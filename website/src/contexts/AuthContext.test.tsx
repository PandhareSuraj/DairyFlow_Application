import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

function TestConsumer() {
  const { user, isLoading } = useAuth();
  return <div>{isLoading ? 'loading' : user ? user.name : 'no user'}</div>;
}

describe('AuthContext', () => {
  it('resolves to no user when no session exists', async () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    expect(await screen.findByText('no user')).toBeInTheDocument();
  });

  it('provides auth context to children', () => {
    const { container } = render(
      <AuthProvider><div>child</div></AuthProvider>
    );
    expect(container.textContent).toBe('child');
  });
});
