# Smart Contract Integration Guide

## 🔗 Integrating Smart Contracts with Event Mini App

This guide shows how to integrate smart contracts with your event management app to enable blockchain-based features like NFT tickets, token-gated events, and on-chain payments.

---

## 🎯 **Smart Contract Use Cases**

### 1. **NFT Event Tickets**
- Mint unique NFT tickets for each event
- Prevent ticket fraud and enable resale tracking
- Add utility to tickets (discounts, access to future events)

### 2. **Token-Gated Events**
- Require specific tokens/NFTs for event access
- Create exclusive events for token holders
- Implement tiered access based on token holdings

### 3. **On-Chain Payments**
- Accept cryptocurrency payments for events
- Automatic refunds for cancelled events
- Revenue sharing with event organizers

### 4. **Decentralized Event Registry**
- Store event metadata on-chain
- Immutable event records
- Decentralized event verification

---

## 🏗️ **Smart Contract Architecture**

### Core Contracts

```solidity
// EventManager.sol - Main event management contract
contract EventManager {
    struct Event {
        uint256 id;
        address organizer;
        string metadataURI;
        uint256 ticketPrice;
        uint256 maxAttendees;
        uint256 startTime;
        bool cancelled;
        address requiredToken; // For token-gated events
        uint256 requiredBalance;
    }
    
    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => bool)) public attendees;
    uint256 public nextEventId;
    
    event EventCreated(uint256 indexed eventId, address indexed organizer);
    event TicketPurchased(uint256 indexed eventId, address indexed attendee);
    event EventCancelled(uint256 indexed eventId);
}

// EventTicketNFT.sol - NFT tickets
contract EventTicketNFT is ERC721 {
    struct Ticket {
        uint256 eventId;
        uint256 seatNumber;
        bool used;
    }
    
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => uint256[]) public eventTickets;
    
    function mintTicket(address to, uint256 eventId) external;
    function useTicket(uint256 tokenId) external;
}
```

---

## 🛠️ **Implementation Steps**

### Step 1: Install Dependencies

```bash
npm install @wagmi/core viem @tanstack/react-query
npm install @openzeppelin/contracts # For smart contract development
npm install hardhat @nomicfoundation/hardhat-toolbox # For contract deployment
```

### Step 2: Smart Contract Setup

