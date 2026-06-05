import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

export async function handleRefundClaimed(event, block) {
  const supabase = getSupabase();
  const { marketId, user, amount } = event.args;

  const claimData = {
    market_id: Number(marketId),
    user_address: user.toLowerCase(),
    amount: amount.toString(),
    claim_type: 'REFUND',
    tx_hash: event.transactionHash,
    block_number: block.number,
    claimed_at: new Date(block.timestamp * 1000).toISOString(),
  };

  const { error } = await supabase.from('claims').insert(claimData);

  if (error) {
    logger.error(`Failed to insert refund claim for market ${marketId}, user ${user}`, { error: error.message });
    throw error;
  }

  logger.info(`RefundClaimed: market #${marketId}, user ${user}, amount ${amount}`);
}

export default handleRefundClaimed;
