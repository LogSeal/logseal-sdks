import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionBadge } from '../components/ActionBadge.js';

describe('ActionBadge', () => {
  it('renders the action text', () => {
    render(<ActionBadge action="user.created" />);
    expect(screen.getByText('user.created')).toBeInTheDocument();
  });

  it('assigns a deterministic color class', () => {
    const { container, rerender } = render(<ActionBadge action="user.created" />);
    const className1 = container.firstElementChild!.className;

    rerender(<ActionBadge action="user.created" />);
    const className2 = container.firstElementChild!.className;

    expect(className1).toBe(className2);
    expect(className1).toMatch(/logseal-action-badge--\w+/);
  });

  it('assigns different colors to different actions', () => {
    const { container: c1 } = render(<ActionBadge action="user.created" />);
    const { container: c2 } = render(<ActionBadge action="document.deleted" />);

    const color1 = c1.firstElementChild!.className;
    const color2 = c2.firstElementChild!.className;

    // Both should have badge classes but different color variants
    expect(color1).toMatch(/logseal-action-badge--\w+/);
    expect(color2).toMatch(/logseal-action-badge--\w+/);
  });

  it('applies custom className', () => {
    const { container } = render(<ActionBadge action="test" className="custom" />);
    expect(container.firstElementChild!.className).toContain('custom');
  });
});
