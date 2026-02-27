import { Link } from 'react-router-dom';
import type { PostDoc } from 'shared/schemas';
import { stripMarkdown } from '../utils/stripMarkdown';

export function PostCard({ post, subName }: { post: PostDoc; subName?: string }) {
  const preview = stripMarkdown(post.body);

  return (
    <div className="post-card">
      <Link to={`/post/${post.id}`}>
        <h2>{post.title}</h2>
      </Link>
      <p className="post-meta">
        {subName && (
          <>
            <Link to={`/s/${subName}`} className="post-sub-badge">{subName}</Link>
            {' '}&middot;{' '}
          </>
        )}
        by <Link to={`/profile/${post.authorId}`}>{post.authorName}</Link> &middot; {new Date(post.createdAt).toLocaleDateString()}
      </p>
      <p className="post-body-preview">{preview.slice(0, 200)}{preview.length > 200 ? '...' : ''}</p>
    </div>
  );
}
