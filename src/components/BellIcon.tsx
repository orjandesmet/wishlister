import { Icon } from "./Icon.tsx";
/** Lucide "bell" (ISC licence); filled when `filled`. */
export function BellIcon(props: { filled?: boolean }) {
  return (
    <Icon strokeWidth={1.75} filled={props.filled}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  );
}
