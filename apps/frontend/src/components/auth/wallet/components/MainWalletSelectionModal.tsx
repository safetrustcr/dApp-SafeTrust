"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useWalletBridge, WalletRejectedError } from "@/lib/wallet/use-wallet-bridge";
import { toast } from "sonner";

interface MainWalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletTypeSelected?: (walletType: any) => void;
  onWalletConnected?: (address: string) => void;
  stellarOnly?: boolean;
}

const FREIGHTER_INSTALL_URL = "https://www.freighter.app";

export const MainWalletSelectionModal: React.FC<MainWalletSelectionModalProps> = ({
  isOpen,
  onClose,
  onWalletTypeSelected,
  onWalletConnected,
}) => {
  const { status, address, provider, isRegistered, connect, disconnect } = useWalletBridge();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [hasFreighterExtension, setHasFreighterExtension] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasFreighterExtension(Boolean((window as any).freighterApi));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (targetProvider: "freighter" | "pollar" | "other") => {
    if (targetProvider === "freighter" && !hasFreighterExtension) {
      toast.error("Freighter is not available in this browser", {
        action: {
          label: "Install Extension",
          onClick: () => window.open(FREIGHTER_INSTALL_URL, "_blank", "noopener,noreferrer"),
        },
      });
      return;
    }

    setConnectingProvider(targetProvider);
    try {
      await connect(targetProvider);
      onWalletTypeSelected?.("stellar");
      if (address) {
        onWalletConnected?.(address);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof WalletRejectedError) {
        toast.info("Wallet connection was cancelled");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to connect wallet";
        toast.error(msg);
      }
    } finally {
      setConnectingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-100 p-5 dark:border-zinc-900">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Connect Stellar Wallet</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select an authorized wallet to sign escrow transactions
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 rounded-full p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-3 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Active Wallet Banner if already connected */}
          {address && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs dark:border-emerald-900 dark:bg-emerald-950/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Connected ({provider})
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isRegistered
                    ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                }`}>
                  {isRegistered ? "Primary Registered" : "Not Primary Wallet"}
                </span>
              </div>
              <p className="font-mono text-zinc-700 dark:text-zinc-300 truncate">{address}</p>
              <div className="mt-2.5 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void disconnect()}
                  className="h-7 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {/* Wallet Options */}
          {/* 1. Freighter Option */}
          <Card
            className={`transition-all duration-200 ${
              hasFreighterExtension
                ? "cursor-pointer hover:border-orange-500 hover:shadow-md dark:hover:border-orange-600"
                : "border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/40"
            }`}
            onClick={() => handleConnect("freighter")}
          >
            <CardContent className="!p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 font-bold text-sm">
                    F
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Freighter</h3>
                      {!hasFreighterExtension && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                          Not available in this browser
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Primary Stellar browser extension
                    </p>
                  </div>
                </div>

                {connectingProvider === "freighter" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                ) : !hasFreighterExtension ? (
                  <a
                    href={FREIGHTER_INSTALL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    Install <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* 2. Pollar Option */}
          <Card
            className="cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md dark:hover:border-blue-600"
            onClick={() => handleConnect("pollar")}
          >
            <CardContent className="!p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 font-bold text-sm">
                    P
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Pollar</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Login with Google / Email without seed phrase
                    </p>
                  </div>
                </div>

                {connectingProvider === "pollar" && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Other Stellar Wallets (Albedo, LOBSTR, xBull, Here) */}
          <Card
            className="cursor-pointer transition-all duration-200 hover:border-purple-500 hover:shadow-md dark:hover:border-purple-600"
            onClick={() => handleConnect("other")}
          >
            <CardContent className="!p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 font-bold text-sm">
                    ✦
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Stellar Wallets Kit</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Albedo, LOBSTR, xBull, Here Wallet
                    </p>
                  </div>
                </div>

                {connectingProvider === "other" && (
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50/70 p-3.5 text-center text-xs text-zinc-500 dark:border-zinc-900 dark:bg-zinc-900/50 dark:text-zinc-400">
          Connecting your wallet never signs anyone in or modifies account permissions.
        </div>
      </div>
    </div>
  );
};