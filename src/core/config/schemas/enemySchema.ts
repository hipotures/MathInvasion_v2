import { z } from 'zod';

// Optional schema for enemy shooting configuration
const enemyShootConfigSchema = z
  .object({
    projectileType: z.string().min(1),
    cooldownMs: z.number().positive(),
    damage: z.number().nonnegative().optional(), // Optional if projectile defines damage
    damagePerSec: z.number().nonnegative().optional(), // Optional for non-DPS projectiles
    speed: z.number().positive().optional(), // Optional if projectile defines speed
    range: z.number().positive().optional(), // Optional for non-ranged attacks
  })
  .optional();

// Optional schema for enemy abilities
const enemyAbilitySchema = z
  .object({
    type: z.string().min(1), // e.g., 'heal_aura', 'spawn_minions'
    range: z.number().positive().optional(),
    healPerSec: z.number().positive().optional(),
    minionId: z.string().min(1).optional(),
    cooldownMs: z.number().positive().optional(),
    count: z.number().int().positive().optional(),
  })
  .optional(); // Making the whole ability object optional might be too broad, consider refining

// Schema for a single enemy entry
const enemySchema = z.object({
  id: z.string().min(1),
  shape: z.string().min(1), // Could be an enum later: z.enum(['triangle', 'square', ...])
  baseHealth: z.number().positive(),
  baseSpeed: z.number().positive(),
  baseReward: z.number().nonnegative(),
  collisionDamage: z.number().nonnegative().describe('Damage dealt to the player on collision.'), // Added collision damage
  movementPattern: z.string().min(1), // Could be an enum later
  collisionRadius: z.number().positive(),
  canShoot: z.boolean(),
  shootConfig: enemyShootConfigSchema, // Use the optional schema
  abilities: z.array(enemyAbilitySchema).optional(), // Array of optional abilities
});

// Schema for the entire enemies.yml file (an array of enemies)
export const enemiesConfigSchema = z.array(enemySchema);

// Infer the TypeScript type from the schema
export type EnemyConfig = z.infer<typeof enemySchema>;
export type EnemiesConfig = z.infer<typeof enemiesConfigSchema>;
