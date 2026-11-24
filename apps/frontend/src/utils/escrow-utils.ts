export function mapDbStatusToDashboardStatus(status: string): "pending" | "funded" | "check_in_approved" | "check_out_approved" | "completed" | "cancelled" {
  const s = status.toLowerCase();
  if (s === "pending_signature" || s === "deploying" || s === "pending") return "pending";
  if (s === "funded" || s === "active" || s === "milestone_approved") return "funded";
  if (s === "check_in_approved") return "check_in_approved";
  if (s === "check_out_approved") return "check_out_approved";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "resolved") return "cancelled";
  return "pending";
}

export const STROOPS_PER_UNIT = BigInt(10_000_000); // 10^7 (7 decimal places)
const ZERO = BigInt(0);

/**
 * Converts a numeric amount (or decimal string) into integer stroops (BigInt),
 * avoiding JavaScript IEEE 754 floating point precision inaccuracies.
 */
export function toStroops(amount: number | string | null | undefined): bigint {
  if (amount === null || amount === undefined || amount === '') return ZERO;
  const str = typeof amount === 'number' ? amount.toFixed(7) : String(amount).trim();
  if (str === '' || str === 'NaN') return ZERO;

  const isNegative = str.startsWith('-');
  const unsignedStr = isNegative ? str.slice(1) : str;

  const [wholePart = '0', fracPart = ''] = unsignedStr.split('.');
  const cleanWhole = wholePart.replace(/\D/g, '') || '0';
  const cleanFrac = (fracPart.replace(/\D/g, '') + '0000000').slice(0, 7);

  const whole = BigInt(cleanWhole);
  const fraction = BigInt(cleanFrac);
  const total = whole * STROOPS_PER_UNIT + fraction;

  return isNegative ? -total : total;
}

/**
 * Converts integer stroops (BigInt) back to a standard decimal string.
 */
export function fromStroops(stroops: bigint): string {
  const isNegative = stroops < ZERO;
  const abs = isNegative ? -stroops : stroops;
  const whole = abs / STROOPS_PER_UNIT;
  const fraction = abs % STROOPS_PER_UNIT;
  const fracStr = fraction.toString().padStart(7, '0').replace(/0+$/, '');
  const res = fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
  return isNegative ? `-${res}` : res;
}

/**
 * Checks if the guest (approver) and host (serviceProvider) split amounts
 * add up exactly to the on-chain balance in 7-decimal integer stroop units.
 * Both amounts must be positive (> 0).
 */
export function isSplitValid(
  guestAmount: number | string | null | undefined,
  hostAmount: number | string | null | undefined,
  totalBalance: number | string | null | undefined,
): boolean {
  const guestStroops = toStroops(guestAmount);
  const hostStroops = toStroops(hostAmount);
  const totalStroops = toStroops(totalBalance);

  if (totalStroops <= ZERO) return false;
  if (guestStroops <= ZERO || hostStroops <= ZERO) return false;

  return guestStroops + hostStroops === totalStroops;
}

/**
 * Calculates the remaining amount in integer stroops and as display strings.
 */
export function getSplitDetails(
  guestAmount: number | string | null | undefined,
  hostAmount: number | string | null | undefined,
  totalBalance: number | string | null | undefined,
) {
  const guestStroops = toStroops(guestAmount);
  const hostStroops = toStroops(hostAmount);
  const totalStroops = toStroops(totalBalance);
  const allocatedStroops = guestStroops + hostStroops;
  const remainingStroops = totalStroops - allocatedStroops;
  const isValid = totalStroops > ZERO && guestStroops > ZERO && hostStroops > ZERO && remainingStroops === ZERO;

  return {
    guestStroops,
    hostStroops,
    totalStroops,
    allocatedStroops,
    remainingStroops,
    allocatedDisplay: fromStroops(allocatedStroops),
    remainingDisplay: fromStroops(remainingStroops),
    isValid,
  };
}
