"use client";

import { useState, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { Button } from "../DemoComponents";
import { Event } from "@/lib/events";
import { Transaction, TransactionButton, TransactionStatus } from '@coinbase/onchainkit/transaction';
import { encodeFunctionData, parseUnits } from 'viem';
import { TokenGateStatus } from '../TokenGating';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";

const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC address
const USDC_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "type": "function",
    "stateMutability": "nonpayable"
  }
] as const;

// Event Registration Form
export function EventRegistrationForm({ 
  event, 
  onRegisterAction, 
  onCancelAction 
}: { 
  event: Event
  onRegisterAction: (userDetails: {name: string, email: string, phone?: string, bio?: string}, onchain?: { paymentTxHash?: `0x${string}` }) => void
  onCancelAction: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const { address } = useAccount();
  const chainId = useChainId();
  const isBase = chainId === 8453; // Base mainnet chain ID
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentTx, setPaymentTx] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [tokenVerified, setTokenVerified] = useState(!event.isTokenGated); // Start as true if no token gating
  const openUrl = useOpenUrl();

  // OnchainKit payment call for paid events using viem
  const paymentCalls: { to: `0x${string}`; data?: `0x${string}`; value?: bigint }[] = useMemo(() => {
    if (!event.isPaid || !event.priceUSDC || !event.creator) return [];
    
    try {
      const transferData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [
            event.creator as `0x${string}`,
            parseUnits(event.priceUSDC.toString(), 6)
        ]
      });

      return [{
        to: USDC_BASE_ADDRESS as `0x${string}`,
        value: BigInt(0),
        data: transferData,
      }];
    } catch (error) {
      console.error('Error creating payment call:', error);
      return [];
    }
  }, [event.isPaid, event.priceUSDC, event.creator]);

  const validate = () => {
    const newErrors: {[key: string]: string} = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!email.trim()) newErrors.email = "Email is required"
    if (email && !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid"
    if (!phone.trim()) newErrors.phone = "Phone number is required"
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) newErrors.phone = "Please enter a valid phone number"
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    
    const validation = validate()
    setErrors(validation)
    if (Object.keys(validation).length > 0) return
    
    // Check token verification for token-gated events
    if (event.isTokenGated && !tokenVerified) {
      setErrors({ tokenVerification: 'Please verify token requirements before registering' });
      return;
    }
    
    setLoading(true)
    try {
      const onchain: { paymentTxHash?: `0x${string}` } = {}
      if (event.isPaid && paymentTx) {
        onchain.paymentTxHash = paymentTx as `0x${string}`
      }
      await onRegisterAction({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bio: bio.trim() || undefined
      }, onchain)
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: 'Registration failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--app-background)] border-2 border-[var(--app-card-border)] rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-2xl text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
          onClick={onCancelAction}
        >
          ×
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Complete Registration</h2>
          <h3 className="text-lg font-semibold text-[var(--app-accent)] mb-2">{event.title}</h3>
          <p className="text-sm text-[var(--app-foreground-muted)]">
            Please provide your details to complete your event registration
          </p>
        </div>
        
        {/* Token Gating Verification */}
        {event.isTokenGated && (
          <div className="mb-6">
            <TokenGateStatus 
              event={event}
              userAddress={address}
              onVerificationComplete={(passed) => {
                setTokenVerified(passed);
                if (!passed) {
                  setErrors(prev => ({ ...prev, tokenVerification: 'Token requirements not met' }));
                } else {
                  setErrors(prev => {
                    const { tokenVerification, ...rest } = prev;
                    return rest;
                  });
                }
              }}
            />
          </div>
        )}
        
        {event.isPaid && (
          <div className="mb-6 onchain-card rounded-xl p-6 border-2" style={{
            background: 'var(--app-payment-bg)',
            borderColor: 'var(--app-payment-light)'
          }}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 payment-gradient rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white">$</text>
                </svg>
              </div>
              <h3 className="font-bold text-2xl mb-2" style={{color: 'var(--app-payment)'}}>
                {event.priceUSDC} USDC
              </h3>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Payment required to complete registration on Base network
              </p>
              
              {paymentConfirmed ? (
                <div className="flex items-center justify-center gap-3 rounded-lg p-4 border border-green-200 bg-green-50 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-green-800">Payment Confirmed!</div>
                    <div className="text-sm text-green-700">USDC payment successful on Base</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!isBase && (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
                      ⚠️ Please switch to Base network to make payment
                    </div>
                  )}
                  
                  {paymentError && (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
                      Payment failed: {paymentError}
                    </div>
                  )}
                  
            <Transaction
              chainId={8453}
              calls={paymentCalls}
                    onSuccess={(response) => {
                      console.log('Payment successful:', response);
                setPaymentConfirmed(true);
                      setPaymentError(null);
                      const txHash = response.transactionReceipts[0]?.transactionHash;
                      if (txHash) {
                        setPaymentTx(txHash);
                      }
                    }}
                    onError={(error) => {
                      console.error('Payment failed:', error);
                      setPaymentError(error.message || 'Payment failed');
                      setPaymentConfirmed(false);
                    }}
                  >
                    <TransactionButton 
                      text={paymentConfirmed ? '✓ Payment Confirmed' : 'Pay with USDC'}
                      disabled={paymentConfirmed}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                        paymentConfirmed 
                          ? 'bg-green-500 text-white cursor-default' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    />
                    <TransactionStatus>
                      <div className="mt-2 text-sm text-center">
                        {paymentTx && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium">Transaction:</span>
                            <button
                              onClick={() => openUrl(`https://basescan.org/tx/${paymentTx}`)}
                              className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 transition-colors"
                            >
                              {paymentTx.slice(0, 10)}...{paymentTx.slice(-8)}
                            </button>
                          </div>
                        )}
                      </div>
                    </TransactionStatus>
            </Transaction>
                </div>
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.name ? 'border-red-500 bg-red-50' : ''}`}
              required
            />
            {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.email ? 'border-red-500 bg-red-50' : ''}`}
              required
            />
            {errors.email && <div className="text-xs text-red-500 mt-1">{errors.email}</div>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.phone ? 'border-red-500 bg-red-50' : ''}`}
              required
            />
            {errors.phone && <div className="text-xs text-red-500 mt-1">{errors.phone}</div>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Bio <span className="text-[var(--app-foreground-muted)] text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              placeholder="Tell us a bit about yourself..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all resize-none"
            />
          </div>
          
          <div className="flex space-x-4 pt-2">
            <button
              type="submit"
              disabled={loading || (event.isPaid && !paymentConfirmed) || (event.isTokenGated && !tokenVerified)}
              className="flex-1 bg-[var(--app-accent)] text-white py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--app-accent-hover)] transition-all font-semibold flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Registration
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancelAction}
              className="flex-1 bg-[var(--app-gray)] text-[var(--app-foreground)] py-4 px-6 rounded-xl hover:bg-[var(--app-gray-dark)] transition-colors font-semibold border-2 border-[var(--app-card-border)] shadow-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
