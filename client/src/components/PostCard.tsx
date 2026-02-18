import { Link } from 'react-router-dom';
import type { PostDoc } from 'shared/schemas';

export function PostCard({ post }: { post: PostDoc }) {
  return (
    <div className="post-card">
      <Link to={`/post/${post.id}`}>
        <h2>{post.title}</h2>
      </Link>
      <p className="post-meta">
        by {post.authorName} &middot; {new Date(post.createdAt).toLocaleDateString()}
      </p>
      <p className="post-body-preview">{post.body.slice(0, 200)}{post.body.length > 200 ? '...' : ''}</p>
    </div>
  );
}
