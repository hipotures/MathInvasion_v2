import { z } from 'zod';

// Schema for the upgrade part of a weapon
const weaponUpgradeSchema = z.object({
  costMultiplier: z.number().positive(),
  damageMultiplier: z.number().positive().optional(), // e.g., slow field has no damage
  cooldownMultiplier: z.number().positive().optional(), // e.g., laser has no cooldown
  rangeAdd: z.number().nonnegative(),
  slowFactorMultiplier: z.number().positive().optional(), // Only for slow field
  durationAddMs: z.number().positive().optional(), // Only for slow field
});

// Schema for a single weapon entry
const weaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseCost: z.number().nonnegative(),
  baseCooldownMs: z.number().nonnegative(),
  baseDamage: z.number().nonnegative().optional(), // Optional for non-damaging weapons like slow
  baseDamagePerSec: z.number().nonnegative().optional(), // Optional for non-DPS weapons
  baseRange: z.number().positive(),
  projectileType: z.string(), // Could be 'none' for area effects
  projectileSpeed: z.number().positive().describe('Speed of the projectile in pixels per second.'), // Added projectile speed
  baseSlowFactor: z.number().positive().optional(), // Optional for non-slowing weapons
  baseDurationMs: z.number().positive().optional(), // Optional for non-slowing weapons
  upgrade: weaponUpgradeSchema,
});

// Schema for the entire weapons.yml file (an array of weapons)
export const weaponsConfigSchema = z.array(weaponSchema);

// Infer the TypeScript type from the schema
export type WeaponConfig = z.infer<typeof weaponSchema>;
export type WeaponsConfig = z.infer<typeof weaponsConfigSchema>;
