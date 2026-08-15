import { z } from "zod";

export const localNotificationScheduleSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  body: z.string(),
  at: z.date().optional(),
  channelId: z.string().optional(),
  sound: z.string().optional(),
  badge: z.number().min(0).optional(),
  data: z.record(z.string(), z.string()).optional(),
});

export const inboundNotificationPayloadSchema = z.object({
  id: z.string().default(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`)),
  title: z.string().default(""),
  body: z.string().default(""),
  data: z.record(z.string(), z.string()).default({}),
  foreground: z.boolean().default(false),
  tag: z.string().optional(),
  channelId: z.string().optional(),
});

export const inboundTapRecordSchema = z.object({
  recordId: z.string().default(""),
  uid: z.string().default(""),
  notificationId: z.string().default(""),
  record: z
    .object({
      recordId: z.string(),
      uid: z.string(),
      notificationId: z.string(),
      dedupeKey: z.string(),
      channelId: z.string(),
      createdAt: z.string(),
      receivedAt: z.number(),
      payload: inboundNotificationPayloadSchema,
    })
    .optional(),
});
