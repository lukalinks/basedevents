# Complete Onchain Migration Guide for Base Blockchain

## 🚀 **Making Your Event App Completely Onchain on Base**

This comprehensive guide outlines how to transform your event management app into a fully decentralized, onchain application using Base blockchain, maintaining the current user experience while leveraging the benefits of blockchain technology.

---

## 📋 **Current State Analysis**

### **Existing Infrastructure**
- **Frontend**: Next.js 15 with React
- **Blockchain**: Base network integration via OnChainKit
- **Wallet**: Wagmi v2 + OnChainKit + MiniKit integration
- **Database**: Supabase PostgreSQL (centralized)
- **Authentication**: Wallet-based (address-based)
- **Payments**: USDC payments via OnChainKit
- **Name Resolution**: Base name (ENS) integration

### **Currently Onchain**
✅ Wallet authentication  
✅ USDC payments for events  
✅ Base name resolution  

### **Currently Offchain (To Migrate)**
❌ Event metadata storage  
❌ Event registration data  
❌ User profiles  
❌ Comments system  
❌ Event discovery/indexing  
❌ Image storage  

---

## 🎯 **Complete Onchain Migration Strategy**

### **Phase 1: Core Smart Contract Infrastructure** (2-3 weeks)
1. Deploy event management smart contracts
2. Implement NFT-based event tickets
3. Create event registry contract
4. Set up IPFS for metadata storage

### **Phase 2: Event Lifecycle Management** (3-4 weeks)
1. Onchain event creation and updates
2. Decentralized registration system
3. Automated refund mechanisms
4. Event attendance verification

### **Phase 3: Advanced Features** (2-3 weeks)
1. Onchain governance for disputes
2. Reputation system for organizers
3. Cross-event token utilities
4. DeFi integrations (staking, liquidity)

### **Phase 4: Full Decentralization** (1-2 weeks)
1. IPFS-based frontend hosting
2. Subgraph for event indexing
3. Decentralized notifications
4. DAO governance structure

---

## 🏗️ **Smart Contract Architecture**

