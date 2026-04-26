import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  XBULL_ID
} from "@creit.tech/stellar-wallets-kit";

const createWalletKit = () =>
  new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: allowAllModules(),
  });

const STELLAR_WALLETS_KIT_BROWSER_ONLY_ERROR =
  "StellarWalletsKit is only available in the browser";

const createWalletKitSSRStub = (): StellarWalletsKit => {
  const throwBrowserOnlyError = (): never => {
    throw new Error(STELLAR_WALLETS_KIT_BROWSER_ONLY_ERROR);
  };

  const target = function stellarWalletKitSSRStub() {
    throwBrowserOnlyError();
  };

  return new Proxy(target, {
    get: (_target, prop) => {
      if (
        typeof prop === "symbol" ||
        prop === "then" ||
        prop === "toJSON" ||
        prop === "inspect"
      ) {
        return undefined;
      }

      if (prop === "toString") {
        return () => "stellarWalletKitSSRStub";
      }

      if (prop === "valueOf") {
        return () => target;
      }

      return throwBrowserOnlyError();
    },
    apply: () => throwBrowserOnlyError(),
    construct: () => throwBrowserOnlyError(),
  }) as unknown as StellarWalletsKit;
};

export const kit: StellarWalletsKit =
  typeof window === "undefined"
    ? createWalletKitSSRStub()
    : createWalletKit();

export const WALLET_IDS = {
  FREIGHTER: FREIGHTER_ID,
  XBULL: XBULL_ID,
} as const;

interface SignTransactionProps {
  unsignedTransaction: string;
  address: string;
  network?: WalletNetwork;
}

export const signTransaction = async ({
  unsignedTransaction,
  address,
  network = WalletNetwork.TESTNET,
}: SignTransactionProps): Promise<string> => {
  const { signedTxXdr } = await kit.signTransaction(unsignedTransaction, {
    address,
    networkPassphrase: network,
  });

  return signedTxXdr;
};
