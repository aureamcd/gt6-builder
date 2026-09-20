import { useState, useRef } from "react";
import { Form } from "@/types/form";

interface UseFormHistoryOptions {
  channelRef: React.MutableRefObject<any>;
  isRemoteUpdateRef: React.MutableRefObject<boolean>;
  clientIdRef: React.MutableRefObject<string>;
  currentUser: any;
}

export function useFormHistory(options: UseFormHistoryOptions) {
  const { channelRef, isRemoteUpdateRef, clientIdRef, currentUser } = options;
  const [schema, _setSchema] = useState<Form | null>(null);
  const [history, setHistory] = useState<Form[]>([]);
  const [future, setFuture] = useState<Form[]>([]);

  const setSchema = (newSchemaOrUpdater: React.SetStateAction<Form | null>) => {
    _setSchema(prev => {
      const nextSchema = typeof newSchemaOrUpdater === 'function' 
        ? (newSchemaOrUpdater as (prevState: Form | null) => Form | null)(prev) 
        : newSchemaOrUpdater;

      if (prev && nextSchema && JSON.stringify(prev) !== JSON.stringify(nextSchema)) {
        setHistory(h => [...h, prev].slice(-50));
        setFuture([]);

        if (channelRef.current && !isRemoteUpdateRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'form_schema_update',
            payload: {
              schema: nextSchema,
              senderId: clientIdRef.current,
              senderName: currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Colega',
              timestamp: Date.now()
            }
          });
        }
      }

      return nextSchema;
    });
  };

  const setSchemaWithoutHistory = (newSchema: Form | null) => {
    _setSchema(newSchema);
  };

  const handleUndo = () => {
    if (history.length === 0 || !schema) return;
    const prev = history[history.length - 1];
    setFuture(f => [schema, ...f]);
    setHistory(h => h.slice(0, -1));
    _setSchema(prev);
  };

  const handleRedo = () => {
    if (future.length === 0 || !schema) return;
    const next = future[0];
    setHistory(h => [...h, schema]);
    setFuture(f => f.slice(1));
    _setSchema(next);
  };

  return {
    schema,
    setSchema,
    setSchemaWithoutHistory,
    history,
    future,
    handleUndo,
    handleRedo,
    canUndo: history.length > 0,
    canRedo: future.length > 0
  };
}

