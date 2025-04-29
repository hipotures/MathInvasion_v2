import { z } from 'zod';

// Schema for the difficulty.yml file
export const difficultyConfigSchema = z.object({
  initialWaveNumber: z.number().int().positive(),
  timeBetweenWavesSec: z.number().positive(),
  enemyHealthMultiplierPerWave: z.number().positive(),
  enemySpeedMultiplierPerWave: z.number().positive(),
  enemyCountMultiplierPerWave: z.number().positive(),
  enemyRewardMultiplierPerWave: z.number().positive(),
  bossWaveFrequency: z.number().int().positive(),
  bossId: z.string().min(1),
  initialEnemyTypes: z.array(z.string().min(1)).min(1), // Must have at least one initial type
  waveEnemyTypeUnlock: z.record(z.number().int().positive(), z.string().min(1)), // Record<waveNumber, enemyId>
  spawnPattern: z.string().min(1), // Could be an enum later
});

// Infer the TypeScript type from the schema
export type DifficultyConfig = z.infer<typeof difficultyConfigSchema>;
