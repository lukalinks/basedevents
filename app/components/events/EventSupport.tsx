"use client";

import { useState, useEffect } from "react";
import { Button } from "../DemoComponents";
import { Event, getEventSupportTotal } from "@/lib/events";
import { BASE_USDC_ADDRESS } from "@/lib/blockchain-base";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { USDCBalance } from "../USDCBalance";

interface EventSupportComponentProps {
  event: Event;
  userAddress?: string;
  onSupportSuccessAction?: () => void;
}

export function EventSupportComponent({ 
  event, 
  userAddress, 
  onSupportSuccessAction 
}: EventSupportComponentProps) {
  const [amount, setAmount] = useState<string>("5");
  const [isSupporting, setIsSupporting] = useState(false);
  const [supportTotal, setSupportTotal] = useState<number>(0);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [error, setError] = useState<string>("");

  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const isCreator = address && event.creator === address;
  const canSupport = address && !isCreator;

  // Log support component state for debugging
  useEffect(() => {
    console.log('💜 EventSupport:', { 
      connected: !!address, 
      isCreator, 
      canSupport, 
      supportTotal 
    });
  }, [address, isCreator, canSupport, supportTotal]);

  useEffect(() => {
    loadSupportTotal();
  }, [event.id]);

  useEffect(() => {
    if (isConfirmed && hash) {
      handleSupportSuccess(hash);
    }
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (writeError) {
      // Handle different types of errors more gracefully
      let errorMessage = "Transaction failed";
      
      if (writeError.message?.includes("User rejected")) {
        errorMessage = "Transaction cancelled by user";
      } else if (writeError.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient USDC balance";
      } else if (writeError.message?.includes("execution reverted")) {
        errorMessage = "Transaction failed - check your USDC balance";
      } else if (writeError.message) {
        errorMessage = writeError.message;
      }
      
      setError(errorMessage);
      setIsSupporting(false);
    }
  }, [writeError]);

  const loadSupportTotal = async () => {
    try {
      const total = await getEventSupportTotal(event.id);
      setSupportTotal(total);
    } catch (error) {
      console.error('Error loading support total:', error);
    }
  };

  const handleSupport = async () => {
    if (!address || !amount || isSupporting) return;

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setError("");
    setIsSupporting(true);

    try {
      // Prepare USDC transfer
      const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals

      // Execute the transfer
      writeContract({
        address: BASE_USDC_ADDRESS,
        abi: [
          {
            name: "transfer",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ],
        functionName: "transfer",
        args: [event.creator as `0x${string}`, amountInWei],
      } as any);
    } catch (error) {
      console.error('Error preparing support transaction:', error);
      setError(error instanceof Error ? error.message : "Failed to prepare transaction");
      setIsSupporting(false);
    }
  };

  const handleSupportSuccess = async (txHash: `0x${string}`) => {
    try {
      // Record the support transaction in the database
      const response = await fetch(`/api/events/${event.id}/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supporterAddress: address,
          amountUSDC: parseFloat(amount),
          txHash: txHash,
          supporterName: address, // Could be enhanced with actual user name
        }),
      });

      if (response.ok) {
        console.log('✅ Support transaction recorded successfully');
        await loadSupportTotal(); // Refresh the total
        setAmount("5"); // Reset form
        setShowSupportForm(false);
        onSupportSuccessAction?.();
      } else {
        console.error('❌ Failed to record support transaction');
        setError("Failed to record support transaction");
      }
    } catch (error) {
      console.error('Error recording support transaction:', error);
      setError("Failed to record support transaction");
    } finally {
      setIsSupporting(false);
    }
  };

  if (isCreator) {
    // Show support total for event creators
    return (
      <div className="bg-gradient-to-r from-[var(--app-accent)]/10 to-transparent rounded-xl p-4 sm:p-6 border border-[var(--app-accent)]/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--app-accent)] rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[var(--app-foreground)] mb-1">Event Support</h3>
            <p className="text-[var(--app-foreground-muted)] text-sm sm:text-base">
              Total support received: <span className="font-bold text-[var(--app-accent)]">{supportTotal.toFixed(2)} USDC</span>
            </p>
            {supportTotal > 0 && (
              <p className="text-[var(--app-accent)] text-xs sm:text-sm mt-1">
                Thank you to your supporters! 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show a connection prompt if wallet is not connected
  if (!address) {
    return (
      <div className="bg-gradient-to-r from-[var(--app-accent)]/5 to-transparent rounded-xl p-4 sm:p-6 border border-[var(--app-accent)]/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--app-accent)] rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[var(--app-foreground)] mb-1">Connect Wallet to Support</h3>
            <p className="text-[var(--app-foreground-muted)] text-sm sm:text-base">
              Connect your wallet to show support for this event with USDC
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!canSupport) {
    return null; // Don't show support option if not connected or is creator
  }

  return (
    <div className="bg-gradient-to-r from-[var(--app-accent)]/10 to-transparent rounded-xl p-4 sm:p-6 border border-[var(--app-accent)]/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--app-accent)] rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[var(--app-foreground)] text-base sm:text-lg">Support This Event</h3>
            <p className="text-[var(--app-foreground-muted)] text-sm sm:text-base">
              Show your appreciation with USDC
              {supportTotal > 0 && ` • ${supportTotal.toFixed(2)} USDC raised`}
            </p>
          </div>
        </div>
        {!showSupportForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowSupportForm(true)}
            className="bg-[var(--app-accent)] hover:bg-[var(--app-accent)]/90 border-[var(--app-accent)] w-full sm:w-auto"
          >
            💜 Support
          </Button>
        )}
      </div>

      {showSupportForm && (
        <div className="mt-4 p-4 sm:p-6 bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)]">
          <div className="flex flex-col gap-4">
            <div className="bg-[var(--app-accent)]/5 border border-[var(--app-accent)]/20 rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="w-5 h-5 bg-[var(--app-accent)]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-[var(--app-foreground)] flex-1 min-w-0">
                  <div className="font-medium">How it works:</div>
                  <div className="text-[var(--app-foreground-muted)] mt-1">
                    You'll send USDC directly to the event creator's wallet. The transaction will be recorded on Base blockchain.
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <USDCBalance size="sm" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
                Support Amount (USDC)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-2 sm:py-3 border border-[var(--app-card-border)] rounded-lg focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent bg-[var(--app-card-bg)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)]"
                  placeholder="5.00"
                  disabled={isSupporting || isPending || isConfirming}
                />
                <div className="flex gap-1 sm:gap-2">
                  {["5", "10", "25"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="px-3 py-2 text-xs font-medium text-[var(--app-accent)] bg-[var(--app-accent)]/10 rounded-lg hover:bg-[var(--app-accent)]/20 transition-colors border border-[var(--app-accent)]/20"
                      disabled={isSupporting || isPending || isConfirming}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">Transaction Error</div>
                  <div className="text-red-700 mt-1">{error}</div>
                  {error.includes("cancelled") && (
                    <div className="text-red-600 text-xs mt-2">
                      You can try again by clicking the support button.
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0"
                  title="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSupport}
                disabled={isSupporting || isPending || isConfirming || !amount || parseFloat(amount) <= 0}
                className="flex-1 bg-[var(--app-accent)] hover:bg-[var(--app-accent)]/90 border-[var(--app-accent)]"
              >
                {isPending ? "Preparing..." : isConfirming ? "Confirming..." : isSupporting ? "Supporting..." : `Send ${amount} USDC`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSupportForm(false);
                  setError("");
                }}
                disabled={isSupporting || isPending || isConfirming}
                className="border-[var(--app-card-border)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-card-bg)] sm:w-auto"
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-[var(--app-foreground-muted)] text-center">
              USDC will be sent directly to the event host's wallet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}