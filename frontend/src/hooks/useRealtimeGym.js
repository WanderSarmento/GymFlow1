import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

/**
 * Hook customizado para escutar atualizações em tempo real da tabela Gym do Supabase.
 * @param {Object} filter - Objeto contendo o filtro (ex: { slug: 'slug-da-academia' } ou { id: 'uuid-da-academia' })
 * @param {Object} initialData - Dados iniciais obtidos via HTTP REST
 */
export function useRealtimeGym(filter, initialData) {
  const [gym, setGym] = useState(initialData);

  useEffect(() => {
    setGym(initialData);
  }, [initialData]);

  useEffect(() => {
    const filterKey = Object.keys(filter)[0];
    const filterValue = filter[filterKey];

    if (!filterValue) return;

    // Cria o canal de escuta do Realtime para a tabela Gym
    const channel = supabase
      .channel(`gym-changes-${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Gym',
          filter: `${filterKey}=eq.${filterValue}`,
        },
        (payload) => {
          // Atualiza o estado local do react com os novos dados recebidos do Supabase
          setGym((prev) => {
            if (!prev) return payload.new;
            return {
              ...prev,
              ...payload.new,
            };
          });
        }
      )
      .subscribe();

    // Limpa a inscrição ao desmontar o componente ou mudar o filtro
    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterValue, filterKey]);

  return [gym, setGym];
}