### **1. Event Manager Contract (Core)**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EventManager is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    IERC20 public usdcToken;
    Counters.Counter private _eventIdCounter;
    
    struct Event {
        uint256 id;
        address organizer;
        string metadataURI; // IPFS hash containing all event details
        uint256 ticketPrice; // Price in USDC (wei)
        uint256 maxAttendees;
        uint256 currentAttendees;
        uint256 startTime;
        uint256 endTime;
        uint256 registrationDeadline;
        bool cancelled;
        bool paused;
        address requiredToken; // For token-gated events
        uint256 requiredBalance; // Minimum balance required
        uint256 organizerStake; // Organizer's stake for reputation
    }
    
    struct Registration {
        address attendee;
        uint256 timestamp;
        bool refunded;
        string encryptedDetails; // Encrypted personal info
    }
    
    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => Registration)) public registrations;
    mapping(uint256 => address[]) public eventAttendees;
    mapping(address => uint256[]) public userEvents;
    mapping(address => uint256) public organizerReputation;
    
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string metadataURI,
        uint256 ticketPrice
    );
    
    event RegistrationComplete(
        uint256 indexed eventId,
        address indexed attendee,
        uint256 amountPaid
    );
    
    event EventCancelled(uint256 indexed eventId, uint256 refundAmount);
    
    event ReputationUpdated(address indexed organizer, uint256 newRep);
    
    modifier eventExists(uint256 eventId) {
        require(events[eventId].organizer != address(0), "Event does not exist");
        _;
    }
    
    modifier onlyOrganizer(uint256 eventId) {
        require(events[eventId].organizer == msg.sender, "Not event organizer");
        _;
    }
    
    modifier eventNotCancelled(uint256 eventId) {
        require(!events[eventId].cancelled, "Event is cancelled");
        _;
    }
    
    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @dev Create a new event
     * @param metadataURI IPFS hash containing event details
     * @param ticketPrice Price in USDC wei
     * @param maxAttendees Maximum number of attendees
     * @param startTime Event start timestamp
     * @param endTime Event end timestamp
     * @param registrationDeadline Registration deadline timestamp
     * @param requiredToken Token address for gating (address(0) for no gating)
     * @param requiredBalance Minimum token balance required
     * @param organizerStake Amount organizer stakes for reputation
     */
    function createEvent(
        string memory metadataURI,
        uint256 ticketPrice,
        uint256 maxAttendees,
        uint256 startTime,
        uint256 endTime,
        uint256 registrationDeadline,
        address requiredToken,
        uint256 requiredBalance,
        uint256 organizerStake
    ) external nonReentrant {
        require(startTime > block.timestamp, "Start time must be in future");
        require(endTime > startTime, "End time must be after start time");
        require(registrationDeadline <= startTime, "Registration deadline invalid");
        require(maxAttendees > 0, "Max attendees must be greater than 0");
        
        uint256 eventId = _eventIdCounter.current();
        _eventIdCounter.increment();
        
        // Collect organizer stake if provided
        if (organizerStake > 0) {
            require(
                usdcToken.transferFrom(msg.sender, address(this), organizerStake),
                "Stake transfer failed"
            );
        }
        
        events[eventId] = Event({
            id: eventId,
            organizer: msg.sender,
            metadataURI: metadataURI,
            ticketPrice: ticketPrice,
            maxAttendees: maxAttendees,
            currentAttendees: 0,
            startTime: startTime,
            endTime: endTime,
            registrationDeadline: registrationDeadline,
            cancelled: false,
            paused: false,
            requiredToken: requiredToken,
            requiredBalance: requiredBalance,
            organizerStake: organizerStake
        });
        
        userEvents[msg.sender].push(eventId);
        
        emit EventCreated(eventId, msg.sender, metadataURI, ticketPrice);
    }
    
    /**
     * @dev Register for an event
     * @param eventId Event ID to register for
     * @param encryptedDetails Encrypted personal details
     */
    function registerForEvent(
        uint256 eventId,
        string memory encryptedDetails
    ) external nonReentrant eventExists(eventId) eventNotCancelled(eventId) {
        Event storage eventData = events[eventId];
        
        require(block.timestamp <= eventData.registrationDeadline, "Registration closed");
        require(eventData.currentAttendees < eventData.maxAttendees, "Event is full");
        require(registrations[eventId][msg.sender].attendee == address(0), "Already registered");
        require(!eventData.paused, "Event registration paused");
        
        // Check token gating requirements
        if (eventData.requiredToken != address(0)) {
            require(
                IERC20(eventData.requiredToken).balanceOf(msg.sender) >= eventData.requiredBalance,
                "Insufficient token balance for gated event"
            );
        }
        
        // Process payment
        if (eventData.ticketPrice > 0) {
            require(
                usdcToken.transferFrom(msg.sender, address(this), eventData.ticketPrice),
                "Payment failed"
            );
        }
        
        // Register user
        registrations[eventId][msg.sender] = Registration({
            attendee: msg.sender,
            timestamp: block.timestamp,
            refunded: false,
            encryptedDetails: encryptedDetails
        });
        
        eventAttendees[eventId].push(msg.sender);
        events[eventId].currentAttendees++;
        
        emit RegistrationComplete(eventId, msg.sender, eventData.ticketPrice);
    }
    
    /**
     * @dev Cancel an event and process refunds
     * @param eventId Event ID to cancel
     */
    function cancelEvent(uint256 eventId) 
        external 
        onlyOrganizer(eventId) 
        eventExists(eventId) 
        eventNotCancelled(eventId) 
        nonReentrant 
    {
        Event storage eventData = events[eventId];
        eventData.cancelled = true;
        
        uint256 totalRefunds = 0;
        address[] memory attendees = eventAttendees[eventId];
        
        // Process refunds for all attendees
        for (uint256 i = 0; i < attendees.length; i++) {
            address attendee = attendees[i];
            Registration storage reg = registrations[eventId][attendee];
            
            if (!reg.refunded && eventData.ticketPrice > 0) {
                reg.refunded = true;
                totalRefunds += eventData.ticketPrice;
                require(usdcToken.transfer(attendee, eventData.ticketPrice), "Refund failed");
            }
        }
        
        // Slash organizer stake if event was cancelled too late
        if (block.timestamp > eventData.registrationDeadline) {
            // Reduce organizer reputation
            if (organizerReputation[msg.sender] > 10) {
                organizerReputation[msg.sender] -= 10;
            } else {
                organizerReputation[msg.sender] = 0;
            }
            emit ReputationUpdated(msg.sender, organizerReputation[msg.sender]);
        } else {
            // Return stake if cancelled early
            if (eventData.organizerStake > 0) {
                require(usdcToken.transfer(msg.sender, eventData.organizerStake), "Stake return failed");
            }
        }
        
        emit EventCancelled(eventId, totalRefunds);
    }
    
    /**
     * @dev Withdraw earnings after event completion
     * @param eventId Event ID to withdraw from
     */
    function withdrawEarnings(uint256 eventId) 
        external 
        onlyOrganizer(eventId) 
        eventExists(eventId) 
        eventNotCancelled(eventId) 
        nonReentrant 
    {
        Event storage eventData = events[eventId];
        require(block.timestamp > eventData.endTime, "Event not yet ended");
        
        uint256 earnings = eventData.currentAttendees * eventData.ticketPrice;
        if (earnings > 0) {
            require(usdcToken.transfer(msg.sender, earnings), "Withdrawal failed");
        }
        
        // Return organizer stake and increase reputation
        if (eventData.organizerStake > 0) {
            require(usdcToken.transfer(msg.sender, eventData.organizerStake), "Stake return failed");
        }
        
        organizerReputation[msg.sender] += 1;
        emit ReputationUpdated(msg.sender, organizerReputation[msg.sender]);
    }
    
    // View functions
    function getEvent(uint256 eventId) external view returns (Event memory) {
        return events[eventId];
    }
    
    function getEventAttendees(uint256 eventId) external view returns (address[] memory) {
        return eventAttendees[eventId];
    }
    
    function getUserEvents(address user) external view returns (uint256[] memory) {
        return userEvents[user];
    }
    
    function isRegistered(uint256 eventId, address user) external view returns (bool) {
        return registrations[eventId][user].attendee != address(0);
    }
    
    function getTotalEvents() external view returns (uint256) {
        return _eventIdCounter.current();
    }
}
```

### **2. Event Ticket NFT Contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EventTicketNFT is ERC721, ERC721URIStorage, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    struct Ticket {
        uint256 eventId;
        address originalOwner;
        uint256 mintTimestamp;
        bool used;
        string seatInfo; // Optional seat/section info
    }
    
    mapping(uint256 => Ticket) public tickets;
    mapping(uint256 => uint256[]) public eventTickets; // eventId => tokenIds
    mapping(address => bool) public authorizedMinters;
    
    event TicketMinted(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed owner
    );
    
    event TicketUsed(uint256 indexed tokenId, uint256 indexed eventId);
    
    modifier onlyAuthorized() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    constructor() ERC721("EventTicket", "TICKET") {}
    
    function addAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
    }
    
    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
    }
    
    /**
     * @dev Mint a ticket NFT for an event
     * @param to Ticket recipient
     * @param eventId Event ID
     * @param tokenURI Metadata URI for the ticket
     * @param seatInfo Optional seat information
     */
    function mintTicket(
        address to,
        uint256 eventId,
        string memory tokenURI,
        string memory seatInfo
    ) external onlyAuthorized nonReentrant {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        tickets[tokenId] = Ticket({
            eventId: eventId,
            originalOwner: to,
            mintTimestamp: block.timestamp,
            used: false,
            seatInfo: seatInfo
        });
        
        eventTickets[eventId].push(tokenId);
        
        emit TicketMinted(tokenId, eventId, to);
    }
    
    /**
     * @dev Mark a ticket as used (for event check-in)
     * @param tokenId Ticket token ID
     */
    function useTicket(uint256 tokenId) external onlyAuthorized {
        require(_exists(tokenId), "Ticket does not exist");
        require(!tickets[tokenId].used, "Ticket already used");
        
        tickets[tokenId].used = true;
        emit TicketUsed(tokenId, tickets[tokenId].eventId);
    }
    
    /**
     * @dev Check if a ticket is valid and unused
     * @param tokenId Ticket token ID
     * @return bool Ticket validity
     */
    function isTicketValid(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId) && !tickets[tokenId].used;
    }
    
    /**
     * @dev Get all tickets for an event
     * @param eventId Event ID
     * @return uint256[] Array of token IDs
     */
    function getEventTickets(uint256 eventId) external view returns (uint256[] memory) {
        return eventTickets[eventId];
    }
    
    /**
     * @dev Get ticket details
     * @param tokenId Ticket token ID
     * @return Ticket struct
     */
    function getTicket(uint256 tokenId) external view returns (Ticket memory) {
        require(_exists(tokenId), "Ticket does not exist");
        return tickets[tokenId];
    }
    
    // Override required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### **3. Event Comments & Social Contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EventSocial is ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _commentIdCounter;
    
    struct Comment {
        uint256 id;
        uint256 eventId;
        address author;
        string content; // IPFS hash for longer content
        uint256 timestamp;
        uint256 likes;
        uint256 parentId; // For replies (0 if top-level)
        bool deleted;
    }
    
    struct Rating {
        address rater;
        uint8 score; // 1-5 stars
        string review; // IPFS hash
        uint256 timestamp;
    }
    
    mapping(uint256 => Comment) public comments;
    mapping(uint256 => uint256[]) public eventComments;
    mapping(uint256 => mapping(address => bool)) public commentLikes;
    mapping(uint256 => mapping(address => Rating)) public eventRatings;
    mapping(uint256 => uint256) public eventRatingTotals;
    mapping(uint256 => uint256) public eventRatingCounts;
    
    event CommentPosted(
        uint256 indexed commentId,
        uint256 indexed eventId,
        address indexed author,
        uint256 parentId
    );
    
    event CommentLiked(uint256 indexed commentId, address indexed liker);
    event CommentUnliked(uint256 indexed commentId, address indexed unliker);
    
    event EventRated(
        uint256 indexed eventId,
        address indexed rater,
        uint8 score
    );
    
    /**
     * @dev Post a comment on an event
     * @param eventId Event ID
     * @param content Comment content (or IPFS hash)
     * @param parentId Parent comment ID (0 for top-level)
     */
    function postComment(
        uint256 eventId,
        string memory content,
        uint256 parentId
    ) external nonReentrant {
        uint256 commentId = _commentIdCounter.current();
        _commentIdCounter.increment();
        
        comments[commentId] = Comment({
            id: commentId,
            eventId: eventId,
            author: msg.sender,
            content: content,
            timestamp: block.timestamp,
            likes: 0,
            parentId: parentId,
            deleted: false
        });
        
        eventComments[eventId].push(commentId);
        
        emit CommentPosted(commentId, eventId, msg.sender, parentId);
    }
    
    /**
     * @dev Like or unlike a comment
     * @param commentId Comment ID to like/unlike
     */
    function toggleCommentLike(uint256 commentId) external {
        require(commentId < _commentIdCounter.current(), "Comment does not exist");
        require(!comments[commentId].deleted, "Comment is deleted");
        
        if (commentLikes[commentId][msg.sender]) {
            // Unlike
            commentLikes[commentId][msg.sender] = false;
            comments[commentId].likes--;
            emit CommentUnliked(commentId, msg.sender);
        } else {
            // Like
            commentLikes[commentId][msg.sender] = true;
            comments[commentId].likes++;
            emit CommentLiked(commentId, msg.sender);
        }
    }
    
    /**
     * @dev Rate an event (only after it ends)
     * @param eventId Event ID to rate
     * @param score Rating score (1-5)
     * @param review Review content (IPFS hash)
     */
    function rateEvent(
        uint256 eventId,
        uint8 score,
        string memory review
    ) external {
        require(score >= 1 && score <= 5, "Score must be 1-5");
        
        Rating storage existingRating = eventRatings[eventId][msg.sender];
        
        if (existingRating.rater != address(0)) {
            // Update existing rating
            eventRatingTotals[eventId] = eventRatingTotals[eventId] - existingRating.score + score;
            existingRating.score = score;
            existingRating.review = review;
            existingRating.timestamp = block.timestamp;
        } else {
            // New rating
            eventRatings[eventId][msg.sender] = Rating({
                rater: msg.sender,
                score: score,
                review: review,
                timestamp: block.timestamp
            });
            eventRatingTotals[eventId] += score;
            eventRatingCounts[eventId]++;
        }
        
        emit EventRated(eventId, msg.sender, score);
    }
    
    /**
     * @dev Get average rating for an event
     * @param eventId Event ID
     * @return average rating (scaled by 100, e.g., 450 = 4.5 stars)
     */
    function getEventRating(uint256 eventId) external view returns (uint256) {
        if (eventRatingCounts[eventId] == 0) return 0;
        return (eventRatingTotals[eventId] * 100) / eventRatingCounts[eventId];
    }
    
    /**
     * @dev Get comments for an event
     * @param eventId Event ID
     * @return Array of comment IDs
     */
    function getEventComments(uint256 eventId) external view returns (uint256[] memory) {
        return eventComments[eventId];
    }
    
    /**
     * @dev Check if user liked a comment
     * @param commentId Comment ID
     * @param user User address
     * @return bool Like status
     */
    function hasUserLikedComment(uint256 commentId, address user) external view returns (bool) {
        return commentLikes[commentId][user];
    }
}
```

