import { getSupabase } from '../utils/supabase.js';
import config from '../config.js';
import logger from '../utils/logger.js';

let checkInterval = null;

/**
 * Auto-detect markets that have passed their close time.
 * Contract doesn't emit event when close time passes,
 * so relayer handles updating status in Supabase.
 */
async function checkClosedMarkets() {
  const supabase = getSupabase();

  const now = new Date().toISOString();

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, title, close_time')
    .eq('status', 'OPEN')
    .lte('close_time', now);

  if (error) {
    logger.error('Auto-close check failed', { error: error.message });
    return;
  }

  if (!markets || markets.length === 0) return;

  for (const market of markets) {
    const { error: updateError } = await supabase
      .from('markets')
      .update({ status: 'CLOSED' })
      .eq('id', market.id);

    if (updateError) {
      logger.error(`Failed to auto-close market ${market.id}`, { error: updateError.message });
    } else {
      logger.info(`Auto-closed market #${market.id} "${market.title}"`);
    }
  }
}

export function startAutoClose() {
  logger.info(`Auto-close checker started (interval: ${config.autoCloseCheckIntervalMs}ms)`);

  // Check immediately
  checkClosedMarkets();

  // Then check at interval
  checkInterval = setInterval(checkClosedMarkets, config.autoCloseCheckIntervalMs);
}

export function stopAutoClose() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Auto-close checker stopped');
  }
}

export default { startAutoClose, stopAutoClose };
