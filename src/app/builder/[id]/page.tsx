"use client";

import React, { useState, useEffect, use } from "react";
import { 
  GripVertical, Plus, Settings, ChevronDown, CheckSquare, 
  Type, List, AlignLeft, Grid, Eye, Save, Play, Layers, Trash2, X, Loader2, Menu, Video, 
  Calendar, UploadCloud, Headphones, Image as ImageIcon, FileText, ExternalLink, Share2, Copy, Undo2, Redo2
} from "lucide-react";
import { Form, Section, Question, QuestionType, Option, FormComment } from "../../../types/form";
import { saveFormState, getFormById, generateShareToken, getComments } from "../../../lib/api";
import CommentsPanel from "../../../components/CommentsPanel";
import { MessageSquare } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const generateId = () => crypto.randomUUID();

const calculateSectionTime = (section: Section) => {
  let seconds = 0;
  
  // Inclui tempo do vídeo da seção, se houver
  if (section.video_url) {
    seconds += (section.unlock_at_seconds !== undefined && section.unlock_at_seconds !== null ? section.unlock_at_seconds : 60);
  }

  section.questions?.forEach(q => {
    switch(q.type) {
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

  const setSchema = (newSchemaOrUpdater: React.SetStateAction<Form | null>) => {
    _setSchema(prev => {
      const nextSchema = typeof newSchemaOrUpdater === 'function' ? (newSchemaOrUpdater as any)(prev) : newSchemaOrUpdater;
      
      if (prev && nextSchema && JSON.stringify(prev) !== JSON.stringify(nextSchema)) {
        setHistory(h => [...h, prev].slice(-50));
        setFuture([]);
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
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'question' | 'section' | null>(null);
  const [draggedItem, setDraggedItem] = useState<{sectionId: string, index: number} | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{sectionId: string, index: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [formComments, setFormComments] = useState<FormComment[]>([]);
  const [activeCommentElement, setActiveCommentElement] = useState<{id: string, title: string} | null>(null);

  const fetchComments = async () => {
    const data = await getComments(id);
    setFormComments(data);
  };

  useEffect(() => {
    async function loadForm() {
      try {
        const data = await getFormById(id);
        if (data) {
          // When loading from DB, initialize _setSchema silently to not affect history
          _setSchema(data);
          if (data.sections && data.sections.length > 0) {
            setActiveSectionId(data.sections[0].id);
          }
          fetchComments();
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
    
    // Evita salvar no momento exato que a página carrega e nada mudou
    // Aguarda 2.5 segundos de inatividade para salvar no banco
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveFormState(schema).then((result) => {
        setIsSaving(false);
        if (!result.success) {
          alert("Aviso: Falha ao salvar automaticamente! " + ((result.error as any)?.message || "Erro desconhecido"));
          console.error("Auto-save error:", result.error);
        }
      }).catch(err => {
        console.error("Auto-save throw:", err);
        setIsSaving(false);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [schema, isLoading, isAutoSaveEnabled]);

  const handleSave = async (showNotification = true) => {
    if (!schema) return;
    setIsSaving(true);
    const result = await saveFormState(schema);
    setIsSaving(false);
    if (showNotification) {
      if (result.success) {
        alert("Formulário salvo no banco de dados com sucesso!");
      } else {
        alert("Erro ao salvar: " + (result.error as any)?.message || "Erro desconhecido");
      }
    }
  };

  useEffect(() => {
    if (!schema || isLoading || !isAutoSaveEnabled) return;
    const timer = setTimeout(() => {
      handleSave(false);
    }, 10000); // Salva 10s após a última alteração
    return () => clearTimeout(timer);
  }, [schema, isAutoSaveEnabled, isLoading]);

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
            <SidebarItem icon={<Grid size={18} />} label="Matriz (Likert)" onClick={() => addQuestion('GRID_LIKERT')} />
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
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <button 
              onClick={handleUndo} 
              disabled={history.length === 0}
              title="Desfazer (Ctrl+Z)"
              className="flex items-center justify-center p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0"
            >
              <Undo2 size={20} />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={future.length === 0}
              title="Refazer (Ctrl+Y)"
              className="flex items-center justify-center p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0"
            >
              <Redo2 size={20} />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md shrink-0"
            >
              <Menu size={20} />
            </button>
            <a href="/" className="hidden sm:inline-flex items-center text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors whitespace-nowrap shrink-0">← Voltar</a>
            <span className="hidden sm:inline-block text-sm font-medium text-slate-500 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full whitespace-nowrap shrink-0">ID: {id.substring(0, 8)}</span>
            <input 
              value={schema.title}
              onChange={(e) => setSchema(prev => prev ? {...prev, title: e.target.value} : prev)}
              className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-full min-w-0 truncate"
            />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-2">
            <button 
              onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
              className={`flex items-center justify-center space-x-1 px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg transition-colors ${isAutoSaveEnabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
              title={isAutoSaveEnabled ? "Salvamento Automático Ativado" : "Salvamento Automático Desativado"}
            >
              <div className={`w-2 h-2 rounded-full ${isAutoSaveEnabled ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></div>
              <span className="hidden lg:inline">{isAutoSaveEnabled ? 'Auto-save ON' : 'Auto-save OFF'}</span>
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
              className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            <button 
              onClick={() => window.open(`/preview/${id}`, '_blank')}
              className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={16} />
              <span className="hidden sm:inline">Pré-visualizar</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span className="hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar Formulário'}</span>
              <span className="sm:hidden">{isSaving ? '...' : 'Salvar'}</span>
            </button>
          </div>
        </header>

        {/* Canvas Area */}
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
      </main>

      {/* Right Sidebar: Properties Panel */}
      {(selectedElementType === 'question' && selectedQuestion) || (selectedElementType === 'section' && selectedSection) ? (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20 shrink-0 hidden lg:flex">
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
                          { id: generateId(), label: "Opção 1" },
                          { id: generateId(), label: "Opção 2" }
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
                  {selectedSection.tags && selectedSection.tags.length > 0 ? (
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
                            draggable
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
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 cursor-grab hover:text-slate-500 active:cursor-grabbing">
                              <GripVertical size={16} />
                            </div>
                            <input 
                              type="text" 
                              value={subQ.label}
                              onChange={(e) => {
                                const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                newSubQs[index].label = e.target.value;
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
                                  newSubQs[index].type = e.target.value;
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
                                      newSubQs[index].options = opts;
                                      newSubQs[index]._rawOptionsText = rawText;
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
                                        newSubQs[index].allow_add_item = e.target.checked;
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
                                    newSubQs[index].depends_on_id = e.target.value || undefined;
                                    newSubQs[index].depends_on_label = undefined; 
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
                                      newSubQs[index].depends_on_label = e.target.value;
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

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <Share2 size={20} className="mr-2 text-indigo-600" />
                Compartilhar Formulário
              </h3>
              <button onClick={() => { setIsShareModalOpen(false); setIsCopied(false); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Link Público</label>
                <p className="text-xs text-slate-500 mb-2">Envie este link para as pessoas preencherem o questionário.</p>
                <div className="flex">
                  <input 
                    type="text" 
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/f/${schema.share_token}` : ''}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-l-lg px-3 py-2 text-sm text-slate-600 outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/f/${schema.share_token}`);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-r-lg transition-colors flex items-center ${isCopied ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {isCopied ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                    {isCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-sm font-semibold text-slate-700">Código QR</label>
                <p className="text-xs text-slate-500 mb-2">As pessoas podem escanear este código pelo celular.</p>
                <div className="flex justify-center bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/f/${schema.share_token}` : '')}`} 
                    alt="QR Code"
                    className="w-32 h-32 rounded-lg"
                  />
                </div>
              </div>
            </div>
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
  onCommentClick
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
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');

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
      draggable={draggable}
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
      <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 flex items-center justify-center cursor-grab text-slate-300 hover:text-indigo-500">
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
          {question.type === 'GRID_LIKERT' && (
             <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
             Visualização da matriz Likert (1 a 5)
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
             <div className="h-20 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
             <FileText size={20} className="mr-2" /> Bloco de Texto Formatado (Markdown)
           </div>
          )}
          {question.type === 'MEDIA_IMAGE' && (
             <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
             <ImageIcon size={24} className="mb-2" /> Upload de Imagem ou Cole a URL
           </div>
          )}
          {question.type === 'MEDIA_AUDIO' && (
             <div className="h-16 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
             <Headphones size={20} className="mr-2" /> Player de Áudio
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
