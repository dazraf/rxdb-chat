import { useRef, useEffect, useCallback } from 'react';

export function useInfiniteScroll(loadMore: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (node && enabled) {
        observerRef.current = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              loadMore();
            }
          },
          { rootMargin: '200px' },
        );
        observerRef.current.observe(node);
      }

      sentinelRef.current = node;
    },
    [loadMore, enabled],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return setRef;
}
