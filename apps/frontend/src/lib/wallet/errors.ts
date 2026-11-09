export class WalletRejectedError extends Error {
  constructor(message = 'Signature cancelled') {
    super(message);
    this.name = 'WalletRejectedError';
  }
}

export class PollarSigningUnsupportedError extends Error {
  constructor() {
    super("Signing with Pollar isn't available yet. Connect Freighter to sign this transaction.");
    this.name = 'PollarSigningUnsupportedError';
  }
}
