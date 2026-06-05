import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export interface MarketRule {
  title: string;
  description: string;
}

export interface Market {
  id: number;
  title: string;
  description: string;
  outcomes: string[];
  ticket_price: string;
  fee: string;
  close_time: string;
  status: string;
  winning_outcome: number | null;
  is_refund: boolean;
  creator: string;
  total_pool: string;
  total_fee_collected: string;
  total_tickets: number;
  created_at: string;
  tx_hash: string;
  block_number: number;
  category_id: number | null;
  match_url: string | null;
  rules: MarketRule[] | null;
}

export interface MarketStats {
  market_id: number;
  outcome_index: number;
  outcome_label: string;
  total_tickets: number;
  total_pool: string;
}

export function useMarkets(status?: string, categoryId?: number) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, MarketStats[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    (async () => {
      let query = supabase
        .from('markets')
        .select('*')
        .order('id', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      } else {
        query = query.in('status', ['OPEN', 'CLOSED', 'RESOLVED']);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: marketsData } = await query;
      if (ignore) return;

      const marketList = marketsData || [];

      const { data: statsData } = await supabase
        .from('market_stats')
        .select('*')
        .order('outcome_index');
      if (ignore) return;

      const map: Record<number, MarketStats[]> = {};
      for (const s of (statsData || [])) {
        if (!map[s.market_id]) map[s.market_id] = [];
        map[s.market_id].push(s);
      }

      setMarkets(marketList);
      setStatsMap(map);
      setLoading(false);
    })();

    // Realtime: market updates (status, pool, tickets)
    const marketsChannel = supabase
      .channel('markets-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'markets',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMarket = payload.new as Market;
          const validStatuses = status ? [status] : ['OPEN', 'CLOSED', 'RESOLVED'];
          if (validStatuses.includes(newMarket.status)) {
            if (!categoryId || newMarket.category_id === categoryId) {
              setMarkets((prev) => [newMarket, ...prev]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setMarkets((prev) =>
            prev.map((m) => m.id === (payload.new as Market).id ? (payload.new as Market) : m)
          );
        }
      })
      .subscribe();

    // Realtime: stats updates (tickets, pool per outcome)
    const statsChannel = supabase
      .channel('market-stats-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_stats',
      }, (payload) => {
        const updated = payload.new as MarketStats;
        setStatsMap((prev) => {
          const existing = prev[updated.market_id] || [];
          const newStats = existing.some(s => s.outcome_index === updated.outcome_index)
            ? existing.map(s => s.outcome_index === updated.outcome_index ? updated : s)
            : [...existing, updated];
          return { ...prev, [updated.market_id]: newStats };
        });
      })
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(marketsChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [status, categoryId]);

  return { markets, statsMap, loading };
}
