import { Link } from 'react-router-dom';
import type { PostDoc } from 'shared/schemas';
import { stripMarkdown } from '../utils/stripMarkdown';

export function PostCard({ post }: { post: PostDoc }) {
  const preview = stripMarkdown(post.body);

  return (
    <div className="post-card">
      <Link to={`/post/${post.id}`}>
        <h2>{post.title}</h2>
      </Link>
      <p className="post-meta">
        by <Link to={`/profile/${post.authorId}`}>{post.authorName}</Link> &middot; {new Date(post.createdAt).toLocaleDateString()}
      </p>
      <p className="post-body-preview">{preview.slice(0, 200)}{preview.length > 200 ? '...' : ''}</p>
    </div>
  );
}
