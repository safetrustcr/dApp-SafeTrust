declare module '@pollar/core' {
  export interface SignOutcomeSigned {
    status: 'signed';
    signedXdr: string;
    submissionToken?: string;
    expiresAt?: number;
    sponsored?: boolean;
  }

  export interface SignOutcomeError {
    status: 'error';
    details?: string;
    code?: string;
    message?: string;
  }

  export type SignOutcome = SignOutcomeSigned | SignOutcomeError;

  export function signTx(
    unsignedXdr: string,
    options?: { skipSponsorship?: boolean },
  ): Promise<SignOutcome>;
}
