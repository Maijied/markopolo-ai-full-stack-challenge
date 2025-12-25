export type CampaignPayload = {
  objective: string;
  audience: {
    name: string;
    rules: any;
    sizeEstimate?: number;
  };
  timing: {
    trigger: string;
    quietHours?: { start: string; end: string; timezone: string };
    frequencyCap?: { maxPerUser: number; perDays: number };
  };
  channels: Array<{
    channel: "email" | "sms" | "whatsapp" | "ads";
    message: {
      subject?: string;
      body: string;
      variables: string[];
    };
  }>;
};