---

## 🗄️ **IPFS Integration for Decentralized Storage**

### **Event Metadata Schema**

```typescript
// types/ipfs.ts
export interface EventMetadata {
  title: string;
  description: string;
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    virtual?: {
      platform: string;
      link: string;
    };
  };
  datetime: {
    start: string; // ISO string
    end: string;
    timezone: string;
  };
  organizer: {
    address: string;
    name?: string;
    bio?: string;
    social?: {
      twitter?: string;
      farcaster?: string;
      website?: string;
    };
  };
  category: string;
  tags: string[];
  images: {
    hero: string; // IPFS hash
    gallery?: string[]; // Array of IPFS hashes
  };
  requirements?: {
    ageLimit?: number;
    accessCodes?: string[];
    prerequisites?: string[];
  };
  schedule?: {
    time: string;
    activity: string;
    speaker?: string;
  }[];
  sponsors?: {
    name: string;
    logo: string; // IPFS hash
    website?: string;
    tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  }[];
  version: string; // Schema version
  created: string; // ISO timestamp
}
```

### **IPFS Upload Service**

```typescript
// lib/ipfs.ts
import { create } from 'ipfs-http-client';

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

class IPFSService {
  private client;

  constructor() {
    // Use Pinata for better reliability
    this.client = create({
      url: 'https://api.pinata.cloud',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    });
  }

  /**
   * Upload event metadata to IPFS
   */
  async uploadEventMetadata(metadata: EventMetadata): Promise<string> {
    try {
      const result = await this.client.add(JSON.stringify(metadata), {
        pin: true,
        cidVersion: 1,
      });
      
      console.log('Event metadata uploaded to IPFS:', result.cid.toString());
      return result.cid.toString();
    } catch (error) {
      console.error('Failed to upload to IPFS:', error);
      throw new Error('IPFS upload failed');
    }
  }

  /**
   * Upload image to IPFS
   */
  async uploadImage(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const result = await this.client.add(buffer, {
        pin: true,
        cidVersion: 1,
      });
      
      return result.cid.toString();
    } catch (error) {
      console.error('Failed to upload image to IPFS:', error);
      throw new Error('Image upload failed');
    }
  }

  /**
   * Retrieve metadata from IPFS
   */
  async getEventMetadata(cid: string): Promise<EventMetadata> {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch from IPFS');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to retrieve from IPFS:', error);
      throw new Error('IPFS retrieval failed');
    }
  }

  /**
   * Get IPFS gateway URL for an image
   */
  getImageUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
}

export const ipfsService = new IPFSService();
```

