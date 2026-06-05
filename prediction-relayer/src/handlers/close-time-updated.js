import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

export async function handleCloseTimeUpdated(event, block) {
  const supabase = getSupabase();
  const { marketId, oldCloseTime, newCloseTime } = event.args;

  const newCloseTimeIso = new Date(Number(newCloseTime) * 1000).toISOString();
  const shouldReopen = Number(newCloseTime) > Math.floor(Date.now() / 1000);

  const updateData = { close_time: newCloseTimeIso };

  if (shouldReopen) {
    const { data: market, error: fetchError } = await supabase
      .from('markets')
      .select('status')
      .eq('id', Number(marketId))
      .single();

    if (fetchError) {
      logger.warn(`Could not fetch market status for close time update ${marketId}`, { error: fetchError.message });
    } else if (market?.status === 'CLOSED') {
      updateData.status = 'OPEN';
    }
  }

  const { error } = await supabase
    .from('markets')
    .update(updateData)
    .eq('id', Number(marketId));

  if (error) {
    logger.error(`Failed to update close time for market ${marketId}`, { error: error.message });
    throw error;
  }

  logger.info(`CloseTimeUpdated: market #${marketId}, ${oldCloseTime} -> ${newCloseTime}`);
}

export default handleCloseTimeUpdated;