Create `contracts/EventManager.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EventManager is ReentrancyGuard, Ownable {
    struct Event {
        uint256 id;
        address organizer;
        string metadataURI;
        uint256 ticketPrice;
        uint256 maxAttendees;
        uint256 currentAttendees;
        uint256 startTime;
        uint256 endTime;
        bool cancelled;
        address requiredToken;
        uint256 requiredBalance;
    }
    
    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => bool)) public attendees;
    mapping(uint256 => address[]) public eventAttendeesList;
    uint256 public nextEventId = 1;
    uint256 public platformFee = 250; // 2.5%
    address public feeRecipient;
    
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string metadataURI,
        uint256 ticketPrice,
        uint256 maxAttendees
    );
    
    event TicketPurchased(
        uint256 indexed eventId,
        address indexed attendee,
        uint256 price
    );
    
    event EventCancelled(uint256 indexed eventId);
    
    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }
    
    function createEvent(
        string memory _metadataURI,
        uint256 _ticketPrice,
        uint256 _maxAttendees,
        uint256 _startTime,
        uint256 _endTime,
        address _requiredToken,
        uint256 _requiredBalance
    ) external returns (uint256) {
        require(_startTime > block.timestamp, "Start time must be in future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_maxAttendees > 0, "Max attendees must be greater than 0");
        
        uint256 eventId = nextEventId++;
        
        events[eventId] = Event({
            id: eventId,
            organizer: msg.sender,
            metadataURI: _metadataURI,
            ticketPrice: _ticketPrice,
            maxAttendees: _maxAttendees,
            currentAttendees: 0,
            startTime: _startTime,
            endTime: _endTime,
            cancelled: false,
            requiredToken: _requiredToken,
            requiredBalance: _requiredBalance
        });
        
        emit EventCreated(eventId, msg.sender, _metadataURI, _ticketPrice, _maxAttendees);
        return eventId;
    }
    
    function purchaseTicket(uint256 _eventId) external payable nonReentrant {
        Event storage event_ = events[_eventId];
        require(!event_.cancelled, "Event is cancelled");
        require(block.timestamp < event_.startTime, "Event has already started");
        require(event_.currentAttendees < event_.maxAttendees, "Event is sold out");
        require(!attendees[_eventId][msg.sender], "Already registered");
        require(msg.value >= event_.ticketPrice, "Insufficient payment");
        
        // Check token gating if required
        if (event_.requiredToken != address(0)) {
            require(
                IERC20(event_.requiredToken).balanceOf(msg.sender) >= event_.requiredBalance,
                "Insufficient token balance for access"
            );
        }
        
        attendees[_eventId][msg.sender] = true;
        eventAttendeesList[_eventId].push(msg.sender);
        event_.currentAttendees++;
        
        // Calculate fees
        uint256 fee = (msg.value * platformFee) / 10000;
        uint256 organizerAmount = msg.value - fee;
        
        // Transfer payments
        payable(feeRecipient).transfer(fee);
        payable(event_.organizer).transfer(organizerAmount);
        
        // Refund excess payment
        if (msg.value > event_.ticketPrice) {
            payable(msg.sender).transfer(msg.value - event_.ticketPrice);
        }
        
        emit TicketPurchased(_eventId, msg.sender, event_.ticketPrice);
    }
    
    function cancelEvent(uint256 _eventId) external {
        Event storage event_ = events[_eventId];
        require(msg.sender == event_.organizer, "Only organizer can cancel");
        require(!event_.cancelled, "Event already cancelled");
        require(block.timestamp < event_.startTime, "Cannot cancel after start");
        
        event_.cancelled = true;
        
        // Refund all attendees
        address[] memory attendeesList = eventAttendeesList[_eventId];
        for (uint256 i = 0; i < attendeesList.length; i++) {
            payable(attendeesList[i]).transfer(event_.ticketPrice);
        }
        
        emit EventCancelled(_eventId);
    }
    
    function getEventAttendees(uint256 _eventId) external view returns (address[] memory) {
        return eventAttendeesList[_eventId];
    }
    
    function isAttendee(uint256 _eventId, address _user) external view returns (bool) {
        return attendees[_eventId][_user];
    }
}
```

### Step 3: Frontend Integration

Create `lib/contracts.ts`:

```typescript
import { createPublicClient, createWalletClient, custom, parseEther, formatEther } from 'viem'
import { base } from 'viem/chains'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'

// Contract ABI (simplified)
export const EVENT_MANAGER_ABI = [
  {
    inputs: [
      { name: '_metadataURI', type: 'string' },
      { name: '_ticketPrice', type: 'uint256' },
      { name: '_maxAttendees', type: 'uint256' },
      { name: '_startTime', type: 'uint256' },
      { name: '_endTime', type: 'uint256' },
      { name: '_requiredToken', type: 'address' },
      { name: '_requiredBalance', type: 'uint256' }
    ],
    name: 'createEvent',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  },
  {
    inputs: [{ name: '_eventId', type: 'uint256' }],
    name: 'purchaseTicket',
    outputs: [],
    payable: true,
    type: 'function'
  },
  {
    inputs: [{ name: '_eventId', type: 'uint256' }],
    name: 'events',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'organizer', type: 'address' },
      { name: 'metadataURI', type: 'string' },
      { name: 'ticketPrice', type: 'uint256' },
      { name: 'maxAttendees', type: 'uint256' },
      { name: 'currentAttendees', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'cancelled', type: 'bool' },
      { name: 'requiredToken', type: 'address' },
      { name: 'requiredBalance', type: 'uint256' }
    ],
    type: 'function'
  }
] as const

export const EVENT_MANAGER_ADDRESS = '0x...' // Your deployed contract address

// Hook for creating events on-chain
export function useCreateEventContract() {
  const { writeContract } = useWriteContract()
  
  const createEvent = async (eventData: {
    metadataURI: string
    ticketPrice: string
    maxAttendees: number
    startTime: Date
    endTime: Date
    requiredToken?: string
    requiredBalance?: string
  }) => {
    const startTimestamp = Math.floor(eventData.startTime.getTime() / 1000)
    const endTimestamp = Math.floor(eventData.endTime.getTime() / 1000)
    
    return writeContract({
      address: EVENT_MANAGER_ADDRESS,
      abi: EVENT_MANAGER_ABI,
      functionName: 'createEvent',
      args: [
        eventData.metadataURI,
        parseEther(eventData.ticketPrice),
        BigInt(eventData.maxAttendees),
        BigInt(startTimestamp),
        BigInt(endTimestamp),
        eventData.requiredToken || '0x0000000000000000000000000000000000000000',
        parseEther(eventData.requiredBalance || '0')
      ]
    })
  }
  
  return { createEvent }
}

// Hook for purchasing tickets
export function usePurchaseTicket() {
  const { writeContract } = useWriteContract()
  
  const purchaseTicket = async (eventId: number, ticketPrice: string) => {
    return writeContract({
      address: EVENT_MANAGER_ADDRESS,
      abi: EVENT_MANAGER_ABI,
      functionName: 'purchaseTicket',
      args: [BigInt(eventId)],
      value: parseEther(ticketPrice)
    })
  }
  
  return { purchaseTicket }
}

// Hook for reading event data
export function useEventContract(eventId: number) {
  const { data: eventData, isLoading } = useReadContract({
    address: EVENT_MANAGER_ADDRESS,
    abi: EVENT_MANAGER_ABI,
    functionName: 'events',
    args: [BigInt(eventId)]
  })
  
  return { eventData, isLoading }
}
```

