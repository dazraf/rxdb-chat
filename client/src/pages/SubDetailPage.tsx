import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRxData, useRxCollection } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import { PostCard } from '../components/PostCard';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { resubscribe, unsubscribe } from '../database/subscription-helpers';
import { POSTS_PAGE_SIZE } from 'shared/constants';
import type { SubDoc, SubscriptionDoc, PostDoc } from 'shared/schemas';

export function SubDetailPage() {
  const { subName } = useParams<{ subName: string }>();
  const { user } = useAuth();
  const subscriptionCollection = useRxCollection<SubscriptionDoc>('subscriptions');
  const [limit, setLimit] = useState(POSTS_PAGE_SIZE);

  const { result: subs, isFetching: loadingSub } = useRxData<SubDoc>('subs', (c) =>
    c.find({ selector: { name: subName } }),
  );

  const sub = (subs as unknown as SubDoc[])[0];

  const { result: subscriptions } = useRxData<SubscriptionDoc>(
    'subscriptions',
    (c) =>
      c.find({
        selector: { userId: user?.id ?? '', subId: sub?.id ?? '' },
      }),
  );

  const isSubscribed = (subscriptions as unknown as SubscriptionDoc[]).length > 0;

  const { result: posts } = useRxData<PostDoc>('posts', (c) =>
    c.find({
      selector: { subId: sub?.id ?? '' },
      sort: [{ createdAt: 'desc' }],
      limit,
    }),
  );

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + POSTS_PAGE_SIZE);
  }, []);

  const hasMore = (posts as unknown as PostDoc[]).length >= limit;
  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  async function toggleSubscription() {
    if (!user || !subscriptionCollection || !sub) return;

    if (isSubscribed) {
      await unsubscribe(subscriptionCollection, user.id, sub.id);
    } else {
      await resubscribe(subscriptionCollection, user.id, sub.id);
    }
  }

  if (loadingSub && !sub) return <p>Loading...</p>;
  if (!sub) return <p>Sub not found. <Link to="/subs">Browse subs</Link></p>;

  return (
    <div>
      <div className="sub-header">
        <div>
          <h1>{sub.name}</h1>
          {sub.description && (
            <div className="sub-description">
              <MarkdownRenderer content={sub.description} />
            </div>
          )}
        </div>
        <div className="sub-header-actions">
          <button
            className={`btn ${isSubscribed ? 'btn-outline' : ''}`}
            onClick={toggleSubscription}
          >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
          </button>
          <Link to="/create" state={{ subId: sub.id }} className="btn">
            New Post
          </Link>
        </div>
      </div>
      {(posts as unknown as PostDoc[]).length === 0 && (
        <p>No posts yet in this sub.</p>
      )}
      {(posts as unknown as PostDoc[]).map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && <div ref={sentinelRef} className="scroll-sentinel" />}
    </div>
  );
}
