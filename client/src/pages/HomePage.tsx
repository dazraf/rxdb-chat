import { Link } from 'react-router-dom';
import { useRxData } from 'rxdb-hooks';
import { PostCard } from '../components/PostCard';
import type { PostDoc } from 'shared/schemas';

export function HomePage() {
  const { result: posts, isFetching } = useRxData<PostDoc>('posts', (collection) =>
    collection.find({ sort: [{ createdAt: 'desc' }] }),
  );

  return (
    <div>
      <div className="page-header">
        <h1>Posts</h1>
        <Link to="/create" className="btn">
          New Post
        </Link>
      </div>
      {isFetching && posts.length === 0 && <p>Loading...</p>}
      {!isFetching && posts.length === 0 && <p>No posts yet. Be the first to post!</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post as unknown as PostDoc} />
      ))}
    </div>
  );
}
