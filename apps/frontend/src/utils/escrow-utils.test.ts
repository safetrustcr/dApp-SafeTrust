import { describe, expect, it } from 'vitest';
import {
  fromStroops,
  getSplitDetails,
  isSplitValid,
  mapDbStatusToDashboardStatus,
  toStroops,
} from './escrow-utils';

describe('escrow-utils', () => {
  describe('mapDbStatusToDashboardStatus', () => {
    it('maps statuses correctly', () => {
      expect(mapDbStatusToDashboardStatus('funded')).toBe('funded');
      expect(mapDbStatusToDashboardStatus('disputed')).toBe('pending');
      expect(mapDbStatusToDashboardStatus('resolved')).toBe('cancelled');
    });
  });

  describe('toStroops', () => {
    it('converts whole numbers', () => {
      expect(toStroops(1)).toBe(10_000_000n);
      expect(toStroops(100)).toBe(1_000_000_000n);
      expect(toStroops('50')).toBe(500_000_000n);
    });

    it('converts 7-decimal fractions', () => {
      expect(toStroops('0.0000001')).toBe(1n);
      expect(toStroops('0.0000010')).toBe(10n);
      expect(toStroops('50.1234567')).toBe(501_234_567n);
      expect(toStroops('49.8765433')).toBe(498_765_433n);
    });

    it('avoids standard JavaScript float imprecision', () => {
      // In JS: 0.1 + 0.2 === 0.30000000000000004
      const s01 = toStroops('0.1');
      const s02 = toStroops('0.2');
      const s03 = toStroops('0.3');
      expect(s01).toBe(1_000_000n);
      expect(s02).toBe(2_000_000n);
      expect(s01 + s02).toBe(s03);
    });

    it('handles empty and null values safely', () => {
      expect(toStroops(null)).toBe(0n);
      expect(toStroops(undefined)).toBe(0n);
      expect(toStroops('')).toBe(0n);
    });
  });

  describe('fromStroops', () => {
    it('formats stroops back to decimal string', () => {
      expect(fromStroops(10_000_000n)).toBe('1');
      expect(fromStroops(1n)).toBe('0.0000001');
      expect(fromStroops(501_234_567n)).toBe('50.1234567');
      expect(fromStroops(0n)).toBe('0');
    });
  });

  describe('isSplitValid (7-decimal precision split check)', () => {
    it('validates integer 50/50 splits', () => {
      expect(isSplitValid(50, 50, 100)).toBe(true);
      expect(isSplitValid('50', '50', '100')).toBe(true);
      expect(isSplitValid(30, 70, 100)).toBe(true);
    });

    it('validates 7-decimal split cases exactly', () => {
      expect(isSplitValid('50.1234567', '49.8765433', '100.0000000')).toBe(true);
      expect(isSplitValid('0.0000001', '0.9999999', '1.0000000')).toBe(true);
      expect(isSplitValid('0.0000001', '0.0000001', '0.0000002')).toBe(true);
    });

    it('rejects splits off by even 1 stroop (0.0000001)', () => {
      // Total 100, guest 50.1234567, host 49.8765434 -> sum is 100.0000001 (1 stroop excess)
      expect(isSplitValid('50.1234567', '49.8765434', '100.0000000')).toBe(false);
      // Total 100, guest 50.1234567, host 49.8765432 -> sum is 99.9999999 (1 stroop short)
      expect(isSplitValid('50.1234567', '49.8765432', '100.0000000')).toBe(false);
    });

    it('rejects zero or negative amounts', () => {
      expect(isSplitValid(0, 100, 100)).toBe(false);
      expect(isSplitValid(100, 0, 100)).toBe(false);
      expect(isSplitValid(-10, 110, 100)).toBe(false);
      expect(isSplitValid(110, -10, 100)).toBe(false);
    });

    it('rejects when total balance is 0 or negative', () => {
      expect(isSplitValid(0, 0, 0)).toBe(false);
      expect(isSplitValid(50, 50, 0)).toBe(false);
    });

    it('handles tricky float addition correctly where IEEE 754 would fail', () => {
      // 0.1 + 0.2 vs 0.3
      expect(isSplitValid(0.1, 0.2, 0.3)).toBe(true);
      expect(isSplitValid('0.1', '0.2', '0.3')).toBe(true);
    });
  });

  describe('getSplitDetails', () => {
    it('returns live allocated and remaining totals', () => {
      const details = getSplitDetails('40', '50', '100');
      expect(details.allocatedDisplay).toBe('90');
      expect(details.remainingDisplay).toBe('10');
      expect(details.isValid).toBe(false);

      const exact = getSplitDetails('50.5', '49.5', '100');
      expect(exact.allocatedDisplay).toBe('100');
      expect(exact.remainingDisplay).toBe('0');
      expect(exact.isValid).toBe(true);
    });
  });
});
