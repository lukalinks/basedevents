// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ProofOfAttendanceNFT
 * @dev NFT contract for issuing proof of attendance tokens for events
 * @author EventFI Team
 */
contract ProofOfAttendanceNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    struct POA {
        uint256 eventId;           // Event identifier (can be hash of event UUID)
        address attendee;          // Original attendee address
        uint256 issuedTimestamp;   // When the POA was issued
        string eventTitle;         // Event title for display
        string eventDate;          // Event date for display
        string eventLocation;      // Event location for display
        address issuedBy;          // Event organizer who issued the POA
        bool revoked;              // Whether the POA has been revoked
        string customMetadata;     // Additional metadata as JSON string
    }

    // Mapping from token ID to POA data
    mapping(uint256 => POA) public poas;
    
    // Mapping from event ID to array of token IDs
    mapping(uint256 => uint256[]) public eventPOAs;
    
    // Mapping from event ID and attendee to token ID (prevents duplicates)
    mapping(uint256 => mapping(address => uint256)) public eventAttendeePOA;
    
    // Mapping of authorized issuers (event organizers)
    mapping(address => bool) public authorizedIssuers;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Contract metadata
    string public contractURI;
    
    // Events
    event POAIssued(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed attendee,
        address issuedBy,
        string eventTitle
    );
    
    event POARevoked(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed attendee,
        address revokedBy
    );
    
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized to issue POAs");
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        require(_exists(tokenId), "POA token does not exist");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        string memory _contractURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
        contractURI = _contractURI;
        
        // Owner is automatically authorized
        authorizedIssuers[msg.sender] = true;
    }

    /**
     * @dev Issue a new POA NFT to an attendee
     * @param to Address to mint the POA to
     * @param eventId Unique identifier for the event
     * @param eventTitle Title of the event
     * @param eventDate Date of the event
     * @param eventLocation Location of the event
     * @param customMetadata Additional metadata as JSON string
     * @param tokenURI Optional custom token URI (if empty, uses base URI + tokenId)
     */
    function issuePOA(
        address to,
        uint256 eventId,
        string memory eventTitle,
        string memory eventDate,
        string memory eventLocation,
        string memory customMetadata,
        string memory tokenURI
    ) external onlyAuthorizedIssuer nonReentrant returns (uint256) {
        require(to != address(0), "Cannot issue POA to zero address");
        require(eventAttendeePOA[eventId][to] == 0, "POA already issued for this event and attendee");
        
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        // Mint the NFT
        _safeMint(to, tokenId);
        
        // Set token URI if provided, otherwise use base URI
        if (bytes(tokenURI).length > 0) {
            _setTokenURI(tokenId, tokenURI);
        }
        
        // Store POA data
        poas[tokenId] = POA({
            eventId: eventId,
            attendee: to,
            issuedTimestamp: block.timestamp,
            eventTitle: eventTitle,
            eventDate: eventDate,
            eventLocation: eventLocation,
            issuedBy: msg.sender,
            revoked: false,
            customMetadata: customMetadata
        });
        
        // Update mappings
        eventPOAs[eventId].push(tokenId);
        eventAttendeePOA[eventId][to] = tokenId;
        
        emit POAIssued(tokenId, eventId, to, msg.sender, eventTitle);
        
        return tokenId;
    }

    /**
     * @dev Batch issue POAs to multiple attendees for the same event
     * @param attendees Array of attendee addresses
     * @param eventId Unique identifier for the event
     * @param eventTitle Title of the event
     * @param eventDate Date of the event
     * @param eventLocation Location of the event
     * @param customMetadata Additional metadata as JSON string
     */
    function batchIssuePOAs(
        address[] memory attendees,
        uint256 eventId,
        string memory eventTitle,
        string memory eventDate,
        string memory eventLocation,
        string memory customMetadata
    ) external onlyAuthorizedIssuer nonReentrant returns (uint256[] memory) {
        require(attendees.length > 0, "No attendees provided");
        require(attendees.length <= 100, "Too many attendees in single batch");
        
        uint256[] memory tokenIds = new uint256[](attendees.length);
        
        for (uint256 i = 0; i < attendees.length; i++) {
            address attendee = attendees[i];
            require(attendee != address(0), "Cannot issue POA to zero address");
            require(eventAttendeePOA[eventId][attendee] == 0, "POA already issued for this attendee");
            
            _tokenIdCounter.increment();
            uint256 tokenId = _tokenIdCounter.current();
            
            // Mint the NFT
            _safeMint(attendee, tokenId);
            
            // Store POA data
            poas[tokenId] = POA({
                eventId: eventId,
                attendee: attendee,
                issuedTimestamp: block.timestamp,
                eventTitle: eventTitle,
                eventDate: eventDate,
                eventLocation: eventLocation,
                issuedBy: msg.sender,
                revoked: false,
                customMetadata: customMetadata
            });
            
            // Update mappings
            eventPOAs[eventId].push(tokenId);
            eventAttendeePOA[eventId][attendee] = tokenId;
            tokenIds[i] = tokenId;
            
            emit POAIssued(tokenId, eventId, attendee, msg.sender, eventTitle);
        }
        
        return tokenIds;
    }

    /**
     * @dev Revoke a POA (marks as revoked but doesn't burn)
     * @param tokenId Token ID to revoke
     */
    function revokePOA(uint256 tokenId) external tokenExists(tokenId) {
        POA storage poa = poas[tokenId];
        require(poa.issuedBy == msg.sender || msg.sender == owner(), "Not authorized to revoke this POA");
        require(!poa.revoked, "POA already revoked");
        
        poa.revoked = true;
        
        emit POARevoked(tokenId, poa.eventId, poa.attendee, msg.sender);
    }

    /**
     * @dev Check if a POA is valid (exists and not revoked)
     * @param tokenId Token ID to check
     * @return bool Whether the POA is valid
     */
    function isPOAValid(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId) && !poas[tokenId].revoked;
    }

    /**
     * @dev Get POA details
     * @param tokenId Token ID to query
     * @return POA struct with all details
     */
    function getPOA(uint256 tokenId) external view tokenExists(tokenId) returns (POA memory) {
        return poas[tokenId];
    }

    /**
     * @dev Get all POAs for a specific event
     * @param eventId Event ID to query
     * @return Array of token IDs for the event
     */
    function getEventPOAs(uint256 eventId) external view returns (uint256[] memory) {
        return eventPOAs[eventId];
    }

    /**
     * @dev Get POA token ID for a specific attendee and event
     * @param eventId Event ID to query
     * @param attendee Attendee address to query
     * @return Token ID (0 if no POA exists)
     */
    function getAttendeePOA(uint256 eventId, address attendee) external view returns (uint256) {
        return eventAttendeePOA[eventId][attendee];
    }

    /**
     * @dev Get all POAs owned by an address
     * @param owner Address to query
     * @return Array of token IDs owned by the address
     */
    function getPOAsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }

    /**
     * @dev Authorize an address to issue POAs
     * @param issuer Address to authorize
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Cannot authorize zero address");
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }

    /**
     * @dev Revoke issuer authorization
     * @param issuer Address to revoke
     */
    function revokeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }

    /**
     * @dev Set base URI for token metadata
     * @param baseTokenURI New base URI
     */
    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev Set contract URI for marketplace metadata
     * @param _contractURI New contract URI
     */
    function setContractURI(string memory _contractURI) external onlyOwner {
        contractURI = _contractURI;
    }

    /**
     * @dev Get total number of POAs issued
     * @return Current token ID counter
     */
    function totalPOAsIssued() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Override tokenURI to use base URI if no custom URI is set
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");

        string memory _tokenURI = super.tokenURI(tokenId);
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }

        return bytes(_baseTokenURI).length > 0 ? 
            string(abi.encodePacked(_baseTokenURI, tokenId.toString())) : "";
    }

    /**
     * @dev Internal base URI function
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override _beforeTokenTransfer to handle enumerable
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Override _burn to handle URI storage
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev Override supportsInterface for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Emergency function to pause transfers (only owner)
     * Note: This is a basic implementation. Consider using OpenZeppelin's Pausable for production
     */
    bool public transfersPaused = false;

    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
    }

    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(!transfersPaused || from == address(0), "Transfers are paused");
        super._beforeTokenTransfer(from, to, tokenId, 1);
    }
}
