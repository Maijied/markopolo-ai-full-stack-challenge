import { z } from "zod";

export const CampaignChannelSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp", "ads"]),
  message: z.object({
    subject: z.string().optional(),
    body: z.string().min(1),
    variables: z.array(z.string()).default([]),
  }),
});

export const CampaignPayloadSchema = z.object({
  objective: z.string().min(1),

  audience: z.object({
    name: z.string().min(1),
    rules: z.object({
      segment: z.string().min(1),
      // keep this constrained; avoid "any" to improve structured-output compliance
      conditions: z.array(
        z.object({
          field: z.string().min(1),
          op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]),
          value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
        })
      ),
    }),
    sizeEstimate: z.number().int().positive().optional(),
  }),

  timing: z.object({
    trigger: z.string().min(1),
    quietHours: z
      .object({
        start: z.string().min(1), // "21:00"
        end: z.string().min(1),   // "08:00"
        timezone: z.string().min(1),
      })
      .optional(),
    frequencyCap: z
      .object({
        maxPerUser: z.number().int().positive(),
        perDays: z.number().int().positive(),
      })
      .optional(),
  }),

  channels: z.array(CampaignChannelSchema).min(1),
});

export type CampaignPayload = z.infer<typeof CampaignPayloadSchema>;
