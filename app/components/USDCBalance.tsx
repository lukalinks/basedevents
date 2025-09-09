"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { BASE_USDC_ADDRESS } from "@/lib/blockchain-base";
import { formatUnits } from "viem";

interface USDCBalanceProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function USDCBalance({ 
  className = "", 
  showLabel = true, 
  size = "md" 
}: USDCBalanceProps) {
  const { address } = useAccount();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  // Read USDC balance
  const { data: balanceData, error, isLoading } = useReadContract({
    address: BASE_USDC_ADDRESS,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  useEffect(() => {
    console.log('USDCBalance useEffect:', { balanceData, error, address, isLoading });
    
    if (balanceData) {
      const formattedBalance = formatUnits(balanceData, 6); // USDC has 6 decimals
      const balance = parseFloat(formattedBalance).toFixed(2);
      console.log('USDC Balance formatted:', balance);
      setBalance(balance);
      setLoading(false);
    } else if (error) {
      console.error('Error fetching USDC balance:', error);
      setBalance("0.00");
      setLoading(false);
    } else if (!address) {
      console.log('No address provided');
      setBalance("0.00");
      setLoading(false);
    } else if (!isLoading && !balanceData) {
      console.log('No balance data and not loading');
      setBalance("0.00");
      setLoading(false);
    }
  }, [balanceData, error, address, isLoading]);

  if (!address) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm", 
    lg: "text-base"
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  if (loading || isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className={`${iconSizes[size]} bg-gray-200 rounded animate-pulse`} />
        {showLabel && (
          <div className={`${sizeClasses[size]} text-gray-400`}>
            Loading...
          </div>
        )}
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className={`${iconSizes[size]} bg-red-100 rounded-full flex items-center justify-center`}>
          <svg className={`${iconSizes[size]} text-red-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        {showLabel && (
          <div className={`${sizeClasses[size]} text-red-600`}>
            Error
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`${iconSizes[size]} bg-blue-100 rounded-full flex items-center justify-center`}>
        <svg className={`${iconSizes[size]} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
      {showLabel && (
        <div className={`${sizeClasses[size]} font-medium text-gray-700`}>
          {balance} USDC
        </div>
      )}
    </div>
  );
}
