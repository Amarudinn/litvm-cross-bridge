import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export interface LeaderboardEntry {
  user_address: string;
  total_volume: string;
  total_markets: number;
  total_wins: number;
  total_losses: number;
  total_refunds: number;
  total_pnl: string;
  winrate: number;
  last_active: string;
}

export function useLeaderboard(sort: 'pnl' | 'winrate' | 'volume' = 'pnl', limit = 50) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const orderColumn = sort === 'pnl' ? 'total_pnl' : sort === 'winrate' ? 'winrate' : 'total_volume';

      let query = supabase
        .from('user_stats')
        .select('*')
        .order(orderColumn, { ascending: false })
        .limit(limit);

      if (sort === 'winrate') {
        query = query.gte('total_markets', 5);
      }

      const { data } = await query;
      setEntries(data || []);
      setLoading(false);
    }

    fetch();

    // Realtime: user_stats updates
    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_stats',
      }, (payload) => {
        const updated = payload.new as LeaderboardEntry;
        setEntries((prev) => {
          const exists = prev.some(e => e.user_address === updated.user_address);
          if (exists) {
            return prev.map(e => e.user_address === updated.user_address ? updated : e);
          }
          return [updated, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sort, limit]);

  return { entries, loading };
}
