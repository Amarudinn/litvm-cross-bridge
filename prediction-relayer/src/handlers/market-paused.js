import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

export async function handleMarketPaused(event, block) {
  const supabase = getSupabase();
  const { marketId } = event.args;

  const { error } = await supabase
    .from('markets')
    .update({ status: 'PAUSED' })
    .eq('id', Number(marketId));

  if (error) {
    logger.error(`Failed to pause market ${marketId}`, { error: error.message });
    throw error;
  }

  logger.info(`MarketPaused: #${marketId}`);
}

export async function handleMarketUnpaused(event, block) {
  const supabase = getSupabase();
  const { marketId } = event.args;

  const { error } = await supabase
    .from('markets')
    .update({ status: 'OPEN' })
    .eq('id', Number(marketId));

  if (error) {
    logger.error(`Failed to unpause market ${marketId}`, { error: error.message });
    throw error;
  }

  logger.info(`MarketUnpaused: #${marketId}`);
}

export default { handleMarketPaused, handleMarketUnpaused };
