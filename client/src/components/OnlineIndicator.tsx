import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OnlineIndicator() {
  const online = useOnlineStatus();

  return (
    <span className={`online-indicator ${online ? 'online' : 'offline'}`}>
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
