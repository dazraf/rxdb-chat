import { useParams, Link } from 'react-router-dom';
import { useRxData } from 'rxdb-hooks';
import { CommentList } from '../components/CommentList';
import { CommentForm } from '../components/CommentForm';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { AttachmentDisplay } from '../components/AttachmentDisplay';
import type { PostDoc, CommentDoc, SubDoc } from 'shared/schemas';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { result: posts, isFetching: loadingPost } = useRxData<PostDoc>('posts', (collection) =>
    collection.findOne(id),
  );

  const post = posts[0] as unknown as PostDoc | undefined;

  const { result: subs } = useRxData<SubDoc>('subs', (c) =>
    c.find({ selector: { id: post?.subId ?? '' } }),
  );

  const sub = (subs as unknown as SubDoc[])[0];

  const { result: comments } = useRxData<CommentDoc>(
    'comments',
    (collection) =>
      collection.find({
        selector: { postId: id },
        sort: [{ createdAt: 'asc' }],
      }),
  );

  if (loadingPost && !post) return <p>Loading...</p>;
  if (!post) return <p>Post not found. <Link to="/">Go home</Link></p>;

  return (
    <div>
      <Link to={sub ? `/s/${sub.name}` : '/'} className="back-link">
        &larr; {sub ? `Back to ${sub.name}` : 'Back to posts'}
      </Link>
      <article className="post-detail">
        <h1>{post.title}</h1>
        <p className="post-meta">
          {sub && (
            <>
              <Link to={`/s/${sub.name}`} className="post-sub-badge">{sub.name}</Link>
              {' '}&middot;{' '}
            </>
          )}
          by <Link to={`/profile/${post.authorId}`}>{post.authorName}</Link> &middot; {new Date(post.createdAt).toLocaleDateString()}
        </p>
        <div className="post-body">
          <MarkdownRenderer content={post.body} />
        </div>
        <AttachmentDisplay parentId={post.id} />
      </article>
      <section className="comments-section">
        <h2>Comments ({(comments as unknown as CommentDoc[]).length})</h2>
        <CommentForm postId={post.id} />
        <CommentList comments={comments as unknown as CommentDoc[]} />
      </section>
    </div>
  );
}
