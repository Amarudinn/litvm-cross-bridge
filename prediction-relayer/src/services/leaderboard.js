import { getSupabase } from '../utils/supabase.js';
import logger from '../utils/logger.js';

/**
 * Update leaderboard (user_stats) after a market is resolved.
 * Called from market-resolved handler.
 */
export async function updateLeaderboard(marketId) {
  const supabase = getSupabase();

  // Get market info
  const { data: market } = await supabase
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (!market) {
    logger.warn(`Leaderboard: market ${marketId} not found`);
    return;
  }

  // Get all tickets for this market
  const { data: tickets } = await supabase
    .from('tickets')
    .select('user_address, outcome_index, quantity, total_paid')
    .eq('market_id', marketId);

  if (!tickets || tickets.length === 0) return;

  // Group tickets by user
  const userMap = {};
  for (const t of tickets) {
    if (!userMap[t.user_address]) {
      userMap[t.user_address] = [];
    }
    userMap[t.user_address].push(t);
  }

  // Get market stats for payout calculation
  const { data: stats } = await supabase
    .from('market_stats')
    .select('outcome_index, total_tickets')
    .eq('market_id', marketId);

  const totalWinningTickets = market.is_refund
    ? 0
    : (stats?.find(s => s.outcome_index === market.winning_outcome)?.total_tickets || 0);

  const totalPool = BigInt(market.total_pool);
  const ticketPrice = BigInt(market.ticket_price);

  // Calculate payout per winning ticket
  let profitPerTicket = 0n;
  if (!market.is_refund && totalWinningTickets > 0) {
    const loserPool = totalPool - (ticketPrice * BigInt(totalWinningTickets));
    profitPerTicket = loserPool / BigInt(totalWinningTickets);
  }

  // Update each user's stats
  for (const [userAddress, userTickets] of Object.entries(userMap)) {
    // Check if this market was already counted for this user
    const { data: existing } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_address', userAddress)
      .single();

    // Check claims table to see if this market was already processed
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('market_id', marketId)
      .eq('user_address', userAddress)
      .limit(1);

    // We use a simple approach: recalculate from scratch for this user
    // Get ALL tickets for this user across ALL resolved markets
    const { data: allUserTickets } = await supabase
      .from('tickets')
      .select('market_id, outcome_index, quantity, total_paid')
      .eq('user_address', userAddress);

    // Get all resolved/cancelled markets this user participated in
    const userMarketIds = [...new Set(allUserTickets?.map(t => t.market_id) || [])];

    const { data: userMarkets } = await supabase
      .from('markets')
      .select('id, status, winning_outcome, is_refund, ticket_price, fee, total_pool')
      .in('id', userMarketIds)
      .in('status', ['RESOLVED', 'CANCELLED']);

    // Recalculate all stats from scratch
    let totalVolume = 0n;
    let totalMarkets = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalRefunds = 0;
    let totalPnl = 0n;

    // Calculate volume from ALL tickets (including non-resolved markets)
    for (const t of (allUserTickets || [])) {
      totalVolume += BigInt(t.total_paid);
    }

    // Count unique markets participated
    totalMarkets = userMarketIds.length;

    // Calculate W/L/PnL only from resolved/cancelled markets
    for (const m of (userMarkets || [])) {
      const mTickets = (allUserTickets || []).filter(t => t.market_id === m.id);
      const mTicketPrice = BigInt(m.ticket_price);
      const mTotalPool = BigInt(m.total_pool);

      if (m.status === 'CANCELLED') {
        totalRefunds += 1;
        const totalQty = mTickets.reduce((sum, t) => sum + t.quantity, 0);
        totalPnl -= BigInt(m.fee) * BigInt(totalQty);
        continue;
      }

      if (m.is_refund) {
        totalRefunds += 1;
        const totalQty = mTickets.reduce((sum, t) => sum + t.quantity, 0);
        totalPnl -= BigInt(m.fee) * BigInt(totalQty);
        continue;
      }

      // Resolved with winner
      let winQty = 0;
      let loseQty = 0;
      for (const t of mTickets) {
        if (t.outcome_index === m.winning_outcome) {
          winQty += t.quantity;
        } else {
          loseQty += t.quantity;
        }
      }

      // Get winning tickets count for this market
      const { data: mStats } = await supabase
        .from('market_stats')
        .select('total_tickets')
        .eq('market_id', m.id)
        .eq('outcome_index', m.winning_outcome)
        .single();

      const mWinningTickets = mStats?.total_tickets || 0;
      let mProfitPerTicket = 0n;
      if (mWinningTickets > 0) {
        const mLoserPool = mTotalPool - (mTicketPrice * BigInt(mWinningTickets));
        mProfitPerTicket = mLoserPool / BigInt(mWinningTickets);
      }

      if (winQty > 0 && loseQty === 0) {
        // Pure win
        totalWins += 1;
        const payout = (mTicketPrice + mProfitPerTicket) * BigInt(winQty);
        totalPnl += payout - (mTicketPrice * BigInt(winQty));
      } else if (winQty === 0 && loseQty > 0) {
        // Pure loss
        totalLosses += 1;
        totalPnl -= mTicketPrice * BigInt(loseQty);
      } else if (winQty > 0 && loseQty > 0) {
        // Partial win - count as win (user did get payout)
        totalWins += 1;
        totalLosses += 1;
        const payout = (mTicketPrice + mProfitPerTicket) * BigInt(winQty);
        totalPnl += payout - (mTicketPrice * BigInt(winQty)) - (mTicketPrice * BigInt(loseQty));
      }
    }

    // Calculate winrate
    const totalPlayed = totalWins + totalLosses;
    const winrate = totalPlayed > 0 ? (totalWins / totalPlayed) * 100 : 0;

    const upsertData = {
      user_address: userAddress,
      total_volume: totalVolume.toString(),
      total_markets: totalMarkets,
      total_wins: totalWins,
      total_losses: totalLosses,
      total_refunds: totalRefunds,
      total_pnl: totalPnl.toString(),
      winrate: winrate,
      last_active: new Date().toISOString(),
    };

    const { error } = await supabase.from('user_stats').upsert(upsertData);

    if (error) {
      logger.error(`Failed to update user_stats for ${userAddress}`, { error: error.message });
    }
  }

  logger.info(`Leaderboard updated for market #${marketId} (${Object.keys(userMap).length} users)`);
}

export default { updateLeaderboard };
