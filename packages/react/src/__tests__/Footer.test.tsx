import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../components/Footer.js';

describe('Footer', () => {
  it('renders branding text', () => {
    render(<Footer />);
    expect(screen.getByText(/powered by/i)).toBeInTheDocument();
    expect(screen.getByText('LogSeal')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Footer className="custom-footer" />);
    expect(container.firstElementChild!.className).toContain('custom-footer');
  });
});
