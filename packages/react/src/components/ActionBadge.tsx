import type { ActionBadgeProps } from '../types.js';

const BADGE_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'yellow',
  'pink',
  'teal',
  'red',
] as const;

/** djb2 hash → deterministic color index */
function hashAction(action: string): number {
  let hash = 5381;
  for (let i = 0; i < action.length; i++) {
    hash = (hash * 33) ^ action.charCodeAt(i);
  }
  return Math.abs(hash) % BADGE_COLORS.length;
}

export function ActionBadge({ action, className }: ActionBadgeProps) {
  const color = BADGE_COLORS[hashAction(action)];
  return (
    <span
      className={`logseal-action-badge logseal-action-badge--${color} ${className || ''}`}
    >
      {action}
    </span>
  );
}
