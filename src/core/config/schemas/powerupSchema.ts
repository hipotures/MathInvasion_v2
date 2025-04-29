import { z } from 'zod';

// Schema for a single power-up entry
const powerupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  effect: z.string().min(1), // Could be an enum later
  durationMs: z.number().positive(),
  dropChance: z.number().min(0).max(1), // Probability between 0 and 1
  visual: z.string().min(1), // Identifier for the visual representation
  multiplier: z.number().positive().optional(), // Optional, e.g., for cash_boost or rapid_fire
});

// Schema for the entire powerups.yml file (an array of power-ups)
export const powerupsConfigSchema = z.array(powerupSchema);

// Infer the TypeScript type from the schema
export type PowerupConfig = z.infer<typeof powerupSchema>;
export type PowerupsConfig = z.infer<typeof powerupsConfigSchema>;
