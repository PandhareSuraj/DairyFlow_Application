import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import React from 'react';

// Suppress console.error for expected errors
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

function ThrowingComponent(): React.ReactElement {
  throw new Error('Test error');
}

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

vi.mock('@/lib/error-tracking', () => ({
  trackError: vi.fn(),
}));

describe('ErrorBoundary', () => {
  afterEach(() => consoleSpy.mockClear());

  it('renders children when no error', () => {
    render(
      <ErrorBoundary><div>Safe content</div></ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
    );
    expect(screen.getByText('errors.somethingWentWrong')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});
