import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRxCollection } from 'rxdb-hooks';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../auth/AuthContext';
import type { PostDoc } from 'shared/schemas';

export function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const collection = useRxCollection<PostDoc>('posts');
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collection || !user) return;

    try {
      const post: PostDoc = {
        id: uuidv4(),
        title: title.trim(),
        body: body.trim(),
        authorId: user.id,
        authorName: user.username,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      };
      await collection.insert(post);
      navigate(`/post/${post.id}`);
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Body
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required />
        </label>
        <button type="submit">Create Post</button>
      </form>
    </div>
  );
}
