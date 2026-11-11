import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { AgentEvent } from '@/lib/supabase';

export function useAgentEvents(caseId: string | null) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!caseId) {
      setEvents([]);
      return;
    }

    // Load existing events
    supabase
      .from('agent_events')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data as AgentEvent[]);
      });

    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`agent_events:${caseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_events',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as AgentEvent]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_events',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          setEvents((prev) =>
            prev.map((e) => (e.id === payload.new.id ? (payload.new as AgentEvent) : e))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [caseId]);

  return events;
}
