import { Link } from 'react-router-dom';
import { useRxData, useRxCollection } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import { resubscribe, unsubscribe } from '../database/subscription-helpers';
import type { SubDoc, SubscriptionDoc } from 'shared/schemas';

export function SubListPage() {
  const { user } = useAuth();
  const subCollection = useRxCollection<SubscriptionDoc>('subscriptions');

  const { result: subs, isFetching } = useRxData<SubDoc>('subs', (c) =>
    c.find({ sort: [{ name: 'asc' }] }),
  );

  const { result: subscriptions } = useRxData<SubscriptionDoc>(
    'subscriptions',
    (c) =>
      c.find({
        selector: { userId: user?.id ?? '' },
      }),
  );

  const subscribedIds = new Set(
    (subscriptions as unknown as SubscriptionDoc[]).map((s) => s.subId),
  );

  async function toggleSubscription(sub: SubDoc) {
    if (!user || !subCollection) return;
    const subId = sub.id;
    const isSubscribed = subscribedIds.has(subId);

    if (isSubscribed) {
      await unsubscribe(subCollection, user.id, subId);
    } else {
      await resubscribe(subCollection, user.id, subId);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>All Subs</h1>
        <Link to="/create-sub" className="btn">
          Create Sub
        </Link>
      </div>
      {isFetching && subs.length === 0 && <p>Loading...</p>}
      {!isFetching && subs.length === 0 && <p>No subs yet.</p>}
      {(subs as unknown as SubDoc[]).map((sub) => (
        <div key={sub.id} className="sub-card">
          <div className="sub-card-info">
            <Link to={`/s/${sub.name}`} className="sub-card-name">
              {sub.name}
            </Link>
            {sub.description && (
              <p className="sub-card-desc">{sub.description.slice(0, 120)}{sub.description.length > 120 ? '...' : ''}</p>
            )}
          </div>
          <button
            className={`btn btn-sm ${subscribedIds.has(sub.id) ? 'btn-outline' : ''}`}
            onClick={() => toggleSubscription(sub)}
          >
            {subscribedIds.has(sub.id) ? 'Unsubscribe' : 'Subscribe'}
          </button>
        </div>
      ))}
    </div>
  );
}
