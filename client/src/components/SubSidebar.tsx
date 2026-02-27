import { Link, useLocation } from 'react-router-dom';
import { useRxData } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import type { SubscriptionDoc, SubDoc } from 'shared/schemas';

export function SubSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const location = useLocation();

  const { result: subscriptions } = useRxData<SubscriptionDoc>(
    'subscriptions',
    (c) =>
      c.find({
        selector: { userId: user?.id ?? '' },
      }),
  );

  const { result: allSubs } = useRxData<SubDoc>('subs', (c) =>
    c.find({ sort: [{ name: 'asc' }] }),
  );

  // Map subId -> SubDoc for quick lookup
  const subsMap = new Map<string, SubDoc>();
  for (const s of allSubs) {
    const sub = s as unknown as SubDoc;
    subsMap.set(sub.id, sub);
  }

  // Get subscribed sub names
  const subscribedSubs = (subscriptions as unknown as SubscriptionDoc[])
    .map((sub) => subsMap.get(sub.subId))
    .filter((s): s is SubDoc => !!s)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sub-sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Subs</h3>
        </div>
        <nav className="sidebar-nav">
          {subscribedSubs.length === 0 && (
            <p className="sidebar-empty">No subscriptions yet.</p>
          )}
          {subscribedSubs.map((sub) => (
            <Link
              key={sub.id}
              to={`/s/${sub.name}`}
              className={`sidebar-link ${location.pathname === `/s/${sub.name}` ? 'active' : ''}`}
              onClick={onClose}
            >
              {sub.name}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/subs" className="sidebar-link" onClick={onClose}>
            Browse All
          </Link>
          <Link to="/create-sub" className="sidebar-link" onClick={onClose}>
            + Create Sub
          </Link>
        </div>
      </aside>
    </>
  );
}
