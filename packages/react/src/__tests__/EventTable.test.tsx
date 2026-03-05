import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventTable } from '../components/EventTable.js';
import type { AuditEvent } from '@logseal/viewer-core';
import type { ColumnDef } from '../types.js';

function makeEvent(id: string, action = 'user.created'): AuditEvent {
  return {
    id,
    action,
    occurred_at: '2026-03-03T12:00:00Z',
    received_at: '2026-03-03T12:00:01Z',
    actor: { id: 'actor_1', type: 'user', name: 'Test User' },
    targets: [{ type: 'document', id: 'doc_1', name: 'Doc' }],
    metadata: {},
    context: {},
    event_hash: 'hash_' + id,
    object: 'event',
  };
}

const columns: ColumnDef[] = [
  { key: 'action', header: 'Action', render: (e) => e.action },
  { key: 'actor', header: 'Actor', render: (e) => e.actor.name || e.actor.id },
];

describe('EventTable', () => {
  it('renders table with aria-label', () => {
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('table', { name: 'Audit log events' })).toBeInTheDocument();
  });

  it('renders header cells with scope="col"', () => {
    const { container } = render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={vi.fn()}
      />,
    );

    const ths = container.querySelectorAll('th');
    ths.forEach((th) => expect(th).toHaveAttribute('scope', 'col'));
  });

  it('always renders visible headers', () => {
    const { container } = render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={vi.fn()}
      />,
    );

    const headerRow = container.querySelector('.logseal-header-row');
    expect(headerRow).toBeInTheDocument();
    const ths = headerRow!.querySelectorAll('th');
    expect(ths.length).toBe(columns.length);
  });

  it('renders event rows', () => {
    render(
      <EventTable
        events={[makeEvent('evt_1'), makeEvent('evt_2', 'user.deleted')]}
        columns={columns}
        expandedId={null}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('user.created')).toBeInTheDocument();
    expect(screen.getByText('user.deleted')).toBeInTheDocument();
  });

  it('calls onToggle when row is clicked', () => {
    const onToggle = vi.fn();
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByText('user.created'));
    expect(onToggle).toHaveBeenCalledWith('evt_1');
  });

  it('does not render inline detail row (no role="button")', () => {
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId="evt_1"
        onToggle={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks selected row with aria-selected', () => {
    const { container } = render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId="evt_1"
        onToggle={vi.fn()}
      />,
    );

    const row = container.querySelector('.logseal-row--expanded');
    expect(row).toHaveAttribute('aria-selected', 'true');
  });

  it('supports keyboard navigation with Enter', () => {
    const onToggle = vi.fn();
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={onToggle}
      />,
    );

    const row = screen.getByRole('row', { name: 'user.created' });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith('evt_1');
  });

  it('adds has-selection class when a row is expanded', () => {
    const { container } = render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId="evt_1"
        onToggle={vi.fn()}
      />,
    );

    expect(container.querySelector('.logseal-table--has-selection')).toBeInTheDocument();
  });
});
