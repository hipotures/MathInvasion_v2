import { z } from 'zod';

/**
 * Schema for display configuration
 */
export const displaySchema = z.object({
  aspect_ratio: z.object({
    default: z.string(),
    supported: z.array(z.string()),
  }),
  base_resolution: z.object({
    width: z.number(),
    height: z.number(),
  }),
  max_resolution: z.object({
    width: z.number(),
    height: z.number(),
  }),
  ui_scaling: z.object({
    enabled: z.boolean(),
    min_scale: z.number(),
    max_scale: z.number(),
  }),
});

export type DisplayConfig = z.infer<typeof displaySchema>;