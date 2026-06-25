"use client";

import { MainWalletSelectionModal } from "@/components/auth/wallet/components/MainWalletSelectionModal";
import { MetaMaskWalletModal } from "@/components/auth/wallet/components/MetaMaskWalletModal";
import { WalletSelectionModal } from "@/components/auth/wallet/components/WalletSelectionModal";
import { useMultiWallet } from "@/components/auth/wallet/hooks/multi-wallet.hook";
import { Button } from "@/components/ui/button";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { Wallet } from "lucide-react";
import { RoleEscrowDashboardPage } from "@/app/dashboard/escrow-dashboard/RoleEscrowDashboardPage";

export function EscrowDashboard() {
  const {
    disconnectWallet,
    handleConnect,
    isMainModalOpen,
    isStellarModalOpen,
    isMetaMaskModalOpen,
    closeMainModal,
    closeStellarModal,
    closeMetaMaskModal,
    handleWalletTypeSelected,
    handleStellarWalletSelected,
    handleMetaMaskSelected,
  } = useMultiWallet();
  const { address } = useGlobalAuthenticationStore();

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto rounded-md border p-4 bg-muted text-foreground">
        {address ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Connected Wallet:</p>
            <p className="font-mono text-sm break-all">{address}</p>
            <Button variant="outline" size="sm" onClick={disconnectWallet} className="w-fit">
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">No wallet connected</p>
            <Button onClick={handleConnect} className="w-fit">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          </div>
        )}
      </div>

      <RoleEscrowDashboardPage />

      <MainWalletSelectionModal
        isOpen={isMainModalOpen}
        onClose={closeMainModal}
        onWalletTypeSelected={handleWalletTypeSelected}
      />
      <WalletSelectionModal
        isOpen={isStellarModalOpen}
        onClose={closeStellarModal}
        onWalletSelected={handleStellarWalletSelected}
      />
      <MetaMaskWalletModal
        isOpen={isMetaMaskModalOpen}
        onClose={closeMetaMaskModal}
        onWalletConnected={handleMetaMaskSelected}
      />
    </div>
  );
}