---

## 📊 **The Graph Subgraph for Event Indexing**

### **Subgraph Schema**

```graphql
# schema.graphql
type Event @entity {
  id: ID!
  eventId: BigInt!
  organizer: Bytes!
  metadataURI: String!
  ticketPrice: BigInt!
  maxAttendees: BigInt!
  currentAttendees: BigInt!
  startTime: BigInt!
  endTime: BigInt!
  registrationDeadline: BigInt!
  cancelled: Boolean!
  paused: Boolean!
  requiredToken: Bytes
  requiredBalance: BigInt
  organizerStake: BigInt!
  createdAt: BigInt!
  updatedAt: BigInt!
  
  # Derived fields
  registrations: [Registration!]! @derivedFrom(field: "event")
  comments: [Comment!]! @derivedFrom(field: "event")
  tickets: [Ticket!]! @derivedFrom(field: "event")
  
  # Computed fields
  averageRating: BigDecimal
  totalRatings: BigInt!
  isActive: Boolean!
  isFull: Boolean!
}

type Registration @entity {
  id: ID!
  event: Event!
  attendee: Bytes!
  timestamp: BigInt!
  refunded: Boolean!
  amountPaid: BigInt!
  transactionHash: Bytes!
}

type Comment @entity {
  id: ID!
  commentId: BigInt!
  event: Event!
  author: Bytes!
  content: String!
  timestamp: BigInt!
  likes: BigInt!
  parentId: BigInt
  deleted: Boolean!
}

type Ticket @entity {
  id: ID!
  tokenId: BigInt!
  event: Event!
  owner: Bytes!
  originalOwner: Bytes!
  mintTimestamp: BigInt!
  used: Boolean!
  seatInfo: String
}

type Organizer @entity {
  id: ID! # address
  address: Bytes!
  reputation: BigInt!
  totalEvents: BigInt!
  totalEarnings: BigInt!
  averageRating: BigDecimal
  
  # Derived fields
  events: [Event!]! @derivedFrom(field: "organizer")
}

type GlobalStats @entity {
  id: ID! # "global"
  totalEvents: BigInt!
  totalRegistrations: BigInt!
  totalVolume: BigInt!
  totalActiveEvents: BigInt!
  lastUpdated: BigInt!
}
```