### Step 4: Enhanced Event Form with Smart Contract Integration

Update `components/EventComponents.tsx`:

```typescript
import { useCreateEventContract } from '@/lib/contracts'
import { uploadToIPFS } from '@/lib/ipfs' // For metadata storage

export function BlockchainEventForm({ onSubmit, onCancel }: {
  onSubmit: (event: any) => void
  onCancel: () => void
}) {
  const [ticketPrice, setTicketPrice] = useState('')
  const [requiresToken, setRequiresToken] = useState(false)
  const [tokenAddress, setTokenAddress] = useState('')
  const [tokenBalance, setTokenBalance] = useState('')
  const [isCreatingOnChain, setIsCreatingOnChain] = useState(false)
  
  const { createEvent } = useCreateEventContract()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingOnChain(true)
    
    try {
      // Upload metadata to IPFS
      const metadata = {
        title,
        description,
        location,
        image: imageUrl,
        attributes: tags.map(tag => ({ trait_type: 'Tag', value: tag }))
      }
      
      const metadataURI = await uploadToIPFS(metadata)
      
      // Create event on smart contract
      const tx = await createEvent({
        metadataURI,
        ticketPrice,
        maxAttendees: parseInt(maxAttendees),
        startTime: new Date(`${date}T${time}`),
        endTime: new Date(`${date}T${time}`), // Add end time logic
        requiredToken: requiresToken ? tokenAddress : undefined,
        requiredBalance: requiresToken ? tokenBalance : undefined
      })
      
      // Also save to Supabase for off-chain data
      const eventData = {
        title,
        description,
        date,
        time,
        location,
        creator: address || '',
        attendees: [],
        maxAttendees: parseInt(maxAttendees),
        tags: tags.split(',').map(t => t.trim()),
        ticketPrice: parseFloat(ticketPrice),
        contractEventId: tx.hash, // Store transaction hash
        blockchainEnabled: true
      }
      
      onSubmit(eventData)
    } catch (error) {
      console.error('Failed to create blockchain event:', error)
    } finally {
      setIsCreatingOnChain(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Existing form fields */}
      
      {/* Blockchain-specific fields */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Ticket Price (ETH)
        </label>
        <input
          type="number"
          step="0.001"
          placeholder="0.1"
          value={ticketPrice}
          onChange={e => setTicketPrice(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="requiresToken"
          checked={requiresToken}
          onChange={e => setRequiresToken(e.target.checked)}
        />
        <label htmlFor="requiresToken">Token-Gated Event</label>
      </div>
      
      {requiresToken && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">
              Required Token Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={tokenAddress}
              onChange={e => setTokenAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Token Balance
            </label>
            <input
              type="number"
              placeholder="1"
              value={tokenBalance}
              onChange={e => setTokenBalance(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </>
      )}
      
      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isCreatingOnChain}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg disabled:opacity-50"
        >
          {isCreatingOnChain ? 'Creating on Blockchain...' : 'Create Event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

### Step 5: Ticket Purchase Component

```typescript
export function TicketPurchaseButton({ event }: { event: Event }) {
  const { address } = useAccount()
  const { purchaseTicket } = usePurchaseTicket()
  const [isPurchasing, setIsPurchasing] = useState(false)
  
  const handlePurchase = async () => {
    if (!address || !event.contractEventId) return
    
    setIsPurchasing(true)
    try {
      await purchaseTicket(event.contractEventId, event.ticketPrice.toString())
      // Update local state or refetch data
    } catch (error) {
      console.error('Failed to purchase ticket:', error)
    } finally {
      setIsPurchasing(false)
    }
  }
  
  return (
    <button
      onClick={handlePurchase}
      disabled={isPurchasing || !address}
      className="bg-green-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
    >
      {isPurchasing ? 'Purchasing...' : `Buy Ticket (${event.ticketPrice} ETH)`}
    </button>
  )
}
```

---

## 🌐 **Deployment Guide**

### Step 1: Deploy Smart Contracts

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  
  const EventManager = await hre.ethers.getContractFactory("EventManager");
  const eventManager = await EventManager.deploy(deployer.address); // Fee recipient
  
  await eventManager.deployed();
  
  console.log("EventManager deployed to:", eventManager.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Step 2: Deploy to Base Network

```bash
npx hardhat run scripts/deploy.js --network base
```

### Step 3: Update Frontend Configuration

```typescript
// lib/config.ts
export const CONTRACTS = {
  EVENT_MANAGER: '0x...' // Your deployed contract address
}

