// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { onAuthStateChanged, fetchNotifications } = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  fetchNotifications: vi.fn(),
}));

vi.mock('firebase/auth', () => ({ onAuthStateChanged }));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('@/lib/api/notifications', () => ({ fetchNotifications }));

import { useNotifications } from './use-notifications';

const item = (id: string) => ({ id, type: 'alert' as const, message: id, timestamp: '2026-11-01T00:00:00.000Z', read: false, kind: 'event' as const });

let emitAuth: (user: unknown) => void;
const unsubscribe = vi.fn();

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    onAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      emitAuth = cb;
      return unsubscribe;
    });
    fetchNotifications.mockResolvedValue([item('a')]);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not call the API before a user is signed in', async () => {
    renderHook(() => useNotifications());
    await act(async () => { await vi.advanceTimersByTimeAsync(40_000); });
    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it('loads as soon as a user signs in, then polls every 15 seconds', async () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isLoading).toBe(true);

    await act(async () => { emitAuth({ uid: 'u1' }); });
    expect(result.current.notifications.map((n) => n.id)).toEqual(['a']);
    expect(result.current.isLoading).toBe(false);
    expect(fetchNotifications).toHaveBeenCalledTimes(1);

    fetchNotifications.mockResolvedValue([item('a'), item('b')]);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(fetchNotifications).toHaveBeenCalledTimes(2);
    expect(result.current.notifications.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('clears the list when the user signs out', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { emitAuth({ uid: 'u1' }); });
    expect(result.current.notifications).toHaveLength(1);

    await act(async () => { emitAuth(null); });
    expect(result.current.notifications).toEqual([]);
    fetchNotifications.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  it('reports failures, keeps the last good list, and recovers', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { emitAuth({ uid: 'u1' }); });

    fetchNotifications.mockRejectedValue(new Error('Hasura is down'));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current.error).toBe('Hasura is down');
    expect(result.current.notifications.map((n) => n.id)).toEqual(['a']);

    fetchNotifications.mockResolvedValue([item('c')]);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current.error).toBeNull();
    expect(result.current.notifications.map((n) => n.id)).toEqual(['c']);
  });

  it('never overlaps requests', async () => {
    let release: (v: unknown) => void = () => {};
    fetchNotifications.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    renderHook(() => useNotifications());
    await act(async () => { emitAuth({ uid: 'u1' }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(45_000); });
    expect(fetchNotifications).toHaveBeenCalledTimes(1);
    await act(async () => { release([]); });
  });

  it('skips polling while the tab is hidden', async () => {
    renderHook(() => useNotifications());
    await act(async () => { emitAuth({ uid: 'u1' }); });
    fetchNotifications.mockClear();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetchNotifications).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('stops everything on unmount', async () => {
    const { unmount } = renderHook(() => useNotifications());
    await act(async () => { emitAuth({ uid: 'u1' }); });
    fetchNotifications.mockClear();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchNotifications).not.toHaveBeenCalled();
  });
});
