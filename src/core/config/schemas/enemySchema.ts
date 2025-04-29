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

// Define specific schemas for each ability type
const healAuraAbilitySchema = z.object({
  type: z.literal('heal_aura'),
  range: z.number().positive(),
  healPerSec: z.number().positive(),
});

const spawnMinionsAbilitySchema = z.object({
  type: z.literal('spawn_minions'),
  minionId: z.string().min(1),
  cooldownMs: z.number().positive(),
  count: z.number().int().positive(),
});

const deathBombAbilitySchema = z.object({
  type: z.literal('death_bomb'),
  projectileType: z.string(), // Type of projectile to spawn on death
  damage: z.number().positive(),
  radius: z.number().positive().optional(), // Optional radius for the explosion effect
  timeToExplodeMs: z.number().positive().optional(), // Optional delay before explosion (will default in logic)
});

// Use discriminated union for enemy abilities
const enemyAbilitySchema = z.discriminatedUnion('type', [
  healAuraAbilitySchema,
  spawnMinionsAbilitySchema,
  deathBombAbilitySchema,
  // Add other ability schemas here as needed
]);

// Schema for a single enemy entry
const enemySchema = z.object({
  id: z.string().min(1),
  shape: z.string().min(1), // Could be an enum later: z.enum(['triangle', 'square', ...])
  baseHealth: z.number().positive(),
  baseSpeed: z.number().positive(),
  baseReward: z.number().nonnegative(),
  collisionDamage: z.number().nonnegative().describe('Damage dealt to the player on collision.'), // Added collision damage
  movementPattern: z.enum([
    'invader_standard',
    'invader_support',
    'boss_weaving',
    'bomber_dive',
    'strafe_horizontal', // Added for Diamond Strafer
  ]), // Use enum for patterns
  collisionRadius: z.number().positive(),
  canShoot: z.boolean(),
  shootConfig: enemyShootConfigSchema, // Use the optional schema
  abilities: z.array(enemyAbilitySchema).optional(), // Array of specific abilities
});

// Schema for the entire enemies.yml file (an array of enemies)
export const enemiesConfigSchema = z.array(enemySchema);

// Infer the TypeScript type from the schema
export type EnemyConfig = z.infer<typeof enemySchema>;
export type EnemiesConfig = z.infer<typeof enemiesConfigSchema>;
