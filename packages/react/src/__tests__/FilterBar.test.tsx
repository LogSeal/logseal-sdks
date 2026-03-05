import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../components/FilterBar.js';

describe('FilterBar', () => {
  const defaultProps = {
    actions: ['user.created', 'user.updated', 'user.deleted'],
    filters: {},
    onFiltersChange: vi.fn(),
  };

  it('renders react-select action dropdown', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('All actions')).toBeInTheDocument();
  });

  it('renders actor text input', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByLabelText('Actor')).toBeInTheDocument();
  });

  it('renders date range button', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /date range/i })).toBeInTheDocument();
  });

  it('calls onFiltersChange when action is selected', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar {...defaultProps} onFiltersChange={onFiltersChange} />);

    // Click on the react-select control to open menu
    const selectControl = screen.getByText('All actions');
    await user.click(selectControl);

    // Click on an option
    const option = await screen.findByText('user.created');
    await user.click(option);

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

  it('opens date range popover on button click', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...defaultProps} />);

    const dateButton = screen.getByRole('button', { name: /date range/i });
    await user.click(dateButton);

    expect(screen.getByRole('dialog', { name: /select date range/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FilterBar {...defaultProps} className="custom-filter" />,
    );

    expect(container.querySelector('.custom-filter')).toBeInTheDocument();
  });

  it('renders mobile toggle button', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /toggle filters/i })).toBeInTheDocument();
  });

  it('toggles fields visibility on mobile toggle click', () => {
    const { container } = render(<FilterBar {...defaultProps} />);
    const toggle = screen.getByRole('button', { name: /toggle filters/i });

    expect(container.querySelector('.logseal-filter-bar--open')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(container.querySelector('.logseal-filter-bar--open')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(container.querySelector('.logseal-filter-bar--open')).not.toBeInTheDocument();
  });

  it('shows active filter dot when hasActiveFilters is true', () => {
    const { container } = render(
      <FilterBar {...defaultProps} hasActiveFilters={true} />,
    );
    expect(container.querySelector('.logseal-filter-bar__dot')).toBeInTheDocument();
  });

  it('renders search input when onSearchChange is provided', () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar {...defaultProps} searchQuery="" onSearchChange={onSearchChange} />,
    );
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('does not render search input when onSearchChange is not provided', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar {...defaultProps} searchQuery="" onSearchChange={onSearchChange} />,
    );

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'jane' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('jane');
  });
});
