import { MarkdownAction } from '../hooks/useMarkdownEditor';

interface Props {
  onAction: (action: MarkdownAction) => void;
  preview: boolean;
  onTogglePreview: () => void;
}

const BUTTONS: { action: MarkdownAction; label: string; title: string }[] = [
  { action: 'bold', label: 'B', title: 'Bold' },
  { action: 'italic', label: 'I', title: 'Italic' },
  { action: 'heading', label: 'H', title: 'Heading' },
  { action: 'bullet', label: '\u2022', title: 'Bullet list' },
  { action: 'numbered', label: '1.', title: 'Numbered list' },
];

export function MarkdownToolbar({ onAction, preview, onTogglePreview }: Props) {
  return (
    <div className="md-toolbar">
      {BUTTONS.map(({ action, label, title }) => (
        <button
          key={action}
          type="button"
          tabIndex={-1}
          title={title}
          onClick={() => onAction(action)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        tabIndex={-1}
        className={`preview-toggle ${preview ? 'active' : ''}`}
        onClick={onTogglePreview}
      >
        {preview ? 'Write' : 'Preview'}
      </button>
    </div>
  );
}
