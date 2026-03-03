import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../components/FilterBar.js';

describe('FilterBar', () => {
  const defaultProps = {
    actions: ['user.created', 'user.updated', 'user.deleted'],
    filters: {},
    onFiltersChange: vi.fn(),
  };

  it('renders action select with all options', () => {
    render(<FilterBar {...defaultProps} />);

    const select = screen.getByLabelText('Action') as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // "All actions" + 3 action options
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(4);
  });

  it('renders actor text input', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByLabelText('Actor')).toBeInTheDocument();
  });

  it('renders date range inputs', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('calls onFiltersChange when action changes', () => {
    const onFiltersChange = vi.fn();
    render(<FilterBar {...defaultProps} onFiltersChange={onFiltersChange} />);

    fireEvent.change(screen.getByLabelText('Action'), {
      target: { value: 'user.created' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.created' }),
    );
  });

  it('calls onFiltersChange when actor changes', () => {
    const onFiltersChange = vi.fn();
    render(<FilterBar {...defaultProps} onFiltersChange={onFiltersChange} />);

    fireEvent.change(screen.getByLabelText('Actor'), {
      target: { value: 'user_123' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user_123' }),
    );
  });

  it('clears filter when action reset to empty', () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        filters={{ action: 'user.created' }}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Action'), {
      target: { value: '' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: undefined }),
    );
  });

  it('reflects current filter values', () => {
    render(
      <FilterBar
        {...defaultProps}
        filters={{ action: 'user.updated', actorId: 'actor_1' }}
      />,
    );

    expect((screen.getByLabelText('Action') as HTMLSelectElement).value).toBe(
      'user.updated',
    );
    expect((screen.getByLabelText('Actor') as HTMLInputElement).value).toBe('actor_1');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FilterBar {...defaultProps} className="custom-filter" />,
    );

    expect(container.querySelector('.custom-filter')).toBeInTheDocument();
  });
});