export const SUPPORTED_CHAINS = [base] // Add your target chains
```

---

## 🔐 **Security Considerations**

### Smart Contract Security
- ✅ Use OpenZeppelin contracts for standards
- ✅ Implement reentrancy guards
- ✅ Add access controls
- ✅ Validate all inputs
- ✅ Handle edge cases (cancellations, refunds)

### Frontend Security
- ✅ Validate contract addresses
- ✅ Check transaction status
- ✅ Handle network switches
- ✅ Implement proper error handling
- ✅ Verify signatures

---

## 📊 **Advanced Features**

### 1. **NFT Ticket Integration**
```solidity
// Add to EventManager.sol
mapping(uint256 => address) public eventNFTContracts;

function createEventWithNFT(
    string memory _metadataURI,
    uint256 _ticketPrice,
    uint256 _maxAttendees
) external returns (uint256, address) {
    uint256 eventId = createEvent(_metadataURI, _ticketPrice, _maxAttendees);
    
    // Deploy NFT contract for this event
    EventTicketNFT nftContract = new EventTicketNFT(
        string(abi.encodePacked("Event ", eventId, " Ticket")),
        "TICKET",
        eventId
    );
    
    eventNFTContracts[eventId] = address(nftContract);
    return (eventId, address(nftContract));
}
```

### 2. **Revenue Sharing**
```solidity
mapping(address => uint256) public organizerBalances;

function withdrawEarnings() external {
    uint256 balance = organizerBalances[msg.sender];
    require(balance > 0, "No earnings to withdraw");
    
    organizerBalances[msg.sender] = 0;
    payable(msg.sender).transfer(balance);
}
```

### 3. **Event Analytics**
```typescript
export function useEventAnalytics(eventId: number) {
  const { data: eventData } = useEventContract(eventId)
  const { data: attendees } = useReadContract({
    address: EVENT_MANAGER_ADDRESS,
    abi: EVENT_MANAGER_ABI,
    functionName: 'getEventAttendees',
    args: [BigInt(eventId)]
  })
  
  return {
    totalRevenue: eventData ? formatEther(eventData.ticketPrice * eventData.currentAttendees) : '0',
    attendeeCount: eventData?.currentAttendees || 0,
    attendeesList: attendees || []
  }
}
```

---

## 🚀 **Getting Started**

1. **Deploy the smart contracts** to your chosen network (Base, Ethereum, Polygon)
2. **Update the contract addresses** in your frontend configuration
3. **Test with small amounts** on testnet first
4. **Implement proper error handling** for all blockchain interactions
5. **Add loading states** for better UX during transactions
6. **Consider gas optimization** for frequently called functions

---

## 📚 **Additional Resources**

- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Base Network Documentation](https://docs.base.org/)

Your event management app can now leverage the power of blockchain for transparent, decentralized event management! 🎉
