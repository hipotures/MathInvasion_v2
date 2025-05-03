// Payload for applying the slow effect
// TODO: Consider moving to a shared core/types location if used elsewhere
export interface ApplySlowEffectData {
    enemyInstanceIds: string[];
    slowFactor: number; // Speed multiplier (e.g., 0.5 for 50% speed)
    durationMs: number; // Duration in milliseconds
}

// Could add other enemy-specific types here later if needed