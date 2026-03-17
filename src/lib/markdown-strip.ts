/**
 * Strip markdown formatting from text so emails read as clean prose.
 * Applied as post-processing after the full compose text is assembled.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')               // ## headings
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')      // ***bold italic***
    .replace(/\*\*([^*]+)\*\*/g, '$1')           // **bold**
    .replace(/\*([^*]+)\*/g, '$1')               // *italic*
    .replace(/__([^_]+)__/g, '$1')               // __bold__
    .replace(/_([^_]+)_/g, '$1')                 // _italic_
    .replace(/`{3}[\s\S]*?`{3}/g, '')            // ```code blocks```
    .replace(/`([^`]+)`/g, '$1')                 // `inline code`
    .replace(/^\s*[-*+]\s+/gm, '- ')             // normalize list markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // [links](url) → links
    .replace(/^>\s+/gm, '')                       // > blockquotes
    .replace(/^---+$/gm, '')                      // horizontal rules
    .replace(/\n{3,}/g, '\n\n')                   // collapse excessive blank lines
    .trim();
}
