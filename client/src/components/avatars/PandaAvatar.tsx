export function PandaAvatar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C7.6 2 4 5.6 4 10v2c0 4.4 3.6 8 8 8s8-3.6 8-8v-2c0-4.4-3.6-8-8-8zM7 9c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3zm4 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm3-4c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm1 4a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm-3 5c-1 0-1.5-.3-1.5-.3.2.6.8 1.3 1.5 1.3s1.3-.7 1.5-1.3c0 0-.5.3-1.5.3z" />
    </svg>
  );
}
