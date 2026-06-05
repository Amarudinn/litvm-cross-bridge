import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/config/supabase';

export interface Comment {
  id: number;
  market_id: number;
  user_address: string;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export function useComments(marketId: number) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [posting, setPosting] = useState(false);

  // Fetch comments with pagination
  const fetchComments = useCallback(async (pageNum: number) => {
    const from = 0;
    const to = pageNum * PAGE_SIZE - 1;

    const { data, count } = await supabase
      .from('market_comments')
      .select('*', { count: 'exact' })
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .range(from, to);

    setComments(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [marketId]);

  useEffect(() => {
    fetchComments(page);

    // Realtime for new comments
    const channel = supabase
      .channel(`comments-${marketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_comments',
        filter: `market_id=eq.${marketId}`,
      }, (payload) => {
        const newComment = payload.new as Comment;
        setComments((prev) => {
          // Cegah duplikat dari optimistic update
          if (prev.some(c => c.id === newComment.id)) return prev;
          return [newComment, ...prev];
        });
        setTotal((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId, page, fetchComments]);

  function showMore() {
    setPage((prev) => prev + 1);
  }

  async function postComment(userAddress: string, content: string) {
    if (!content.trim()) return;
    setPosting(true);

    // Optimistic update — tampilkan langsung tanpa tunggu realtime
    const optimisticComment: Comment = {
      id: Date.now(),
      market_id: marketId,
      user_address: userAddress,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [optimisticComment, ...prev]);
    setTotal((prev) => prev + 1);

    await supabase.from('market_comments').insert({
      market_id: marketId,
      user_address: userAddress,
      content: content.trim(),
    });
    setPosting(false);
  }

  const hasMore = comments.length < total;

  return { comments, total, loading, hasMore, showMore, postComment, posting };
}
