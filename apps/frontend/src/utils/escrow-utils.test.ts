import { describe, it, expect } from 'vitest';
import {
  toStroops,
  fromStroops,
  isSplitValid,
  STROOP_FACTOR,
} from './escrow-utils';

describe('Stroop Conversions and 7-decimal Split Math', () => {
  it('converts amounts to integer stroops accurately', () => {
    expect(toStroops(1)).toBe(10_000_000);
    expect(toStroops('1')).toBe(10_000_000);
    expect(toStroops(0.0000001)).toBe(1);
    expect(toStroops('0.0000001')).toBe(1);
    expect(toStroops(null)).toBe(0);
    expect(toStroops(undefined)).toBe(0);
    expect(toStroops('')).toBe(0);
  });

  it('converts stroops back to human readable balance', () => {
    expect(fromStroops(10_000_000)).toBe(1);
    expect(fromStroops(1)).toBe(0.0000001);
  });

  describe('isSplitValid - 7-decimal precision checks', () => {
    it('validates simple integer splits', () => {
      expect(isSplitValid(50, 50, 100)).toBe(true);
      expect(isSplitValid(100, 0, 100)).toBe(true);
      expect(isSplitValid(0, 100, 100)).toBe(true);
      expect(isSplitValid(49, 50, 100)).toBe(false);
      expect(isSplitValid(51, 50, 100)).toBe(false);
    });

    it('solves classic JavaScript IEEE 754 floating point imprecision (0.1 + 0.2 === 0.3)', () => {
      // In JS: 0.1 + 0.2 === 0.30000000000000004 !== 0.3
      expect(0.1 + 0.2 === 0.3).toBe(false);
      // But in integer stroops, it is exact:
      expect(isSplitValid(0.1, 0.2, 0.3)).toBe(true);
      expect(isSplitValid('0.1', '0.2', '0.3')).toBe(true);
    });

    it('validates complex 7-decimal fractional splits', () => {
      const total = 100.1234567;
      const guest = 40.123456;
      const host = 60.0000007;

      expect(isSplitValid(guest, host, total)).toBe(true);
      expect(isSplitValid(guest.toString(), host.toString(), total.toString())).toBe(true);
    });

    it('rejects splits off by 1 stroop (0.0000001)', () => {
      const total = 100.1234567;
      const guest = 40.123456;
      const hostTooHigh = 60.0000008; // 1 stroop too high
      const hostTooLow = 60.0000006; // 1 stroop too low

      expect(isSplitValid(guest, hostTooHigh, total)).toBe(false);
      expect(isSplitValid(guest, hostTooLow, total)).toBe(false);
    });

    it('rejects negative amounts even if they mathematically sum to total', () => {
      expect(isSplitValid(-10, 110, 100)).toBe(false);
      expect(isSplitValid(110, -10, 100)).toBe(false);
    });

    it('rejects zero or negative total escrows', () => {
      expect(isSplitValid(0, 0, 0)).toBe(false);
      expect(isSplitValid(0, 0, -100)).toBe(false);
    });

    it('rejects invalid or non-numeric inputs', () => {
      expect(isSplitValid('invalid', 50, 100)).toBe(false);
      expect(isSplitValid(50, 'invalid', 100)).toBe(false);
      expect(isSplitValid(NaN, 50, 100)).toBe(false);
    });
  });
});
