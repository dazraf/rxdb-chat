export function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, '')          // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2')  // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')     // italic
    .replace(/~~(.*?)~~/g, '$1')         // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')) // code
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images (before links)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^\s*[-*+]\s+/gm, '')       // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')       // ordered list markers
    .replace(/^\s*>\s+/gm, '')           // blockquotes
    .replace(/\n{2,}/g, ' ')             // collapse blank lines
    .trim();
}
