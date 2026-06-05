import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

export async function handleTicketPurchased(event, block) {
  const supabase = getSupabase();

  const { marketId, user, outcomeIndex, quantity, totalPaid } = event.args;

  // Get market to find outcome label
  const { data: marketData } = await supabase
    .from('markets')
    .select('outcomes')
    .eq('id', Number(marketId))
    .single();

  const outcomeLabel = marketData?.outcomes?.[Number(outcomeIndex)] || `Outcome ${outcomeIndex}`;

  // Insert ticket record
  const ticketData = {
    market_id: Number(marketId),
    user_address: user.toLowerCase(),
    outcome_index: Number(outcomeIndex),
    outcome_label: outcomeLabel,
    quantity: Number(quantity),
    total_paid: totalPaid.toString(),
    tx_hash: event.transactionHash,
    block_number: block.number,
    created_at: new Date(block.timestamp * 1000).toISOString(),
  };

  const { error: ticketError } = await supabase.from('tickets').insert(ticketData);

  if (ticketError) {
    logger.error(`Failed to insert ticket for market ${marketId}`, { error: ticketError.message });
    throw ticketError;
  }

  // Update market_stats for this outcome
  const { data: currentStats } = await supabase
    .from('market_stats')
    .select('total_tickets, total_pool')
    .eq('market_id', Number(marketId))
    .eq('outcome_index', Number(outcomeIndex))
    .single();

  if (currentStats) {
    const newTickets = currentStats.total_tickets + Number(quantity);
    const ticketPrice = BigInt(totalPaid) - (BigInt(totalPaid) * BigInt(quantity) / BigInt(quantity)); // recalc from market
    // Simpler: get ticket_price from market
    const { data: mkt } = await supabase.from('markets').select('ticket_price, fee').eq('id', Number(marketId)).single();
    const poolAdd = BigInt(mkt.ticket_price) * BigInt(quantity);
    const newPool = (BigInt(currentStats.total_pool) + poolAdd).toString();

    await supabase
      .from('market_stats')
      .update({ total_tickets: newTickets, total_pool: newPool })
      .eq('market_id', Number(marketId))
      .eq('outcome_index', Number(outcomeIndex));
  }

  // Update market totals
  const { data: market } = await supabase
    .from('markets')
    .select('total_pool, total_fee_collected, total_tickets, ticket_price, fee')
    .eq('id', Number(marketId))
    .single();

  if (market) {
    const poolAdd = BigInt(market.ticket_price) * BigInt(quantity);
    const feeAdd = BigInt(market.fee) * BigInt(quantity);

    await supabase
      .from('markets')
      .update({
        total_pool: (BigInt(market.total_pool) + poolAdd).toString(),
        total_fee_collected: (BigInt(market.total_fee_collected) + feeAdd).toString(),
        total_tickets: market.total_tickets + Number(quantity),
      })
      .eq('id', Number(marketId));
  }

  logger.info(`TicketPurchased: market #${marketId}, user ${user}, outcome ${outcomeIndex}, qty ${quantity}`);
}

export default handleTicketPurchased;
