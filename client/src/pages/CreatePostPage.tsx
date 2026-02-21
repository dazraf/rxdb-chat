import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRxCollection } from 'rxdb-hooks';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../auth/AuthContext';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import { FilePicker } from '../components/FilePicker';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { useAttachmentUpload } from '../hooks/useAttachmentUpload';
import type { RecorderState } from '../hooks/useVoiceRecorder';
import type { PostDoc } from 'shared/schemas';

export function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const titleRef = useRef<HTMLInputElement>(null);
  const collection = useRxCollection<PostDoc>('posts');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { uploadFile } = useAttachmentUpload();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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

    try {
      const postId = uuidv4();
      const post: PostDoc = {
        id: postId,
        title: title.trim(),
        body: body.trim(),
        authorId: user.id,
        authorName: user.username,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };
      await collection.insert(post);

      // Upload pending files
      for (const file of pendingFiles) {
        await uploadFile(file, postId, 'post');
      }

      navigate(`/post/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
  }

  return (
    <div className="create-post">
      <h1>Create Post</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <label>
          Title
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <div>
          <label htmlFor="post-body">Body</label>
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
              id="post-body"
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              required
            />
          )}
        </div>

        <div className="attachment-actions">
          {recorderState === 'idle' && (
            <FilePicker onFiles={handleFiles} />
          )}
          <VoiceRecorder
            onRecorded={(file) => setPendingFiles((prev) => [...prev, file])}
            onStateChange={setRecorderState}
          />
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

        <button type="submit">Create Post</button>
      </form>
    </div>
  );
}
