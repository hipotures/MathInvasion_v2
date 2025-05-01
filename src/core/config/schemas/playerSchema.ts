import { z } from 'zod';

export const playerSchema = z.object({
  initialHealth: z.number().int().positive().describe('Starting health points for the player.'),
  speed: z // Renamed from moveSpeed
    .number()
    .positive()
    .describe('Horizontal movement speed of the player in pixels per second.'),
  invulnerabilityDurationMs: z
    .number()
    .int()
    .positive()
    .describe('Duration of invulnerability in milliseconds after taking damage.'),
  // Add other player-specific configurations here later (e.g., starting position, sprite key)
});

export type PlayerConfig = z.infer<typeof playerSchema>;
