import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';
import { updateLeaderboard } from '../services/leaderboard.js';

export async function handleMarketResolved(event, block) {
  const supabase = getSupabase();

  const { marketId, winningOutcome, isRefund } = event.args;

  const updateData = {
    status: 'RESOLVED',
    winning_outcome: Number(winningOutcome),
    is_refund: isRefund,
  };

  const { error } = await supabase
    .from('markets')
    .update(updateData)
    .eq('id', Number(marketId));

  if (error) {
    logger.error(`Failed to update market ${marketId} as resolved`, { error: error.message });
    throw error;
  }

  // Update leaderboard for all participants
  try {
    await updateLeaderboard(Number(marketId));
  } catch (err) {
    logger.error(`Failed to update leaderboard for market ${marketId}`, { error: err.message });
  }

  logger.info(`MarketResolved: #${marketId}, winner: ${winningOutcome}, isRefund: ${isRefund}`);
}

export default handleMarketResolved;
