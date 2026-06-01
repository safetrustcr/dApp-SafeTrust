import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Hotel } from "lucide-react";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { useMultiWallet } from "@/components/auth/wallet/hooks/multi-wallet.hook";
import { MainWalletSelectionModal } from "@/components/auth/wallet/components/MainWalletSelectionModal";
import { WalletSelectionModal } from "@/components/auth/wallet/components/WalletSelectionModal";
import { signTransaction } from "@/components/auth/wallet/constants/wallet-kit.constant";

interface BookingEscrowWrapperProps {
  bookingId: string;
  onComplete: () => void;
}

export function BookingEscrowWrapper({ bookingId, onComplete }: BookingEscrowWrapperProps) {
  const { address } = useGlobalAuthenticationStore();
  const {
    handleConnect,
    isMainModalOpen,
    isStellarModalOpen,
    closeMainModal,
    closeStellarModal,
    handleWalletTypeSelected,
    handleStellarWalletSelected,
  } = useMultiWallet();

  const [step, setStep] = useState<"init" | "deploying" | "signing" | "completed">("init");
  const [error, setError] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string>("");
  const [unsignedXdr, setUnsignedXdr] = useState<string>("");
  const [engagementId, setEngagementId] = useState<string>("");

  // Stub hotel data based on bookingId
  const bookingDetails = useMemo(() => {
    return {
      hotelName: "Grand Oasis Resort",
      dates: "June 15, 2026 - June 22, 2026 (7 nights)",
      amount: 1200.0,
      usdcAmount: "1200.00 USDC",
      hostAddress: "GDQP26...Z2K", // Owner / hotel destination address
    };
  }, [bookingId]);

  const handleDeploy = async () => {
    if (!address) {
      handleConnect();
      return;
    }

    setStep("deploying");
    setError(null);

    try {
      const response = await fetch("/api/escrow/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apartmentId: bookingId,
          tenantAddress: address,
          ownerAddress: "GBV4UX2LMRK7PND4G5MXCY7LCPXNXQ7HNS3TLJ3FNDUXE5HHYT3LQ55Q", // Demo stellar owner address
          amount: bookingDetails.amount,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to deploy escrow contract.");
      }

      setContractId(payload.contractId);
      setUnsignedXdr(payload.unsignedXDR);
      setEngagementId(payload.engagementId);
      setStep("signing");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Escrow deployment failed.");
      setStep("init");
    }
  };

  const handleSignAndSubmit = async () => {
    if (!address || !unsignedXdr) return;

    setStep("signing");
    setError(null);

    try {
      // 1. Sign using Stellar Wallet Kit helper
      const signedXdr = await signTransaction({
        unsignedTransaction: unsignedXdr,
        address,
      });

      // 2. Submit signed XDR to Trustless Work
      const response = await fetch("/helper/send-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedXdr,
          contractId,
          engagementId,
          propertyId: bookingId,
          senderAddress: address,
          receiverAddress: "GBV4UX2LMRK7PND4G5MXCY7LCPXNXQ7HNS3TLJ3FNDUXE5HHYT3LQ55Q",
          amount: bookingDetails.amount,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit signed transaction.");
      }

      setStep("completed");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Signing or submission failed.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-lg">
                <Hotel className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Hotel Booking Escrow
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Secure your payment for Booking #{bookingId}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200">
              Stellar Testnet
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Booking Summary</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Destination</span>
                <span className="font-semibold text-slate-900 dark:text-white">{bookingDetails.hotelName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Dates</span>
                <span className="text-slate-700 dark:text-slate-300">{bookingDetails.dates}</span>
              </div>
              <div className="h-px bg-slate-200/60 dark:bg-slate-800/60 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-slate-500">Escrow Deposit</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">{bookingDetails.usdcAmount}</span>
              </div>
            </div>
          </div>

          {/* Stepper View */}
          {step !== "completed" && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium border-t border-b border-slate-100 dark:border-slate-800 py-3">
              <div className={address ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                1. Connect Wallet
              </div>
              <div className={step === "deploying" ? "text-blue-600 font-semibold animate-pulse" : step === "signing" ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                2. Deploy Escrow
              </div>
              <div className={step === "signing" ? "text-blue-600 font-semibold animate-pulse" : "text-slate-400"}>
                3. Sign & Pay
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 text-sm border border-rose-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Active Flow Views */}
          {step === "init" && (
            <div className="space-y-4">
              {!address ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-4">
                    Connect your Freighter or Stellar wallet to secure funds in escrow.
                  </p>
                  <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Wallet className="h-4 w-4" /> Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Wallet Connected</p>
                      <p className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all max-w-[280px]">
                        {address.slice(0, 8)}...{address.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Active</Badge>
                </div>
              )}
            </div>
          )}

          {step === "deploying" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Deploying Smart Escrow Contract on Stellar...
              </p>
              <p className="text-xs text-slate-400">
                This prepares the cryptographic keys and parameters for your safety escrow.
              </p>
            </div>
          )}

          {step === "signing" && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <h5 className="font-semibold text-blue-950 dark:text-blue-200 text-sm mb-1">Unsigned Transaction Ready</h5>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Engagement ID: <strong>{engagementId}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-2 font-mono break-all leading-tight">
                  Contract ID: {contractId}
                </p>
              </div>
              <p className="text-sm text-slate-500 text-center">
                freighter will prompt you to authorize and sign the secure deposit transaction.
              </p>
            </div>
          )}

          {step === "completed" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Escrow Deployed & Funded!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  Your funds are now locked safely in the Stellar escrow. The hotel will receive payment only when the booking is validated.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                <Button onClick={onComplete} className="bg-emerald-600 hover:bg-emerald-700 w-full gap-2">
                  Continue to Confirmation <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        {step !== "completed" && (
          <CardFooter className="bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 flex justify-between items-center">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Powered by Trustless Work
            </span>
            {step === "init" && address && (
              <Button onClick={handleDeploy} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                Secure Deposit Now <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === "signing" && (
              <Button onClick={handleSignAndSubmit} className="bg-blue-600 hover:bg-blue-700 gap-2">
                Sign & Pay <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

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
    </div>
  );
}
