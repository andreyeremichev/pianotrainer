// Simple, crisp treble clef icon.
// No hooks → server component by default (fine for icons).
// Size via `size` prop; color inherits from `currentColor`.

type Props = {
  size?: number;        // px, default 18
  strokeWidth?: number; // px, default 1.6
};

export default function TrebleClef({ size = 18, strokeWidth = 1.6 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      {/* A small stylized treble-clef path; tuned for tiny rendering */}
      <path
        d="
          M12 2
          C10.8 2, 10 2.9, 10 4
          C10 5.1, 10.8 6, 12 6
          C13.2 6, 14 5.1, 14 4
          C14 2.2, 12.6 1, 11 1

          M12 6
          L12 17

          M12 9.5
          C9.6 9.5, 8 11.1, 8 13
          C8 14.9, 9.6 16.5, 12 16.5
          C14.4 16.5, 16 14.9, 16 13
          C16 11.1, 14.4 9.5, 12 9.5

          M12 17
          C9.5 17, 8 18.2, 8 19.5
          C8 20.8, 9.5 22, 12 22
          C14.5 22, 16 20.8, 16 19.5
          C16 18.2, 14.5 17, 12 17
        "
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}