### **Subgraph Mappings**

```typescript
// src/mapping.ts
import { 
  EventCreated,
  RegistrationComplete,
  EventCancelled,
  ReputationUpdated
} from "../generated/EventManager/EventManager";
import { 
  Event,
  Registration,
  Organizer,
  GlobalStats
} from "../generated/schema";
import { BigInt, Address } from "@graphprotocol/graph-ts";

export function handleEventCreated(event: EventCreated): void {
  let entity = new Event(event.params.eventId.toString());
  
  entity.eventId = event.params.eventId;
  entity.organizer = event.params.organizer;
  entity.metadataURI = event.params.metadataURI;
  entity.ticketPrice = event.params.ticketPrice;
  entity.createdAt = event.block.timestamp;
  entity.updatedAt = event.block.timestamp;
  entity.totalRatings = BigInt.fromI32(0);
  entity.isActive = true;
  entity.isFull = false;
  
  // Update organizer stats
  let organizer = Organizer.load(event.params.organizer.toHex());
  if (organizer == null) {
    organizer = new Organizer(event.params.organizer.toHex());
    organizer.address = event.params.organizer;
    organizer.reputation = BigInt.fromI32(0);
    organizer.totalEvents = BigInt.fromI32(0);
    organizer.totalEarnings = BigInt.fromI32(0);
  }
  
  organizer.totalEvents = organizer.totalEvents.plus(BigInt.fromI32(1));
  organizer.save();
  
  // Update global stats
  let stats = GlobalStats.load("global");
  if (stats == null) {
    stats = new GlobalStats("global");
    stats.totalEvents = BigInt.fromI32(0);
    stats.totalRegistrations = BigInt.fromI32(0);
    stats.totalVolume = BigInt.fromI32(0);
    stats.totalActiveEvents = BigInt.fromI32(0);
  }
  
  stats.totalEvents = stats.totalEvents.plus(BigInt.fromI32(1));
  stats.totalActiveEvents = stats.totalActiveEvents.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
  
  entity.save();
}

export function handleRegistrationComplete(event: RegistrationComplete): void {
  let registrationId = event.params.eventId.toString() + "-" + event.params.attendee.toHex();
  let registration = new Registration(registrationId);
  
  registration.event = event.params.eventId.toString();
  registration.attendee = event.params.attendee;
  registration.timestamp = event.block.timestamp;
  registration.refunded = false;
  registration.amountPaid = event.params.amountPaid;
  registration.transactionHash = event.transaction.hash;
  
  registration.save();
  
  // Update event stats
  let eventEntity = Event.load(event.params.eventId.toString());
  if (eventEntity != null) {
    eventEntity.currentAttendees = eventEntity.currentAttendees.plus(BigInt.fromI32(1));
    eventEntity.isFull = eventEntity.currentAttendees.equals(eventEntity.maxAttendees);
    eventEntity.updatedAt = event.block.timestamp;
    eventEntity.save();
  }
  
  // Update global stats
  let stats = GlobalStats.load("global");
  if (stats != null) {
    stats.totalRegistrations = stats.totalRegistrations.plus(BigInt.fromI32(1));
    stats.totalVolume = stats.totalVolume.plus(event.params.amountPaid);
    stats.lastUpdated = event.block.timestamp;
    stats.save();
  }
}

// Additional handlers for other events...
```

