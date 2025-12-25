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
  inputs: z.object({
    connectedSources: z.array(z.enum(["website", "shopify", "crm"])).min(1),
  }),

  objective: z.string().min(1),

  audience: z.object({
    name: z.string().min(1),
    sizeEstimate: z.number().int().positive().optional(),
    rules: z.object({
      segment: z.string().min(1),
      conditions: z.array(
        z.object({
          field: z.string().min(1),
          op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]),
          value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
        })
      ),
    }),
  }),

  timing: z.object({
    trigger: z.string().min(1),
    frequencyCap: z
      .object({
        maxPerUser: z.number().int().positive(),
        perDays: z.number().int().positive(),
      })
      .optional(),
    quietHours: z
      .object({
        start: z.string().min(1),
        end: z.string().min(1),
        timezone: z.string().min(1),
      })
      .optional(),
  }),

  tracking: z
    .object({
      utm: z
        .object({
          source: z.string().min(1),
          medium: z.string().min(1),
          campaign: z.string().min(1),
        })
        .optional(),
      website: z
        .object({
          pixel: z.string().optional(),
          events: z.array(z.string()).optional(),
        })
        .optional(),
      shopify: z
        .object({
          discountCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),

  channels: z.array(CampaignChannelSchema).min(1),
});

export type CampaignPayload = z.infer<typeof CampaignPayloadSchema>;
