export function FoxAvatar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2L3 8c0 2 1 3.5 2.5 4.5C5 13.5 5 14 5 15c0 3.9 3.1 7 7 7s7-3.1 7-7c0-1 0-1.5-.5-2.5C20 11.5 21 10 21 8l-3-6-3 4h-6L6 2zM9.5 11a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 16c-.8 0-1.5-.5-1.5-.5l1.5 1 1.5-1s-.7.5-1.5.5z" />
    </svg>
  );
}
