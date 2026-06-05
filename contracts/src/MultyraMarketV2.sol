// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MultyraMarketV2 {
    // ============================================
    // Enums
    // ============================================
    enum MarketStatus {
        OPEN,
        PAUSED,
        CLOSED,
        RESOLVED,
        CANCELLED
    }

    // ============================================
    // Structs
    // ============================================
    struct Market {
        uint256 id;
        string title;
        string description;
        string[] outcomes;
        uint256 ticketPrice;
        uint256 fee;
        uint256 closeTime;
        MarketStatus status;
        uint256 winningOutcome;
        bool isRefund;
        address owner;
        uint256 createdAt;
        uint256 totalPool;
        uint256 totalFeeCollected;
    }

    // ============================================
    // State Variables
    // ============================================
    address public owner;
    address public primaryOwner;
    uint256 public marketCount;
    uint256 public totalFeesCollected;

    mapping(address => bool) public owners;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(uint256 => uint256)) public outcomeTickets;
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userTickets;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => uint256) public totalTickets;
    mapping(uint256 => address[]) public marketParticipants;
    mapping(uint256 => mapping(address => bool)) public isParticipant;

    // ============================================
    // Events
    // ============================================
    event MarketCreated(uint256 indexed marketId, string title, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime);
    event TicketPurchased(uint256 indexed marketId, address indexed user, uint256 outcomeIndex, uint256 quantity, uint256 totalPaid);
    event MarketResolved(uint256 indexed marketId, uint256 winningOutcome, bool isRefund);
    event MarketCancelled(uint256 indexed marketId);
    event MarketPaused(uint256 indexed marketId);
    event MarketUnpaused(uint256 indexed marketId);
    event CloseTimeUpdated(uint256 indexed marketId, uint256 oldCloseTime, uint256 newCloseTime);
    event FeeUpdated(uint256 indexed marketId, uint256 oldFee, uint256 newFee);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);

    // ============================================
    // Modifiers
    // ============================================
    modifier onlyOwner() {
        require(owners[msg.sender], "Not owner");
        _;
    }

    modifier onlyPrimaryOwner() {
        require(msg.sender == primaryOwner, "Not primary owner");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < marketCount, "Market not found");
        _;
    }

    modifier marketOpen(uint256 marketId) {
        require(markets[marketId].status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < markets[marketId].closeTime, "Market closed");
        _;
    }

    // ============================================
    // Constructor
    // ============================================
    constructor() {
        owner = msg.sender;
        primaryOwner = msg.sender;
        owners[msg.sender] = true;
    }

    // ============================================
    // Owner Management
    // ============================================
    function addOwner(address newOwner) external onlyPrimaryOwner {
        require(newOwner != address(0), "Invalid owner");
        require(!owners[newOwner], "Already owner");

        owners[newOwner] = true;

        emit OwnerAdded(newOwner);
    }

    function removeOwner(address ownerToRemove) external onlyPrimaryOwner {
        require(ownerToRemove != address(0), "Invalid owner");
        require(ownerToRemove != primaryOwner, "Cannot remove primary owner");
        require(owners[ownerToRemove], "Not owner");

        owners[ownerToRemove] = false;

        emit OwnerRemoved(ownerToRemove);
    }

    function isOwner(address account) external view returns (bool) {
        return owners[account];
    }

    // ============================================
    // Owner Functions
    // ============================================
    function createMarket(
        string calldata title,
        string calldata description,
        string[] calldata outcomes,
        uint256 ticketPrice,
        uint256 fee,
        uint256 closeTime
    ) external onlyOwner {
        require(outcomes.length >= 2, "Min 2 outcomes");
        require(ticketPrice > 0, "Ticket price must be > 0");
        require(closeTime > block.timestamp, "Close time must be future");

        Market storage m = markets[marketCount];
        m.id = marketCount;
        m.title = title;
        m.description = description;
        for (uint256 i = 0; i < outcomes.length; i++) {
            m.outcomes.push(outcomes[i]);
        }
        m.ticketPrice = ticketPrice;
        m.fee = fee;
        m.closeTime = closeTime;
        m.status = MarketStatus.OPEN;
        m.owner = msg.sender;
        m.createdAt = block.timestamp;

        emit MarketCreated(marketCount, title, outcomes, ticketPrice, fee, closeTime);
        marketCount++;
    }

    function resolveMarket(uint256 marketId, uint256 winningOutcomeIndex)
        external onlyOwner marketExists(marketId)
    {
        Market storage m = markets[marketId];
        require(block.timestamp >= m.closeTime, "Not yet closed");
        require(m.status != MarketStatus.RESOLVED, "Already resolved");
        require(m.status != MarketStatus.CANCELLED, "Already cancelled");
        require(winningOutcomeIndex < m.outcomes.length, "Invalid outcome");

        m.status = MarketStatus.RESOLVED;
        m.winningOutcome = winningOutcomeIndex;
        m.isRefund = false;

        emit MarketResolved(marketId, winningOutcomeIndex, false);
    }

    function resolveMarketRefund(uint256 marketId)
        external onlyOwner marketExists(marketId)
    {
        Market storage m = markets[marketId];
        require(block.timestamp >= m.closeTime, "Not yet closed");
        require(m.status != MarketStatus.RESOLVED, "Already resolved");
        require(m.status != MarketStatus.CANCELLED, "Already cancelled");

        m.status = MarketStatus.RESOLVED;
        m.isRefund = true;

        emit MarketResolved(marketId, 0, true);
    }

    function cancelMarket(uint256 marketId)
        external onlyOwner marketExists(marketId)
    {
        Market storage m = markets[marketId];
        require(m.status != MarketStatus.RESOLVED, "Already resolved");
        require(m.status != MarketStatus.CANCELLED, "Already cancelled");

        m.status = MarketStatus.CANCELLED;
        totalFeesCollected -= m.totalFeeCollected;

        emit MarketCancelled(marketId);
    }

    function pauseMarket(uint256 marketId) external onlyOwner marketExists(marketId) {
        require(markets[marketId].status == MarketStatus.OPEN, "Not open");
        markets[marketId].status = MarketStatus.PAUSED;
        emit MarketPaused(marketId);
    }

    function unpauseMarket(uint256 marketId) external onlyOwner marketExists(marketId) {
        require(markets[marketId].status == MarketStatus.PAUSED, "Not paused");
        markets[marketId].status = MarketStatus.OPEN;
        emit MarketUnpaused(marketId);
    }

    function updateCloseTime(uint256 marketId, uint256 newCloseTime)
        external onlyOwner marketExists(marketId)
    {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.OPEN || m.status == MarketStatus.PAUSED, "Cannot update");
        require(newCloseTime > block.timestamp, "Must be future");

        uint256 oldCloseTime = m.closeTime;
        m.closeTime = newCloseTime;

        emit CloseTimeUpdated(marketId, oldCloseTime, newCloseTime);
    }

    function updateFee(uint256 marketId, uint256 newFee)
        external onlyOwner marketExists(marketId)
    {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.OPEN || m.status == MarketStatus.PAUSED, "Cannot update");

        uint256 oldFee = m.fee;
        m.fee = newFee;

        emit FeeUpdated(marketId, oldFee, newFee);
    }

    function withdrawFees() external onlyOwner {
        require(totalFeesCollected > 0, "No fees");
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit FeesWithdrawn(msg.sender, amount);
    }

    // ============================================
    // User Functions
    // ============================================
    function buyTicket(uint256 marketId, uint256 outcomeIndex, uint256 quantity)
        external payable marketExists(marketId) marketOpen(marketId)
    {
        Market storage m = markets[marketId];
        uint256 totalCost = (m.ticketPrice + m.fee) * quantity;
        require(msg.value == totalCost, "Incorrect payment");
        require(outcomeIndex < m.outcomes.length, "Invalid outcome");
        require(quantity > 0, "Min 1 ticket");

        userTickets[marketId][msg.sender][outcomeIndex] += quantity;
        outcomeTickets[marketId][outcomeIndex] += quantity;
        totalTickets[marketId] += quantity;
        m.totalPool += m.ticketPrice * quantity;
        m.totalFeeCollected += m.fee * quantity;
        totalFeesCollected += m.fee * quantity;

        if (!isParticipant[marketId][msg.sender]) {
            isParticipant[marketId][msg.sender] = true;
            marketParticipants[marketId].push(msg.sender);
        }

        emit TicketPurchased(marketId, msg.sender, outcomeIndex, quantity, msg.value);
    }

    function claim(uint256 marketId) external marketExists(marketId) {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.RESOLVED, "Not resolved");
        require(!m.isRefund, "Is refund, use claimRefund");
        require(!hasClaimed[marketId][msg.sender], "Already claimed");

        uint256 winningTickets = userTickets[marketId][msg.sender][m.winningOutcome];
        require(winningTickets > 0, "No winning tickets");

        hasClaimed[marketId][msg.sender] = true;

        uint256 totalWinningTickets = outcomeTickets[marketId][m.winningOutcome];
        uint256 loserPool = m.totalPool - (m.ticketPrice * totalWinningTickets);
        uint256 profitPerTicket = loserPool / totalWinningTickets;
        uint256 payout = (m.ticketPrice + profitPerTicket) * winningTickets;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit Claimed(marketId, msg.sender, payout);
    }

    function claimRefund(uint256 marketId) external marketExists(marketId) {
        Market storage m = markets[marketId];
        require(
            (m.status == MarketStatus.RESOLVED && m.isRefund) ||
            m.status == MarketStatus.CANCELLED,
            "Not refundable"
        );
        require(!hasClaimed[marketId][msg.sender], "Already claimed");

        hasClaimed[marketId][msg.sender] = true;

        uint256 totalUserTickets = 0;
        for (uint256 i = 0; i < m.outcomes.length; i++) {
            totalUserTickets += userTickets[marketId][msg.sender][i];
        }
        require(totalUserTickets > 0, "No tickets");

        uint256 refundAmount;
        if (m.status == MarketStatus.CANCELLED) {
            refundAmount = (m.ticketPrice + m.fee) * totalUserTickets;
        } else {
            refundAmount = m.ticketPrice * totalUserTickets;
        }

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Transfer failed");

        emit RefundClaimed(marketId, msg.sender, refundAmount);
    }

    // ============================================
    // View Functions
    // ============================================
    function getMarket(uint256 marketId) external view marketExists(marketId) returns (Market memory) {
        return markets[marketId];
    }

    function getMarketOutcomeStats(uint256 marketId) external view marketExists(marketId)
        returns (uint256[] memory ticketsPerOutcome)
    {
        Market storage m = markets[marketId];
        ticketsPerOutcome = new uint256[](m.outcomes.length);
        for (uint256 i = 0; i < m.outcomes.length; i++) {
            ticketsPerOutcome[i] = outcomeTickets[marketId][i];
        }
    }

    function getUserTickets(uint256 marketId, address user) external view marketExists(marketId)
        returns (uint256[] memory ticketsPerOutcome)
    {
        Market storage m = markets[marketId];
        ticketsPerOutcome = new uint256[](m.outcomes.length);
        for (uint256 i = 0; i < m.outcomes.length; i++) {
            ticketsPerOutcome[i] = userTickets[marketId][user][i];
        }
    }

    function getEstimatedPayout(uint256 marketId, uint256 outcomeIndex) external view marketExists(marketId)
        returns (uint256 payoutPerTicket)
    {
        Market storage m = markets[marketId];
        require(outcomeIndex < m.outcomes.length, "Invalid outcome");

        uint256 winTickets = outcomeTickets[marketId][outcomeIndex];
        if (winTickets == 0) {
            return 0;
        }

        uint256 loserPool = m.totalPool - (m.ticketPrice * winTickets);
        uint256 profitPerTicket = loserPool / winTickets;
        payoutPerTicket = m.ticketPrice + profitPerTicket;
    }

    function getClaimableAmount(uint256 marketId, address user) external view marketExists(marketId)
        returns (uint256 amount)
    {
        Market storage m = markets[marketId];

        if (hasClaimed[marketId][user]) return 0;

        if (m.status == MarketStatus.RESOLVED && !m.isRefund) {
            uint256 winningTickets = userTickets[marketId][user][m.winningOutcome];
            if (winningTickets == 0) return 0;

            uint256 totalWinningTickets = outcomeTickets[marketId][m.winningOutcome];
            uint256 loserPool = m.totalPool - (m.ticketPrice * totalWinningTickets);
            uint256 profitPerTicket = loserPool / totalWinningTickets;
            amount = (m.ticketPrice + profitPerTicket) * winningTickets;
        } else if ((m.status == MarketStatus.RESOLVED && m.isRefund) || m.status == MarketStatus.CANCELLED) {
            uint256 totalUserTickets = 0;
            for (uint256 i = 0; i < m.outcomes.length; i++) {
                totalUserTickets += userTickets[marketId][user][i];
            }
            if (totalUserTickets == 0) return 0;

            if (m.status == MarketStatus.CANCELLED) {
                amount = (m.ticketPrice + m.fee) * totalUserTickets;
            } else {
                amount = m.ticketPrice * totalUserTickets;
            }
        }
    }

    function getMarketParticipants(uint256 marketId) external view marketExists(marketId)
        returns (address[] memory)
    {
        return marketParticipants[marketId];
    }

    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }
}
