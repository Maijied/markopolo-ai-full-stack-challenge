type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function pplxStreamChatCompletions(input: {
  apiKey: string;
  model: string; // "sonar-pro" recommended if you have it
  messages: ChatMessage[];
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
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Perplexity error ${res.status}: ${txt}`);
  }

  return res;
}
