import express from 'express';
import { ethers } from 'ethers';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { getLiteforgeRpc, getSepoliaRpc, checkBalances } from '../utils/provider.js';
import { saveBridgeTransaction } from '../utils/supabase.js';
import BridgeVaultABI from '../abi/BridgeVault.json' with { type: 'json' };
import WrappedZkLTCABI from '../abi/WrappedZkLTC.json' with { type: 'json' };

/**
 * Admin API for LitVM Bridge Relayer
 *
 * Endpoints:
 *   GET  /admin/health         — Relayer health (balances, RPC status, queue stats)
 *   GET  /admin/queue          — All transactions in queue
 *   GET  /admin/queue/:id      — Single transaction by ID
 *   POST /admin/verify         — Verify a user's tx on-chain
 *   POST /admin/retry/:id      — Force retry a specific transaction
 *   POST /admin/inject         — Manually inject a missed transaction into queue
 */
export function startAdminApi(txQueue) {
  if (!config.adminApiKey) {
    logger.warn('[Admin API] ADMIN_API_KEY not set — admin API disabled');
    return null;
  }

  const app = express();
  app.use(express.json());

  // ── CORS middleware ─────────────────────────────────────────
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // ── Auth middleware ──────────────────────────────────────────
  app.use('/admin', (req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.key;
    if (key !== config.adminApiKey) {
      return res.status(401).json({ error: 'Unauthorized — invalid API key' });
    }
    next();
  });

  // ── GET /admin/health ───────────────────────────────────────
  app.get('/admin/health', async (req, res) => {
    try {
      const stats = txQueue.getStats();
      let balances = null;
      try {
        balances = await checkBalances();
        balances = {
          liteforge: ethers.formatEther(balances.liteforge) + ' zkLTC',
          sepolia: ethers.formatEther(balances.sepolia) + ' ETH',
        };
      } catch (e) {
        balances = { error: e.message };
      }

      const lfRpc = getLiteforgeRpc();
      const sepRpc = getSepoliaRpc();

      res.json({
        status: 'running',
        uptime: process.uptime(),
        balances,
        rpc: {
          liteforge: { active: lfRpc.getCurrentUrl(), total: lfRpc.rpcUrls.length },
          sepolia: { active: sepRpc.getCurrentUrl(), total: sepRpc.rpcUrls.length },
        },
        queue: stats,
        config: {
          pollIntervalMs: config.pollIntervalMs,
          confirmationBlocks: config.confirmationBlocks,
          maxRetries: config.maxRetries,
          mintConcurrency: config.mintConcurrency,
          unlockConcurrency: config.unlockConcurrency,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /admin/queue ────────────────────────────────────────
  app.get('/admin/queue', (req, res) => {
    try {
      const { status, limit } = req.query;
      const txs = txQueue.getAllTransactions(status || null, parseInt(limit) || 50);
      res.json({ count: txs.length, transactions: txs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GET /admin/queue/:id ────────────────────────────────────
  app.get('/admin/queue/:id', (req, res) => {
    try {
      const tx = txQueue.getTransaction(parseInt(req.params.id));
      if (!tx) return res.status(404).json({ error: 'Transaction not found' });
      res.json(tx);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── POST /admin/verify ─────────────────────────────────────
  // Body: { txHash: "0x...", chain: "liteforge" | "sepolia" }
  app.post('/admin/verify', async (req, res) => {
    try {
      const { txHash, chain } = req.body;
      if (!txHash || !chain) {
        return res.status(400).json({ error: 'Required: txHash, chain (liteforge|sepolia)' });
      }

      const result = { txHash, chain, steps: {} };

      // Step 1: Check if tx exists in relayer queue
      const queueTxs = txQueue.getTransactionByHash(txHash);
      result.steps.inQueue = queueTxs.length > 0;
      result.steps.queueEntries = queueTxs;

      // Step 2: Verify on source chain
      if (chain === 'liteforge') {
        const lfRpc = getLiteforgeRpc();

        // Get tx receipt from LiteForge
        const receipt = await lfRpc.withFallback(p => p.getTransactionReceipt(txHash));
        result.steps.sourceReceipt = receipt ? {
          status: receipt.status === 1 ? 'success' : 'reverted',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        } : null;

        if (receipt && receipt.status === 1) {
          // Parse Locked event
          const iface = new ethers.Interface(BridgeVaultABI);
          const lockedEvents = receipt.logs
            .map(log => { try { return iface.parseLog(log); } catch { return null; } })
            .filter(e => e && e.name === 'Locked');

          if (lockedEvents.length > 0) {
            const ev = lockedEvents[0];
            result.steps.lockedEvent = {
              sender: ev.args.sender,
              recipient: ev.args.recipient,
              amount: ethers.formatEther(ev.args.amount),
              fee: ethers.formatEther(ev.args.fee),
              nonce: ev.args.nonce.toString(),
            };

            // Step 3: Check if mint was processed on Sepolia
            const sepRpc = getSepoliaRpc();
            const wrappedContract = new ethers.Contract(
              config.sepolia.wrappedZkLTCAddress,
              WrappedZkLTCABI,
              sepRpc.getProvider()
            );
            const nonce = Number(ev.args.nonce);
            const isProcessed = await sepRpc.withFallback(async () => {
              return wrappedContract.isProcessed(txHash, nonce);
            });
            result.steps.mintedOnSepolia = isProcessed;
          }
        }

        result.summary = result.steps.mintedOnSepolia
          ? 'COMPLETED — mint sudah diproses di Sepolia'
          : result.steps.inQueue
            ? `IN QUEUE — status: ${queueTxs[0]?.status}`
            : 'MISSED — lock valid tapi tidak ada di queue, gunakan /admin/inject';

      } else if (chain === 'sepolia') {
        const sepRpc = getSepoliaRpc();

        // Get tx receipt from Sepolia
        const receipt = await sepRpc.withFallback(p => p.getTransactionReceipt(txHash));
        result.steps.sourceReceipt = receipt ? {
          status: receipt.status === 1 ? 'success' : 'reverted',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        } : null;

        if (receipt && receipt.status === 1) {
          // Parse Burned event
          const iface = new ethers.Interface(WrappedZkLTCABI);
          const burnedEvents = receipt.logs
            .map(log => { try { return iface.parseLog(log); } catch { return null; } })
            .filter(e => e && e.name === 'Burned');

          if (burnedEvents.length > 0) {
            const ev = burnedEvents[0];
            result.steps.burnedEvent = {
              sender: ev.args.sender,
              recipient: ev.args.recipient,
              amount: ethers.formatEther(ev.args.amount),
              fee: ethers.formatEther(ev.args.fee),
              nonce: ev.args.nonce.toString(),
            };

            // Step 3: Check if unlock was processed on LiteForge
            const lfRpc = getLiteforgeRpc();
            const vaultContract = new ethers.Contract(
              config.liteforge.bridgeVaultAddress,
              BridgeVaultABI,
              lfRpc.getProvider()
            );
            const nonce = Number(ev.args.nonce);
            const isProcessed = await lfRpc.withFallback(async () => {
              return vaultContract.isProcessed(txHash, nonce);
            });
            result.steps.unlockedOnLiteforge = isProcessed;
          }
        }

        result.summary = result.steps.unlockedOnLiteforge
          ? 'COMPLETED — unlock sudah diproses di LiteForge'
          : result.steps.inQueue
            ? `IN QUEUE — status: ${queueTxs[0]?.status}`
            : 'MISSED — burn valid tapi tidak ada di queue, gunakan /admin/inject';

      } else {
        return res.status(400).json({ error: 'chain must be "liteforge" or "sepolia"' });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── POST /admin/retry/:id ──────────────────────────────────
  app.post('/admin/retry/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tx = txQueue.getTransaction(id);
      if (!tx) return res.status(404).json({ error: 'Transaction not found' });

      if (tx.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Transaction already completed', tx });
      }

      const updated = txQueue.forceRetry(id);
      logger.info(`[Admin] Force retry transaction`, { id });
      res.json({ message: `Transaction #${id} set to RETRYING`, tx: updated });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── POST /admin/inject ─────────────────────────────────────
  // Manually inject a missed transaction into the queue
  // Body: { txHash: "0x...", chain: "liteforge" | "sepolia" }
  app.post('/admin/inject', async (req, res) => {
    try {
      const { txHash, chain } = req.body;
      if (!txHash || !chain) {
        return res.status(400).json({ error: 'Required: txHash, chain (liteforge|sepolia)' });
      }

      // Check if already in queue
      const existing = txQueue.getTransactionByHash(txHash);
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'Transaction already in queue',
          existing: existing[0],
          hint: existing[0].status !== 'COMPLETED' ? `Use POST /admin/retry/${existing[0].id} to force retry` : 'Already completed',
        });
      }

      if (chain === 'liteforge') {
        // Fetch and parse Locked event from LiteForge
        const lfRpc = getLiteforgeRpc();
        const receipt = await lfRpc.withFallback(p => p.getTransactionReceipt(txHash));
        if (!receipt || receipt.status !== 1) {
          return res.status(400).json({ error: 'Transaction not found or reverted on LiteForge' });
        }

        const iface = new ethers.Interface(BridgeVaultABI);
        const lockedEvents = receipt.logs
          .map(log => { try { return iface.parseLog(log); } catch { return null; } })
          .filter(e => e && e.name === 'Locked');

        if (lockedEvents.length === 0) {
          return res.status(400).json({ error: 'No Locked event found in transaction' });
        }

        const ev = lockedEvents[0];
        const nonce = Number(ev.args.nonce);

        // Check if already processed on-chain
        const sepRpc = getSepoliaRpc();
        const wrappedContract = new ethers.Contract(
          config.sepolia.wrappedZkLTCAddress, WrappedZkLTCABI, sepRpc.getProvider()
        );
        const isProcessed = await sepRpc.withFallback(() => wrappedContract.isProcessed(txHash, nonce));
        if (isProcessed) {
          return res.status(400).json({ error: 'Already minted on Sepolia — no action needed' });
        }

        // Inject into queue
        const added = txQueue.addTransaction({
          type: 'MINT',
          sourceTxHash: txHash,
          sourceChain: 'liteforge',
          sourceBlock: receipt.blockNumber,
          sourceNonce: nonce,
          recipient: ev.args.recipient,
          amount: ev.args.amount.toString(),
        });

        // Also save to Supabase
        await saveBridgeTransaction({
          direction: 'liteforge_to_sepolia',
          source_tx_hash: txHash,
          source_chain_id: 4441,
          source_block: receipt.blockNumber,
          source_nonce: nonce,
          dest_chain_id: 11155111,
          sender: ev.args.sender,
          recipient: ev.args.recipient,
          amount: ev.args.amount.toString(),
          fee: ev.args.fee.toString(),
          status: 'pending',
        });

        logger.info(`[Admin] Injected MINT transaction`, { txHash, nonce });
        res.json({
          message: 'MINT transaction injected into queue',
          event: {
            sender: ev.args.sender,
            recipient: ev.args.recipient,
            amount: ethers.formatEther(ev.args.amount),
            fee: ethers.formatEther(ev.args.fee),
            nonce,
          },
        });

      } else if (chain === 'sepolia') {
        // Fetch and parse Burned event from Sepolia
        const sepRpc = getSepoliaRpc();
        const receipt = await sepRpc.withFallback(p => p.getTransactionReceipt(txHash));
        if (!receipt || receipt.status !== 1) {
          return res.status(400).json({ error: 'Transaction not found or reverted on Sepolia' });
        }

        const iface = new ethers.Interface(WrappedZkLTCABI);
        const burnedEvents = receipt.logs
          .map(log => { try { return iface.parseLog(log); } catch { return null; } })
          .filter(e => e && e.name === 'Burned');

        if (burnedEvents.length === 0) {
          return res.status(400).json({ error: 'No Burned event found in transaction' });
        }

        const ev = burnedEvents[0];
        const nonce = Number(ev.args.nonce);

        // Check if already processed on-chain
        const lfRpc = getLiteforgeRpc();
        const vaultContract = new ethers.Contract(
          config.liteforge.bridgeVaultAddress, BridgeVaultABI, lfRpc.getProvider()
        );
        const isProcessed = await lfRpc.withFallback(() => vaultContract.isProcessed(txHash, nonce));
        if (isProcessed) {
          return res.status(400).json({ error: 'Already unlocked on LiteForge — no action needed' });
        }

        // Inject into queue
        const added = txQueue.addTransaction({
          type: 'UNLOCK',
          sourceTxHash: txHash,
          sourceChain: 'sepolia',
          sourceBlock: receipt.blockNumber,
          sourceNonce: nonce,
          recipient: ev.args.recipient,
          amount: ev.args.amount.toString(),
        });

        // Also save to Supabase
        await saveBridgeTransaction({
          direction: 'sepolia_to_liteforge',
          source_tx_hash: txHash,
          source_chain_id: 11155111,
          source_block: receipt.blockNumber,
          source_nonce: nonce,
          dest_chain_id: 4441,
          sender: ev.args.sender,
          recipient: ev.args.recipient,
          amount: ev.args.amount.toString(),
          fee: ev.args.fee.toString(),
          status: 'pending',
        });

        logger.info(`[Admin] Injected UNLOCK transaction`, { txHash, nonce });
        res.json({
          message: 'UNLOCK transaction injected into queue',
          event: {
            sender: ev.args.sender,
            recipient: ev.args.recipient,
            amount: ethers.formatEther(ev.args.amount),
            fee: ethers.formatEther(ev.args.fee),
            nonce,
          },
        });

      } else {
        return res.status(400).json({ error: 'chain must be "liteforge" or "sepolia"' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Start server ────────────────────────────────────────────
  const server = app.listen(config.adminPort, () => {
    logger.info(`[Admin API] Running on port ${config.adminPort}`);
  });

  return server;
}
