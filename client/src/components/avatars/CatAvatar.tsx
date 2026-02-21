export function CatAvatar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1 0-2.5.5-3.5 1L7 1v4.5C5.2 7.3 4 9.5 4 12c0 4.4 3.6 8 8 8s8-3.6 8-8c0-2.5-1.2-4.7-3-6.5V1l-1.5 2c-1-.5-2.5-1-3.5-1zm-2.5 9a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 15c-1 0-1.8-.3-2-.5.4.8 1.1 1.5 2 1.5s1.6-.7 2-1.5c-.2.2-1 .5-2 .5z" />
    </svg>
  );
}
