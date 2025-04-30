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
  // Expect string keys from YAML/JSON, then validate they are positive integers
  waveEnemyTypeUnlock: z
    .record(z.string(), z.string().min(1)) // Expect string keys, string values
    .refine(
      (record) =>
        Object.keys(record).every((key) => {
          const num = Number(key);
          return !isNaN(num) && Number.isInteger(num) && num > 0;
        }),
      {
        message: 'waveEnemyTypeUnlock keys must be strings representing positive integers.',
      }
    ),
  spawnPattern: z.string().min(1), // Could be an enum later
});

// Infer the TypeScript type from the schema
export type DifficultyConfig = z.infer<typeof difficultyConfigSchema>;
