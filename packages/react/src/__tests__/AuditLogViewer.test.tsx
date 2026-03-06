import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditLogViewer } from '../components/AuditLogViewer.js';
import type { AuditEvent } from '@logseal/viewer-core';

function makeEvent(id: string, action = 'user.created'): AuditEvent {
  return {
    id,
    action,
    occurred_at: '2026-03-03T12:00:00Z',
    received_at: '2026-03-03T12:00:01Z',
    actor: { id: 'actor_1', type: 'user', name: 'Jane Doe' },
    targets: [{ type: 'document', id: 'doc_1', name: 'Report' }],
    metadata: { key: 'value' },
    context: { ip_address: '127.0.0.1' },
    event_hash: 'abc123',
    object: 'event',
  };
}

function mockFetchSuccess(events: AuditEvent[] = [makeEvent('evt_1')]) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/actions')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ data: ['user.created', 'user.updated'], object: 'list' }),
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: events,
          has_more: false,
          object: 'list',
        }),
    });
  });
}

describe('AuditLogViewer', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders loading state initially', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditLogViewer token="vtk_test" />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders events in a table after loading', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Audit log events' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('user.created').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });

  it('renders empty state when no events', async () => {
    globalThis.fetch = mockFetchSuccess([]);
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByText('No events yet.')).toBeInTheDocument();
    });
  });

  it('renders error state on failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('renders filter bar with actions', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Actor')).toBeInTheDocument();
  });

  it('applies custom classNames', async () => {
    globalThis.fetch = mockFetchSuccess();
    const { container } = render(
      <AuditLogViewer token="vtk_test" classNames={{ root: 'my-custom-root' }} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    expect(container.querySelector('.my-custom-root')).toBeInTheDocument();
  });

  it('renders custom emptyState', async () => {
    globalThis.fetch = mockFetchSuccess([]);
    render(
      <AuditLogViewer
        token="vtk_test"
        emptyState={<div data-testid="custom-empty">Custom empty</div>}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });
  });

  it('uses custom components when provided', async () => {
    globalThis.fetch = mockFetchSuccess();

    function CustomFilterBar() {
      return <div data-testid="custom-filter">Custom filter</div>;
    }

    render(
      <AuditLogViewer
        token="vtk_test"
        components={{ FilterBar: CustomFilterBar as any }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('custom-filter')).toBeInTheDocument();
    });
  });

  it('renders header by default with title', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditLogViewer token="vtk_test" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Audit Log');
  });

  it('renders header with custom title and organization', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditLogViewer token="vtk_test" title="Events" organization="Acme Corp" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Events');
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('hides header when showHeader is false', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditLogViewer token="vtk_test" showHeader={false} />);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('renders footer by default', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditLogViewer token="vtk_test" />);
    expect(screen.getByText('LogSeal')).toBeInTheDocument();
  });

  it('hides footer when showBranding is false', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AuditLogViewer token="vtk_test" showBranding={false} />);
    expect(screen.queryByText('LogSeal')).not.toBeInTheDocument();
  });

  it('renders action badges in table', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const badge = screen.getByText('user.created', { selector: '.logseal-action-badge' });
    expect(badge).toBeInTheDocument();
  });

  it('allows custom Header component override', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    function CustomHeader() {
      return <div data-testid="custom-header">My Header</div>;
    }

    render(
      <AuditLogViewer
        token="vtk_test"
        components={{ Header: CustomHeader as any }}
      />,
    );

    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('opens popover when row is clicked', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jane Doe'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Event details' })).toBeInTheDocument();
    });
  });

  it('closes popover on Escape key', async () => {
    globalThis.fetch = mockFetchSuccess();
    render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Jane Doe'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes popover when clicking same row again', async () => {
    globalThis.fetch = mockFetchSuccess();
    const { container } = render(<AuditLogViewer token="vtk_test" />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Click to open
    const row = container.querySelector('.logseal-row') as HTMLElement;
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click same row again to close
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
