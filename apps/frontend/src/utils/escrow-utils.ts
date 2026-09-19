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
