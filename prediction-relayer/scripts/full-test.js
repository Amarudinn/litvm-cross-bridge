// Full end-to-end test: 2 wallets, new market, buy tickets, resolve, claim
// Jalankan: node scripts/full-test.js

import { ethers } from 'ethers';

const RPC_URL = 'https://liteforge.rpc.caldera.xyz/http';
const OWNER_KEY = '0x71d7f08748ac34e3d5a589093a09bd7138a5a7db385e84d2d4980359a1860020';
const CONTRACT_ADDRESS = '0xF314F388D63b899b418312EDD424DF1dd3159EDa';

const ABI = [
  "function createMarket(string title, string description, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime) external",
  "function buyTicket(uint256 marketId, uint256 outcomeIndex, uint256 quantity) external payable",
  "function resolveMarket(uint256 marketId, uint256 winningOutcomeIndex) external",
  "function claim(uint256 marketId) external",
  "function claimRefund(uint256 marketId) external",
  "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string title, string description, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime, uint8 status, uint256 winningOutcome, bool isRefund, address owner, uint256 createdAt, uint256 totalPool, uint256 totalFeeCollected))",
  "function getMarketOutcomeStats(uint256 marketId) external view returns (uint256[])",
  "function getUserTickets(uint256 marketId, address user) external view returns (uint256[])",
  "function getClaimableAmount(uint256 marketId, address user) external view returns (uint256)",
  "function marketCount() external view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, string title, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime)",
  "event TicketPurchased(uint256 indexed marketId, address indexed user, uint256 outcomeIndex, uint256 quantity, uint256 totalPaid)",
  "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)",
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // === WALLETS ===
  const ownerWallet = new ethers.Wallet(OWNER_KEY, provider);

  // Generate new wallet for user2
  const user2Wallet = ethers.Wallet.createRandom().connect(provider);

  console.log('=== WALLETS ===');
  console.log(`Owner/User1: ${ownerWallet.address}`);
  console.log(`User2 (new): ${user2Wallet.address}`);
  console.log(`User2 PK:    ${user2Wallet.privateKey}`);
  console.log('');

  // === FUND USER2 ===
  console.log('=== FUNDING USER2 ===');
  const fundAmount = ethers.parseEther('0.01');
  const fundTx = await ownerWallet.sendTransaction({
    to: user2Wallet.address,
    value: fundAmount,
  });
  await fundTx.wait();
  console.log(`Sent ${ethers.formatEther(fundAmount)} zkLTC to User2`);
  console.log(`User2 balance: ${ethers.formatEther(await provider.getBalance(user2Wallet.address))} zkLTC`);
  console.log('');

  // === CREATE MARKET (close in 3 minutes) ===
  console.log('=== CREATE MARKET ===');
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, ownerWallet);
  const contractUser2 = new ethers.Contract(CONTRACT_ADDRESS, ABI, user2Wallet);

  const title = 'Brazil vs Argentina - Test Match';
  const description = 'Who wins the friendly?';
  const outcomes = ['Brazil', 'Argentina'];
  const ticketPrice = ethers.parseEther('0.001');
  const fee = ethers.parseEther('0.0001');
  const closeTime = Math.floor(Date.now() / 1000) + 180; // 3 minutes

  const createTx = await contract.createMarket(title, description, outcomes, ticketPrice, fee, closeTime);
  await createTx.wait();

  const marketId = Number(await contract.marketCount()) - 1;
  console.log(`Market #${marketId} created: "${title}"`);
  console.log(`Outcomes: [${outcomes.join(', ')}]`);
  console.log(`Close time: ${new Date(closeTime * 1000).toLocaleTimeString()} (3 min from now)`);
  console.log('');

  // === BUY TICKETS ===
  console.log('=== BUY TICKETS ===');
  const costPerTicket = ticketPrice + fee;

  // User1 (owner) buys 5 tickets on Brazil
  const buy1Tx = await contract.buyTicket(marketId, 0, 5, { value: costPerTicket * 5n });
  await buy1Tx.wait();
  console.log(`User1 bought 5 tickets on Brazil`);

  // User2 buys 3 tickets on Argentina
  const buy2Tx = await contractUser2.buyTicket(marketId, 1, 3, { value: costPerTicket * 3n });
  await buy2Tx.wait();
  console.log(`User2 bought 3 tickets on Argentina`);

  // Show stats
  const stats = await contract.getMarketOutcomeStats(marketId);
  console.log('');
  console.log('Market stats:');
  console.log(`  Brazil: ${stats[0]} tickets`);
  console.log(`  Argentina: ${stats[1]} tickets`);

  const market = await contract.getMarket(marketId);
  console.log(`  Total pool: ${ethers.formatEther(market.totalPool)} zkLTC`);
  console.log(`  Total fees: ${ethers.formatEther(market.totalFeeCollected)} zkLTC`);
  console.log('');

  // === WAIT FOR CLOSE TIME ===
  const now = Math.floor(Date.now() / 1000);
  const waitSeconds = closeTime - now + 5; // +5 buffer
  console.log(`=== WAITING ${waitSeconds}s FOR MARKET TO CLOSE ===`);
  console.log('(market closes in 3 minutes, please wait...)');
  console.log('');

  // Countdown
  for (let i = waitSeconds; i > 0; i -= 30) {
    if (i < waitSeconds) {
      console.log(`  ${i}s remaining...`);
    }
    await sleep(Math.min(30000, i * 1000));
  }

  console.log('Market closed!');
  console.log('');

  // === RESOLVE MARKET (random winner) ===
  console.log('=== RESOLVE MARKET ===');
  const winnerIndex = Math.random() < 0.5 ? 0 : 1;
  const winnerName = outcomes[winnerIndex];
  console.log(`Randomly picked winner: ${winnerName} (index ${winnerIndex})`);

  const resolveTx = await contract.resolveMarket(marketId, winnerIndex);
  await resolveTx.wait();
  console.log('Market resolved!');
  console.log('');

  // === CHECK CLAIMABLE ===
  console.log('=== CLAIM RESULTS ===');
  const claimableUser1 = await contract.getClaimableAmount(marketId, ownerWallet.address);
  const claimableUser2 = await contract.getClaimableAmount(marketId, user2Wallet.address);

  console.log(`User1 claimable: ${ethers.formatEther(claimableUser1)} zkLTC`);
  console.log(`User2 claimable: ${ethers.formatEther(claimableUser2)} zkLTC`);
  console.log('');

  // === CLAIM ===
  const winnerWallet = winnerIndex === 0 ? ownerWallet : user2Wallet;
  const winnerContract = winnerIndex === 0 ? contract : contractUser2;
  const winnerLabel = winnerIndex === 0 ? 'User1' : 'User2';
  const loserLabel = winnerIndex === 0 ? 'User2' : 'User1';

  const balBefore = await provider.getBalance(winnerWallet.address);
  const claimTx = await winnerContract.claim(marketId);
  const claimReceipt = await claimTx.wait();
  const balAfter = await provider.getBalance(winnerWallet.address);

  const gasUsed = claimReceipt.gasUsed * claimReceipt.gasPrice;
  const netReceived = balAfter - balBefore + gasUsed;

  console.log(`${winnerLabel} claimed! Received: ${ethers.formatEther(netReceived)} zkLTC`);
  console.log('');

  // === FINAL SUMMARY ===
  console.log('=== FINAL SUMMARY ===');
  console.log(`Market: "${title}"`);
  console.log(`Winner: ${winnerName}`);
  console.log('');
  console.log(`User1 (${ownerWallet.address}):`);
  console.log(`  Bet: 5 tickets on Brazil (cost: ${ethers.formatEther(costPerTicket * 5n)} zkLTC)`);
  console.log(`  Result: ${winnerIndex === 0 ? 'WON' : 'LOST'}`);
  console.log(`  Claimable: ${ethers.formatEther(claimableUser1)} zkLTC`);
  console.log('');
  console.log(`User2 (${user2Wallet.address}):`);
  console.log(`  Bet: 3 tickets on Argentina (cost: ${ethers.formatEther(costPerTicket * 3n)} zkLTC)`);
  console.log(`  Result: ${winnerIndex === 1 ? 'WON' : 'LOST'}`);
  console.log(`  Claimable: ${ethers.formatEther(claimableUser2)} zkLTC`);
  console.log('');

  // Payout math
  const totalPool = ticketPrice * 8n; // 8 total tickets
  const winningTickets = winnerIndex === 0 ? 5n : 3n;
  const loserPool = totalPool - (ticketPrice * winningTickets);
  const profitPerTicket = loserPool / winningTickets;
  const payoutPerTicket = ticketPrice + profitPerTicket;

  console.log('=== PAYOUT MATH ===');
  console.log(`Total pool: ${ethers.formatEther(totalPool)} zkLTC`);
  console.log(`Winning tickets: ${winningTickets}`);
  console.log(`Loser pool: ${ethers.formatEther(loserPool)} zkLTC`);
  console.log(`Profit per ticket: ${ethers.formatEther(profitPerTicket)} zkLTC`);
  console.log(`Payout per ticket: ${ethers.formatEther(payoutPerTicket)} zkLTC`);
  console.log(`Total payout: ${ethers.formatEther(payoutPerTicket * winningTickets)} zkLTC`);
  console.log('');
  console.log('Done! Check relayer logs and Supabase for synced data.');
}

main().catch(console.error);
