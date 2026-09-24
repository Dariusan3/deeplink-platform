// Groq models used across the app, in one place. Groq retires models without
// notice: llama-3.3-70b-versatile and llama-3.1-8b-instant both started
// returning 404 model_not_found, which silently broke AI Brain, the weekly
// report, alert root-cause text and partner content ideas. Check
// GET https://api.groq.com/openai/v1/models when AI features start failing.
//
// gpt-oss models are reasoning models: max_tokens also covers hidden reasoning,
// so callers need headroom, and reasoning_effort "low" keeps latency down.

// Main model: chat with tools, long-form writing.
export const AI_MODEL = "openai/gpt-oss-120b";
// Cheap and fast: short structured outputs (alert root causes).
export const AI_MODEL_FAST = "openai/gpt-oss-20b";
export const AI_REASONING_EFFORT = "low" as const;
