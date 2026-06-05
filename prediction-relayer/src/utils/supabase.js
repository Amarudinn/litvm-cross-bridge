import { createClient } from '@supabase/supabase-js';
import config from '../config.js';
import logger from './logger.js';

let supabase = null;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    logger.info('Supabase client initialized');
  }
  return supabase;
}

export default { getSupabase };
