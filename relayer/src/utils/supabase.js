import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from './logger.js';

let supabase = null;

/**
 * Get Supabase client (lazy singleton)
 * Returns null if not configured - relayer tetap jalan tanpa Supabase
 */
function getSupabase() {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      return null;
    }
    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    logger.info('Supabase client initialized');
  }
  return supabase;
}

/**
 * Save a bridge transaction (insert or update)
 */
export async function saveBridgeTransaction(data) {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client
      .from('bridge_transactions')
      .upsert(data, { onConflict: 'source_tx_hash,source_nonce' });

    if (error) {
      logger.error(`Supabase upsert error: ${error.message}`);
    }
  } catch (err) {
    logger.error(`Supabase save error: ${err.message}`);
  }
}

/**
 * Update transaction status to completed
 */
export async function completeBridgeTransaction(sourceTxHash, sourceNonce, destTxHash) {
  const client = getSupabase();
  if (!client) return;

  try {
    const { error } = await client
      .from('bridge_transactions')
      .update({
        dest_tx_hash: destTxHash,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('source_tx_hash', sourceTxHash)
      .eq('source_nonce', sourceNonce);

    if (error) {
      logger.error(`Supabase update error: ${error.message}`);
    }
  } catch (err) {
    logger.error(`Supabase update error: ${err.message}`);
  }
}
