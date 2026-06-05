// Script untuk buy ticket di Rivalis
// Jalankan: node scripts/buy-ticket.js

import { ethers } from 'ethers';

const RPC_URL = 'https://liteforge.rpc.caldera.xyz/http';
const PRIVATE_KEY = '0x71d7f08748ac34e3d5a589093a09bd7138a5a7db385e84d2d4980359a1860020';
const CONTRACT_ADDRESS = '0xF314F388D63b899b418312EDD424DF1dd3159EDa';

const ABI = [
  "function buyTicket(uint256 marketId, uint256 outcomeIndex, uint256 quantity) external payable",
  "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string title, string description, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime, uint8 status, uint256 winningOutcome, bool isRefund, address owner, uint256 createdAt, uint256 totalPool, uint256 totalFeeCollected))",
  "function getMarketOutcomeStats(uint256 marketId) external view returns (uint256[])",
  "event TicketPurchased(uint256 indexed marketId, address indexed user, uint256 outcomeIndex, uint256 quantity, uint256 totalPaid)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Wallet:', wallet.address);
  console.log('');

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  const marketId = 0;
  const market = await contract.getMarket(marketId);

  const ticketPrice = market.ticketPrice;
  const fee = market.fee;
  const costPerTicket = ticketPrice + fee;

  // Buy 3 tickets on Arsenal (outcome 0)
  console.log('Buying 3 tickets on Arsenal...');
  const tx1 = await contract.buyTicket(marketId, 0, 3, { value: costPerTicket * 3n });
  await tx1.wait();
  console.log('  TX:', tx1.hash);

  // Buy 2 tickets on Chelsea (outcome 2)
  console.log('Buying 2 tickets on Chelsea...');
  const tx2 = await contract.buyTicket(marketId, 2, 2, { value: costPerTicket * 2n });
  await tx2.wait();
  console.log('  TX:', tx2.hash);

  // Check stats
  const stats = await contract.getMarketOutcomeStats(marketId);
  console.log('');
  console.log('Market stats after purchase:');
  console.log(`  Arsenal: ${stats[0]} tickets`);
  console.log(`  Draw: ${stats[1]} tickets`);
  console.log(`  Chelsea: ${stats[2]} tickets`);

  const updatedMarket = await contract.getMarket(marketId);
  console.log(`  Total pool: ${ethers.formatEther(updatedMarket.totalPool)} zkLTC`);
  console.log('');
  console.log('Done! Check relayer logs and Supabase.');
}

main().catch(console.error);
