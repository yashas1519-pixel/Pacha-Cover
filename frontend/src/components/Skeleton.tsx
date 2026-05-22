interface SkeletonProps {
  variant?: 'text' | 'card' | 'map' | 'circle';
  width?: string;
  height?: string;
  count?: number;
}

export function Skeleton({ variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`skeleton skeleton--${variant}`}
          style={{
            width: width || undefined,
            height: height || undefined,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="circle" width="48px" height="48px" />
      <div className="skeleton-card__content">
        <Skeleton variant="text" width="60%" height="16px" />
        <Skeleton variant="text" width="80%" height="14px" />
        <Skeleton variant="text" width="40%" height="14px" />
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="skeleton-map">
      <Skeleton variant="map" width="100%" height="400px" />
    </div>
  );
}
