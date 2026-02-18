import { useRef } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
}

export function FilePicker({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onFiles(files);
          // Reset so the same file can be re-selected
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="file-picker-btn"
        onClick={() => inputRef.current?.click()}
      >
        Attach files
      </button>
    </>
  );
}
