import { useState, useEffect, useRef } from "react";
import { Form } from "@/types/form";
import { saveFormState } from "@/lib/api";

interface UseFormAutoSaveOptions {
  id: string;
  schema: Form | null;
  isLoading: boolean;
  isAutoSaveEnabled: boolean;
  isDeletingForm?: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

export function useFormAutoSave(options: UseFormAutoSaveOptions) {
  const { id, schema, isLoading, isAutoSaveEnabled, isDeletingForm = false, showToast } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isDeletingRef = useRef(isDeletingForm);
  isDeletingRef.current = isDeletingForm;

  // Sincronização automática para a Aba de Preview usando sessionStorage
  useEffect(() => {
    if (schema && !isLoading && !isDeletingForm && typeof window !== 'undefined') {
      sessionStorage.setItem(`form_preview_${id}`, JSON.stringify(schema));
    }
  }, [schema, id, isLoading, isDeletingForm]);

  // Salvar automaticamente no banco de dados (Auto-Save)
  useEffect(() => {
    if (!schema || isLoading || !isAutoSaveEnabled || isDeletingForm) return;

    // Aguarda 800ms de inatividade para salvar no banco
    const timer = setTimeout(() => {
      if (isDeletingRef.current) return;
      setIsSaving(true);
      saveFormState(schema).then((result) => {
        if (isDeletingRef.current) return;
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
    }, 800);

    return () => clearTimeout(timer);
  }, [schema, isLoading, isAutoSaveEnabled, isDeletingForm]);

  const handleManualSave = async (showNotification = true) => {
    if (!schema || isDeletingRef.current) return;
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


