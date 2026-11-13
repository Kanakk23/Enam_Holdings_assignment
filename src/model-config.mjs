// Public provider choices only. Credentials must never be imported from here.
export const modelProviders = {
  groq: {
    label: "Groq",
    defaultModel: "openai/gpt-oss-120b",
    models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"],
    keyUrl: "https://console.groq.com/keys",
    note: "Use a free-plan account. Quotas depend on the model and account; FINN cannot check your billing settings.",
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "openrouter/free",
    keyUrl: "https://openrouter.ai/settings/keys",
    note: "Only the free router or a model ending in :free is accepted. Free availability and daily limits vary.",
  },
  gemini: {
    label: "Gemini",
    defaultModel: "gemini-3.1-flash-lite",
    models: ["gemini-3.1-flash-lite"],
    keyUrl: "https://aistudio.google.com/api-keys",
    note: "Use a free-tier project without billing attached. FINN cannot check your billing settings.",
  },
};

export function allowedModel(provider, model) {
  if (provider === "openrouter")
    return model === "openrouter/free" || /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+:free$/.test(model);
  return !!modelProviders[provider]?.models?.includes(model);
}
