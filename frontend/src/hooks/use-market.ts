import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
import type { Market, MarketStats } from './use-markets';

export function useMarket(marketId: number) {
  const [market, setMarket] = useState<Market | null>(null);
  const [stats, setStats] = useState<MarketStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [marketRes, statsRes] = await Promise.all([
        supabase.from('markets').select('*').eq('id', marketId).single(),
        supabase.from('market_stats').select('*').eq('market_id', marketId).order('outcome_index'),
      ]);

      setMarket(marketRes.data);
      setStats(statsRes.data || []);
      setLoading(false);
    }

    fetch();

    // Realtime for market updates
    const marketChannel = supabase
      .channel(`market-${marketId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'markets',
        filter: `id=eq.${marketId}`,
      }, (payload) => {
        setMarket(payload.new as Market);
      })
      .subscribe();

    // Realtime for stats updates
    const statsChannel = supabase
      .channel(`market-stats-${marketId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_stats',
        filter: `market_id=eq.${marketId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setStats((prev) =>
            prev.map((s) =>
              s.outcome_index === (payload.new as MarketStats).outcome_index
                ? (payload.new as MarketStats)
                : s
            )
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(marketChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [marketId]);

  return { market, stats, loading };
}
