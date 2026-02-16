import type { VipGroup, CreateVipGroupDTO, UpdateVipGroupDTO, Result } from '../types'

export interface IVipGroupService {
    listGroups(): Promise<Result<VipGroup[]>>
    getGroup(id: string): Promise<Result<VipGroup>>
    registerGroup(data: CreateVipGroupDTO): Promise<Result<VipGroup>>
    updateGroup(id: string, data: UpdateVipGroupDTO): Promise<Result<VipGroup>>
    deleteGroup(id: string): Promise<Result<void>>
}