---

## 🔧 **Frontend Integration**

### **Blockchain Service Layer**

```typescript
// lib/blockchain.ts
import { Contract, ethers } from 'ethers';
import { useContractWrite, useContractRead, useAccount } from 'wagmi';
import { base } from 'wagmi/chains';
import { EventMetadata } from '../types/ipfs';
import { ipfsService } from './ipfs';

// Contract addresses (deploy these first)
export const CONTRACTS = {
  EVENT_MANAGER: '0x...', // Your deployed EventManager contract
  EVENT_TICKET_NFT: '0x...', // Your deployed EventTicketNFT contract
  EVENT_SOCIAL: '0x...', // Your deployed EventSocial contract
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
};

// Contract ABIs (import from your build artifacts)
import EventManagerABI from '../contracts/EventManager.json';
import EventTicketNFTABI from '../contracts/EventTicketNFT.json';
import EventSocialABI from '../contracts/EventSocial.json';

export class BlockchainEventService {
  private provider: ethers.providers.Provider;
  
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
    );
  }

  /**
   * Create a new event onchain
   */
  async createEvent(
    eventData: Omit<EventMetadata, 'version' | 'created'>,
    ticketPriceUSDC: number,
    maxAttendees: number,
    organizerStake: number = 0
  ) {
    try {
      // 1. Upload metadata to IPFS
      const metadata: EventMetadata = {
        ...eventData,
        version: '1.0.0',
        created: new Date().toISOString(),
      };
      
      const metadataURI = await ipfsService.uploadEventMetadata(metadata);
      
      // 2. Prepare contract parameters
      const ticketPrice = ethers.utils.parseUnits(ticketPriceUSDC.toString(), 6); // USDC has 6 decimals
      const stake = ethers.utils.parseUnits(organizerStake.toString(), 6);
      const startTime = Math.floor(new Date(eventData.datetime.start).getTime() / 1000);
      const endTime = Math.floor(new Date(eventData.datetime.end).getTime() / 1000);
      const registrationDeadline = startTime - (24 * 60 * 60); // 24 hours before
      
      // 3. Return contract call parameters for wagmi
      return {
        address: CONTRACTS.EVENT_MANAGER as `0x${string}`,
        abi: EventManagerABI,
        functionName: 'createEvent',
        args: [
          metadataURI,
          ticketPrice,
          maxAttendees,
          startTime,
          endTime,
          registrationDeadline,
          ethers.constants.AddressZero, // No token gating
          0, // No required balance
          stake,
        ],
      };
    } catch (error) {
      console.error('Error preparing event creation:', error);
      throw error;
    }
  }

  /**
   * Register for an event
   */
  async registerForEvent(
    eventId: number,
    userDetails: {
      name: string;
      email: string;
      phone?: string;
      bio?: string;
    }
  ) {
    try {
      // Encrypt user details (simple example - use proper encryption in production)
      const encryptedDetails = btoa(JSON.stringify(userDetails));
      
      return {
        address: CONTRACTS.EVENT_MANAGER as `0x${string}`,
        abi: EventManagerABI,
        functionName: 'registerForEvent',
        args: [eventId, encryptedDetails],
      };
    } catch (error) {
      console.error('Error preparing registration:', error);
      throw error;
    }
  }

  /**
   * Get event details from blockchain and IPFS
   */
  async getEventDetails(eventId: number): Promise<EventMetadata & { 
    onchainData: any;
    registrationCount: number;
  }> {
    try {
      // Get onchain data
      const contract = new Contract(
        CONTRACTS.EVENT_MANAGER,
        EventManagerABI,
        this.provider
      );
      
      const onchainData = await contract.getEvent(eventId);
      
      // Get metadata from IPFS
      const metadata = await ipfsService.getEventMetadata(onchainData.metadataURI);
      
      return {
        ...metadata,
        onchainData,
        registrationCount: onchainData.currentAttendees.toNumber(),
      };
    } catch (error) {
      console.error('Error fetching event details:', error);
      throw error;
    }
  }
}

export const blockchainEventService = new BlockchainEventService();
```

### **React Hooks for Blockchain Interaction**

