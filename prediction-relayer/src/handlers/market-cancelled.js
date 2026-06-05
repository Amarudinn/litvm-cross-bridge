import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

export async function handleMarketCancelled(event, block) {
  const supabase = getSupabase();

  const { marketId } = event.args;

  const { error } = await supabase
    .from('markets')
    .update({ status: 'CANCELLED' })
    .eq('id', Number(marketId));

  if (error) {
    logger.error(`Failed to update market ${marketId} as cancelled`, { error: error.message });
    throw error;
  }

  logger.info(`MarketCancelled: #${marketId}`);
}

export default handleMarketCancelled;
