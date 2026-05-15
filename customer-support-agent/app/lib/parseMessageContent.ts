export function parseMessageContent(content: string): { text: string; thinking?: string } {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && typeof parsed.response === 'string') {
      return { text: parsed.response, thinking: parsed.thinking };
    }
  } catch {
    // Not JSON — return as-is
  }
  return { text: content };
}
