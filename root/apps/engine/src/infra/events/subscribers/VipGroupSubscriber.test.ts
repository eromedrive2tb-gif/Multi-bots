import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { registerVipGroupSubscriber } from './VipGroupSubscriber'
import { DomainEventType } from '../../../core/domain-events'

// Mock VipGroupService methods
const mockListGroups = mock()
const mockAddMember = mock()
const mockUpdateMemberStatus = mock()
const mockUpdateGroup = mock()

// Mock the nested import for organisms
mock.module('../../../lib/organisms', () => {
    return {
        VipGroupService: mock().mockImplementation(() => {
            return {
                listGroups: mockListGroups,
                addMember: mockAddMember,
                updateMemberStatus: mockUpdateMemberStatus,
                updateGroup: mockUpdateGroup,
                registerGroup: mock(),
                deleteGroup: mock()
            }
        })
    }
})

describe('VipGroupSubscriber', () => {
    let handlers: Record<string, Function> = {}

    beforeEach(() => {
        handlers = {}
        // Simular a função on() que registra os handlers
        const mockOn = (eventType: string, handler: Function) => {
            handlers[eventType] = handler
        }
        registerVipGroupSubscriber(mockOn as any)

        // Reset mocks
        mockListGroups.mockReset()
        mockAddMember.mockReset()
        mockUpdateMemberStatus.mockReset()
        mockUpdateGroup.mockReset()
    })

    it('should register handlers for group events', () => {
        expect(handlers[DomainEventType.USER_JOINED_GROUP]).toBeDefined()
        expect(handlers[DomainEventType.USER_LEFT_GROUP]).toBeDefined()
    })

    it('should increment member_count on USER_JOINED_GROUP', async () => {
        // Arrange
        const mockEnv = { DB: {} as any }
        const mockEvent = {
            tenantId: 'tenant-123',
            payload: {
                chatId: 'chat-1',
                userId: 'user-1',
                status: 'member',
                username: 'johndoe',
                firstName: 'John'
            }
        }

        mockListGroups.mockResolvedValue({
            success: true,
            data: [
                {
                    id: 'internal-group-id',
                    providerId: 'chat-1',
                    provider: 'telegram',
                    metadata: { member_count: 10 }
                }
            ]
        })

        // Act
        const handler = handlers[DomainEventType.USER_JOINED_GROUP]
        await handler(mockEvent, mockEnv)

        // Assert
        expect(mockAddMember).toHaveBeenCalledWith({
            groupId: 'internal-group-id',
            customerId: 'user-1',
            status: 'member',
            provider: 'tg',
            tenantId: 'tenant-123',
            username: 'johndoe',
            name: 'John'
        })

        expect(mockUpdateGroup).toHaveBeenCalled()
        const updateArgs = mockUpdateGroup.mock.calls[0]
        expect(updateArgs[0]).toBe('internal-group-id')
        expect(updateArgs[1].metadata.member_count).toBe(11) // 10 + 1
    })

    it('should decrement member_count on USER_LEFT_GROUP', async () => {
        // Arrange
        const mockEnv = { DB: {} as any }
        const mockEvent = {
            tenantId: 'tenant-123',
            payload: {
                chatId: 'chat-1',
                userId: 'user-1',
                status: 'left'
            }
        }

        mockListGroups.mockResolvedValue({
            success: true,
            data: [
                {
                    id: 'internal-group-id',
                    providerId: 'chat-1',
                    provider: 'telegram',
                    metadata: { member_count: 5 }
                }
            ]
        })

        // Act
        const handler = handlers[DomainEventType.USER_LEFT_GROUP]
        await handler(mockEvent, mockEnv)

        // Assert
        expect(mockUpdateMemberStatus).toHaveBeenCalledWith(
            'internal-group-id',
            'user-1',
            'left'
        )

        expect(mockUpdateGroup).toHaveBeenCalled()
        const updateArgs = mockUpdateGroup.mock.calls[0]
        expect(updateArgs[0]).toBe('internal-group-id')
        expect(updateArgs[1].metadata.member_count).toBe(4) // 5 - 1
    })

    it('should not decrement below zero on USER_LEFT_GROUP', async () => {
        // Arrange
        const mockEnv = { DB: {} as any }
        const mockEvent = {
            tenantId: 'tenant-123',
            payload: {
                chatId: 'chat-1',
                userId: 'user-1',
                status: 'left'
            }
        }

        mockListGroups.mockResolvedValue({
            success: true,
            data: [
                {
                    id: 'internal-group-id',
                    providerId: 'chat-1',
                    provider: 'telegram',
                    metadata: { member_count: 0 }
                }
            ]
        })

        // Act
        const handler = handlers[DomainEventType.USER_LEFT_GROUP]
        await handler(mockEvent, mockEnv)

        // Assert
        const updateArgs = mockUpdateGroup.mock.calls[0]
        expect(updateArgs[1].metadata.member_count).toBe(0) // Math.max(0, 0 - 1)
    })
})
