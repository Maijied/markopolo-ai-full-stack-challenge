export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function pplxStreamChatCompletions(input: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  returnCitations?: boolean;
}): Promise<Response> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: true,
      return_citations: input.returnCitations ?? false,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Perplexity error ${res.status}: ${txt}`);
  }

  return res;
}

export async function pplxChatCompletions(input: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  responseFormat?: any;
  returnCitations?: boolean;
}): Promise<any> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: false,
      return_citations: input.returnCitations ?? false,
      ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Perplexity error ${res.status}: ${txt}`);
  }

  return res.json();
}