```typescript
// hooks/useEvents.ts
import { useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi';
import { useState, useEffect } from 'react';
import { blockchainEventService, CONTRACTS } from '../lib/blockchain';
import EventManagerABI from '../contracts/EventManager.json';

export function useCreateEvent() {
  const [isCreating, setIsCreating] = useState(false);
  
  const { writeAsync } = useContractWrite({
    address: CONTRACTS.EVENT_MANAGER as `0x${string}`,
    abi: EventManagerABI,
    functionName: 'createEvent',
  });

  const createEvent = async (eventData: any) => {
    try {
      setIsCreating(true);
      
      // Prepare contract parameters
      const contractParams = await blockchainEventService.createEvent(
        eventData.metadata,
        eventData.ticketPrice,
        eventData.maxAttendees,
        eventData.organizerStake
      );
      
      // Execute transaction
      const tx = await writeAsync({
        args: contractParams.args,
      });
      
      console.log('Event creation transaction:', tx.hash);
      return tx;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return { createEvent, isCreating };
}

export function useRegisterForEvent() {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const { writeAsync } = useContractWrite({
    address: CONTRACTS.EVENT_MANAGER as `0x${string}`,
    abi: EventManagerABI,
    functionName: 'registerForEvent',
  });

  const register = async (eventId: number, userDetails: any) => {
    try {
      setIsRegistering(true);
      
      const contractParams = await blockchainEventService.registerForEvent(
        eventId,
        userDetails
      );
      
      const tx = await writeAsync({
        args: contractParams.args,
      });
      
      return tx;
    } catch (error) {
      console.error('Failed to register for event:', error);
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  return { register, isRegistering };
}

export function useEventDetails(eventId: number) {
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const details = await blockchainEventService.getEventDetails(eventId);
        setEventDetails(details);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  return { eventDetails, loading, error };
}

export function useEventList() {
  const { data: totalEvents } = useContractRead({
    address: CONTRACTS.EVENT_MANAGER as `0x${string}`,
    abi: EventManagerABI,
    functionName: 'getTotalEvents',
  });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!totalEvents) return;

    const fetchAllEvents = async () => {
      try {
        setLoading(true);
        const eventPromises = [];
        
        for (let i = 0; i < totalEvents.toNumber(); i++) {
          eventPromises.push(blockchainEventService.getEventDetails(i));
        }
        
        const allEvents = await Promise.all(eventPromises);
        setEvents(allEvents.filter(event => !event.onchainData.cancelled));
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllEvents();
  }, [totalEvents]);

  return { events, loading };
}
```

---

## 🚀 **Deployment & Setup Instructions**

### **1. Smart Contract Deployment**

```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts to Base network...");

  // Deploy USDC token (or use existing Base USDC)
  const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

  // Deploy EventManager
  const EventManager = await ethers.getContractFactory("EventManager");
  const eventManager = await EventManager.deploy(usdcAddress);
  await eventManager.deployed();
  console.log("EventManager deployed to:", eventManager.address);

  // Deploy EventTicketNFT
  const EventTicketNFT = await ethers.getContractFactory("EventTicketNFT");
  const eventTicketNFT = await EventTicketNFT.deploy();
  await eventTicketNFT.deployed();
  console.log("EventTicketNFT deployed to:", eventTicketNFT.address);

  // Deploy EventSocial
  const EventSocial = await ethers.getContractFactory("EventSocial");
  const eventSocial = await EventSocial.deploy();
  await eventSocial.deployed();
  console.log("EventSocial deployed to:", eventSocial.address);

  // Set up permissions
  await eventTicketNFT.addAuthorizedMinter(eventManager.address);
  console.log("EventManager authorized to mint tickets");

  // Verify contracts on Basescan
  console.log("\nVerification commands:");
  console.log(`npx hardhat verify --network base ${eventManager.address} ${usdcAddress}`);
  console.log(`npx hardhat verify --network base ${eventTicketNFT.address}`);
  console.log(`npx hardhat verify --network base ${eventSocial.address}`);

  // Save addresses for frontend
  const addresses = {
    EventManager: eventManager.address,
    EventTicketNFT: eventTicketNFT.address,
    EventSocial: eventSocial.address,
    USDC: usdcAddress,
  };

  console.log("\nContract addresses:", addresses);
  
  // Write to file for frontend import
  const fs = require('fs');
  fs.writeFileSync(
    './contract-addresses.json',
    JSON.stringify(addresses, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### **2. Environment Configuration**

```bash
# .env.local
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
NEXT_PUBLIC_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/your-username/event-app
NEXT_PUBLIC_CONTRACT_EVENT_MANAGER=0x...
NEXT_PUBLIC_CONTRACT_EVENT_TICKET_NFT=0x...
NEXT_PUBLIC_CONTRACT_EVENT_SOCIAL=0x...

# Blockchain
PRIVATE_KEY=your_deployer_private_key
BASESCAN_API_KEY=your_basescan_api_key

