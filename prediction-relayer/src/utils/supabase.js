import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import config from '../config.js';
import logger from './logger.js';

let supabase = null;

/**
 * Get Supabase client (lazy singleton).
 * Same pattern as bridge relayer: returns null if Supabase is not configured,
 * so the relayer can keep polling chain events without Supabase.
 */
export function getSupabase() {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      return null;
    }

    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws,
      },
    });
    logger.info('Supabase client initialized');
  }
  return supabase;
}

export default { getSupabase };
