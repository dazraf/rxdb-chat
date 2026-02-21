export function OwlAvatar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C7 2 4 5 4 9v4c0 4.4 3.6 8 8 8s8-3.6 8-8V9c0-4-3-7-8-7zM8.5 9a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm7 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8.5 10.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 16l-1-1h2l-1 1z" />
    </svg>
  );
}
