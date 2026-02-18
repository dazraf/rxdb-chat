import { useState, FormEvent } from 'react';
import { useRxCollection } from 'rxdb-hooks';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../auth/AuthContext';
import type { CommentDoc } from 'shared/schemas';

export function CommentForm({ postId }: { postId: string }) {
  const [body, setBody] = useState('');
  const collection = useRxCollection<CommentDoc>('comments');
  const { user } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collection || !user || !body.trim()) return;

    await collection.insert({
      id: uuidv4(),
      postId,
      body: body.trim(),
      authorId: user.id,
      authorName: user.username,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      _deleted: false,
    });

    setBody('');
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        required
      />
      <button type="submit">Comment</button>
    </form>
  );
}
