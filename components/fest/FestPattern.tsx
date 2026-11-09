import React from 'react';

/**
 * Khatam tile: two overlapping squares (one turned 45°) that read as an
 * eight-point star when repeated. Colour comes from `currentColor`.
 */
export function TilePattern({ id, className = '' }: { id: string; className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="72" height="72" patternUnits="userSpaceOnUse">
          <rect x="12" y="12" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect
            x="12"
            y="12"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            transform="rotate(45 36 36)"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Solid eight-point star. */
export function Star({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon
        fill="currentColor"
        points="50,4 61,27 85,15 73,39 96,50 73,61 85,85 61,73 50,96 39,73 15,85 27,61 4,50 27,39 15,15 39,27"
      />
    </svg>
  );
}
