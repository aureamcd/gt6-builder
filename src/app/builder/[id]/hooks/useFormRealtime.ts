import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UseFormRealtimeOptions {
  id: string;
  clientIdRef: React.MutableRefObject<string>;
  channelRef: React.MutableRefObject<any>;
  isRemoteUpdateRef: React.MutableRefObject<boolean>;
  onRemoteSchemaUpdate: (newSchema: any) => void;
  onNewResponseSubmitted: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

export function useFormRealtime(options: UseFormRealtimeOptions) {
  const {
    id,
    clientIdRef,
    channelRef,
    isRemoteUpdateRef,
    onRemoteSchemaUpdate,
    onNewResponseSubmitted,
    showToast
  } = options;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineCollaborators, setOnlineCollaborators] = useState<Array<{ clientId: string; name: string; email: string; color: string }>>([]);
  const [lastSyncedBy, setLastSyncedBy] = useState<string | null>(null);

  useEffect(() => {
    let channel: any;

    async function initRealtime() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setCurrentUser(user);
      }
      const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
      const userEmail = user?.email || '';
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6'];
      const userColor = colors[Math.floor(Math.random() * colors.length)];

      channel = supabase.channel(`form_builder_realtime_${id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: clientIdRef.current }
        }
      });

      channelRef.current = channel;

      // 1. Receber edições do formulário em tempo real
      channel.on('broadcast', { event: 'form_schema_update' }, ({ payload }: any) => {
        if (payload && payload.senderId !== clientIdRef.current && payload.schema) {
          isRemoteUpdateRef.current = true;
          onRemoteSchemaUpdate(payload.schema);
          setLastSyncedBy(payload.senderName || 'Colaborador');
          setTimeout(() => {
            setLastSyncedBy(null);
          }, 3000);
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      });

      // 2. Receber novas respostas em tempo real (via Broadcast)
      channel.on('broadcast', { event: 'new_response_submitted' }, () => {
        onNewResponseSubmitted();
        showToast("Uma nova resposta foi registrada no formulário!", "success", "Nova Resposta Recebida! 🎉");
      });

      // 3. Acompanhar colaboradores online (Presence)
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users: any[] = [];
          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.clientId !== clientIdRef.current) {
                users.push(p);
              }
            });
          });
          setOnlineCollaborators(users);
        })
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
          newPresences.forEach((p: any) => {
            if (p.clientId !== clientIdRef.current) {
              showToast(`${p.name || 'Outro usuário'} entrou na edição simultânea.`, 'info', 'Colaborador Conectado');
            }
          });
        });

      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            clientId: clientIdRef.current,
            name: userName,
            email: userEmail,
            color: userColor,
            joinedAt: new Date().toISOString()
          });
        }
      });
    }

    if (id) {
      initRealtime();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  return {
    currentUser,
    onlineCollaborators,
    lastSyncedBy
  };
}

