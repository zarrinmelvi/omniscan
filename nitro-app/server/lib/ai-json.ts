// Shared by every route that asks an Ollama Cloud model for JSON — gemma4:cloud
// (and possibly others) sometimes wrap their JSON reply in markdown code fences
// despite format: 'json' being requested, e.g. "```json\n{...}\n```" instead of
// bare "{...}". Strip those before JSON.parse, or the call throws every time.
export function stripCodeFences(text: string): string {
	const trimmed = text.trim()
	const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
	return fenceMatch ? fenceMatch[1].trim() : trimmed
}
