// Script untuk create market pertama di Rivalis
// Jalankan: node scripts/create-market.js

import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = 'https://liteforge.rpc.caldera.xyz/http';
const PRIVATE_KEY = '0x71d7f08748ac34e3d5a589093a09bd7138a5a7db385e84d2d4980359a1860020';
const CONTRACT_ADDRESS = '0xF314F388D63b899b418312EDD424DF1dd3159EDa';

const ABI = [
  "function createMarket(string title, string description, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime) external",
  "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string title, string description, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime, uint8 status, uint256 winningOutcome, bool isRefund, address owner, uint256 createdAt, uint256 totalPool, uint256 totalFeeCollected))",
  "function marketCount() external view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, string title, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Wallet:', wallet.address);
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('');

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  // Market config
  const title = 'Arsenal vs Chelsea';
  const description = 'Premier League Match - Who wins?';
  const outcomes = ['Arsenal', 'Draw', 'Chelsea'];
  const ticketPrice = ethers.parseEther('0.001'); // 0.001 native token per ticket
  const fee = ethers.parseEther('0.0001');        // 0.0001 fee per ticket
  const closeTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 jam dari sekarang

  console.log('Creating market...');
  console.log(`  Title: ${title}`);
  console.log(`  Outcomes: [${outcomes.join(', ')}]`);
  console.log(`  Ticket Price: ${ethers.formatEther(ticketPrice)} zkLTC`);
  console.log(`  Fee: ${ethers.formatEther(fee)} zkLTC`);
  console.log(`  Close Time: ${new Date(closeTime * 1000).toLocaleString()}`);
  console.log('');

  const tx = await contract.createMarket(title, description, outcomes, ticketPrice, fee, closeTime);
  console.log('TX sent:', tx.hash);

  const receipt = await tx.wait();
  console.log('TX confirmed! Block:', receipt.blockNumber);

  // Read market count
  const count = await contract.marketCount();
  console.log('Total markets:', count.toString());

  // Read the market we just created
  const market = await contract.getMarket(count - 1n);
  console.log('');
  console.log('Market created:');
  console.log(`  ID: ${market.id}`);
  console.log(`  Title: ${market.title}`);
  console.log(`  Status: ${['OPEN', 'PAUSED', 'CLOSED', 'RESOLVED', 'CANCELLED'][market.status]}`);
  console.log('');
  console.log('Done! Check Supabase for synced data.');
}

main().catch(console.error);
