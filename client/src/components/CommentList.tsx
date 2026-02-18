import type { CommentDoc } from 'shared/schemas';

export function CommentList({ comments }: { comments: CommentDoc[] }) {
  if (comments.length === 0) {
    return <p className="no-comments">No comments yet.</p>;
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <p className="comment-meta">
            <strong>{comment.authorName}</strong> &middot;{' '}
            {new Date(comment.createdAt).toLocaleDateString()}
          </p>
          <p>{comment.body}</p>
        </div>
      ))}
    </div>
  );
}
