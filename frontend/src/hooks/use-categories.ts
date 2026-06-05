import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export interface Category {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  sort_order: number | null;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchCategories() {
      setLoading(true);
      const { data } = await supabase
        .from('market_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (ignore) return;

      setCategories(data || []);
      setLoading(false);
    }

    function handleCategoriesUpdated() {
      fetchCategories();
    }

    fetchCategories();
    window.addEventListener('rivalis:categories-updated', handleCategoriesUpdated);

    return () => {
      ignore = true;
      window.removeEventListener('rivalis:categories-updated', handleCategoriesUpdated);
    };
  }, []);

  return { categories, loading };
}
