import { z } from "zod";

export const pickFileOptionsSchema = z.object({
  types: z.array(z.string()).optional(),
  multiple: z.boolean().optional(),
  readData: z.boolean().optional(),
}).optional();
export const pickFilesOptionsSchema = pickFileOptionsSchema;

export const saveFileOptionsSchema = z.object({
  fileName: z.string().min(1),
  data: z.union([z.string(), z.instanceof(Uint8Array)]),
  mimeType: z.string().optional(),
});

export const readFileOptionsSchema = z.object({
  path: z.string().min(1),
  directory: z.string().optional(),
});

export const writeFileOptionsSchema = z.object({
  path: z.string().min(1),
  data: z.string(),
  directory: z.string().optional(),
  recursive: z.boolean().optional(),
});

export const deleteFileOptionsSchema = z.object({
  path: z.string().min(1),
  directory: z.string().optional(),
});

export const openFileExternallyOptionsSchema = z.object({
  path: z.string().min(1),
  directory: z.string().optional(),
});