# IPFS
IPFS_GATEWAY=https://gateway.pinata.cloud
```

### **3. Package.json Scripts**

```json
{
  "scripts": {
    "deploy:contracts": "hardhat run scripts/deploy.ts --network base",
    "verify:contracts": "hardhat run scripts/verify.ts --network base",
    "deploy:subgraph": "graph deploy --studio event-app-base",
    "build:subgraph": "graph codegen && graph build",
    "test:contracts": "hardhat test",
    "deploy:ipfs": "npm run build && ipfs add -r ./out",
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

---

## 📈 **Migration Timeline & Phases**

### **Phase 1: Foundation (Weeks 1-3)**
- [ ] Deploy smart contracts to Base testnet
- [ ] Set up IPFS integration with Pinata
- [ ] Create basic event creation flow (onchain)
- [ ] Implement event registration (onchain)
- [ ] Test with small events

### **Phase 2: Core Features (Weeks 4-6)**
- [ ] Deploy to Base mainnet
- [ ] Implement NFT ticket system
- [ ] Add onchain comments and ratings
- [ ] Create The Graph subgraph
- [ ] Build event discovery interface

### **Phase 3: Advanced Features (Weeks 7-9)**
- [ ] Add token-gating capabilities
- [ ] Implement organizer reputation system
- [ ] Create automated refund mechanisms
- [ ] Add event analytics dashboard
- [ ] Implement cross-event features

### **Phase 4: Full Decentralization (Weeks 10-12)**
- [ ] Deploy frontend to IPFS
- [ ] Implement DAO governance
- [ ] Add DeFi integrations (yield farming)
- [ ] Create mobile app with wallet integration
- [ ] Launch community incentives

---

## 💰 **Economic Model & Tokenomics**

### **Revenue Streams (Decentralized)**
1. **Platform Fee**: 2.5% of ticket sales (split between DAO treasury and stakers)
2. **Premium Features**: Governance token required for advanced features
3. **NFT Marketplace**: Secondary ticket sales (1% fee)
4. **Staking Rewards**: Lock platform tokens for enhanced features

### **Token Distribution**
```
Total Supply: 100M EVENTS tokens

Community: 40% (40M tokens)
- Users: 25% (airdrops, participation rewards)
- Organizers: 15% (event hosting rewards)

Development: 30% (30M tokens)
- Team: 20% (4-year vesting)
- Advisors: 5% (2-year vesting)
- Future Development: 5%

Ecosystem: 30% (30M tokens)
- DAO Treasury: 20%
- Liquidity Mining: 10%
```

### **Utility Token Use Cases**
- **Governance**: Vote on platform changes
- **Staking**: Enhanced features and reduced fees
- **Payment**: Alternative payment method for events
- **Rewards**: Earn tokens for hosting successful events
- **Access**: Premium features and exclusive events

---

## 🛡️ **Security & Best Practices**

### **Smart Contract Security**
- [ ] Multi-signature wallet for contract ownership
- [ ] Time-locked upgrades (48-hour delay)
- [ ] Emergency pause mechanisms
- [ ] Regular security audits
- [ ] Bug bounty program

### **Data Privacy**
- [ ] Encrypt sensitive user data before storing onchain
- [ ] Use zero-knowledge proofs for private event details
- [ ] GDPR compliance through data minimization
- [ ] User consent management

### **Operational Security**
- [ ] Decentralized infrastructure (no single points of failure)
- [ ] Regular backups of IPFS data
- [ ] Monitoring and alerting systems
- [ ] Incident response procedures

---

## 📚 **Developer Resources**

### **Documentation Structure**
```
docs/
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── examples.md
├── smart-contracts/
│   ├── event-manager.md
│   ├── ticket-nft.md
│   └── social.md
├── apis/
│   ├── blockchain-service.md
│   ├── ipfs-integration.md
│   └── subgraph-queries.md
├── guides/
│   ├── creating-events.md
│   ├── token-gating.md
│   └── custom-features.md
└── reference/
    ├── contract-addresses.md
    ├── event-schemas.md
    └── error-codes.md
```

### **Testing Framework**
```typescript
// test/integration.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { BlockchainEventService } from "../lib/blockchain";

describe("Event Lifecycle Integration", function () {
  let eventManager: Contract;
  let usdcToken: Contract;
  let organizer: SignerWithAddress;
  let attendee: SignerWithAddress;

  beforeEach(async function () {
    // Deploy contracts and set up test environment
  });

  it("Should create an event and allow registration", async function () {
    // Test complete event creation and registration flow
  });

  it("Should handle event cancellation and refunds", async function () {
    // Test cancellation and refund mechanisms
  });

  it("Should prevent double registration", async function () {
    // Test duplicate registration prevention
  });
});
```

---

## 🎉 **Launch Strategy**

### **Beta Launch (Base Testnet)**
1. **Week 1-2**: Deploy to testnet, invite 50 beta users
2. **Week 3-4**: Test with 10 real events
3. **Week 5-6**: Bug fixes and optimization

### **Mainnet Launch**
1. **Week 1**: Deploy to Base mainnet
2. **Week 2**: Launch with 5 high-profile events
3. **Week 3**: Open registration to all users
4. **Week 4**: Marketing campaign and partnerships

### **Growth Phase**
1. **Month 2**: Partner with major event organizers
2. **Month 3**: Launch mobile app
3. **Month 4**: Integrate with other DeFi protocols
4. **Month 6**: International expansion

---

## 🔗 **Integration Partners**

### **Infrastructure Partners**
- **Base**: Layer 2 blockchain
- **Pinata**: IPFS pinning service
- **The Graph**: Indexing and querying
- **Coinbase Wallet**: Primary wallet integration

### **DeFi Partners**
- **Uniswap**: Token liquidity
- **Aave**: Yield generation for staked tokens
- **Compound**: Event organizer loans
- **1inch**: Best price execution

### **Event Partners**
- **Eventbrite**: Migration assistance
- **Meetup**: Community events
- **Conference organizers**: Web3 events
- **University partnerships**: Educational events

---

This guide provides a complete roadmap for migrating your event app to be fully onchain on Base blockchain. The architecture leverages smart contracts for core functionality, IPFS for decentralized storage, and The Graph for efficient data querying, while maintaining a smooth user experience.

Would you like me to elaborate on any specific section or help you implement any particular component?
