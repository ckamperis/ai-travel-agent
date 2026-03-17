/**
 * Aggressively strip ALL markdown formatting from text.
 * Applied to both composed emails and research itinerary text.
 */
export function stripMarkdown(text: string): string {
  return text
    // Code blocks (must be first)
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Headers
    .replace(/^#{1,6}\s+/gm, '')
    // Bold/italic variants (greedy across newlines handled by repeated passes)
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Second pass for nested markdown that the first pass exposed
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // Horizontal rules
    .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')
    // Blockquotes
    .replace(/^>\s+/gm, '')
    // Links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Numbered list markers at start of line: "1. " → "1) " (keep structure, remove markdown syntax)
    .replace(/^(\d+)\.\s+/gm, '$1) ')
    // Unordered list markers: -, *, + at start of line → clean dash
    .replace(/^\s*[-*+]\s+/gm, '- ')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
