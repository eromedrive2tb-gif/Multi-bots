import type { Blueprint, BlueprintListItem, Result } from '../types'

export interface IBlueprintService {
    listBlueprints(): Promise<Result<BlueprintListItem[]>>
    getBlueprint(id: string): Promise<Result<Blueprint>>
    saveBlueprint(blueprint: Blueprint): Promise<Result<Blueprint>>
    deleteBlueprint(id: string): Promise<Result<void>>
}
