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
  it('renders table headers', () => {
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Actor')).toBeInTheDocument();
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

  it('shows event detail when row is expanded', () => {
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId="evt_1"
        onToggle={vi.fn()}
      />,
    );

    // EventDetail renders actor info
    expect(screen.getByText('actor_1')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    const onToggle = vi.fn();
    render(
      <EventTable
        events={[makeEvent('evt_1')]}
        columns={columns}
        expandedId={null}
        onToggle={onToggle}
      />,
    );

    const row = screen.getByRole('button');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith('evt_1');
  });
});
