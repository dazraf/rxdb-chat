import { Link } from 'react-router-dom';
import type { CommentDoc } from 'shared/schemas';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AttachmentDisplay } from './AttachmentDisplay';

export function CommentList({ comments }: { comments: CommentDoc[] }) {
  if (comments.length === 0) {
    return <p className="no-comments">No comments yet.</p>;
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <p className="comment-meta">
            <Link to={`/profile/${comment.authorId}`}><strong>{comment.authorName}</strong></Link> &middot;{' '}
            {new Date(comment.createdAt).toLocaleDateString()}
          </p>
          <MarkdownRenderer content={comment.body} />
          <AttachmentDisplay parentId={comment.id} />
        </div>
      ))}
    </div>
  );
}
