
import { describe, it, expect, mock, beforeAll } from "bun:test";
import { executeFlow } from "./engine";
import type { UniversalContext, Blueprint, SessionData } from "../../core/types";
import { registerAction } from "../molecules/action-registry";

// Mock KV
class MockKV {
    store = new Map<string, any>();

    async get(key: string, type?: string) {
        return this.store.get(key) || null;
    }

    async put(key: string, value: any) {
        this.store.set(key, value);
    }
}

// Mock Action
const mockAction = mock(async () => {
    return { success: true, data: { some: "data" } };
});

describe("Engine Ghost Trigger Reproduction", () => {
    beforeAll(() => {
        // Register a dummy action for the blueprint
        registerAction("test_action", mockAction);
    });

    it("should REJECT flow execution when command does not match blueprint trigger (Ghost Trigger)", async () => {
        // 1. Setup Data
        const tenantId = "test-tenant";
        const botId = "test-bot";
        const userId = "user-123";

        // The "Wrong" Blueprint (e.g. /planos)
        const blueprint: Blueprint = {
            id: "flow-planos",
            name: "Fluxo Planos",
            trigger: "/planos", // ACTUAL trigger
            entry_step: "step_1",
            version: "1.0",
            steps: {
                step_1: {
                    type: "atom",
                    action: "test_action",
                    params: {},
                    next_step: null
                }
            }
        };

        // 2. Setup Mocks
        const blueprintsKV = new MockKV() as any;
        const sessionsKV = new MockKV() as any;

        // SIMULATE GHOST TRIGGER:
        // User types "/start", but KV points it to "flow-planos" (which is /planos)
        blueprintsKV.store.set(`tenant:${tenantId}:trigger:/start`, blueprint.id);
        blueprintsKV.store.set(`tenant:${tenantId}:flow:${blueprint.id}`, blueprint);

        const ctx: UniversalContext = {
            provider: "tg",
            tenantId,
            userId,
            chatId: "chat-123",
            botToken: "token",
            botId,
            metadata: {
                command: "start", // User typed /start
                userName: "Test User"
            }
        };

        // 3. Execute
        const result = await executeFlow(
            { blueprints: blueprintsKV, sessions: sessionsKV },
            ctx
        );

        // 4. Assertions
        // CURRENT BUG BEHAVIOR: 
        // The engine finds the blueprint via KV, sees it exists, and executes it.
        // It DOES NOT check if blueprint.trigger === /start.
        // So result.success should be TRUE (which is wrong).

        // DESIRED BEHAVIOR (After Fix):
        // result.success should be FALSE.
        // result.error should contain "mismatch" or similar.

        console.log("Execution Result:", result);

        // DESIRED BEHAVIOR (After Fix):
        // result.success should be FALSE.
        expect(result.success).toBe(false);
        expect(result.error).toContain("mismatch");
    });
});
