export type RecordExec = (statement: string, params: unknown[]) => Promise<unknown>
export declare const RENAME_STATEMENTS: string[]
export declare const PURGE_STATEMENTS: Array<[string, number]>
export declare function renameUserRecords(exec: RecordExec, userId: number, name: string): Promise<{ failed: number }>
export declare function purgeUserRecords(exec: RecordExec, userId: number): Promise<{ failed: number }>
export declare function withoutUserGarrisons<T extends { userId?: unknown }>(garrisons: { list?: T[]; defeated?: number } | null | undefined, userId: number): { list: T[]; defeated: number } | null
