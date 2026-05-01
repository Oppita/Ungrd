export const AI_MODELS = {
  gemini: {
    default: "gemini-1.5-flash",
    fallback: "gemini-1.5-flash",
  },
  groq: {
    default: "llama-3.3-70b-versatile",
  },
  openrouter: {
    // Using a more compatible model on OpenRouter
    default: "meta-llama/llama-3-8b-instruct",
  }
};

export const FALLBACK_ORDER = ["gemini", "groq", "openrouter"];
