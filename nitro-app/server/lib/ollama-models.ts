const BASE_HOST = process.env.OLLAMA_HOST || 'https://ollama.com'
export const OLLAMA_ENDPOINT = `${BASE_HOST.replace(/\/$/, '')}/api/chat`

// Vision + text. Used for: scan photo -> ingredient extraction (OCR),
// and Halal logo detection from the same photo.
// Natively multimodal cloud model (text + image input, 1M context).
export const SCAN_VISION_MODEL = 'glm-5.3-flash:cloud'

// Text reasoning. Used for: semantic allergen matching — reasoning
// over extracted ingredient text against a user's real allergen profile,
// beyond what the static IngredientMapping table alone can catch.
export const ALLERGEN_MATCH_MODEL = 'deepseek-v4.1-flash:cloud'

// Large-context reasoning. Used for: alternatives ranking, the web-search
// alternatives normalization, and AI-generated recipe suggestions — all need
// to hold many candidate rows (products or recipes) + pantry + allergen
// profile at once. 1M context.
export const GENERATION_MODEL = 'deepseek-v4.1-flash:cloud'
