import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useRxData } from 'rxdb-hooks';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../auth/AuthContext';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { POSTS_PAGE_SIZE } from 'shared/constants';
import type { PostDoc, SubscriptionDoc, SubDoc } from 'shared/schemas';

export function HomePage() {
  const { user } = useAuth();
  const [feedMode, setFeedMode] = useState<'subscribed' | 'all'>('subscribed');
  const [limit, setLimit] = useState(POSTS_PAGE_SIZE);

  const { result: subscriptions } = useRxData<SubscriptionDoc>(
    'subscriptions',
    (c) =>
      c.find({
        selector: { userId: user?.id ?? '' },
      }),
  );

  const subscribedSubIds = (subscriptions as unknown as SubscriptionDoc[]).map((s) => s.subId);

  const { result: allSubs } = useRxData<SubDoc>('subs', (c) =>
    c.find({}),
  );

  const subsMap = new Map<string, SubDoc>();
  for (const s of allSubs) {
    const sub = s as unknown as SubDoc;
    subsMap.set(sub.id, sub);
  }

  const { result: posts, isFetching } = useRxData<PostDoc>('posts', (collection) => {
    if (feedMode === 'subscribed' && subscribedSubIds.length > 0) {
      return collection.find({
        selector: {
          subId: { $in: subscribedSubIds },
        },
        sort: [{ createdAt: 'desc' }],
        limit,
      });
    }
    return collection.find({
      sort: [{ createdAt: 'desc' }],
      limit,
    });
  });

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + POSTS_PAGE_SIZE);
  }, []);

  const hasMore = (posts as unknown as PostDoc[]).length >= limit;
  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  return (
    <div>
      <div className="page-header">
        <h1>Posts</h1>
        <Link to="/create" className="btn">
          New Post
        </Link>
      </div>
      <div className="feed-toggle">
        <button
          className={feedMode === 'subscribed' ? 'active' : ''}
          onClick={() => { setFeedMode('subscribed'); setLimit(POSTS_PAGE_SIZE); }}
        >
          Subscribed
        </button>
        <button
          className={feedMode === 'all' ? 'active' : ''}
          onClick={() => { setFeedMode('all'); setLimit(POSTS_PAGE_SIZE); }}
        >
          All
        </button>
      </div>
      {isFetching && posts.length === 0 && <p>Loading...</p>}
      {!isFetching && posts.length === 0 && (
        <p>
          {feedMode === 'subscribed'
            ? 'No posts from your subscribed subs. Try browsing all or subscribe to more subs!'
            : 'No posts yet. Be the first to post!'}
        </p>
      )}
      {(posts as unknown as PostDoc[]).map((post) => (
        <PostCard
          key={post.id}
          post={post}
          subName={subsMap.get(post.subId)?.name}
        />
      ))}
      {hasMore && <div ref={sentinelRef} className="scroll-sentinel" />}
    </div>
  );
}
