import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/Header.js';

describe('Header', () => {
  it('renders the title', () => {
    render(<Header title="Audit Log" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Audit Log');
  });

  it('renders the organization when provided', () => {
    render(<Header title="Audit Log" organization="Acme Corp" />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('does not render organization when omitted', () => {
    const { container } = render(<Header title="Audit Log" />);
    expect(container.querySelector('.logseal-header__org')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Header title="Test" className="custom-header" />);
    expect(container.firstElementChild!.className).toContain('custom-header');
  });
});
