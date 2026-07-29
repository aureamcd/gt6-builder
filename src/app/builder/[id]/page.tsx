"use client";

import React, { useState, useEffect, use } from "react";
import { 
  GripVertical, Plus, Settings, ChevronDown, CheckSquare, 
  Type, List, AlignLeft, Grid, Eye, Save, Play, Layers, Trash2, X, Loader2, Share2, Key, MessageSquare
} from "lucide-react";
import { Form, Section, Question, QuestionType, Option } from "../../../types/form";
import { saveFormState, getFormById, generateShareToken, getFormSubmissions } from "../../../lib/api";

const generateId = () => crypto.randomUUID();

export default function FormBuilderSketch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'build' | 'responses'>('build');
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    async function loadForm() {
      try {
        const [data, subs] = await Promise.all([
          getFormById(id),
          getFormSubmissions(id)
        ]);
        if (data) {
          setSchema(data);
          if (data.sections && data.sections.length > 0) {
            setActiveSectionId(data.sections[0].id);
          }
        }
        setSubmissions(subs);
      } catch (error) {
        console.error("Erro ao carregar:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadForm();
  }, [id]);

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

    setSchema(prev => prev ? ({
      ...prev,
      sections: prev.sections?.map(sec => 
        sec.id === activeSectionId 
          ? { ...sec, questions: [...(sec.questions || []), newQuestion] }
          : sec
      )
    }) : prev);
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

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar: Components Palette */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2">
          <Layers className="text-indigo-600" />
          <h1 className="font-bold text-lg text-slate-800">FormPanel</h1>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Adicionar à Seção Ativa</h2>
          
          <div className="space-y-2">
            <SidebarItem icon={<Type size={18} />} label="Texto Curto" onClick={() => addQuestion('TEXT_SHORT')} />
            <SidebarItem icon={<AlignLeft size={18} />} label="Texto Longo" onClick={() => addQuestion('TEXT_LONG')} />
            <SidebarItem icon={<CheckSquare size={18} />} label="Múltipla Escolha" onClick={() => addQuestion('CHECKBOX_MULTIPLE')} />
            <SidebarItem icon={<List size={18} />} label="Escolha Única" onClick={() => addQuestion('RADIO_SINGLE')} />
            <SidebarItem icon={<Grid size={18} />} label="Matriz (Likert)" onClick={() => addQuestion('GRID_LIKERT')} />
          </div>

          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4">Lógica Avançada</h2>
          <div className="space-y-2">
            <SidebarItem icon={<Settings size={18} />} label="Regra Condicional" onClick={() => addQuestion('CONDITIONAL_LOGIC')} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" />
            <SidebarItem icon={<Layers size={18} />} label="Repetidor Dinâmico" onClick={() => addQuestion('DYNAMIC_REPEATER')} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" />
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0">
          <div className="flex items-center space-x-4">
            <a href="/" className="text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors">← Voltar</a>
            
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('build')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'build' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Perguntas
              </button>
              <button 
                onClick={() => setActiveTab('responses')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-2 ${activeTab === 'responses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span>Respostas</span>
                <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">{submissions.length}</span>
              </button>
            </div>

            <input 
              value={schema.title}
              onChange={(e) => setSchema(prev => prev ? {...prev, title: e.target.value} : prev)}
              className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-64"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                const url = `${window.location.origin}/f/${id}`;
                navigator.clipboard.writeText(url);
                alert("Link público copiado: " + url);
              }}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Share2 size={16} />
              <span>Link (Responder)</span>
            </button>
            <button 
              onClick={async () => {
                try {
                  const token = await generateShareToken(id);
                  navigator.clipboard.writeText(token);
                  alert(`Token gerado e copiado: ${token}\nEnvie para o outro usuário importar.`);
                } catch (error) {
                  alert("Erro ao gerar token. Certifique-se de salvar o formulário primeiro.");
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-700 bg-amber-50 border border-amber-200 rounded-lg shadow-sm hover:bg-amber-100 transition-colors"
            >
              <Key size={16} className="text-amber-600" />
              <span className="text-amber-700">Token (Importar)</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Salvando...' : 'Salvar Formulário'}</span>
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          
          {/* BUILDER TAB */}
          <div className={`p-8 ${activeTab === 'build' ? 'block' : 'hidden'}`}>
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
              
              {schema.sections?.map((section, index) => (
              <div 
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${activeSectionId === section.id ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200 opacity-80 hover:opacity-100'}`}
              >
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center group">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Seção {index + 1} {activeSectionId === section.id && "(Ativa)"}</p>
                    <input 
                      value={section.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setSchema(prev => prev ? ({
                          ...prev,
                          sections: prev.sections?.map(s => s.id === section.id ? { ...s, title: newTitle } : s)
                        }) : prev);
                      }}
                      className="text-lg font-bold text-slate-800 mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                    />
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
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
                      onUpdateLabel={(newLabel) => updateQuestionLabel(section.id, q.id, newLabel)}
                      onDelete={() => deleteQuestion(section.id, q.id)}
                      onAddOption={() => addOption(section.id, q.id)}
                      onUpdateOptionLabel={(optId, newLabel) => updateOptionLabel(section.id, q.id, optId, newLabel)}
                      onDeleteOption={(optId) => deleteOption(section.id, q.id, optId)}
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

          {/* RESPONSES TAB */}
          <div className={`p-8 ${activeTab === 'responses' ? 'block' : 'hidden'}`}>
            <div className="max-w-4xl mx-auto space-y-6 pb-32">
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Resultados do Questionário</h2>
                  <p className="text-slate-500 text-sm mt-1">Veja as respostas enviadas pelos usuários.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{submissions.length}</span>
                  <span className="text-xs uppercase tracking-wider font-semibold">Respostas</span>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                  <MessageSquare size={40} className="mx-auto text-slate-300 mb-4" />
                  <p>Ainda não há nenhuma resposta para este formulário.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {submissions.map((sub, index) => (
                    <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Resposta #{submissions.length - index}</span>
                        <span className="text-xs font-medium text-slate-400">{new Date(sub.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="p-6 space-y-6">
                        {schema.sections?.map(section => (
                          <div key={section.id}>
                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-3">{section.title}</h3>
                            <div className="space-y-4">
                              {section.questions?.map(q => {
                                const answer = sub.answers[q.id];
                                let displayAnswer = answer;
                                
                                if (!answer || (Array.isArray(answer) && answer.length === 0)) {
                                  displayAnswer = <span className="text-slate-300 italic">Não respondido</span>;
                                } else if (q.type === 'RADIO_SINGLE' || q.type === 'CHECKBOX_MULTIPLE') {
                                  // Map option IDs to option labels
                                  if (Array.isArray(answer)) {
                                    displayAnswer = answer.map(ansId => {
                                      const opt = q.options?.find(o => o.id === ansId);
                                      return opt ? opt.label : ansId;
                                    }).join(", ");
                                  } else {
                                    const opt = q.options?.find(o => o.id === answer);
                                    displayAnswer = opt ? opt.label : answer;
                                  }
                                }

                                return (
                                  <div key={q.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                    <p className="text-sm font-medium text-slate-500 mb-1">{q.label}</p>
                                    <p className="text-base text-slate-800">{displayAnswer}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
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
  onUpdateLabel, 
  onDelete,
  onAddOption,
  onUpdateOptionLabel,
  onDeleteOption
}: { 
  question: Question, 
  number: number,
  onUpdateLabel: (l: string) => void,
  onDelete: () => void,
  onAddOption?: () => void,
  onUpdateOptionLabel?: (optId: string, l: string) => void,
  onDeleteOption?: (optId: string) => void
}) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
      <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab text-slate-300 hover:text-indigo-500">
        <GripVertical size={16} />
      </div>
      
      <div className="pl-6">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start space-x-2 flex-1">
            <span className="font-bold text-slate-400 mt-1">{number}.</span>
            <input 
              value={question.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className="font-semibold text-slate-800 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-1"
              placeholder="Digite sua pergunta aqui..."
            />
          </div>
          <div className="flex items-center space-x-2 ml-4 shrink-0">
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium border border-slate-200">{question.type}</span>
            <button onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1 transition-colors" title="Deletar Pergunta">
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
          {(question.type === 'RADIO_SINGLE' || question.type === 'CHECKBOX_MULTIPLE') && (
            <div className="space-y-2">
              {question.options?.map((opt, i) => (
                <div key={opt.id} className="flex items-center space-x-2 group/opt">
                  <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center shrink-0 ${question.type === 'RADIO_SINGLE' ? 'rounded-full' : 'rounded'}`}></div>
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
              <div onClick={onAddOption} className="flex items-center space-x-2 text-indigo-500 cursor-pointer hover:text-indigo-700 mt-2 p-1 w-max rounded-md hover:bg-indigo-50">
                <Plus size={14} />
                <span className="text-xs font-medium">Adicionar Opção</span>
              </div>
            </div>
          )}
          {question.type === 'GRID_LIKERT' && (
             <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
             Visualização da matriz Likert (1 a 5)
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
