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

export const STROOP_FACTOR = 10_000_000;

export function toStroops(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0;
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * STROOP_FACTOR);
}

export function fromStroops(stroops: number): number {
  return stroops / STROOP_FACTOR;
}

/**
 * Validates that guest and host split amounts exactly equal the escrow balance
 * using 7-decimal stroop integer arithmetic to prevent floating-point errors.
 */
export function isSplitValid(
  approverAmount: number | string | null | undefined,
  receiverAmount: number | string | null | undefined,
  totalAmount: number | string | null | undefined,
): boolean {
  const approverNum = typeof approverAmount === 'string' ? Number.parseFloat(approverAmount) : (approverAmount ?? 0);
  const receiverNum = typeof receiverAmount === 'string' ? Number.parseFloat(receiverAmount) : (receiverAmount ?? 0);

  if (!Number.isFinite(approverNum) || !Number.isFinite(receiverNum)) return false;
  if (approverNum < 0 || receiverNum < 0) return false;

  const totalStroops = toStroops(totalAmount);
  if (totalStroops <= 0) return false;

  const approverStroops = toStroops(approverNum);
  const receiverStroops = toStroops(receiverNum);

  return approverStroops + receiverStroops === totalStroops;
}

