import express from 'express';
import { ethers } from 'ethers';
import { getSupabase } from '../utils/supabase.js';
import { getProvider } from '../utils/provider.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import { getLastProcessedBlock } from '../db/checkpoint.js';
import { getBlockNumber } from '../utils/provider.js';

const app = express();
app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const startTime = Date.now();

const CONTRACT_ABI = [
  "function createMarket(string title, string description, string[] outcomes, uint256 ticketPrice, uint256 fee, uint256 closeTime)",
  "function resolveMarket(uint256 marketId, uint256 winningOutcome)",
  "function resolveMarketRefund(uint256 marketId)",
  "function cancelMarket(uint256 marketId)",
  "function pauseMarket(uint256 marketId)",
  "function unpauseMarket(uint256 marketId)",
  "function withdrawFees()",
  "function updateCloseTime(uint256 marketId, uint256 newCloseTime)",
  "function updateFee(uint256 marketId, uint256 newFee)",
  "function owner() view returns (address)",
];

// Auth middleware for admin endpoints
function authMiddleware(req, res, next) {
  const passphrase = req.headers.authorization?.replace('Bearer ', '');
  if (!passphrase || passphrase !== config.adminPassphrase) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Get admin wallet
function getAdminWallet() {
  if (!config.adminPrivateKey) {
    throw new Error('ADMIN_PRIVATE_KEY not configured');
  }
  const provider = getProvider();
  return new ethers.Wallet(config.adminPrivateKey, provider);
}

// Get contract instance with admin signer
function getContract() {
  const wallet = getAdminWallet();
  return new ethers.Contract(config.contractAddress, CONTRACT_ABI, wallet);
}

// ============================================
// Public Endpoints
// ============================================

// GET /categories
app.get('/categories', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('market_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ categories: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Admin Auth Verify
// ============================================

// POST /admin/verify
app.post('/admin/verify', authMiddleware, (req, res) => {
  res.json({ success: true });
});

// ============================================
// Admin Category Endpoints
// ============================================

// POST /admin/create-category
app.post('/admin/create-category', authMiddleware, async (req, res) => {
  try {
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing category name' });
    }

    const supabase = getSupabase();
    const { data: maxOrderRows } = await supabase
      .from('market_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (maxOrderRows?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('market_categories')
      .insert({ name, icon: icon || 'tag', sort_order: nextOrder })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Category already exists' });
      }
      throw error;
    }

    logger.info(`[Admin] Category created: ${name} (icon: ${icon || 'tag'})`);
    res.json({ success: true, category: data });
  } catch (err) {
    logger.error(`[Admin] createCategory failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/delete-category
app.post('/admin/delete-category', authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Missing category id' });
    }

    const supabase = getSupabase();
    const { count, error: countError } = await supabase
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) throw countError;
    if ((count || 0) > 0) {
      return res.status(400).json({ error: 'Category is used by existing markets' });
    }

    const { error } = await supabase
      .from('market_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`[Admin] Category deleted: #${id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error(`[Admin] deleteCategory failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/reorder-categories
app.post('/admin/reorder-categories', authMiddleware, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Missing orders array' });
    }

    const supabase = getSupabase();
    for (const item of orders) {
      if (!item?.id || item.sort_order === undefined) continue;
      const { error } = await supabase
        .from('market_categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
      if (error) throw error;
    }

    logger.info(`[Admin] Categories reordered (${orders.length} items)`);
    res.json({ success: true });
  } catch (err) {
    logger.error(`[Admin] reorderCategories failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Admin Transaction Endpoints
// ============================================

// POST /admin/create-market
app.post('/admin/create-market', authMiddleware, async (req, res) => {
  try {
    const { title, description, outcomes, ticketPrice, fee, closeTime, categoryId, matchUrl, rules } = req.body;

    if (!title || !outcomes || outcomes.length < 2 || !ticketPrice || !fee || !closeTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'Missing categoryId' });
    }

    const contract = getContract();
    const tx = await contract.createMarket(
      title,
      description || '',
      outcomes,
      ethers.parseEther(ticketPrice),
      ethers.parseEther(fee),
      BigInt(closeTime)
    );

    logger.info(`[Admin] createMarket tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] createMarket confirmed: ${tx.hash}`);

    // Update category_id in Supabase after market is indexed
    // Retry because the market-created handler may not have indexed it yet
    const supabase = getSupabase();
    const maxRetries = 10;
    let updated = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data, error: updateError } = await supabase
        .from('markets')
        .update({
          category_id: categoryId,
          match_url: matchUrl?.trim() || null,
          rules: Array.isArray(rules) ? rules : null,
        })
        .eq('tx_hash', tx.hash)
        .select('id');

      if (updateError) {
        logger.warn(`[Admin] Failed to set category (attempt ${attempt}): ${updateError.message}`);
      } else if (data && data.length > 0) {
        logger.info(`[Admin] Category ${categoryId} set for market #${data[0].id} (tx: ${tx.hash})`);
        updated = true;
        break;
      }

      // Wait 3 seconds before retry (market handler needs time to index)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    if (!updated) {
      logger.warn(`[Admin] Could not set category after ${maxRetries} retries (tx: ${tx.hash})`);
    }

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] createMarket failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/update-close-time
app.post('/admin/update-close-time', authMiddleware, async (req, res) => {
  try {
    const { marketId, closeTime } = req.body;
    if (marketId === undefined || closeTime === undefined) {
      return res.status(400).json({ error: 'Missing marketId or closeTime' });
    }

    const contract = getContract();
    const tx = await contract.updateCloseTime(BigInt(marketId), BigInt(closeTime));

    logger.info(`[Admin] updateCloseTime tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] updateCloseTime confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] updateCloseTime failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/resolve-market
app.post('/admin/resolve-market', authMiddleware, async (req, res) => {
  try {
    const { marketId, winningOutcome } = req.body;
    if (marketId === undefined || winningOutcome === undefined) {
      return res.status(400).json({ error: 'Missing marketId or winningOutcome' });
    }

    const contract = getContract();
    const tx = await contract.resolveMarket(BigInt(marketId), BigInt(winningOutcome));

    logger.info(`[Admin] resolveMarket tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] resolveMarket confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] resolveMarket failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/resolve-refund
app.post('/admin/resolve-refund', authMiddleware, async (req, res) => {
  try {
    const { marketId } = req.body;
    if (marketId === undefined) {
      return res.status(400).json({ error: 'Missing marketId' });
    }

    const contract = getContract();
    const tx = await contract.resolveMarketRefund(BigInt(marketId));

    logger.info(`[Admin] resolveMarketRefund tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] resolveMarketRefund confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] resolveMarketRefund failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/cancel-market
app.post('/admin/cancel-market', authMiddleware, async (req, res) => {
  try {
    const { marketId } = req.body;
    if (marketId === undefined) {
      return res.status(400).json({ error: 'Missing marketId' });
    }

    const contract = getContract();
    const tx = await contract.cancelMarket(BigInt(marketId));

    logger.info(`[Admin] cancelMarket tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] cancelMarket confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] cancelMarket failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/pause-market
app.post('/admin/pause-market', authMiddleware, async (req, res) => {
  try {
    const { marketId } = req.body;
    if (marketId === undefined) {
      return res.status(400).json({ error: 'Missing marketId' });
    }

    const contract = getContract();
    const tx = await contract.pauseMarket(BigInt(marketId));

    logger.info(`[Admin] pauseMarket tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] pauseMarket confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] pauseMarket failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/unpause-market
app.post('/admin/unpause-market', authMiddleware, async (req, res) => {
  try {
    const { marketId } = req.body;
    if (marketId === undefined) {
      return res.status(400).json({ error: 'Missing marketId' });
    }

    const contract = getContract();
    const tx = await contract.unpauseMarket(BigInt(marketId));

    logger.info(`[Admin] unpauseMarket tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] unpauseMarket confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] unpauseMarket failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/withdraw-fees
app.post('/admin/withdraw-fees', authMiddleware, async (req, res) => {
  try {
    const contract = getContract();
    const tx = await contract.withdrawFees();

    logger.info(`[Admin] withdrawFees tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`[Admin] withdrawFees confirmed: ${tx.hash}`);

    res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    logger.error(`[Admin] withdrawFees failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// Read Endpoints (existing)
// ============================================

// GET /health
app.get('/health', async (req, res) => {
  try {
    const currentBlock = await getBlockNumber();
    const lastProcessed = getLastProcessedBlock();

    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      lastProcessedBlock: lastProcessed,
      currentBlock: currentBlock,
      blocksBehind: currentBlock - lastProcessed,
      contract: config.contractAddress,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /markets
app.get('/markets', async (req, res) => {
  try {
    const supabase = getSupabase();
    const status = req.query.status;

    let query = supabase.from('markets').select('*').order('id', { ascending: false });

    if (status) {
      query = query.eq('status', status.toUpperCase());
    }

    const limit = parseInt(req.query.limit) || 50;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ markets: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /markets/:id
app.get('/markets/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const marketId = parseInt(req.params.id);

    const { data: market, error } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (error) throw error;
    if (!market) return res.status(404).json({ error: 'Market not found' });

    // Get stats
    const { data: stats } = await supabase
      .from('market_stats')
      .select('*')
      .eq('market_id', marketId)
      .order('outcome_index');

    res.json({ market, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /markets/:id/tickets
app.get('/markets/:id/tickets', async (req, res) => {
  try {
    const supabase = getSupabase();
    const marketId = parseInt(req.params.id);

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:address
app.get('/users/:address', async (req, res) => {
  try {
    const supabase = getSupabase();
    const address = req.params.address.toLowerCase();

    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_address', address)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ user: stats || { user_address: address, total_volume: '0', total_markets: 0, total_wins: 0, total_losses: 0, total_pnl: '0', winrate: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:address/history
app.get('/users/:address/history', async (req, res) => {
  try {
    const supabase = getSupabase();
    const address = req.params.address.toLowerCase();

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        market_id,
        outcome_index,
        outcome_label,
        quantity,
        total_paid,
        created_at,
        markets (
          title,
          status,
          winning_outcome,
          is_refund,
          ticket_price,
          fee
        )
      `)
      .eq('user_address', address)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get claims for this user
    const { data: claims } = await supabase
      .from('claims')
      .select('market_id, amount, claim_type')
      .eq('user_address', address);

    const claimsMap = {};
    if (claims) {
      for (const c of claims) {
        claimsMap[c.market_id] = c;
      }
    }

    // Group by market
    const marketMap = {};
    for (const t of tickets) {
      if (!marketMap[t.market_id]) {
        marketMap[t.market_id] = {
          market_id: t.market_id,
          market_title: t.markets?.title,
          status: t.markets?.status,
          outcomes_bought: [],
          total_paid: '0',
          claim: claimsMap[t.market_id] || null,
        };
      }
      marketMap[t.market_id].outcomes_bought.push({
        outcome: t.outcome_label,
        outcome_index: t.outcome_index,
        quantity: t.quantity,
        paid: t.total_paid,
      });
      marketMap[t.market_id].total_paid = (
        BigInt(marketMap[t.market_id].total_paid) + BigInt(t.total_paid)
      ).toString();
    }

    res.json({ history: Object.values(marketMap) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /leaderboard
app.get('/leaderboard', async (req, res) => {
  try {
    const supabase = getSupabase();
    const sort = req.query.sort || 'pnl';
    const limit = parseInt(req.query.limit) || 100;

    let orderColumn = 'total_pnl';
    if (sort === 'winrate') orderColumn = 'winrate';
    else if (sort === 'volume') orderColumn = 'total_volume';

    let query = supabase
      .from('user_stats')
      .select('*')
      .order(orderColumn, { ascending: false })
      .limit(limit);

    // For winrate, require minimum 5 markets
    if (sort === 'winrate') {
      query = query.gte('total_markets', 5);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export function startAdminApi() {
  app.listen(config.adminPort, () => {
    logger.info(`Admin API running on port ${config.adminPort}`);
  });
}

export default { startAdminApi };
