import React, { useState, useEffect, use, useRef, useMemo } from "react";
import {
  Plus, Layers, Trash2, X, Loader2, MessageSquare, BarChart3, Inbox,
  CheckCircle2, AlertCircle, RefreshCw, ExternalLink, FileSpreadsheet,
  Clock, Hash, HelpCircle
} from "lucide-react";
import { Form, Section, Question, QuestionType, Option, FormComment } from "@/types/form";
import {
  saveFormState, getFormById, generateShareToken, getComments, getFormResponses,
  deleteForm, registerAccessedForm
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import CommentsPanel from "@/components/CommentsPanel";

// Utilitários isolados
import { calculateSectionTime } from "@/lib/formCalculations";
import { exportFormToXML, parseFormFromXML } from "@/lib/xmlHandler";

// Custom Hooks isolados
import { useFormHistory } from "./hooks/useFormHistory";
import { useFormRealtime } from "./hooks/useFormRealtime";
import { useFormAutoSave } from "./hooks/useFormAutoSave";

// Subcomponentes isolados
import { PasscodeLockModal } from "./components/PasscodeLockModal";
import { BuilderHeader } from "./components/BuilderHeader";
import { SectionSidebar } from "./components/SectionSidebar";
import { QuestionCard } from "./components/QuestionCard";
import { PropertyInspector } from "./components/PropertyInspector";
import { ShareModal } from "./components/ShareModal";
import { DeleteFormModal } from "./components/DeleteFormModal";

const generateId = () => crypto.randomUUID();

export default function FormBuilderSketch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Refs de Colaboração
  const clientIdRef = useRef(generateId());
  const channelRef = useRef<any>(null);
  const isRemoteUpdateRef = useRef(false);

  // Hook de Histórico / Schema / Undo / Redo
  const {
    schema,
    setSchema,
    setSchemaWithoutHistory,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo
  } = useFormHistory({
    channelRef,
    isRemoteUpdateRef,
    clientIdRef,
    currentUser: null
  });

  // Estados de Interface e Seleção
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'question' | 'section' | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ sectionId: string; index: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ sectionId: string; index: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingForm, setIsDeletingForm] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'builder' | 'responses'>('builder');
  const [responsesList, setResponsesList] = useState<any[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [formComments, setFormComments] = useState<FormComment[]>([]);
  const [activeCommentElement, setActiveCommentElement] = useState<{ id: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; title?: string } | null>(null);

  // Estados de Bloqueio Privado
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    setToast({ message, type, title });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Hook de Colaboração em Tempo Real (Supabase Realtime)
  const { onlineCollaborators, lastSyncedBy } = useFormRealtime({
    id,
    clientIdRef,
    channelRef,
    isRemoteUpdateRef,
    onRemoteSchemaUpdate: (remoteSchema) => setSchemaWithoutHistory(remoteSchema),
    onNewResponseSubmitted: () => fetchResponses(),
    showToast
  });

  // Hook de Salvamento Automático
  const { isSaving, handleManualSave } = useFormAutoSave({
    id,
    schema,
    isLoading,
    isAutoSaveEnabled,
    showToast
  });

  const fetchComments = async () => {
    const data = await getComments(id);
    setFormComments(data);
  };

  const fetchResponses = async () => {
    setIsLoadingResponses(true);
    try {
      const data = await getFormResponses(id);
      setResponsesList(data);
    } catch (err) {
      console.error("Erro ao buscar respostas:", err);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  // Carregamento Inicial do Formulário e Verificação de Permissão
  useEffect(() => {
    async function loadForm() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (typeof window !== 'undefined') {
            router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          }
          return;
        }
        const user = session.user;

        const data = await getFormById(id);
        if (data) {
          setSchemaWithoutHistory(data);
          if (data.sections && data.sections.length > 0) {
            setActiveSectionId(data.sections[0].id);
          }
          fetchComments();
          fetchResponses();

          const isOwner = user && user.id === data.user_id;
          const isPrivate = data.settings?.visibility === 'private' && Boolean(data.settings?.access_token);

          if (isPrivate && !isOwner) {
            const expectedToken = data.settings?.access_token?.trim().toUpperCase();
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const urlAccessToken = urlParams?.get('access_token');
            const storedToken = typeof window !== 'undefined' ? (
              sessionStorage.getItem(`gt6_builder_token_${data.id}`)
            ) : null;
            const alreadyUnlocked = Boolean(storedToken && expectedToken && storedToken === expectedToken);

            if (alreadyUnlocked || (urlAccessToken && expectedToken && urlAccessToken.trim().toUpperCase() === expectedToken)) {
              if (typeof window !== 'undefined' && expectedToken) {
                sessionStorage.setItem(`gt6_builder_token_${data.id}`, expectedToken);
              }
              setIsUnlocked(true);
              registerAccessedForm(id);
            } else {
              setIsUnlocked(false);
            }
          } else {
            setIsUnlocked(true);
            registerAccessedForm(id);
          }

          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'responses') {
              setActiveTab('responses');
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadForm();
  }, [id]);

  const handleUnlockPrivateBuilder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!schema || !schema.settings?.access_token) return;

    const expectedToken = schema.settings.access_token.trim().toUpperCase();
    const enteredToken = inputPasscode.trim().toUpperCase();

    if (enteredToken === expectedToken) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`gt6_builder_token_${schema.id}`, expectedToken);
      }
      setIsUnlocked(true);
      setPasscodeError(null);
      registerAccessedForm(schema.id);
    } else {
      setPasscodeError("Código de acesso incorreto. Verifique e tente novamente.");
    }
  };

  // Funções de Mutação do Schema
  const addQuestion = (type: QuestionType) => {
    const newQuestionId = generateId();
    const newQuestion: Question = {
      id: newQuestionId,
      section_id: activeSectionId,
      type,
      label: `Nova Pergunta (${type})`,
      required: false,
      allow_add_item: false,
      order_index: schema?.sections?.find(s => s.id === activeSectionId)?.questions?.length || 0,
      created_at: new Date().toISOString(),
      options: type === 'RADIO_SINGLE' || type === 'CHECKBOX_MULTIPLE'
        ? [{
          id: generateId(),
          question_id: newQuestionId,
          label: "Opção 1",
          order_index: 0,
          created_at: new Date().toISOString()
        }]
        : undefined
    };

    setSchema(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections?.map(sec => {
          if (sec.id === activeSectionId) {
            const currentQuestions = sec.questions || [];
            if (selectedElementType === 'question' && selectedQuestionId) {
              const selectedIndex = currentQuestions.findIndex(q => q.id === selectedQuestionId);
              if (selectedIndex !== -1) {
                const newQuestions = [...currentQuestions];
                newQuestions.splice(selectedIndex + 1, 0, newQuestion);
                newQuestions.forEach((q, i) => q.order_index = i);
                return { ...sec, questions: newQuestions };
              }
            }
            const newQuestions = [...currentQuestions, newQuestion];
            newQuestions.forEach((q, i) => q.order_index = i);
            return { ...sec, questions: newQuestions };
          }
          return sec;
        })
      };
    });

    setSelectedQuestionId(newQuestionId);
    setSelectedElementType('question');
  };

  const updateQuestionLabel = (sectionId: string, questionId: string, newLabel: string) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? {
            ...sec,
            questions: sec.questions?.map(q => q.id === questionId ? { ...q, label: newLabel } : q)
          }
          : sec
      )
    }) : prev);
  };

  const updateQuestionVideoUrl = (sectionId: string, questionId: string, newUrl: string) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? {
            ...sec,
            questions: sec.questions?.map(q => q.id === questionId ? { ...q, video_url: newUrl } : q)
          }
          : sec
      )
    }) : prev);
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? { ...sec, questions: sec.questions?.filter(q => q.id !== questionId) }
          : sec
      )
    }) : prev);
  };

  const reorderQuestion = (sectionId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec => {
        if (sec.id === sectionId && sec.questions) {
          const newQuestions = [...sec.questions];
          const [movedItem] = newQuestions.splice(fromIndex, 1);
          newQuestions.splice(toIndex, 0, movedItem);
          newQuestions.forEach((q, i) => q.order_index = i);
          return { ...sec, questions: newQuestions };
        }
        return sec;
      })
    }) : prev);
  };

  const addOption = (sectionId: string, questionId: string) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? {
            ...sec,
            questions: sec.questions?.map(q => {
              if (q.id === questionId) {
                const newOption: Option = {
                  id: generateId(),
                  question_id: q.id,
                  label: `Opção ${(q.options?.length || 0) + 1}`,
                  order_index: q.options?.length || 0,
                  created_at: new Date().toISOString()
                };
                return { ...q, options: [...(q.options || []), newOption] };
              }
              return q;
            })
          }
          : sec
      )
    }) : prev);
  };

  const updateOptionLabel = (sectionId: string, questionId: string, optionId: string, newLabel: string) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? {
            ...sec,
            questions: sec.questions?.map(q => {
              if (q.id === questionId) {
                return {
                  ...q,
                  options: q.options?.map(opt => opt.id === optionId ? { ...opt, label: newLabel } : opt)
                };
              }
              return q;
            })
          }
          : sec
      )
    }) : prev);
  };

  const deleteOption = (sectionId: string, questionId: string, optionId: string) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? {
            ...sec,
            questions: sec.questions?.map(q => {
              if (q.id === questionId) {
                return {
                  ...q,
                  options: q.options?.filter(opt => opt.id !== optionId)
                };
              }
              return q;
            })
          }
          : sec
      )
    }) : prev);
  };

  const deleteSection = (sectionId: string) => {
    if (!schema) return;
    const remainingSections = (schema.sections || []).filter(s => s.id !== sectionId);
    setSchema(prev => prev ? ({
      ...prev,
      sections: remainingSections
    }) : prev);

    if (activeSectionId === sectionId) {
      if (remainingSections.length > 0) {
        setActiveSectionId(remainingSections[0].id);
      } else {
        setActiveSectionId("");
      }
    }

    if (selectedElementType === 'section') {
      setSelectedElementType(null);
    }

    showToast("Seção excluída com sucesso.", "success", "Seção Excluída");
  };

  const addSection = () => {
    if (!schema) return;
    const newSectionId = generateId();
    const newSection: Section = {
      id: newSectionId,
      form_id: schema.id,
      title: "Nova Seção",
      order_index: schema.sections?.length || 0,
      created_at: new Date().toISOString(),
      questions: []
    };
    setSchema(prev => prev ? ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }) : prev);
    setActiveSectionId(newSectionId);
  };

  // Mapeamento de perguntas e seções para renderização enriquecida das respostas
  const questionMap = useMemo(() => {
    const map = new Map<string, { label: string; sectionTitle: string; type: string }>();
    if (!schema?.sections) return map;
    schema.sections.forEach(sec => {
      sec.questions?.forEach(q => {
        map.set(q.id, {
          label: q.label || 'Pergunta sem título',
          sectionTitle: sec.title || 'Seção',
          type: q.type
        });
      });
    });
    return map;
  }, [schema]);

  // Função normalizadora para converter respostas (array do Supabase ou objeto) em lista legível
  const getNormalizedAnswers = (resp: any): { questionId: string; label: string; sectionTitle?: string; value: string }[] => {
    if (!resp) return [];

    // Se resp.answers for array vindo do Supabase (relacionamento com a tabela answers)
    if (Array.isArray(resp.answers)) {
      return resp.answers.map((a: any) => {
        const qInfo = questionMap.get(a.question_id);
        let valStr = '';
        if (a.answer_text !== null && a.answer_text !== undefined && a.answer_text !== '') {
          valStr = a.answer_text;
        } else if (a.answer_json !== null && a.answer_json !== undefined) {
          valStr = Array.isArray(a.answer_json)
            ? a.answer_json.join(', ')
            : typeof a.answer_json === 'object'
              ? JSON.stringify(a.answer_json)
              : String(a.answer_json);
        }
        return {
          questionId: a.question_id,
          label: qInfo?.label || `Pergunta (${a.question_id ? a.question_id.slice(0, 8) : 'Geral'})`,
          sectionTitle: qInfo?.sectionTitle,
          value: valStr || '(Em branco)'
        };
      });
    }

    // Se resp.answers for um objeto de chave-valor { [qId]: val }
    if (resp.answers && typeof resp.answers === 'object') {
      return Object.entries(resp.answers).map(([qId, val]: [string, any]) => {
        const qInfo = questionMap.get(qId);
        let valStr = '';
        if (Array.isArray(val)) {
          valStr = val.join(', ');
        } else if (typeof val === 'object' && val !== null) {
          valStr = JSON.stringify(val);
        } else {
          valStr = val !== undefined && val !== null ? String(val) : '';
        }
        return {
          questionId: qId,
          label: qInfo?.label || `Pergunta (${qId.slice(0, 8)})`,
          sectionTitle: qInfo?.sectionTitle,
          value: valStr || '(Em branco)'
        };
      });
    }

    return [];
  };

  const updateQuestionProperty = (sectionId: string, questionId: string, key: keyof Question, value: any) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? { ...sec, questions: sec.questions?.map(q => q.id === questionId ? { ...q, [key]: value } : q) }
          : sec
      )
    }) : prev);
  };

  const updateOptionWeight = (sectionId: string, questionId: string, optionId: string, weight: number | null) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId
          ? {
            ...sec,
            questions: sec.questions?.map(q => {
              if (q.id === questionId) {
                return { ...q, options: q.options?.map(opt => opt.id === optionId ? { ...opt, weight } : opt) };
              }
              return q;
            })
          }
          : sec
      )
    }) : prev);
  };

  const updateSectionProperty = (sectionId: string, key: keyof Section, value: any) => {
    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec =>
        sec.id === sectionId ? { ...sec, [key]: value } : sec
      )
    }) : prev);
  };

  const handleDeleteForm = async () => {
    if (!schema) return;
    setIsDeletingForm(true);
    try {
      const success = await deleteForm(schema.id);
      if (success) {
        showToast("Formulário excluído com sucesso.", "success");
        router.push('/');
      } else {
        showToast("Erro ao excluir o formulário.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Falha ao excluir o formulário.", "error");
    } finally {
      setIsDeletingForm(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleExportXMLAction = () => {
    if (!schema) return;
    try {
      const { content, filename } = exportFormToXML(schema);
      const dataStr = "data:text/xml;charset=utf-8," + encodeURIComponent(content);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Estrutura exportada em XML para backup seguro.", "success", "XML Exportado");
    } catch (err: any) {
      showToast("Falha ao exportar XML: " + err.message, "error");
    }
  };

  const handleImportXMLAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlContent = event.target?.result as string;
        const parsedSchema = parseFormFromXML(xmlContent);
        setSchema(parsedSchema);
        showToast("Estrutura carregada via XML com sucesso.", "success", "XML Importado");
      } catch (err: any) {
        showToast("Falha ao analisar XML: " + err.message, "error", "Erro");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Resolução da Seleção Atual
  let selectedQuestion: Question | null = null;
  let selectedSection: Section | null = null;

  if (schema && activeSectionId) {
    selectedSection = schema.sections?.find(s => s.id === activeSectionId) || null;
  }

  if (schema && selectedQuestionId && selectedElementType === 'question') {
    for (const sec of schema.sections || []) {
      const q = sec.questions?.find(q => q.id === selectedQuestionId);
      if (q) {
        selectedQuestion = q;
        break;
      }
    }
  }

  // Renderização condicional para carregamento e erro
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-4 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Formulário não encontrado</h2>
        <p className="text-sm text-slate-500 mb-4">O formulário que você está tentando acessar não existe ou foi excluído.</p>
        <a href="/" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-colors">
          Voltar ao Início
        </a>
      </div>
    );
  }

  // Tela de bloqueio privado
  if (!isUnlocked) {
    return (
      <PasscodeLockModal
        title={schema.title}
        inputPasscode={inputPasscode}
        setInputPasscode={setInputPasscode}
        passcodeError={passcodeError}
        setPasscodeError={setPasscodeError}
        onUnlock={handleUnlockPrivateBuilder}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Esquerda (Paleta & Configurações Globais) */}
      <SectionSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        addQuestion={addQuestion}
        schema={schema}
        setSchema={setSchema}
        showToast={showToast}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
      />

      {/* Área Principal Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Cabeçalho Superior */}
        <BuilderHeader
          schema={schema}
          setSchema={setSchema}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          canUndo={canUndo}
          canRedo={canRedo}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onlineCollaborators={onlineCollaborators}
          isAutoSaveEnabled={isAutoSaveEnabled}
          setIsAutoSaveEnabled={setIsAutoSaveEnabled}
          isSaving={isSaving}
          responsesCount={responsesList.length}
          onShareClick={async () => {
            let token = schema.share_token;
            if (!token) {
              token = await generateShareToken(id);
              setSchema(prev => prev ? { ...prev, share_token: token } : prev);
            }
            setIsShareModalOpen(true);
          }}
          onExportXML={handleExportXMLAction}
          onImportXML={handleImportXMLAction}
          onSaveClick={() => handleManualSave(true)}
          fetchResponses={fetchResponses}
          id={id}
        />

        {/* Conteúdo Central (Aba Construtor ou Aba Respostas) */}
        {activeTab === 'responses' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6 pb-24">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="text-indigo-600" size={24} />
                    <span>Respostas Recebidas</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Visualização em tempo real dos formulários submetidos por respondentes.
                  </p>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    onClick={() => fetchResponses()}
                    disabled={isLoadingResponses}
                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    title="Atualizar lista de respostas"
                  >
                    <RefreshCw size={14} className={isLoadingResponses ? "animate-spin text-indigo-600" : ""} />
                    <span>Atualizar</span>
                  </button>
                  {schema?.share_token && (
                    <a
                      href={`/f/${schema.share_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                      title="Abrir formulário público para testar respostas"
                    >
                      <ExternalLink size={14} />
                      <span>Testar Envio</span>
                    </a>
                  )}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 text-center">
                    <span className="text-2xl font-black text-indigo-600 block">{responsesList.length}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Total de Envios</span>
                  </div>
                </div>
              </div>

              {isLoadingResponses ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3">
                  <Loader2 className="animate-spin text-indigo-600" size={36} />
                  <p className="text-sm font-medium text-slate-500">Carregando respostas...</p>
                </div>
              ) : responsesList.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-xs">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <Inbox size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-lg">Nenhuma resposta registrada ainda</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Compartilhe o link do formulário com os usuários para começar a coletar dados. As novas submissões aparecerão aqui automaticamente.
                    </p>
                  </div>
                  {schema?.share_token && (
                    <div className="pt-2">
                      <a
                        href={`/f/${schema.share_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                      >
                        <ExternalLink size={16} />
                        <span>Abrir Formulário para Responder</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {responsesList.map((resp, i) => {
                    const answers = getNormalizedAnswers(resp);
                    const formattedDate = resp.submitted_at || resp.created_at
                      ? new Date(resp.submitted_at || resp.created_at).toLocaleString('pt-BR')
                      : 'Data não informada';

                    return (
                      <div key={resp.id || i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                              Envio #{responsesList.length - i}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              ID: {resp.id ? resp.id.slice(0, 8) : `#${i + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-slate-500">
                            <span className="flex items-center space-x-1">
                              <Clock size={13} className="text-slate-400" />
                              <span>{formattedDate}</span>
                            </span>
                            <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                              {answers.length} {answers.length === 1 ? 'campo' : 'campos'}
                            </span>
                          </div>
                        </div>

                        {answers.length === 0 ? (
                          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                            Nenhum campo respondido registrado para este envio.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {answers.map((item, idx) => (
                              <div
                                key={item.questionId || idx}
                                className="bg-slate-50/80 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 transition-colors flex flex-col justify-between space-y-2"
                              >
                                <div>
                                  {item.sectionTitle && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded mb-1 inline-block">
                                      {item.sectionTitle}
                                    </span>
                                  )}
                                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                                    {item.label}
                                  </p>
                                </div>
                                <div className="pt-1.5 border-t border-slate-200/50">
                                  <p className="text-xs font-medium text-slate-900 bg-white p-2 rounded-lg border border-slate-200/50 break-words">
                                    {item.value}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="flex-1 flex overflow-hidden relative"
            onDragOver={(e) => {
              e.preventDefault();
              const container = e.currentTarget;
              const { top, bottom } = container.getBoundingClientRect();
              const { clientY } = e;
              const THRESHOLD = 100;
              const SCROLL_SPEED = 15;
              if (clientY - top < THRESHOLD) {
                container.scrollTop -= SCROLL_SPEED;
              } else if (bottom - clientY < THRESHOLD) {
                container.scrollTop += SCROLL_SPEED;
              }
            }}
          >
            {/* Canvas Central de Edição */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              <div className="max-w-3xl mx-auto space-y-6 pb-24">
                
                {/* Abas de Seções */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                  {schema.sections?.map((sec, index) => (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSectionId(sec.id);
                        setSelectedElementType('section');
                        setSelectedQuestionId(null);
                      }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                        activeSectionId === sec.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>Seção {index + 1}: {sec.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeSectionId === sec.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                        {calculateSectionTime(sec)}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={addSection}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Nova Seção</span>
                  </button>
                </div>

                {/* Card Header da Seção Selecionada */}
                {selectedSection && (
                  <div
                    onClick={() => {
                      setSelectedElementType('section');
                      setSelectedQuestionId(null);
                    }}
                    className={`bg-white rounded-xl p-6 border shadow-sm transition-all cursor-pointer relative group/secCard ${
                      selectedElementType === 'section' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                          Seção Atual
                        </span>
                        <input
                          value={selectedSection.title}
                          onChange={(e) => updateSectionProperty(selectedSection.id, 'title', e.target.value)}
                          className="font-extrabold text-slate-800 text-xl bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-0.5"
                          placeholder="Título da Seção..."
                        />
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCommentElement({ id: selectedSection.id, title: selectedSection.title });
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Comentar na seção"
                        >
                          <MessageSquare size={16} />
                        </button>
                        {schema.sections && schema.sections.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSchema(prev => prev ? ({
                                ...prev,
                                sections: prev.sections?.filter(s => s.id !== selectedSection.id)
                              }) : prev);
                              const remaining = schema.sections?.filter(s => s.id !== selectedSection.id);
                              if (remaining && remaining.length > 0) {
                                setActiveSectionId(remaining[0].id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Seção"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedSection.description && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                        {selectedSection.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Lista de Perguntas da Seção */}
                <div className="space-y-4">
                  {selectedSection?.questions?.map((q, qIndex) => {
                    const commentsCount = formComments.filter(c => c.element_id === q.id && c.status === 'open').length;
                    return (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        number={qIndex + 1}
                        isSelected={selectedElementType === 'question' && selectedQuestionId === q.id}
                        onClick={() => {
                          setSelectedQuestionId(q.id);
                          setSelectedElementType('question');
                        }}
                        onUpdateLabel={(newLabel) => updateQuestionLabel(activeSectionId, q.id, newLabel)}
                        onUpdateVideoUrl={(newUrl) => updateQuestionVideoUrl(activeSectionId, q.id, newUrl)}
                        onDelete={() => deleteQuestion(activeSectionId, q.id)}
                        onAddOption={() => addOption(activeSectionId, q.id)}
                        onUpdateOptionLabel={(optId, newLabel) => updateOptionLabel(activeSectionId, q.id, optId, newLabel)}
                        onDeleteOption={(optId) => deleteOption(activeSectionId, q.id, optId)}
                        draggable={true}
                        isDragging={draggedItem?.sectionId === activeSectionId && draggedItem?.index === qIndex}
                        isDragOver={dragOverItem?.sectionId === activeSectionId && dragOverItem?.index === qIndex}
                        onDragStart={() => setDraggedItem({ sectionId: activeSectionId, index: qIndex })}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverItem({ sectionId: activeSectionId, index: qIndex });
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverItem(null);
                        }}
                        onDrop={() => {
                          if (draggedItem && draggedItem.sectionId === activeSectionId) {
                            reorderQuestion(activeSectionId, draggedItem.index, qIndex);
                          }
                          setDraggedItem(null);
                          setDragOverItem(null);
                        }}
                        openCommentsCount={commentsCount}
                        onCommentClick={() => setActiveCommentElement({ id: q.id, title: q.label || `Pergunta ${qIndex + 1}` })}
                        onUpdateSubQuestionTemplate={(tpl) => updateQuestionProperty(activeSectionId, q.id, 'sub_question_template', tpl)}
                      />
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Painel Inspetor de Propriedades Direito */}
            <PropertyInspector
              selectedElementType={selectedElementType}
              setSelectedElementType={setSelectedElementType}
              selectedSection={selectedSection}
              selectedQuestion={selectedQuestion}
              activeSectionId={activeSectionId}
              schema={schema}
              setSchema={setSchema}
              updateSectionProperty={updateSectionProperty}
              updateQuestionProperty={updateQuestionProperty}
              updateOptionWeight={updateOptionWeight}
              generateId={generateId}
            />
          </div>
        )}
      </main>

      {/* Modais da Aplicação */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        schema={schema}
        formId={id}
      />

      <DeleteFormModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteForm}
        isDeleting={isDeletingForm}
        title={schema.title}
      />

      {/* Painel de Comentários */}
      {activeCommentElement && (
        <CommentsPanel
          formId={schema.id}
          elementId={activeCommentElement.id}
          elementTitle={activeCommentElement.title}
          isEditorMode={true}
          onClose={() => {
            setActiveCommentElement(null);
            fetchComments();
          }}
        />
      )}

      {/* Live Sync Realtime Pill Notification */}
      {lastSyncedBy && (
        <div className="fixed top-20 right-6 z-40 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium px-3.5 py-2 rounded-xl shadow-xl border border-indigo-500/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Atualizado em tempo real por <strong className="text-indigo-300">{lastSyncedBy}</strong></span>
          </div>
        </div>
      )}

      {/* Toast Notification Flutuante */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-start p-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/30'
              : toast.type === 'error'
                ? 'bg-red-950/95 text-white border-red-500/40 shadow-red-950/30'
                : 'bg-slate-900/95 text-white border-indigo-500/40 shadow-indigo-950/30'
          }`}>
            <div className={`p-2 rounded-xl shrink-0 mr-3.5 ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : toast.type === 'error'
                  ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 pt-0.5">
              <h4 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                {toast.title || (toast.type === 'success' ? 'Sucesso!' : 'Aviso')}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 ml-2 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

