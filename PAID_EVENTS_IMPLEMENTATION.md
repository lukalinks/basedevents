# Paid Events & USDC Payment Implementation Plan

## 1. Overview

This document outlines the plan to add support for paid events in the mini-app, allowing event creators to set a price (in USDC) for their events and requiring attendees to pay in USDC to register.

## 2. User Flow

- **Event Creation:**
  - Host can specify if the event is paid and set a USDC price.
- **Event Listing:**
  - Paid events are clearly marked with the price in USDC.
- **Registration:**
  - User clicks "Register" or "RSVP" on a paid event.
  - User is prompted to pay the specified USDC amount via their wallet (e.g., MetaMask, Coinbase Wallet).
  - On successful payment, registration is confirmed and the user is added as an attendee.
  - If payment fails or is cancelled, registration does not proceed.

## 3. Smart Contract / Payment Integration

- **USDC Payment:**
  - Integrate with a USDC token contract on the supported chain (e.g., Ethereum mainnet, Polygon, Base).
  - Use wagmi/ethers.js to initiate a USDC transfer from the attendee to the event host's address.
  - Optionally, deploy a minimal escrow smart contract to hold funds until the event occurs (for refunds/cancellations).
- **Payment Verification:**
  - Listen for transaction confirmation before confirming registration.
  - Store transaction hash and payment status in the database.

## 4. UI/UX Changes

- **Event Creation Form:**
  - Add a toggle for "Paid Event" and a field for USDC price.
- **Event Card/List:**
  - Show price badge for paid events.
- **Registration Modal:**
  - Show payment summary and require wallet payment before registration.
  - Show payment status (pending, confirmed, failed).
- **Host Dashboard:**
  - Show total earnings and list of paid attendees.

## 5. Backend Changes

- **Database:**
  - Add `isPaid` (boolean), `priceUSDC` (number), and `paymentStatus` fields to events/registrations tables.
  - Store transaction hashes for payments.
- **API:**
  - Validate payment before confirming registration.
  - Expose endpoints for hosts to view earnings and attendees.

## 6. Security & Edge Cases

- **Double Spend:** Prevent double registration/payments.
- **Refunds:** Optionally support refunds for cancelled events.
- **Chain Support:** Ensure USDC contract address is correct for the selected chain.
- **Wallet Support:** Support major wallets (MetaMask, Coinbase, WalletConnect).
- **Gas Fees:** Warn users about gas fees.
- **Failed/Delayed Transactions:** Handle pending/failed payments gracefully.

## 7. Testing

- Unit and integration tests for payment flow.
- Test on testnet with USDC faucet.
- Simulate failed, pending, and successful payments.
- Test UI/UX for both paid and free events.

## 8. Milestones / Steps

1. Update database schema for paid events and payments.
2. Update event creation UI to support paid events.
3. Integrate USDC payment flow in registration modal.
4. Implement backend payment verification and registration logic.
5. Add host dashboard for earnings and paid attendees.
6. Test end-to-end on testnet.
7. Deploy to production.

---

**Note:**
- USDC contract addresses and payment logic must be tailored to the target chain (Ethereum, Polygon, Base, etc.).
- Consider using a payment SDK (e.g., wagmi, ethers.js) for wallet integration.
- Optionally, use a minimal escrow contract for advanced features (refunds, dispute resolution).
