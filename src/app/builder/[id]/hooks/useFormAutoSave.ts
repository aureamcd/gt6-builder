import { useState, useEffect } from "react";
import { Form } from "@/types/form";
import { saveFormState } from "@/lib/api";

interface UseFormAutoSaveOptions {
  id: string;
  schema: Form | null;
  isLoading: boolean;
  isAutoSaveEnabled: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

export function useFormAutoSave(options: UseFormAutoSaveOptions) {
  const { id, schema, isLoading, isAutoSaveEnabled, showToast } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Sincronização automática para a Aba de Preview usando sessionStorage
  useEffect(() => {
    if (schema && !isLoading && typeof window !== 'undefined') {
      sessionStorage.setItem(`form_preview_${id}`, JSON.stringify(schema));
    }
  }, [schema, id, isLoading]);

  // Salvar automaticamente no banco de dados (Auto-Save)
  useEffect(() => {
    if (!schema || isLoading || !isAutoSaveEnabled) return;

    // Aguarda 1.8 segundos de inatividade para salvar no banco
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveFormState(schema).then((result) => {
        setIsSaving(false);
        if (result.success) {
          setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
        } else {
          console.error("Auto-save error:", result.error);
          showToast("Erro ao salvar: " + ((result.error as any)?.message || "Falha na conexão"), "error");
        }
      }).catch(err => {
        console.error("Auto-save throw:", err);
        setIsSaving(false);
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [schema, isLoading, isAutoSaveEnabled]);

  const handleManualSave = async (showNotification = true) => {
    if (!schema) return;
    setIsSaving(true);
    const result = await saveFormState(schema);
    setIsSaving(false);
    if (showNotification) {
      if (result.success) {
        const time = new Date().toLocaleTimeString('pt-BR');
        setLastSavedTime(time);
        showToast("Todas as perguntas, seções e configurações foram salvas com sucesso!", "success", "Questionário Salvo!");
      } else {
        showToast((result.error as any)?.message || "Falha ao salvar", "error", "Falha ao salvar");
      }
    }
  };

  return {
    isSaving,
    lastSavedTime,
    handleManualSave
  };
}

