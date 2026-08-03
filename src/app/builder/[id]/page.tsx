"use client";

import React, { useState, useEffect, use } from "react";
import { 
  GripVertical, Plus, Settings, ChevronDown, CheckSquare, 
  Type, List, AlignLeft, Grid, Eye, Save, Play, Layers, Trash2, X, Loader2, Menu, Video, 
  Calendar, UploadCloud, Headphones, Image as ImageIcon, FileText, ExternalLink, Share2, Copy
} from "lucide-react";
import { Form, Section, Question, QuestionType, Option } from "../../../types/form";
import { saveFormState, getFormById } from "../../../lib/api";

const generateId = () => crypto.randomUUID();

export default function FormBuilderSketch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
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

  useEffect(() => {
    async function loadForm() {
      try {
        const data = await getFormById(id);
        if (data) {
          setSchema(data);
          if (data.sections && data.sections.length > 0) {
            setActiveSectionId(data.sections[0].id);
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

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  if (!schema) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Formulário não encontrado.</div>;

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveFormState(schema);
    setIsSaving(false);
    if (result.success) {
      alert("Formulário salvo no banco de dados com sucesso!");
    } else {
      alert("Erro ao salvar: " + (result.error as any)?.message || "Erro desconhecido");
    }
  };

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
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-4 overflow-hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md"
            >
              <Menu size={20} />
            </button>
            <a href="/" className="hidden sm:block text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors">← Voltar</a>
            <span className="hidden sm:inline-block text-sm font-medium text-slate-500 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full whitespace-nowrap">ID: {id.substring(0, 8)}</span>
            <input 
              value={schema.title}
              onChange={(e) => setSchema(prev => prev ? {...prev, title: e.target.value} : prev)}
              className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-full sm:w-64 md:w-96 truncate"
            />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-2">
            <button 
              onClick={() => setIsShareModalOpen(true)}
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
                    <p className="text-[10px] sm:text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                      Seção {index + 1} {activeSectionId === section.id && "(Ativa)"}
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
                        
                        // Drag and drop handlers
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

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-md text-xs text-indigo-800 flex items-start">
                  <Video size={16} className="mr-2 mt-0.5 shrink-0" />
                  <span>Para adicionar um Vídeo Explicativo logo abaixo deste cabeçalho, basta adicionar um bloco de "Vídeo (YouTube/Vimeo)" e arrastá-mo para o topo da seção.</span>
                </div>
              </>
            )}

            {/* --- QUESTION PROPERTIES --- */}
            {selectedElementType === 'question' && selectedQuestion && (
              <>
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
                </div>

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
              </>
            )}

          </div>
        </aside>
      ) : null}

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
                    value={typeof window !== 'undefined' ? `${window.location.origin}/preview/${id}` : ''}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-l-lg px-3 py-2 text-sm text-slate-600 outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/preview/${id}`);
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
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/preview/${id}` : '')}`} 
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
  onDrop
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
}) {
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
              <input 
                type="text"
                placeholder="Cole o link do vídeo aqui (ex: https://youtube.com/watch?v=...)"
                value={question.video_url || ''}
                onChange={(e) => onUpdateVideoUrl && onUpdateVideoUrl(e.target.value)}
                className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
              />
              {question.video_url && question.video_url.includes('youtube.com') ? (
                <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe 
                    className="absolute top-0 left-0 w-full h-full"
                    src={question.video_url.replace('watch?v=', 'embed/')}
                    title="Video Preview"
                    allowFullScreen
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
