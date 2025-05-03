import { z } from 'zod';

export const playerSchema = z.object({
  initialHealth: z.number().int().positive().describe('Starting health points for the player.'),
  speed: z // Renamed from moveSpeed
    .number()
    .positive()
    .describe('Horizontal movement speed of the player in pixels per second.'),
  acceleration: z
    .number()
    .positive()
    .describe('Rate at which the player reaches maximum speed in pixels per second squared.'),
  deceleration: z
    .number()
    .positive()
    .describe('Rate at which the player slows down to zero speed in pixels per second squared.'),
  invulnerabilityDurationMs: z
    .number()
    .int()
    .positive()
    .describe('Duration of invulnerability in milliseconds after taking damage.'),
  // Add other player-specific configurations here later (e.g., starting position, sprite key)
});

export type PlayerConfig = z.infer<typeof playerSchema>;
