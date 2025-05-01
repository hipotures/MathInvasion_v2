import { z } from 'zod';

const powerupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  effect: z.string().min(1), // Could be an enum later
  durationMs: z.number().positive(),
  dropChance: z.number().min(0).max(1), // Probability between 0 and 1
  visual: z.string().min(1),
  multiplier: z.number().positive().optional(), // Optional, e.g., for cash_boost or rapid_fire
});

export const powerupsConfigSchema = z.array(powerupSchema);

export type PowerupConfig = z.infer<typeof powerupSchema>;
export type PowerupsConfig = z.infer<typeof powerupsConfigSchema>;
