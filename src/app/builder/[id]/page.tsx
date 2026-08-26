"use client";

import React, { useState, useEffect, use, useRef } from "react";
import {
  GripVertical, Plus, Settings, ChevronDown, CheckSquare,
  Type, List, AlignLeft, Grid, Eye, Save, Play, Layers, Trash2, X, Loader2, Menu, Video,
  Calendar, UploadCloud, Headphones, Image as ImageIcon, FileText, ExternalLink, Share2, Copy, Undo2, Redo2, Users, Globe, FileCode,
  ArrowLeft, ArrowRight, BarChart3, Inbox, FileDown, CheckCircle2, AlertCircle, Lock, Key, RefreshCw
} from "lucide-react";
import { Form, Section, Question, QuestionType, Option, FormComment } from "../../../types/form";
import { saveFormState, getFormById, generateShareToken, getComments, getFormResponses, deleteForm, registerAccessedForm, generateAccessToken } from "../../../lib/api";
import CommentsPanel from "../../../components/CommentsPanel";
import { MessageSquare } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

const generateId = () => crypto.randomUUID();

const calculateSectionTime = (section: Section) => {
  let seconds = 0;

  // Inclui tempo do vídeo da seção, se houver
  if (section.video_url) {
    seconds += (section.unlock_at_seconds !== undefined && section.unlock_at_seconds !== null ? section.unlock_at_seconds : 60);
  }

  section.questions?.forEach(q => {
    switch (q.type) {
      case 'TEXT_SHORT': seconds += 15; break;
      case 'TEXT_LONG': seconds += 45; break;
      case 'RADIO_SINGLE': seconds += 10; break;
      case 'CHECKBOX_MULTIPLE': seconds += 15; break;
      case 'GRID_LIKERT': seconds += 30; break;
      case 'DROPDOWN': seconds += 10; break;
      case 'DATE_TIME': seconds += 15; break;
      case 'FILE_UPLOAD': seconds += 30; break;
      case 'MEDIA_VIDEO': seconds += (q.sub_question_template?.unlock_at_seconds !== undefined && q.sub_question_template?.unlock_at_seconds !== null ? q.sub_question_template.unlock_at_seconds : 60); break;
      case 'MEDIA_AUDIO': seconds += 30; break;
      case 'MEDIA_IMAGE': seconds += 10; break;
      case 'TEXT_MARKDOWN': seconds += 15; break;
      default: seconds += 10;
    }
  });
  if (seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${mins}m ${remainingSecs > 0 ? remainingSecs + 's' : ''}`;
};

export default function FormBuilderSketch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [schema, _setSchema] = useState<Form | null>(null);
  const [history, setHistory] = useState<Form[]>([]);
  const [future, setFuture] = useState<Form[]>([]);

  const clientIdRef = useRef(generateId());
  const channelRef = useRef<any>(null);
  const isRemoteUpdateRef = useRef(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineCollaborators, setOnlineCollaborators] = useState<Array<{ clientId: string, name: string, email: string, color: string }>>([]);
  const [lastSyncedBy, setLastSyncedBy] = useState<string | null>(null);

  const setSchema = (newSchemaOrUpdater: React.SetStateAction<Form | null>) => {
    _setSchema(prev => {
      const nextSchema = typeof newSchemaOrUpdater === 'function' ? (newSchemaOrUpdater as any)(prev) : newSchemaOrUpdater;

      if (prev && nextSchema && JSON.stringify(prev) !== JSON.stringify(nextSchema)) {
        setHistory(h => [...h, prev].slice(-50));
        setFuture([]);

        // Broadcast alterações em tempo real para outros colaboradores conectados
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
  const router = useRouter();
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'question' | 'section' | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ sectionId: string, index: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ sectionId: string, index: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingForm, setIsDeletingForm] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'responses'>('builder');
  const [responsesList, setResponsesList] = useState<any[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [formComments, setFormComments] = useState<FormComment[]>([]);
  const [activeCommentElement, setActiveCommentElement] = useState<{ id: string, title: string } | null>(null);
  const [dragEnabledSubQId, setDragEnabledSubQId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; title?: string } | null>(null);

  // Private Form Passcode Lock State for Builder Collaborators
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const handleUnlockPrivateBuilder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!schema || !schema.settings?.access_token) return;

    const expectedToken = schema.settings.access_token.trim().toUpperCase();
    const enteredToken = inputPasscode.trim().toUpperCase();

    if (enteredToken === expectedToken) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gt6_builder_token_${schema.id}`, expectedToken);
        sessionStorage.setItem(`gt6_builder_token_${schema.id}`, expectedToken);
      }
      setIsUnlocked(true);
      setPasscodeError(null);
      registerAccessedForm(schema.id);
    } else {
      setPasscodeError("Código de acesso incorreto. Verifique e tente novamente.");
    }
  };

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

  // Realtime Collaboration & Live Responses (Supabase Channels: Broadcast + Presence + Postgres Changes)
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
          _setSchema(payload.schema);
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
        fetchResponses();
        showToast("Uma nova resposta foi registrada no formulário!", "success", "Nova Resposta Recebida! 🎉");
      });

      // 3. Receber novas respostas em tempo real (via Postgres Changes se habilitado)
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `form_id=eq.${id}`
      }, () => {
        fetchResponses();
        showToast("Uma nova resposta foi registrada no formulário!", "success", "Nova Resposta Recebida! 🎉");
      });

      // 4. Acompanhar colaboradores online (Presence)
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
        if (user) {
          setCurrentUser(user);
        }

        const data = await getFormById(id);
        if (data) {
          // When loading from DB, initialize _setSchema silently to not affect history
          _setSchema(data);
          if (data.sections && data.sections.length > 0) {
            setActiveSectionId(data.sections[0].id);
          }
          fetchComments();
          fetchResponses();

          // O dono nunca precisa do token; colaboradores precisam digitar uma única vez
          const isOwner = user && user.id === data.user_id;
          const isPrivate = data.settings?.visibility === 'private' && Boolean(data.settings?.access_token);

          if (isPrivate && !isOwner) {
            const expectedToken = data.settings?.access_token?.trim().toUpperCase();
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const urlAccessToken = urlParams?.get('access_token');
            const storedToken = typeof window !== 'undefined' ? (
              localStorage.getItem(`gt6_builder_token_${data.id}`) ||
              sessionStorage.getItem(`gt6_builder_token_${data.id}`)
            ) : null;
            const alreadyUnlocked = Boolean(storedToken && expectedToken && storedToken === expectedToken);

            if (alreadyUnlocked || (urlAccessToken && expectedToken && urlAccessToken.trim().toUpperCase() === expectedToken)) {
              if (typeof window !== 'undefined' && expectedToken) {
                localStorage.setItem(`gt6_builder_token_${data.id}`, expectedToken);
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

          // Check if URL has ?tab=responses
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

  // Sincronização automática para a Aba de Preview usando localStorage
  useEffect(() => {
    if (schema && !isLoading) {
      localStorage.setItem(`form_preview_${id}`, JSON.stringify(schema));
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
        }
      }).catch(err => {
        console.error("Auto-save throw:", err);
        setIsSaving(false);
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [schema, isLoading, isAutoSaveEnabled]);

  const handleSave = async (showNotification = true) => {
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
        showToast((result.error as any)?.message || "Ocorreu um erro ao salvar as alterações.", "error", "Falha ao salvar");
      }
    }
  };

  // Removido useEffect redundante de 10 segundos que causava race condition

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  if (!schema) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Formulário não encontrado.</div>;


  const addQuestion = (type: QuestionType) => {
    const newQuestionId = generateId();
    const newQuestion: Question = {
      id: newQuestionId,
      section_id: activeSectionId,
      type,
      label: `Nova Pergunta (${type})`,
      required: false,
      allow_add_item: false,
      order_index: schema.sections?.find(s => s.id === activeSectionId)?.questions?.length || 0,
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
          // Update order_index
          newQuestions.forEach((q, i) => q.order_index = i);
          return { ...sec, questions: newQuestions };
        }
        return sec;
      })
    }) : prev);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary for allowing drops on the container itself if needed
    const container = e.currentTarget;
    const { top, bottom } = container.getBoundingClientRect();
    const { clientY } = e;

    const THRESHOLD = 100;
    const SCROLL_SPEED = 15;

    if (clientY - top < THRESHOLD) {
      container.scrollTop -= SCROLL_SPEED; // Scroll up
    } else if (bottom - clientY < THRESHOLD) {
      container.scrollTop += SCROLL_SPEED; // Scroll down
    }
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

  const addSection = () => {
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

  let selectedQuestion = null;
  let selectedSection = null;

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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50 shadow-inner">
            <Lock size={32} />
          </div>

          <div className="text-center mb-6">
            <span className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full mb-3">
              <Key size={12} className="mr-1" /> Edição Colaborativa Privada
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-snug">
              {schema.title || "Questionário Protegido"}
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Este formulário é privado. Para participar da edição simultânea e visualizar as perguntas, insira o código de acesso fornecido pelo proprietário:
            </p>
          </div>

          <form onSubmit={handleUnlockPrivateBuilder} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: GT-A1B2"
                  value={inputPasscode}
                  onChange={(e) => {
                    setInputPasscode(e.target.value.toUpperCase());
                    if (passcodeError) setPasscodeError(null);
                  }}
                  className="w-full uppercase font-mono tracking-widest text-center text-lg font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all shadow-inner placeholder:font-normal placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
                />
              </div>
              {passcodeError && (
                <div className="flex items-center space-x-1.5 text-xs text-red-600 font-medium mt-2 pl-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Desbloquear Edição</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <a
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Voltar para Meus Formulários
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Components Palette */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-sm transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="text-indigo-600" />
            <h1 className="font-bold text-lg text-slate-800">FormPanel</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-slate-800">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Entradas de Dados</h2>

          <div className="space-y-2">
            <SidebarItem icon={<Type size={18} />} label="Texto Curto" onClick={() => addQuestion('TEXT_SHORT')} />
            <SidebarItem icon={<AlignLeft size={18} />} label="Texto Longo" onClick={() => addQuestion('TEXT_LONG')} />
            <SidebarItem icon={<CheckSquare size={18} />} label="Múltipla Escolha" onClick={() => addQuestion('CHECKBOX_MULTIPLE')} />
            <SidebarItem icon={<List size={18} />} label="Escolha Única" onClick={() => addQuestion('RADIO_SINGLE')} />
            <SidebarItem icon={<ChevronDown size={18} />} label="Lista Suspensa" onClick={() => addQuestion('DROPDOWN')} />
            <SidebarItem icon={<Calendar size={18} />} label="Data e Hora" onClick={() => addQuestion('DATE_TIME')} />
            <SidebarItem icon={<UploadCloud size={18} />} label="Upload de Arquivo" onClick={() => addQuestion('FILE_UPLOAD')} />
          </div>

          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4">Mídia & Conteúdo</h2>
          <div className="space-y-2">
            <SidebarItem icon={<FileText size={18} />} label="Texto (Markdown)" onClick={() => addQuestion('TEXT_MARKDOWN')} />
            <SidebarItem icon={<ImageIcon size={18} />} label="Imagem" onClick={() => addQuestion('MEDIA_IMAGE')} />
            <SidebarItem icon={<Video size={18} />} label="Vídeo (YouTube/Vimeo)" onClick={() => addQuestion('MEDIA_VIDEO')} />
            <SidebarItem icon={<Headphones size={18} />} label="Áudio" onClick={() => addQuestion('MEDIA_AUDIO')} />
          </div>

          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4">Lógica Avançada</h2>
          <div className="space-y-2">
            <SidebarItem icon={<Settings size={18} />} label="Regra Condicional" onClick={() => addQuestion('CONDITIONAL_LOGIC')} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" />
            <SidebarItem icon={<Layers size={18} />} label="Repetidor Dinâmico" onClick={() => addQuestion('DYNAMIC_REPEATER')} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" />
          </div>

          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4">Configurações Globais</h2>
          <div className="space-y-4">
            {/* Privacidade & Acesso */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Privacidade do Questionário
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSchema(prev => prev ? {
                      ...prev,
                      settings: {
                        ...(prev.settings || {}),
                        visibility: 'public'
                      }
                    } : prev);
                  }}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${(schema?.settings?.visibility || 'public') === 'public'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <Globe size={13} />
                  <span>Público</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentToken = schema?.settings?.access_token || generateAccessToken();
                    setSchema(prev => prev ? {
                      ...prev,
                      settings: {
                        ...(prev.settings || {}),
                        visibility: 'private',
                        access_token: currentToken
                      }
                    } : prev);
                  }}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${schema?.settings?.visibility === 'private'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <Lock size={13} />
                  <span>Privado</span>
                </button>
              </div>

              {schema?.settings?.visibility === 'private' && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-amber-900"><Key size={12} className="text-amber-600" /> Token de Acesso:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newToken = generateAccessToken();
                        setSchema(prev => prev ? {
                          ...prev,
                          settings: { ...(prev.settings || {}), access_token: newToken }
                        } : prev);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5"
                      title="Gerar outro código"
                    >
                      <RefreshCw size={10} />
                      <span>Gerar outro</span>
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={schema?.settings?.access_token || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSchema(prev => prev ? {
                          ...prev,
                          settings: { ...(prev.settings || {}), access_token: val }
                        } : prev);
                      }}
                      placeholder="Ex: GT-4821"
                      className="w-full text-xs font-mono font-bold tracking-wider uppercase text-slate-800 bg-white border border-amber-300 rounded px-2 py-1.5 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (schema?.settings?.access_token) {
                          navigator.clipboard.writeText(schema.settings.access_token);
                          showToast("Token copiado para a área de transferência!", "success");
                        }
                      }}
                      className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-600"
                      title="Copiar token"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Este código será exigido para responder, importar como template e editar colaborativamente.
                  </p>
                </div>
              )}
            </div>

            <label className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
              <input
                type="checkbox"
                checked={schema?.settings?.show_estimated_time || false}
                onChange={(e) => {
                  setSchema(prev => prev ? {
                    ...prev,
                    settings: {
                      ...(prev.settings || {}),
                      show_estimated_time: e.target.checked
                    }
                  } : prev);
                }}
                className="mt-1 shrink-0 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Mostrar Tempo Estimado</p>
                <p className="text-xs text-slate-500 mt-0.5">Exibe para o usuário a estimativa de tempo (total e por seção) no formulário público.</p>
              </div>
            </label>

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                <Trash2 size={14} />
                <span>Excluir este Questionário</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-2 sm:px-4 shadow-sm shrink-0 flex items-center justify-between gap-1 sm:gap-2 lg:gap-3 overflow-hidden">
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink min-w-0">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Desfazer (Ctrl+Z)"
              className="flex items-center justify-center p-1 sm:p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0"
            >
              <Undo2 size={17} />
            </button>
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Refazer (Ctrl+Y)"
              className="flex items-center justify-center p-1 sm:p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0"
            >
              <Redo2 size={17} />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-md shrink-0"
              title="Menu"
            >
              <Menu size={17} />
            </button>
            <a href="/" className="inline-flex items-center text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 gap-1" title="Voltar para Questionários">
              <ArrowLeft size={14} />
              <span className="hidden 2xl:inline">Questionários</span>
            </a>
            <input
              value={schema.title}
              onChange={(e) => setSchema(prev => prev ? { ...prev, title: e.target.value } : prev)}
              className="font-bold text-slate-800 text-xs sm:text-sm md:text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-1 w-20 sm:w-28 md:w-36 lg:w-44 truncate min-w-[60px]"
              placeholder="Título..."
            />
          </div>

          {/* Tab Switcher (Construtor / Respostas) */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'builder' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              title="Construtor"
            >
              <span className="hidden sm:inline">Construtor</span>
              <span className="sm:hidden"><Menu size={13} /></span>
            </button>
            <button
              onClick={() => { setActiveTab('responses'); fetchResponses(); }}
              className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'responses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              title="Respostas"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">Respostas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'responses' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                {responsesList.length}
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            {/* Online Collaborators Badge */}
            {onlineCollaborators.length > 0 && (
              <div 
                className="flex items-center space-x-1.5 bg-indigo-50/95 border border-indigo-200/90 px-2 py-1 rounded-lg shrink-0 shadow-xs"
                title={onlineCollaborators.map(c => `${c.name} (${c.email || 'Online'})`).join(', ')}
              >
                <div className="flex items-center -space-x-1.5">
                  {onlineCollaborators.map((c, i) => (
                    <div
                      key={c.clientId || i}
                      title={`${c.name} (${c.email || 'Online'})`}
                      style={{ backgroundColor: c.color || '#6366f1' }}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ring-2 ring-white shadow-sm uppercase cursor-default shrink-0"
                    >
                      {c.name ? c.name.slice(0, 2) : 'U'}
                    </div>
                  ))}
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                {onlineCollaborators.length > 1 && (
                  <span className="text-[11px] font-bold text-indigo-800">
                    {onlineCollaborators.length}
                  </span>
                )}
              </div>
            )}

            {/* Auto-save Button */}
            <button
              onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
              className={`flex items-center justify-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors border shadow-xs shrink-0 cursor-pointer ${
                isAutoSaveEnabled 
                  ? 'bg-indigo-50/90 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                isAutoSaveEnabled 
                  ? (isSaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse') 
                  : 'bg-slate-300'
              }`}></div>
              <span className="text-[11px] font-semibold hidden md:inline">
                {isAutoSaveEnabled ? (isSaving ? 'Salvando...' : 'Auto-save') : 'Auto-save OFF'}
              </span>
            </button>
            <button
              onClick={async () => {
                let token = schema.share_token;
                if (!token) {
                  token = await generateShareToken(id);
                  setSchema(prev => prev ? { ...prev, share_token: token } : prev);
                }
                setIsShareModalOpen(true);
              }}
              className="flex items-center justify-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 whitespace-nowrap"
              title="Compartilhar"
            >
              <Share2 size={14} />
              <span className="hidden xl:inline">Compartilhar</span>
            </button>
            <button
              onClick={() => window.open(`/preview/${id}`, '_blank')}
              className="flex items-center justify-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 whitespace-nowrap"
              title="Pré-visualizar"
            >
              <ExternalLink size={14} />
              <span className="hidden xl:inline">Pré-visualizar</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className={`flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white rounded-lg shadow-sm transition-colors shrink-0 whitespace-nowrap ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              title="Salvar Formulário"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </header>

        {/* Canvas Area or Responses Area */}
        {activeTab === 'responses' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto space-y-6 pb-24">

              {/* Header de Respostas */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="text-indigo-600" size={24} />
                    <span>Respostas Recebidas</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Total de <strong>{responsesList.length}</strong> envio(s) registrado(s) para este questionário.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchResponses}
                    disabled={isLoadingResponses}
                    className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    {isLoadingResponses ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>Atualizar</span>
                  </button>
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(responsesList, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `respostas_${schema.title.replace(/\s+/g, '_')}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    disabled={responsesList.length === 0}
                    className="flex items-center space-x-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    <FileDown size={14} />
                    <span>Exportar JSON</span>
                  </button>
                </div>
              </div>

              {/* Lista de Respostas */}
              {isLoadingResponses ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Loader2 size={32} className="animate-spin text-indigo-600" />
                  <p className="text-sm">Carregando respostas do banco de dados...</p>
                </div>
              ) : responsesList.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                    <Inbox size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Nenhuma resposta recebida ainda</h3>
                  <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
                    Compartilhe o link público deste formulário para que as pessoas possam preencher e enviar suas respostas.
                  </p>
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center space-x-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                  >
                    <Share2 size={16} />
                    <span>Compartilhar Link Público</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {responsesList.map((resp, idx) => {
                    const answersMap: Record<string, any> = {};
                    resp.answers?.forEach((a: any) => {
                      answersMap[a.question_id] = a.answer_text || a.answer_json;
                    });

                    return (
                      <div key={resp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                              #{responsesList.length - idx}
                            </span>
                            <span className="font-bold text-slate-800 text-sm sm:text-base">Submissão</span>
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                            {new Date(resp.submitted_at || resp.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="p-6 space-y-6">
                          {schema.sections?.map((sec, sIdx) => (
                            <div key={sec.id} className="space-y-3">
                              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                Seção {sIdx + 1}: {sec.title || "Sem título"}
                              </h4>
                              <div className="grid grid-cols-1 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                {sec.questions?.map((q, qIdx) => {
                                  const val = answersMap[q.id];

                                  const getOptionLabel = (qId: string, optId: string) => {
                                    if (optId.startsWith('other:')) return optId.replace('other:', 'Outro: ');
                                    const opt = q.options?.find(o => o.id === optId);
                                    if (opt) return opt.label;

                                    if (q.type === 'DYNAMIC_REPEATER' && q.sub_question_template?.sub_questions) {
                                      for (const sq of q.sub_question_template.sub_questions) {
                                        const sOpt = sq.options?.find((o: any) => o.id === optId || o === optId);
                                        if (sOpt) return typeof sOpt === 'string' ? sOpt : sOpt.label;
                                      }
                                    }
                                    return optId;
                                  };

                                  let formattedVal: React.ReactNode = val;

                                  if (val === undefined || val === null || val === '') {
                                    formattedVal = <span className="text-slate-400 italic text-xs">Não respondido</span>;
                                  } else if (q.type === 'RADIO_SINGLE' || q.type === 'DROPDOWN') {
                                    formattedVal = <span className="font-medium text-slate-800 text-sm">{getOptionLabel(q.id, String(val))}</span>;
                                  } else if (q.type === 'CHECKBOX_MULTIPLE' && Array.isArray(val)) {
                                    if (val.length === 0) formattedVal = <span className="text-slate-400 italic text-xs">Não respondido</span>;
                                    else formattedVal = (
                                      <ul className="list-disc pl-4 space-y-1">
                                        {val.map((v, i) => <li key={i} className="font-medium text-slate-800 text-sm">{getOptionLabel(q.id, String(v))}</li>)}
                                      </ul>
                                    );
                                  } else if (q.type === 'DYNAMIC_REPEATER' && typeof val === 'object') {
                                    const selectedLabels = (val.selected || []).map((id: string) => getOptionLabel(q.id, id));
                                    formattedVal = (
                                      <div className="space-y-3">
                                        <div>
                                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Itens Selecionados</span>
                                          {selectedLabels.length > 0 ? (
                                            <ul className="list-disc pl-4">
                                              {selectedLabels.map((l: string, i: number) => <li key={i} className="font-medium text-slate-800 text-sm">{l}</li>)}
                                            </ul>
                                          ) : <span className="text-slate-400 italic text-xs">Nenhum selecionado</span>}
                                        </div>

                                        {val.answers && Object.keys(val.answers).length > 0 && (
                                          <div>
                                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1 mt-3">Detalhes</span>
                                            <div className="space-y-3">
                                              {Object.entries(val.answers).map(([optId, subAnswers]: [string, any]) => {
                                                const optLabel = getOptionLabel(q.id, optId);
                                                return (
                                                  <div key={optId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                    <p className="font-bold text-indigo-700 text-xs mb-2">{optLabel}</p>
                                                    <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
                                                      {Object.entries(subAnswers).map(([sqId, sqVal]) => {
                                                        const sq = q.sub_question_template?.sub_questions?.find((s: any) => s.id === sqId);
                                                        const sqLabel = sq ? sq.label : sqId;

                                                        let sqValFormatted = sqVal;
                                                        if (sq && (sq.type === 'RADIO_SINGLE' || sq.type === 'CHECKBOX_MULTIPLE' || sq.type === 'DROPDOWN')) {
                                                          if (Array.isArray(sqVal)) {
                                                            sqValFormatted = sqVal.map(v => {
                                                              const o = sq.options?.find((o: any) => o.id === v || o === v);
                                                              return o ? (typeof o === 'string' ? o : o.label) : v;
                                                            }).join(', ');
                                                          } else {
                                                            const o = sq.options?.find((o: any) => o.id === sqVal || o === sqVal);
                                                            sqValFormatted = o ? (typeof o === 'string' ? o : o.label) : sqVal;
                                                          }
                                                        }

                                                        return (
                                                          <div key={sqId}>
                                                            <p className="text-[11px] text-slate-500 font-semibold">{sqLabel}</p>
                                                            <p className="text-sm font-medium text-slate-800">{String(sqValFormatted)}</p>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else if (typeof val === 'object') {
                                    formattedVal = <span className="font-mono text-xs bg-slate-100 p-1.5 rounded block text-slate-700 whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</span>;
                                  } else {
                                    formattedVal = <span className="font-medium text-slate-800 text-sm">{String(val)}</span>;
                                  }

                                  return (
                                    <div key={q.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                      <p className="text-xs text-slate-500 font-medium mb-1.5">
                                        {qIdx + 1}. {q.label}
                                      </p>
                                      <div className="pl-3 border-l-[3px] border-indigo-400">
                                        {formattedVal}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        ) : (
          /* Canvas Area */
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50"
            onDragOver={handleContainerDragOver}
          >
            <div className="max-w-4xl mx-auto space-y-8 pb-32">

              {schema.sections?.map((section, index) => (
                <div
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${activeSectionId === section.id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200 opacity-80 hover:opacity-100'}`}
                >
                  <div
                    onClick={(e) => { e.stopPropagation(); setActiveSectionId(section.id); setSelectedElementType('section'); }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedItem && draggedItem.sectionId === section.id) {
                        reorderQuestion(section.id, draggedItem.index, 0);
                      }
                      setDraggedItem(null);
                      setDragOverItem(null);
                    }}
                    className={`bg-slate-50 px-4 py-4 sm:px-6 border-b border-slate-200 flex flex-col group cursor-pointer transition-colors ${selectedElementType === 'section' && activeSectionId === section.id ? 'bg-indigo-50/50' : 'hover:bg-slate-100'}`}
                  >
                    <div className="flex-1 w-full">
                      <p className="text-[10px] sm:text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <span>Seção {index + 1} {activeSectionId === section.id && "(Ativa)"}</span>
                          <span className="text-slate-400 font-normal normal-case flex items-center" title="Tempo estimado para responder esta seção">
                            ⏱️ ~{calculateSectionTime(section)}
                          </span>
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveCommentElement({ id: section.id, title: section.title || `Seção ${index + 1}` }); }}
                          className="flex items-center space-x-1 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full transition-colors"
                          title="Comentários desta seção"
                        >
                          <MessageSquare size={12} />
                          {formComments.filter(c => c.element_id === section.id && c.status === 'open').length > 0 && (
                            <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 font-bold leading-tight">
                              {formComments.filter(c => c.element_id === section.id && c.status === 'open').length}
                            </span>
                          )}
                        </button>
                      </p>
                      <input
                        value={section.title}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          updateSectionProperty(section.id, 'title', newTitle);
                        }}
                        className="text-lg font-bold text-slate-800 mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full cursor-text"
                        onClick={(e) => e.stopPropagation()} // Prevent selecting section when typing
                        onFocus={() => { setActiveSectionId(section.id); setSelectedElementType('section'); }}
                      />
                    </div>
                    {section.description && (
                      <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{section.description}</p>
                    )}
                  </div>

                  <div
                    className="p-4 sm:p-6 space-y-4 min-h-[100px]"
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedItem && draggedItem.sectionId === section.id) {
                        reorderQuestion(section.id, draggedItem.index, section.questions?.length || 0);
                      }
                      setDraggedItem(null);
                      setDragOverItem(null);
                    }}
                  >
                    {(!section.questions || section.questions.length === 0) && (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        Nenhuma pergunta nesta seção. Clique nos componentes na barra lateral para adicionar.
                      </div>
                    )}

                    {section.questions?.map((q, qIndex) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        number={qIndex + 1}
                        isSelected={selectedElementType === 'question' && selectedQuestionId === q.id}
                        onClick={() => { setSelectedQuestionId(q.id); setSelectedElementType('question'); }}
                        onUpdateLabel={(newLabel) => updateQuestionLabel(section.id, q.id, newLabel)}
                        onUpdateVideoUrl={(newUrl) => updateQuestionVideoUrl(section.id, q.id, newUrl)}
                        onDelete={() => {
                          deleteQuestion(section.id, q.id);
                          if (selectedQuestionId === q.id) setSelectedQuestionId(null);
                        }}
                        onAddOption={() => addOption(section.id, q.id)}
                        onUpdateOptionLabel={(optId, newLabel) => updateOptionLabel(section.id, q.id, optId, newLabel)}
                        onDeleteOption={(optId) => deleteOption(section.id, q.id, optId)}
                        onUpdateSubQuestionTemplate={(tpl) => updateQuestionProperty(section.id, q.id, 'sub_question_template', tpl)}
                        openCommentsCount={formComments.filter(c => c.element_id === q.id && c.status === 'open').length}
                        onCommentClick={() => setActiveCommentElement({ id: q.id, title: q.label || `Pergunta ${qIndex + 1}` })}
                        draggable
                        isDragging={draggedItem?.sectionId === section.id && draggedItem?.index === qIndex}
                        isDragOver={dragOverItem?.sectionId === section.id && dragOverItem?.index === qIndex}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          // For Firefox compatibility
                          e.dataTransfer.setData('text/plain', '');
                          setDraggedItem({ sectionId: section.id, index: qIndex });
                        }}
                        onDragOver={(e) => {
                          e.preventDefault(); // Necessary to allow dropping
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverItem?.sectionId !== section.id || dragOverItem?.index !== qIndex) {
                            setDragOverItem({ sectionId: section.id, index: qIndex });
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverItem(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedItem && draggedItem.sectionId === section.id) {
                            reorderQuestion(section.id, draggedItem.index, qIndex);
                          }
                          setDraggedItem(null);
                          setDragOverItem(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Add Section Button */}
              <button
                onClick={addSection}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex flex-col items-center justify-center space-y-2 bg-slate-50/50"
              >
                <Plus size={24} />
                <span>Adicionar Nova Seção</span>
              </button>

            </div>
          </div>
        )}
      </main>

      {/* Right Sidebar: Properties Panel (Responsive Drawer on mobile + sidebar on desktop) */}
      {(selectedElementType === 'question' && selectedQuestion) || (selectedElementType === 'section' && selectedSection) ? (
        <>
          {/* Mobile Overlay for Right Sidebar */}
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
            onClick={() => setSelectedElementType(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl lg:shadow-xl lg:relative lg:w-80 lg:z-20 shrink-0 transition-transform">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">
                {selectedElementType === 'section' ? 'Propriedades da Seção' : 'Propriedades da Pergunta'}
              </h2>
              <button onClick={() => setSelectedElementType(null)} className="text-slate-500 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-6">

              {/* --- SECTION PROPERTIES --- */}
              {selectedElementType === 'section' && selectedSection && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Título da Seção</label>
                    <input
                      type="text"
                      value={selectedSection.title}
                      onChange={(e) => updateSectionProperty(selectedSection.id, 'title', e.target.value)}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descrição / Contexto</label>
                    <p className="text-xs text-slate-500">Aparecerá como um bloco de texto explicativo no topo da seção (Cards de contexto).</p>
                    <textarea
                      value={selectedSection.description || ''}
                      onChange={(e) => updateSectionProperty(selectedSection.id, 'description', e.target.value)}
                      rows={4}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none resize-none"
                      placeholder="Ex: O objetivo desta seção é avaliar..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Vídeo Explicativo</label>
                    <p className="text-xs text-slate-500">Adicione um vídeo no cabeçalho desta seção.</p>
                    <SectionVideoUploader
                      videoUrl={selectedSection.video_url || ''}
                      onUpdate={(url) => updateSectionProperty(selectedSection.id, 'video_url', url)}
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700">Bloquear Perguntas (Segundos)</label>
                    <p className="text-xs text-slate-500">Oculta as perguntas desta seção até que o vídeo acima atinja o tempo definido (apenas vídeos nativos). Deixe 0 para não ocultar.</p>
                    <input
                      type="number"
                      placeholder="Ex: 30"
                      min="0"
                      value={selectedSection.unlock_at_seconds ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateSectionProperty(selectedSection.id, 'unlock_at_seconds', isNaN(val) ? undefined : val);
                      }}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-sm font-medium text-slate-700">Tag de Camada (IMAPS)</label>
                    <p className="text-xs text-slate-500">Ex: TIMAPS, SIMAPS, OIMAPS, LIMAPS</p>
                    <input
                      type="text"
                      placeholder="Adicionar tags separadas por vírgula..."
                      value={selectedSection.tags?.join(', ') || ''}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        updateSectionProperty(selectedSection.id, 'tags', tags.length > 0 ? tags : undefined);
                      }}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                    />
                  </div>
                </>
              )}

              {/* --- QUESTION PROPERTIES --- */}
              {selectedElementType === 'question' && selectedQuestion && (
                <>
                  {/* Question Type Changer */}
                  <div className="space-y-2 pb-4 border-b border-slate-100">
                    <label className="text-sm font-medium text-slate-700">Tipo de Pergunta</label>
                    <select
                      value={selectedQuestion.type}
                      onChange={(e) => {
                        const newType = e.target.value as QuestionType;
                        const needsOptions = ['RADIO_SINGLE', 'CHECKBOX_MULTIPLE', 'DROPDOWN'].includes(newType);

                        const updates: Partial<Question> = { type: newType };

                        // Auto-add options if switching to a choice type and none exist
                        if (needsOptions && (!selectedQuestion.options || selectedQuestion.options.length === 0)) {
                          updates.options = [
                            { id: generateId(), label: "Opção 1" } as any,
                            { id: generateId(), label: "Opção 2" } as any
                          ];
                        }

                        // Use a batched update by finding the section and question
                        setSchema(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            sections: prev.sections?.map(sec =>
                              sec.id === activeSectionId
                                ? {
                                  ...sec,
                                  questions: sec.questions?.map(q =>
                                    q.id === selectedQuestion.id ? { ...q, ...updates } : q
                                  )
                                }
                                : sec
                            )
                          };
                        });
                      }}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                    >
                      <optgroup label="Texto">
                        <option value="TEXT_SHORT">Resposta Curta</option>
                        <option value="TEXT_LONG">Parágrafo</option>
                      </optgroup>
                      <optgroup label="Múltipla Escolha">
                        <option value="RADIO_SINGLE">Múltipla Escolha (1 Opção)</option>
                        <option value="CHECKBOX_MULTIPLE">Caixas de Seleção</option>
                        <option value="DROPDOWN">Menu Suspenso (Dropdown)</option>
                      </optgroup>
                      <optgroup label="Upload & Data">
                        <option value="FILE_UPLOAD">Upload de Arquivo</option>
                        <option value="DATE_TIME">Data e Hora</option>
                      </optgroup>
                      <optgroup label="Mídia & Visual">
                        <option value="TEXT_MARKDOWN">Bloco de Texto Formato (Aviso)</option>
                        <option value="MEDIA_VIDEO">Vídeo (YouTube/Upload)</option>
                        <option value="MEDIA_IMAGE">Imagem</option>
                        <option value="MEDIA_AUDIO">Áudio</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Required Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Obrigatória</label>
                    <div
                      onClick={() => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'required', !selectedQuestion.required)}
                      className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${selectedQuestion.required ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${selectedQuestion.required ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Tags / Metadata */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tag de Camada (IMAPS)</label>
                    {selectedSection?.tags && selectedSection.tags.length > 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 leading-relaxed">
                        <strong>Tags desativadas:</strong> A seção atual já possui tags configuradas ({selectedSection.tags.join(', ')}). Todas as perguntas desta seção herdarão automaticamente as tags da seção.
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500">Ex: TIMAPS, SIMAPS, OIMAPS, LIMAPS</p>
                        <input
                          type="text"
                          placeholder="Adicionar tags separadas por vírgula..."
                          value={selectedQuestion.tags?.join(', ') || ''}
                          onChange={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                            updateQuestionProperty(activeSectionId, selectedQuestion.id, 'tags', tags.length > 0 ? tags : undefined);
                          }}
                          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                        />
                      </>
                    )}
                  </div>

                  {/* Video Unlock Settings */}
                  {selectedQuestion.type === 'MEDIA_VIDEO' && (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <label className="text-sm font-medium text-slate-700">Bloquear Respostas (Segundos)</label>
                      <p className="text-xs text-slate-500">Impedir respostas até que o vídeo atinja o tempo definido abaixo. (Deixe 0 para não bloquear).</p>
                      <input
                        type="number"
                        placeholder="Ex: 30"
                        min="0"
                        value={selectedQuestion.sub_question_template?.unlock_at_seconds || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                            ...selectedQuestion.sub_question_template,
                            unlock_at_seconds: isNaN(val) ? undefined : val
                          });
                        }}
                        className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                      />
                    </div>
                  )}

                  {/* Allow Add Item (for Checkbox/Radio) */}
                  {(selectedQuestion.type === 'RADIO_SINGLE' || selectedQuestion.type === 'CHECKBOX_MULTIPLE') && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-slate-700">Opção "Outros"</label>
                        <span className="text-xs text-slate-500">Permite texto livre</span>
                      </div>
                      <div
                        onClick={() => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'allow_add_item', !selectedQuestion.allow_add_item)}
                        className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${selectedQuestion.allow_add_item ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${selectedQuestion.allow_add_item ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  )}

                  {/* Option Weights */}
                  {(selectedQuestion.type === 'RADIO_SINGLE' || selectedQuestion.type === 'CHECKBOX_MULTIPLE' || selectedQuestion.type === 'DROPDOWN') && selectedQuestion.options && (
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <label className="text-sm font-medium text-slate-700">Pesos Analíticos (Scores)</label>
                      <p className="text-xs text-slate-500 mb-3">Atribua valores numéricos de 1 a 5 para cálculo de maturidade.</p>
                      {selectedQuestion.options.map(opt => (
                        <div key={opt.id} className="flex items-center space-x-2">
                          <span className="flex-1 text-xs text-slate-600 truncate">{opt.label || 'Sem rótulo'}</span>
                          <input
                            type="number"
                            placeholder="Peso"
                            value={opt.weight ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              updateOptionWeight(activeSectionId, selectedQuestion.id, opt.id, val);
                            }}
                            className="w-16 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* DYNAMIC REPEATER PROPERTIES */}
                  {selectedQuestion.type === 'DYNAMIC_REPEATER' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Pergunta Base (Gatilho)</label>
                        <p className="text-xs text-slate-500">Selecione a pergunta de múltipla escolha que irá gerar os blocos de repetição.</p>
                        <select
                          value={selectedQuestion.trigger_source_question_id || ''}
                          onChange={(e) => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'trigger_source_question_id', e.target.value)}
                          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                        >
                          <option value="">Selecione uma pergunta...</option>
                          {schema?.sections?.flatMap(s => s.questions || [])
                            .filter(q => (q.type === 'CHECKBOX_MULTIPLE' || q.type === 'RADIO_SINGLE' || q.type === 'DROPDOWN') && q.id !== selectedQuestion.id)
                            .map(q => (
                              <option key={q.id} value={q.id}>{q.label || 'Sem título'}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Sub-perguntas (Bloco)</label>
                        <p className="text-xs text-slate-500">Estas perguntas serão repetidas para cada opção selecionada na Pergunta Base.</p>

                        <div className="space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
                          {selectedQuestion.sub_question_template?.sub_questions?.map((subQ: any, index: number) => (
                            <div
                              key={subQ.id}
                              className="bg-white border border-slate-200 p-2 pl-7 rounded text-sm relative group/sub"
                              draggable={dragEnabledSubQId === subQ.id}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', index.toString());
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const draggedIndexStr = e.dataTransfer.getData('text/plain');
                                if (!draggedIndexStr) return;
                                const draggedIndex = parseInt(draggedIndexStr, 10);
                                if (isNaN(draggedIndex) || draggedIndex === index) return;

                                const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                const item = newSubQs.splice(draggedIndex, 1)[0];
                                newSubQs.splice(index, 0, item);
                                updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                              }}
                            >
                              <div
                                className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 cursor-grab hover:text-slate-500 active:cursor-grabbing"
                                onMouseEnter={() => setDragEnabledSubQId(subQ.id)}
                                onMouseLeave={() => setDragEnabledSubQId(null)}
                                onTouchStart={() => setDragEnabledSubQId(subQ.id)}
                                onTouchEnd={() => setDragEnabledSubQId(null)}
                              >
                                <GripVertical size={16} />
                              </div>
                              <input
                                type="text"
                                value={subQ.label}
                                onChange={(e) => {
                                  const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                  newSubQs[index] = { ...newSubQs[index], label: e.target.value };
                                  updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                }}
                                className="w-full border-none bg-transparent font-medium focus:ring-0 p-0 text-slate-800"
                                placeholder="Título da sub-pergunta"
                              />
                              <div className="flex flex-col gap-2 mt-2">
                                <select
                                  value={subQ.type}
                                  onChange={(e) => {
                                    const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                    newSubQs[index] = { ...newSubQs[index], type: e.target.value };
                                    updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                  }}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none"
                                >
                                  <option value="TEXT_SHORT">Texto Curto</option>
                                  <option value="TEXT_LONG">Texto Longo</option>
                                  <option value="RADIO_SINGLE">Única Escolha</option>
                                  <option value="CHECKBOX_MULTIPLE">Múltipla Escolha</option>
                                </select>

                                {(subQ.type === 'RADIO_SINGLE' || subQ.type === 'CHECKBOX_MULTIPLE') && (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      placeholder="Digite as opções separadas por vírgula..."
                                      value={subQ._rawOptionsText !== undefined ? subQ._rawOptionsText : (subQ.options?.map((o: any) => o.label).join(', ') || '')}
                                      onChange={(e) => {
                                        const rawText = e.target.value;
                                        const opts = rawText.split(',').map(t => ({ id: crypto.randomUUID(), label: t.trim() })).filter(o => o.label);
                                        const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                        newSubQs[index] = { ...newSubQs[index], options: opts, _rawOptionsText: rawText };
                                        updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                      }}
                                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={subQ.allow_add_item || false}
                                        onChange={(e) => {
                                          const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                          newSubQs[index] = { ...newSubQs[index], allow_add_item: e.target.checked };
                                          updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                        }}
                                      />
                                      Adicionar opção "Outros" (Permite texto livre)
                                    </label>
                                  </div>
                                )}
                              </div>

                              {/* Condition UI */}
                              {index > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Condição de Exibição (Opcional)</label>
                                  <select
                                    value={subQ.depends_on_id || ''}
                                    onChange={(e) => {
                                      const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                      newSubQs[index] = { ...newSubQs[index], depends_on_id: e.target.value || undefined, depends_on_label: undefined };
                                      updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                    }}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-700"
                                  >
                                    <option value="">Sempre exibir</option>
                                    {selectedQuestion.sub_question_template.sub_questions.slice(0, index).filter((sq: any) => sq.type === 'RADIO_SINGLE' || sq.type === 'CHECKBOX_MULTIPLE').map((sq: any) => (
                                      <option key={sq.id} value={sq.id}>Se a resposta de "{sq.label || 'Sem título'}" for...</option>
                                    ))}
                                  </select>

                                  {subQ.depends_on_id && (
                                    <input
                                      type="text"
                                      placeholder="Resposta exata (ex: Sim)"
                                      value={subQ.depends_on_label || ''}
                                      onChange={(e) => {
                                        const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                        newSubQs[index] = { ...newSubQs[index], depends_on_label: e.target.value };
                                        updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                      }}
                                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                    />
                                  )}
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  const newSubQs = selectedQuestion.sub_question_template.sub_questions.filter((_: any, i: number) => i !== index);
                                  updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                }}
                                className="absolute right-1 top-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 p-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                          <button
                            onClick={() => {
                              const newSub = { id: generateId(), type: 'TEXT_SHORT', label: 'Nova sub-pergunta', options: [] };
                              const currentSubs = selectedQuestion.sub_question_template?.sub_questions || [];
                              updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                                ...selectedQuestion.sub_question_template,
                                sub_questions: [...currentSubs, newSub]
                              });
                            }}
                            className="w-full py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 border-dashed rounded flex justify-center items-center gap-1 hover:bg-indigo-100 transition-colors"
                          >
                            <Plus size={14} /> Adicionar Sub-pergunta
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </aside>
        </>
      ) : null}

      {/* Active Comment Panel */}
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

      {/* Modal Bonito de Confirmação de Exclusão no Builder */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center">Excluir este Questionário?</h3>
            <p className="text-sm text-slate-500 text-center mt-2 leading-relaxed">
              Você tem certeza que deseja excluir o questionário <strong className="text-slate-800">"{schema?.title}"</strong>?
            </p>
            <div className="mt-2 p-3 bg-red-50 rounded-lg text-xs text-red-700 text-center border border-red-100">
              Esta ação apagará permanentemente todas as seções, perguntas e respostas registradas.
            </div>

            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingForm}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setIsDeletingForm(true);
                  try {
                    await deleteForm(id);
                    router.push('/');
                  } catch (err: any) {
                    alert("Erro ao excluir: " + (err.message || "Erro inesperado"));
                    setIsDeletingForm(false);
                  }
                }}
                disabled={isDeletingForm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-70"
              >
                {isDeletingForm ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{isDeletingForm ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <Share2 size={20} className="mr-2 text-indigo-600" />
                Compartilhar Questionário
              </h3>
              <button onClick={() => { setIsShareModalOpen(false); setCopiedKey(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">

              {/* Status de Privacidade Banner */}
              {schema.settings?.visibility === 'private' ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                      <Lock size={18} className="text-amber-600" />
                      <span>Formulário Privado (Protegido por Token)</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">Bloqueado</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    O código abaixo é <strong>obrigatório</strong> para qualquer uma das 3 opções de acesso:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-amber-900/90 bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/60">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Globe size={13} className="text-indigo-600 shrink-0" />
                      <span>1. Responder</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <FileCode size={13} className="text-purple-600 shrink-0" />
                      <span>2. Importar Template</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users size={13} className="text-amber-700 shrink-0" />
                      <span>3. Edição Direta</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-amber-300 rounded-lg p-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código de Acesso</span>
                      <span className="font-mono font-bold text-base text-slate-800 tracking-widest">{schema.settings?.access_token || 'N/A'}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (schema.settings?.access_token) {
                          navigator.clipboard.writeText(schema.settings.access_token);
                          setCopiedKey('token');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs rounded-md transition-colors flex items-center gap-1"
                    >
                      {copiedKey === 'token' ? <CheckSquare size={14} /> : <Copy size={14} />}
                      <span>{copiedKey === 'token' ? 'Copiado!' : 'Copiar Código'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800">
                  <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                    <Globe size={18} className="text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-emerald-900">Formulário Público (Acesso Livre)</h4>
                    <p className="text-xs text-emerald-700">Qualquer pessoa com o link pode abrir e responder diretamente sem digitar código.</p>
                  </div>
                </div>
              )}

              {/* Opção 1: Respostas Públicas */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-sm">
                  <Globe size={18} />
                  <span>1. Link para Respondentes</span>
                </div>
                <p className="text-xs text-slate-500">Envie este link para as pessoas responderem e enviarem dados do questionário.</p>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/f/${schema.share_token}` : ''}
                    className="flex-1 bg-white border border-slate-200 rounded-l-lg px-3 py-2 text-xs sm:text-sm text-slate-600 outline-none select-all font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/f/${schema.share_token}`);
                      setCopiedKey('public');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-r-lg transition-colors flex items-center shrink-0 ${copiedKey === 'public' ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {copiedKey === 'public' ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                    {copiedKey === 'public' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>

              {/* Opção 2: Compartilhar Template (Clonar cópia) */}
              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-3">
                <div className="flex items-center space-x-2 text-purple-700 font-semibold text-sm">
                  <FileCode size={18} />
                  <span>2. Enviar como Template (Cópia Independente)</span>
                </div>
                <p className="text-xs text-slate-600">A outra pessoa receberá uma cópia idêntica deste questionário na conta dela para editar sem alterar o seu original.</p>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/?import_token=${schema.share_token}` : ''}
                    className="flex-1 bg-white border border-purple-200 rounded-l-lg px-3 py-2 text-xs sm:text-sm text-slate-600 outline-none select-all font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?import_token=${schema.share_token}`);
                      setCopiedKey('template');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-r-lg transition-colors flex items-center shrink-0 ${copiedKey === 'template' ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                  >
                    {copiedKey === 'template' ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                    {copiedKey === 'template' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Opção 3: Edição Colaborativa no Mesmo Arquivo */}
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center space-x-2 text-amber-800 font-semibold text-sm">
                  <Users size={18} />
                  <span>3. Edição Direta (Colaboração em Tempo Real)</span>
                </div>
                <p className="text-xs text-slate-600">Compartilhe o link do editor com sua equipe para que ambos trabalhem e editem este mesmo arquivo com salvamento automático.</p>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/builder/${id}` : ''}
                    className="flex-1 bg-white border border-amber-200 rounded-l-lg px-3 py-2 text-xs sm:text-sm text-slate-600 outline-none select-all font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/builder/${id}`);
                      setCopiedKey('collab');
                      setTimeout(() => setCopiedKey(null), 2000);
                    }}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-r-lg transition-colors flex items-center shrink-0 ${copiedKey === 'collab' ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'}`}
                  >
                    {copiedKey === 'collab' ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                    {copiedKey === 'collab' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Código QR */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Código QR (Link Público)</label>
                <div className="flex items-center space-x-4 bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/f/${schema.share_token}` : '')}`}
                    alt="QR Code"
                    className="w-20 h-20 rounded-lg border border-white shadow-sm shrink-0"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Live Sync Realtime Pill */}
      {lastSyncedBy && (
        <div className="fixed top-20 right-6 z-40 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium px-3.5 py-2 rounded-xl shadow-xl border border-indigo-500/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Atualizado em tempo real por <strong className="text-indigo-300">{lastSyncedBy}</strong></span>
          </div>
        </div>
      )}

      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-start p-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm transition-all ${toast.type === 'success'
            ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/30'
            : toast.type === 'error'
              ? 'bg-red-950/95 text-white border-red-500/40 shadow-red-950/30'
              : 'bg-slate-900/95 text-white border-indigo-500/40 shadow-indigo-950/30'
            }`}>
            <div className={`p-2 rounded-xl shrink-0 mr-3.5 ${toast.type === 'success'
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
              className="text-slate-400 hover:text-white p-1 ml-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
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

// Subcomponents

function SidebarItem({ icon, label, onClick, className = "" }: { icon: React.ReactNode, label: string, onClick: () => void, className?: string }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:shadow-md transition-all group ${className}`}
    >
      <div className="text-slate-500 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
      <Plus size={16} className="ml-auto text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
    </div>
  );
}

function QuestionCard({
  question,
  number,
  isSelected,
  onClick,
  onUpdateLabel,
  onUpdateVideoUrl,
  onDelete,
  onAddOption,
  onUpdateOptionLabel,
  onDeleteOption,
  draggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  openCommentsCount,
  onCommentClick,
  onUpdateSubQuestionTemplate
}: {
  question: Question,
  number: number,
  isSelected?: boolean,
  onClick?: () => void,
  onUpdateLabel: (l: string) => void,
  onUpdateVideoUrl?: (url: string) => void,
  onDelete: () => void,
  onAddOption?: () => void,
  onUpdateOptionLabel?: (optId: string, l: string) => void,
  onDeleteOption?: (optId: string) => void,
  draggable?: boolean,
  isDragging?: boolean,
  isDragOver?: boolean,
  onDragStart?: (e: React.DragEvent) => void,
  onDragOver?: (e: React.DragEvent) => void,
  onDragEnd?: (e: React.DragEvent) => void,
  onDrop?: (e: React.DragEvent) => void,
  openCommentsCount?: number,
  onCommentClick?: () => void,
  onUpdateSubQuestionTemplate?: (tpl: any) => void
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [isDragEnabled, setIsDragEnabled] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateVideoUrl) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert("O vídeo é muito grande. O tamanho máximo é 50MB.");
      return;
    }

    setIsUploading(true);
    try {
      // Remove special characters, accents, and spaces from filename to avoid 'Invalid key' errors in Supabase
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Replace invalid chars with underscore
        .toLowerCase();

      const fileName = `${Date.now()}_${safeName}`;
      const { data, error } = await supabase.storage
        .from('form-media')
        .upload(fileName, file, { upsert: false });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('form-media')
        .getPublicUrl(fileName);

      onUpdateVideoUrl(publicData.publicUrl);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao fazer upload do vídeo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      draggable={draggable && isDragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`group relative bg-white border rounded-lg p-3 sm:p-5 hover:shadow-sm transition-all focus-within:ring-1 
        ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-200 hover:border-indigo-300'}
        ${isDragging ? 'opacity-50 scale-[0.98]' : ''}
        ${isDragOver ? 'border-t-4 border-t-indigo-500' : ''}
      `}
    >
      {question.required && (
        <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
          Obrigatório
        </div>
      )}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 flex items-center justify-center cursor-grab text-slate-300 hover:text-indigo-500"
        onMouseEnter={() => setIsDragEnabled(true)}
        onMouseLeave={() => setIsDragEnabled(false)}
        onTouchStart={() => setIsDragEnabled(true)}
        onTouchEnd={() => setIsDragEnabled(false)}
      >
        <GripVertical size={16} />
      </div>

      <div className="pl-4 sm:pl-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2 sm:gap-0">
          <div className="flex items-start space-x-2 flex-1 w-full">
            <span className="font-bold text-slate-400 mt-1 text-sm sm:text-base">{number}.</span>
            <input
              value={question.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className="font-semibold text-slate-800 text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-1"
              placeholder="Digite sua pergunta..."
            />
          </div>
          <div className="flex items-center space-x-2 sm:ml-4 shrink-0 self-end sm:self-auto">
            {onCommentClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onCommentClick(); }}
                className="flex items-center space-x-1 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded-full transition-colors"
                title="Comentários"
              >
                <MessageSquare size={14} />
                {openCommentsCount ? (
                  <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 font-bold leading-tight">
                    {openCommentsCount}
                  </span>
                ) : null}
              </button>
            )}
            <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium border border-slate-200">{question.type.replace('_', ' ')}</span>
            <button onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1 transition-colors bg-slate-50 hover:bg-red-50 rounded" title="Deletar Pergunta">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          {question.type === 'TEXT_SHORT' && (
            <div className="h-10 bg-slate-50 border border-slate-200 rounded-md flex items-center px-3">
              Campo de texto curto...
            </div>
          )}
          {question.type === 'TEXT_LONG' && (
            <div className="h-20 bg-slate-50 border border-slate-200 rounded-md flex items-start p-3">
              Campo de texto longo...
            </div>
          )}
          {(question.type === 'RADIO_SINGLE' || question.type === 'CHECKBOX_MULTIPLE' || question.type === 'DROPDOWN') && (
            <div className="space-y-2">
              {question.options?.map((opt, i) => (
                <div key={opt.id} className="flex items-center space-x-2 group/opt">
                  <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center shrink-0 ${question.type === 'RADIO_SINGLE' || question.type === 'DROPDOWN' ? 'rounded-full' : 'rounded'}`}></div>
                  <input
                    value={opt.label}
                    onChange={(e) => onUpdateOptionLabel && onUpdateOptionLabel(opt.id, e.target.value)}
                    className="text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-1"
                  />
                  <button onClick={() => onDeleteOption && onDeleteOption(opt.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity p-1" title="Remover Opção">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div onClick={(e) => { e.stopPropagation(); onAddOption && onAddOption(); }} className="flex items-center space-x-2 text-indigo-500 cursor-pointer hover:text-indigo-700 mt-2 p-1 w-max rounded-md hover:bg-indigo-50">
                <Plus size={14} />
                <span className="text-xs font-medium">Adicionar Opção</span>
              </div>
              {question.allow_add_item && (
                <div className="flex items-center space-x-2 group/opt mt-2">
                  <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center shrink-0 ${question.type === 'RADIO_SINGLE' || question.type === 'DROPDOWN' ? 'rounded-full' : 'rounded'}`}></div>
                  <span className="text-slate-400 text-sm py-1 border-b border-transparent">Outro (Adicionar item)</span>
                </div>
              )}
            </div>
          )}
          {question.type === 'DATE_TIME' && (
            <div className="h-10 w-48 bg-slate-50 border border-slate-200 rounded-md flex items-center px-3 text-slate-400">
              <Calendar size={16} className="mr-2" /> Selecione a data/hora
            </div>
          )}
          {question.type === 'FILE_UPLOAD' && (
            <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
              <UploadCloud size={24} className="mb-2" /> Arraste e solte arquivos aqui
            </div>
          )}
          {question.type === 'TEXT_MARKDOWN' && (
            <div className="space-y-2">
              <textarea
                placeholder="Digite o conteúdo do seu texto de aviso ou instrução aqui..."
                value={question.sub_question_template?.markdown_content || ''}
                onChange={(e) => onUpdateSubQuestionTemplate && onUpdateSubQuestionTemplate({ ...question.sub_question_template, markdown_content: e.target.value })}
                rows={4}
                className="w-full text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none resize-y"
              />
            </div>
          )}
          {question.type === 'MEDIA_IMAGE' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Cole o link da imagem aqui (ex: https://site.com/imagem.png)"
                value={question.sub_question_template?.image_url || ''}
                onChange={(e) => onUpdateSubQuestionTemplate && onUpdateSubQuestionTemplate({ ...question.sub_question_template, image_url: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
              />
              {question.sub_question_template?.image_url ? (
                <div className="flex justify-center border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <img src={question.sub_question_template.image_url} alt="Preview" className="max-h-64 object-contain rounded-md" />
                </div>
              ) : (
                <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
                  <ImageIcon size={24} className="mb-2" />
                  <span className="text-sm">Cole a URL da imagem acima</span>
                </div>
              )}
            </div>
          )}
          {question.type === 'MEDIA_AUDIO' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Cole o link do áudio aqui (ex: https://site.com/audio.mp3)"
                value={question.sub_question_template?.audio_url || ''}
                onChange={(e) => onUpdateSubQuestionTemplate && onUpdateSubQuestionTemplate({ ...question.sub_question_template, audio_url: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
              />
              {question.sub_question_template?.audio_url ? (
                <div className="flex justify-center border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <audio src={question.sub_question_template.audio_url} controls className="w-full max-w-md" />
                </div>
              ) : (
                <div className="h-16 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
                  <Headphones size={20} className="mr-2" /> Cole a URL do áudio acima
                </div>
              )}
            </div>
          )}
          {question.type === 'MEDIA_VIDEO' && (
            <div className="space-y-4">
              <div className="flex space-x-2 border-b border-slate-200">
                <button
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'url' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('url')}
                >
                  Link Externo (YouTube)
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('upload')}
                >
                  Fazer Upload (Nativo)
                </button>
              </div>

              {activeTab === 'url' ? (
                <input
                  type="text"
                  placeholder="Cole o link do vídeo aqui (ex: https://youtube.com/watch?v=...)"
                  value={question.video_url || ''}
                  onChange={(e) => onUpdateVideoUrl && onUpdateVideoUrl(e.target.value)}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                  {isUploading ? (
                    <div className="flex flex-col items-center text-slate-500">
                      <Loader2 size={24} className="animate-spin mb-2 text-indigo-600" />
                      <span className="text-sm">Enviando vídeo (isso pode demorar)...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={24} className="mb-2 text-slate-400" />
                      <span className="text-sm text-slate-600 mb-4">Envie um arquivo MP4 ou WebM (Max 50MB)</span>
                      <label className="cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Selecionar Arquivo
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {question.video_url && (question.video_url.includes('youtube.com') || question.video_url.includes('youtu.be')) ? (
                <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={question.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    title="Video Preview"
                    allowFullScreen
                  />
                </div>
              ) : question.video_url && question.video_url.includes('supabase.co') ? (
                <div className="relative w-full overflow-hidden rounded-lg bg-black">
                  <video
                    className="w-full max-h-80"
                    src={question.video_url}
                    controls
                  />
                </div>
              ) : (
                <div className="h-32 bg-slate-100 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
                  <Video size={24} className="mb-2 text-slate-300" />
                  <span>Nenhuma pré-visualização de vídeo disponível</span>
                </div>
              )}
            </div>
          )}
          {(question.type === 'DYNAMIC_REPEATER' || question.type === 'CONDITIONAL_LOGIC') && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium flex items-center">
              <Settings size={14} className="mr-2" />
              Configuração de lógica e campos aninhados em breve...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionVideoUploader({ videoUrl, onUpdate }: { videoUrl: string, onUpdate: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert("O vídeo é muito grande. O tamanho máximo é 50MB.");
      return;
    }

    setIsUploading(true);
    try {
      // Remove special characters, accents, and spaces from filename to avoid 'Invalid key' errors in Supabase
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Replace invalid chars with underscore
        .toLowerCase();

      const fileName = `${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from('form-media')
        .upload(fileName, file, { upsert: false });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('form-media')
        .getPublicUrl(fileName);

      onUpdate(publicData.publicUrl);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao fazer upload do vídeo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'url' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('url')}
        >
          YouTube
        </button>
        <button
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Local
        </button>
      </div>

      {activeTab === 'url' ? (
        <input
          type="text"
          placeholder="Ex: https://youtube.com/watch?v=..."
          value={videoUrl || ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
          {isUploading ? (
            <div className="flex flex-col items-center text-slate-500">
              <Loader2 size={24} className="animate-spin mb-2 text-indigo-600" />
              <span className="text-xs">Enviando vídeo...</span>
            </div>
          ) : (
            <>
              <label className="cursor-pointer bg-white px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50">
                Selecionar MP4/WebM
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </>
          )}
        </div>
      )}

      {videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) ? (
        <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
            title="Preview"
            allowFullScreen
          />
        </div>
      ) : videoUrl && videoUrl.includes('supabase.co') ? (
        <div className="relative w-full overflow-hidden rounded-md bg-black">
          <video className="w-full max-h-40" src={videoUrl} controls />
        </div>
      ) : null}
    </div>
  );
}
