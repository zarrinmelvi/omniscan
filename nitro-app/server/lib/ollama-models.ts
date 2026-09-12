export const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat'

// Vision + text. Used for: scan photo -> ingredient extraction (OCR),
// and (once extended) Halal logo detection from the same photo.
// 256K context, text+image input.
export const SCAN_VISION_MODEL = 'gemma4:cloud'

// Text-only reasoning. Used for: semantic allergen matching — reasoning
// over extracted ingredient text against a user's real allergen profile,
// beyond what the static IngredientMapping table alone can catch.
// 198K context, text input.
export const ALLERGEN_MATCH_MODEL = 'glm-5.1:cloud'

// Text-only reasoning, large context. Used for: alternatives ranking and
// AI-generated recipe suggestions — both need to hold many candidate
// rows (products or recipes) + pantry + allergen profile at once.
// 1M context, text input.
export const GENERATION_MODEL = 'deepseek-v4-flash:cloud'
