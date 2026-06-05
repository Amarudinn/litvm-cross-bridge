import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL_PRIMARY || 'https://liteforge.rpc.caldera.xyz/http';

async function getLatestBlock() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: 4441, name: 'LiteForge' }, { staticNetwork: true });

  const blockNumber = await provider.getBlockNumber();
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Latest block: ${blockNumber}`);
  console.log('');
  console.log('Untuk set di .env:');
  console.log(`CONTRACT_DEPLOY_BLOCK=${blockNumber}`);
}

getLatestBlock().catch((err) => {
  console.error('Failed to get block number:', err.message);
  process.exit(1);
});
