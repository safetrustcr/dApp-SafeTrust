export type EscrowRoleRecord = {
  approver?: string | null;
  marker?: string | null;
  releaser?: string | null;
  resolver?: string | null;
};

export type EscrowRoleFallbacks = {
  senderAddress?: string | null;
  receiverAddress?: string | null;
  platformAddress?: string | null;
};

export function resolveEscrowWalletRoles(
  trustlessWorkEscrow: EscrowRoleRecord | null | undefined,
  fallbacks: EscrowRoleFallbacks,
) {
  return {
    approver: trustlessWorkEscrow?.approver ?? fallbacks.senderAddress,
    serviceProvider: trustlessWorkEscrow?.marker ?? fallbacks.receiverAddress,
    releaseSigner: trustlessWorkEscrow?.releaser ?? fallbacks.senderAddress,
    disputeResolver: trustlessWorkEscrow?.resolver ?? fallbacks.platformAddress,
  };
}
