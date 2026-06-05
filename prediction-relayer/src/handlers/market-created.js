import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

export async function handleMarketCreated(event, block) {
  const supabase = getSupabase();

  const { marketId, title, outcomes, ticketPrice, fee, closeTime } = event.args;

  const marketData = {
    id: Number(marketId),
    title: title,
    description: '',
    outcomes: outcomes,
    ticket_price: ticketPrice.toString(),
    fee: fee.toString(),
    close_time: new Date(Number(closeTime) * 1000).toISOString(),
    status: 'OPEN',
    winning_outcome: null,
    is_refund: false,
    creator: event.address,
    total_pool: '0',
    total_fee_collected: '0',
    total_tickets: 0,
    created_at: new Date(block.timestamp * 1000).toISOString(),
    tx_hash: event.transactionHash,
    block_number: block.number,
  };

  const { error } = await supabase.from('markets').upsert(marketData);

  if (error) {
    logger.error(`Failed to insert market ${marketId}`, { error: error.message });
    throw error;
  }

  // Initialize market_stats for each outcome
  const statsRows = outcomes.map((label, index) => ({
    market_id: Number(marketId),
    outcome_index: index,
    outcome_label: label,
    total_tickets: 0,
    total_pool: '0',
  }));

  const { error: statsError } = await supabase
    .from('market_stats')
    .upsert(statsRows, { onConflict: 'market_id,outcome_index' });

  if (statsError) {
    logger.error(`Failed to insert market_stats for market ${marketId}`, { error: statsError.message });
    throw statsError;
  }

  logger.info(`MarketCreated: #${marketId} "${title}" [${outcomes.join(', ')}]`);
}

export default handleMarketCreated;
