import { useRef, useCallback } from 'react';

export type MarkdownAction = 'bold' | 'italic' | 'heading' | 'bullet' | 'numbered';

interface InsertSpec {
  prefix: string;
  suffix: string;
  placeholder: string;
  linePrefix?: boolean;
}

const ACTIONS: Record<MarkdownAction, InsertSpec> = {
  bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
  italic: { prefix: '_', suffix: '_', placeholder: 'italic text' },
  heading: { prefix: '## ', suffix: '', placeholder: 'Heading', linePrefix: true },
  bullet: { prefix: '- ', suffix: '', placeholder: 'List item', linePrefix: true },
  numbered: { prefix: '1. ', suffix: '', placeholder: 'List item', linePrefix: true },
};

export function useMarkdownEditor(
  setText: (updater: (prev: string) => string) => void,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback(
    (action: MarkdownAction) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const { prefix, suffix, placeholder, linePrefix } = ACTIONS[action];
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = ta.value.substring(start, end);
      const text = selected || placeholder;

      let before = ta.value.substring(0, start);
      const after = ta.value.substring(end);

      if (linePrefix && before.length > 0 && !before.endsWith('\n')) {
        before += '\n';
      }

      const inserted = `${prefix}${text}${suffix}`;
      const newValue = before + inserted + after;

      setText(() => newValue);

      requestAnimationFrame(() => {
        ta.focus();
        const cursorStart = before.length + prefix.length;
        const cursorEnd = cursorStart + text.length;
        ta.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [setText],
  );

  return { textareaRef, insertMarkdown };
}
