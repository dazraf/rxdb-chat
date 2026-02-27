import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRxCollection } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import type { SubDoc, SubscriptionDoc } from 'shared/schemas';

const NAME_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export function CreateSubPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const subCollection = useRxCollection<SubDoc>('subs');
  const subscriptionCollection = useRxCollection<SubscriptionDoc>('subscriptions');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const setDescFn = useCallback((updater: (prev: string) => string) => {
    setDescription((prev) => updater(prev));
  }, []);
  const { textareaRef, insertMarkdown } = useMarkdownEditor(setDescFn);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subCollection || !subscriptionCollection || !user) return;

    const trimmedName = name.trim().toLowerCase();
    if (!NAME_REGEX.test(trimmedName)) {
      setError('Name must be 3-50 lowercase alphanumeric characters or hyphens, starting and ending with a letter or number.');
      return;
    }

    try {
      const now = Date.now();
      const createdAt = new Date().toISOString();

      // Use name as the ID for the sub
      const sub: SubDoc = {
        id: trimmedName,
        name: trimmedName,
        description: description.trim(),
        creatorId: user.id,
        createdAt,
        updatedAt: now,
        _deleted: false,
      };
      await subCollection.insert(sub);

      // Auto-subscribe creator
      const subscription: SubscriptionDoc = {
        id: `${user.id}_${trimmedName}`,
        userId: user.id,
        subId: trimmedName,
        createdAt,
        updatedAt: now,
        _deleted: false,
      };
      await subscriptionCollection.insert(subscription);

      navigate(`/s/${trimmedName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sub');
    }
  }

  return (
    <div className="create-post">
      <h1>Create Sub</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <label>
          Name
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="e.g. programming"
            required
          />
        </label>
        <div>
          <label htmlFor="sub-description">Description</label>
          <MarkdownToolbar
            onAction={insertMarkdown}
            preview={preview}
            onTogglePreview={() => setPreview((p) => !p)}
          />
          {preview ? (
            <div className="md-preview">
              <MarkdownRenderer content={description} />
            </div>
          ) : (
            <textarea
              id="sub-description"
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What is this sub about?"
            />
          )}
        </div>
        <button type="submit">Create Sub</button>
      </form>
    </div>
  );
}
