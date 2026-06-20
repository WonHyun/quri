import { useId } from "react";

/**
 * Quri brand mark — a rounded "spark" droplet (curiosity) wrapped by a quiz "Q" arc.
 * Uses a unique gradient id per instance so multiple marks can coexist.
 */
export function QuriMark({ size = 28 }: { size?: number }) {
  const id = useId();
  const grad = `quri-grad-${id}`;
  const spark = `quri-spark-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Quri"
    >
      <defs>
        <linearGradient id={grad} x1="4" y1="3" x2="28" y2="29">
          <stop offset="0" stopColor="var(--brand-1)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
        <linearGradient id={spark} x1="11" y1="8" x2="22" y2="24">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {/* Q ring */}
      <path
        d="M16 3.2c7.07 0 12.8 5.73 12.8 12.8 0 3.2-1.17 6.12-3.1 8.37l2.5 2.5a1.6 1.6 0 1 1-2.26 2.26l-2.62-2.62A12.74 12.74 0 0 1 16 28.8C8.93 28.8 3.2 23.07 3.2 16S8.93 3.2 16 3.2Zm0 4.3a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z"
        fill={`url(#${grad})`}
      />
      {/* curiosity spark */}
      <path
        d="M16 9.4c.5 2.46 1.34 3.3 3.8 3.8-2.46.5-3.3 1.34-3.8 3.8-.5-2.46-1.34-3.3-3.8-3.8 2.46-.5 3.3-1.34 3.8-3.8Z"
        fill={`url(#${spark})`}
      />
    </svg>
  );
}

/** Full logo lockup: mark + wordmark. */
export function QuriLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo-lockup">
      <QuriMark size={size} />
      <span className="logo-word">Quri</span>
    </span>
  );
}
