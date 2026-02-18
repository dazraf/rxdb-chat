import { describe, it, expect } from 'vitest';
import { stripMarkdown } from './stripMarkdown';

describe('stripMarkdown', () => {
  it('strips heading markers', () => {
    expect(stripMarkdown('# Heading 1')).toBe('Heading 1');
    expect(stripMarkdown('## Heading 2')).toBe('Heading 2');
    expect(stripMarkdown('### Heading 3')).toBe('Heading 3');
  });

  it('strips bold syntax', () => {
    expect(stripMarkdown('**bold text**')).toBe('bold text');
    expect(stripMarkdown('__bold text__')).toBe('bold text');
  });

  it('strips italic syntax', () => {
    expect(stripMarkdown('*italic text*')).toBe('italic text');
    expect(stripMarkdown('_italic text_')).toBe('italic text');
  });

  it('strips strikethrough syntax', () => {
    expect(stripMarkdown('~~deleted~~')).toBe('deleted');
  });

  it('strips inline code', () => {
    expect(stripMarkdown('use `console.log()`')).toBe('use console.log()');
  });

  it('strips links, keeping text', () => {
    expect(stripMarkdown('[Click here](https://example.com)')).toBe('Click here');
  });

  it('strips images, keeping alt text', () => {
    expect(stripMarkdown('![alt text](image.png)')).toBe('alt text');
  });

  it('strips unordered list markers', () => {
    expect(stripMarkdown('- item one\n- item two')).toBe('item one\nitem two');
    expect(stripMarkdown('* item one\n* item two')).toBe('item one\nitem two');
  });

  it('strips ordered list markers', () => {
    expect(stripMarkdown('1. first\n2. second')).toBe('first\nsecond');
  });

  it('strips blockquote markers', () => {
    expect(stripMarkdown('> quoted text')).toBe('quoted text');
  });

  it('collapses multiple blank lines', () => {
    expect(stripMarkdown('paragraph one\n\nparagraph two')).toBe('paragraph one paragraph two');
  });

  it('handles combined markdown', () => {
    const md = '## Welcome\n\nThis is **bold** and *italic* with a [link](http://x.com).\n\n- item 1\n- item 2';
    const result = stripMarkdown(md);
    expect(result).toBe('Welcome This is bold and italic with a link.\nitem 1\nitem 2');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(stripMarkdown('Just plain text')).toBe('Just plain text');
  });
});
