import { z } from "zod";

export const photoOptionsSchema = z
  .object({
    direction: z.enum(["front", "rear"]).optional(),
    quality: z
      .union([z.enum(["low", "medium", "high"]), z.number().min(0).max(100)])
      .optional(),
    correctOrientation: z.boolean().optional(),
    saveToGallery: z.boolean().optional(),
    allowEditing: z.boolean().optional(),
  })
  .optional();

export const pickImagesOptionsSchema = z
  .object({
    quality: z
      .union([z.enum(["low", "medium", "high"]), z.number().min(0).max(100)])
      .optional(),
    limit: z.number().min(1).optional(),
    correctOrientation: z.boolean().optional(),
  })
  .optional();
