import { useState, FormEvent, useCallback } from 'react';
import { useRxCollection } from 'rxdb-hooks';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../auth/AuthContext';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import { FilePicker } from './FilePicker';
import { VoiceRecorder } from './VoiceRecorder';
import { useAttachmentUpload } from '../hooks/useAttachmentUpload';
import type { RecorderState } from '../hooks/useVoiceRecorder';
import type { CommentDoc } from 'shared/schemas';

export function CommentForm({ postId }: { postId: string }) {
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const collection = useRxCollection<CommentDoc>('comments');
  const { user } = useAuth();
  const { uploadFile } = useAttachmentUpload();

  const setBodyFn = useCallback((updater: (prev: string) => string) => {
    setBody((prev) => updater(prev));
  }, []);
  const { textareaRef, insertMarkdown } = useMarkdownEditor(setBodyFn);

  function handleFiles(files: File[]) {
    setPendingFiles((prev) => [...prev, ...files]);
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collection || !user) return;
    if (!body.trim() && pendingFiles.length === 0) return;

    const commentId = uuidv4();
    await collection.insert({
      id: commentId,
      postId,
      body: body.trim(),
      authorId: user.id,
      authorName: user.username,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      _deleted: false,
    });

    // Upload pending files
    for (const file of pendingFiles) {
      await uploadFile(file, commentId, 'comment');
    }

    setBody('');
    setPreview(false);
    setPendingFiles([]);
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <MarkdownToolbar
        onAction={insertMarkdown}
        preview={preview}
        onTogglePreview={() => setPreview((p) => !p)}
      />
      {preview ? (
        <div className="md-preview">
          <MarkdownRenderer content={body} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
        />
      )}

      <div className="attachment-actions">
        {recorderState === 'idle' && (
          <>
            <FilePicker onFiles={handleFiles} />
          </>
        )}
        <VoiceRecorder
          onRecorded={(file) => setPendingFiles((prev) => [...prev, file])}
          onStateChange={setRecorderState}
        />
        {recorderState === 'idle' && (
          <button
            type="submit"
            className="action-submit"
            disabled={!body.trim() && pendingFiles.length === 0}
          >Comment</button>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="pending-files">
          {pendingFiles.map((f, i) => (
            <span key={i} className="pending-file">
              {f.name}
              <button type="button" onClick={() => removePending(i)}>&times;</button>
            </span>
          ))}
        </div>
      )}
    </form>
  );
}
