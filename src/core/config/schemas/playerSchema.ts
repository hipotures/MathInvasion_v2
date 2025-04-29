import { z } from 'zod';

/**
 * Defines the structure and validation rules for player configuration.
 */
export const playerSchema = z.object({
  initialHealth: z.number().int().positive().describe('Starting health points for the player.'),
  moveSpeed: z
    .number()
    .positive()
    .describe('Horizontal movement speed of the player in pixels per second.'),
  // Add other player-specific configurations here later (e.g., starting position, sprite key)
});

/**
 * Type inferred from the player schema.
 * Represents the validated player configuration object.
 */
export type PlayerConfig = z.infer<typeof playerSchema>;
