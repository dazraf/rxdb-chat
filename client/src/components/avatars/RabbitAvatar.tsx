export function RabbitAvatar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 1C7 1 6 2 6 4v4.5C4.8 9.8 4 11.3 4 13c0 3.9 3.6 7 8 7s8-3.1 8-7c0-1.7-.8-3.2-2-4.5V4c0-2-1-3-2-3s-2 1.5-2 3v3.5c-.6-.3-1.3-.5-2-.5s-1.4.2-2 .5V4c0-1.5-1-3-2-3zm1.5 11a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 17c-.8 0-1.5-.5-1.5-.5l1.5 1 1.5-1s-.7.5-1.5.5z" />
    </svg>
  );
}
