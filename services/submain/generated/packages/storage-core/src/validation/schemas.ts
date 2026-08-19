import { z } from 'zod';

export const storageOutputFormatSchema = z.enum(['webp']);

export const storageProfileIdSchema = z.string().min(1);

export const imageUploadRequestSchema = z.object({
  storageProfileId: storageProfileIdSchema,
});
