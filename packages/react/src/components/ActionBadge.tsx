import type { ActionBadgeProps } from '../types.js';

export const BADGE_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'yellow',
  'pink',
  'teal',
  'red',
] as const;

/** Map action prefixes to semantic colors */
const PREFIX_COLORS: Record<string, (typeof BADGE_COLORS)[number]> = {
  user: 'blue',
  document: 'green',
  api: 'orange',
  settings: 'purple',
  billing: 'yellow',
  team: 'pink',
  export: 'teal',
};

/** djb2 hash → deterministic color index (fallback) */
function hashAction(action: string): number {
  let hash = 5381;
  for (let i = 0; i < action.length; i++) {
    hash = (hash * 33) ^ action.charCodeAt(i);
  }
  return Math.abs(hash) % BADGE_COLORS.length;
}

export function getBadgeColor(action: string): (typeof BADGE_COLORS)[number] {
  const prefix = action.split('.')[0];
  return PREFIX_COLORS[prefix] || BADGE_COLORS[hashAction(action)];
}

export function ActionBadge({ action, className }: ActionBadgeProps) {
  const color = getBadgeColor(action);
  return (
    <span
      className={`logseal-action-badge logseal-action-badge--${color} ${className || ''}`}
    >
      {action}
    </span>
  );
}
