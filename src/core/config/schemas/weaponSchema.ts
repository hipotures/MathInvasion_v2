import { z } from 'zod';

const weaponUpgradeSchema = z.object({
  costMultiplier: z.number().positive(),
  damageMultiplier: z.number().positive().optional(), // e.g., slow field has no damage
  cooldownMultiplier: z.number().positive().optional(), // e.g., laser has no cooldown
  projectileSpeedMultiplier: z.number().positive().optional(),
  rangeAdd: z.number().nonnegative(),
  slowFactorMultiplier: z.number().positive().optional(), // Only for slow field
  durationAddMs: z.number().positive().optional(), // Only for slow field
  // Energy System Upgrades (Optional)
  energyCapacityMultiplier: z.number().positive().optional(),
  energyRefillMultiplier: z.number().positive().optional(),
  // TODO: Consider adding visual upgrade multipliers here later (e.g., size, color shift)
});

const weaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseCost: z.number().nonnegative(),
  baseCooldownMs: z.number().nonnegative(),
  baseDamage: z.number().nonnegative().optional(), // Optional for non-damaging weapons like slow
  baseDamagePerSec: z.number().nonnegative().optional(), // Optional for non-DPS weapons
  baseRange: z.number().positive(),
  projectileType: z.string(), // Could be 'none' for area effects
  projectileSpeed: z
    .number()
    .positive()
    .optional()
    .describe('Speed of the projectile in pixels per second.'), // Make optional
  // New visual properties for dynamic generation
  visualShape: z
    .enum(['rectangle', 'ellipse'])
    .optional()
    .describe('Shape of the dynamically generated projectile visual.'),
  visualWidth: z
    .number()
    .positive()
    .optional()
    .describe('Width of the dynamically generated projectile visual in pixels.'),
  visualHeight: z
    .number()
    .positive()
    .optional()
    .describe('Height of the dynamically generated projectile visual in pixels.'),
  visualColor: z
    .string()
    .regex(/^0x[0-9A-Fa-f]{6}$/) // Matches '0x' followed by 6 hex characters
    .optional()
    .describe(
      'Hex color of the dynamically generated projectile visual (e.g., "0xff0000" for red).'
    ),
  // End new visual properties
  baseSlowFactor: z.number().positive().optional(), // Optional for non-slowing weapons
  baseDurationMs: z.number().positive().optional(), // Optional for non-slowing weapons
  // Energy System (Optional)
  baseEnergyCapacity: z.number().positive().optional(),
  baseEnergyDrainPerSec: z.number().positive().optional(),
  baseEnergyRefillPerSec: z.number().positive().optional(),
  upgrade: weaponUpgradeSchema,
});

export const weaponsConfigSchema = z.array(weaponSchema);

export type WeaponConfig = z.infer<typeof weaponSchema>;
export type WeaponsConfig = z.infer<typeof weaponsConfigSchema>;
