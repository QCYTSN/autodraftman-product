import { useId } from "react";

type FigFoxMarkProps = {
  className?: string;
  title?: string;
};

export function FigFoxMark({ className, title }: FigFoxMarkProps) {
  const labelled = Boolean(title);
  const gradientId = useId().replaceAll(":", "");
  const tailGradient = `figfox-tail-${gradientId}`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id={tailGradient} x1="12" y1="55" x2="57" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#431ca9" />
          <stop offset="0.58" stopColor="#6335e3" />
          <stop offset="1" stopColor="#a48cff" />
        </linearGradient>
      </defs>
      <g transform="translate(-3 -7) scale(1.1)">
        <path
          className="figfox-mark-tail"
          d="M43.4 29.5c8.8 1.1 12.7-2.8 14.7-6.8 4.2 13.2-.1 25.8-9.2 32.5-9.7 7.1-25.8 4.6-37.8-2.9 2.4-7.3 8.7-13.3 18.3-16.2-7.9 1.3-14.5 5.6-18.6 12 1.3-10.2 11.8-16.9 23.6-17 3.5 0 6.4-.4 9-1.6Z"
          fill={`url(#${tailGradient})`}
          stroke="#2c1745"
          strokeLinejoin="round"
          strokeWidth="1.15"
        />
        <path
          d="M14.5 50.2c7.5-7 16.7-12.3 27.5-16.2-8.6 5.8-16.2 12.4-22.3 19.1Z"
          fill="#f2672e"
        />
        <path
          d="M20 47.4c6.6-6 13.9-10.4 21.7-13.1"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="1.35"
        />
        <path
          d="M24.4 50.3c4.8-4.4 9.8-8 15.2-10.8"
          fill="none"
          stroke="#cfc3ff"
          strokeLinecap="round"
          strokeWidth="0.95"
        />
      </g>
    </svg>
  );
}

export function FigFoxWordmark({ className }: { className?: string }) {
  return (
    <span className={className} aria-label="FigFox">
      FigFox
    </span>
  );
}
