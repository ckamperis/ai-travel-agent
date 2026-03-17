/**
 * Nuclear markdown stripper. Multiple passes to ensure zero markdown
 * artifacts reach the UI. Applied to composed emails AND itinerary text.
 */
export function stripMarkdown(text: string): string {
  let result = text;

  // 3 full passes to catch nested/multi-line patterns
  for (let pass = 0; pass < 3; pass++) {
    result = result
      // Code blocks
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Headers (# through ######)
      .replace(/^#{1,6}\s+/gm, '')
      // Bold+italic combos
      .replace(/\*{3}([\s\S]+?)\*{3}/g, '$1')
      .replace(/\*{2}([\s\S]+?)\*{2}/g, '$1')
      // Standalone asterisks as italic (only within a line)
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
      // Underscore variants
      .replace(/_{3}([\s\S]+?)_{3}/g, '$1')
      .replace(/_{2}([\s\S]+?)_{2}/g, '$1')
      .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
      // Horizontal rules
      .replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '')
      // Blockquotes
      .replace(/^>\s+/gm, '')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Numbered list markers: "1. " → "1) "
      .replace(/^(\d+)\.\s+/gm, '$1) ')
      // Unordered list markers
      .replace(/^\s*[-*+]\s+/gm, '- ');
  }

  // Final safety: kill any remaining ** or __ pairs
  result = result.replace(/\*\*/g, '').replace(/__/g, '');

  // Clean up whitespace
  return result.replace(/\n{3,}/g, '\n\n').trim();
}
