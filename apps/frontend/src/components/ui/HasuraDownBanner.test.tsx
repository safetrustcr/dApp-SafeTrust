// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { act } from 'react';

import { HasuraDownBanner } from './HasuraDownBanner';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function unhealthy() {
  return { ok: false, status: 503 } as unknown as Response;
}

function healthy() {
  return { ok: true, status: 200 } as unknown as Response;
}

describe('HasuraDownBanner', () => {
  it('performs an initial health check immediately after mounting', async () => {
    mockFetch.mockResolvedValueOnce(healthy());

    render(<HasuraDownBanner />);
    await act(async () => {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/health/hasura',
      expect.anything(),
    );
  });

  it('displays when the health endpoint reports unhealthy', async () => {
    mockFetch.mockResolvedValueOnce(unhealthy());

    render(<HasuraDownBanner />);
    await act(async () => {});

    expect(screen.getByText('Hasura is not running')).toBeTruthy();
  });

  it('displays the exact startup command', async () => {
    mockFetch.mockResolvedValueOnce(unhealthy());

    render(<HasuraDownBanner />);
    await act(async () => {});

    expect(
      screen.getByText(
        'cd infra/backend && bin/start safetrust hotel_industry',
      ),
    ).toBeTruthy();
  });

  it('hides when Hasura becomes healthy again without reloading', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValueOnce(unhealthy());

    render(<HasuraDownBanner />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('Hasura is not running')).toBeTruthy();

    mockFetch.mockResolvedValue(healthy());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.queryByText('Hasura is not running')).toBeNull();
  });

  it('polls the health endpoint every 5 seconds', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(healthy());

    render(<HasuraDownBanner />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('cleans up the polling interval on unmount', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(healthy());

    const { unmount } = render(<HasuraDownBanner />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not render when the health endpoint is healthy', async () => {
    mockFetch.mockResolvedValueOnce(healthy());

    render(<HasuraDownBanner />);
    await act(async () => {});

    expect(screen.queryByText('Hasura is not running')).toBeNull();
  });
});
