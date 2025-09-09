"use client";

import { useState, useEffect } from "react";
import { Button } from "../DemoComponents";
import { Event, getEventSupportTotal } from "@/lib/events";
import { BASE_USDC_ADDRESS } from "@/lib/blockchain-base";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

interface EventSupportComponentProps {
  event: Event;
  userAddress?: string;
  onSupportSuccess?: () => void;
}

export function EventSupportComponent({ 
  event, 
  userAddress, 
  onSupportSuccess 
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
      setError(writeError.message || "Transaction failed");
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
      });
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
        onSupportSuccess?.();
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
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-800 mb-1">Event Support</h3>
            <p className="text-green-600 text-sm">
              Total support received: <span className="font-bold">{supportTotal.toFixed(2)} USDC</span>
            </p>
            {supportTotal > 0 && (
              <p className="text-green-500 text-xs mt-1">
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-blue-800 mb-1">Connect Wallet to Support</h3>
            <p className="text-blue-600 text-sm">
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
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-purple-800">Support This Event</h3>
            <p className="text-purple-600 text-sm">
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
            className="bg-purple-600 hover:bg-purple-700 border-purple-600"
          >
            💜 Support
          </Button>
        )}
      </div>

      {showSupportForm && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-purple-800 mb-2">
                Support Amount (USDC)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="5.00"
                  disabled={isSupporting || isPending || isConfirming}
                />
                <div className="flex gap-1">
                  {["5", "10", "25"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="px-3 py-2 text-xs font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                      disabled={isSupporting || isPending || isConfirming}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSupport}
                disabled={isSupporting || isPending || isConfirming || !amount || parseFloat(amount) <= 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 border-purple-600"
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
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-purple-600 text-center">
              USDC will be sent directly to the event host's wallet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}