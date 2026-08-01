"use client";

import React, { useState, useEffect, use } from "react";
import {
  GripVertical, Plus, Settings, ChevronDown, CheckSquare,
  Type, List, AlignLeft, Grid, Eye, Save, Play, Layers, Trash2, X, Loader2, Share2, Key, MessageSquare, Users
} from "lucide-react";
import { Form, Section, Question, QuestionType, Option } from "../../../types/form";
import { saveFormState, getFormById, generateShareToken, getFormSubmissions } from "../../../lib/api";

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const typeLabels: Record<string, string> = {
  'TEXT_SHORT': 'Texto Curto',
  'TEXT_LONG': 'Texto Longo',
  'CHECKBOX_MULTIPLE': 'Múltipla Escolha',
  'RADIO_SINGLE': 'Escolha Única',
  'GRID_LIKERT': 'Matriz Likert',
  'CONDITIONAL_LOGIC': 'Regra Condicional',
  'DYNAMIC_REPEATER': 'Repetidor Dinâmico'
};

export default function FormBuilderSketch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'build' | 'responses'>('build');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<{ title: string, desc: string, type: 'success' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      showToast("Sucesso!", "Formulário salvo no banco de dados com sucesso.");
    } else {
      showToast("Erro", "Erro ao salvar: " + ((result.error as any)?.message || "Erro desconhecido"), 'error');
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

  const deleteSection = (sectionId: string) => {
    setSchema(prev => {
      if (!prev) return prev;
      const newSections = prev.sections?.filter(s => s.id !== sectionId) || [];
      // Se a seção deletada for a ativa, mude para outra ou deixe vazio
      if (activeSectionId === sectionId) {
        setActiveSectionId(newSections.length > 0 ? newSections[0].id : "");
      }
      return {
        ...prev,
        sections: newSections
      };
    });
  };

  const renderPaletteItems = () => (
    <>
      <SidebarItem icon={<Type size={18} />} label="Texto Curto" onClick={() => addQuestion('TEXT_SHORT')} />
      <SidebarItem icon={<AlignLeft size={18} />} label="Texto Longo" onClick={() => addQuestion('TEXT_LONG')} />
      <SidebarItem icon={<CheckSquare size={18} />} label="Múltipla" onClick={() => addQuestion('CHECKBOX_MULTIPLE')} />
      <SidebarItem icon={<List size={18} />} label="Única" onClick={() => addQuestion('RADIO_SINGLE')} />
      <SidebarItem icon={<Grid size={18} />} label="Likert" onClick={() => addQuestion('GRID_LIKERT')} />
    </>
  );

  const renderAdvancedLogicItems = () => (
    <>
      <SidebarItem icon={<Settings size={18} />} label="Regra Condicional" onClick={() => addQuestion('CONDITIONAL_LOGIC')} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" />
      <SidebarItem icon={<Layers size={18} />} label="Repetidor Dinâmico" onClick={() => addQuestion('DYNAMIC_REPEATER')} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" />
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 text-slate-900 font-sans selection:bg-indigo-200">
      {/* Sidebar: Components Palette (Desktop Only) */}
      <aside className="hidden md:flex w-64 h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
        <div className="p-4 border-b border-slate-200/60 flex items-center space-x-2">
          <Layers className="text-indigo-600" />
          <h1 className="font-bold text-lg text-slate-800">FormPanel</h1>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Adicionar à Seção Ativa</h2>
          <div className="grid grid-cols-1 gap-2 pb-2">
            {renderPaletteItems()}
          </div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4">Lógica Avançada</h2>
          <div className="grid grid-cols-1 gap-2 pb-2">
            {renderAdvancedLogicItems()}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Unified Navbar (Only visible on mobile) */}
        <header className="md:hidden flex flex-col bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-4 space-y-4 shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.02)] max-h-[60vh] overflow-y-auto">
          {/* Row 1: Back + Title */}
          <div className="flex items-center space-x-2">
            <a href="/" title="Voltar" className="flex items-center justify-center w-8 h-8 text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shrink-0">
              <span className="text-lg leading-none mb-0.5">←</span>
            </a>
            <input
              value={schema.title}
              onChange={(e) => setSchema(prev => prev ? { ...prev, title: e.target.value } : prev)}
              className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-full truncate text-lg"
              placeholder="Nome do Questionário"
            />
          </div>

          {/* Row 2: Tabs */}
          <div className="flex bg-slate-100 rounded-lg p-1 shrink-0 w-full">
            <button
              onClick={() => setActiveTab('build')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'build' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Perguntas
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex justify-center items-center space-x-1.5 ${activeTab === 'responses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span>Respostas</span>
              <span className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full">{submissions.length}</span>
            </button>
          </div>

          {/* Row 3: Tools */}
          <div>
            <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Adicionar à Seção Ativa</h2>
            <div className="flex flex-row overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {renderPaletteItems()}
            </div>
            <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2 mb-2">Lógica Avançada</h2>
            <div className="flex flex-row overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {renderAdvancedLogicItems()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 w-full mt-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/f/${id}`;
                navigator.clipboard.writeText(url);
                showToast("Link Copiado!", "Link de resposta copiado com sucesso!");
              }}
              className="flex justify-center items-center space-x-1.5 h-10 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all shrink-0"
            >
              <Share2 size={14} />
              <span>Responder</span>
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/builder/${id}`;
                navigator.clipboard.writeText(url);
                showToast("Link Copiado!", "Link de colaboração copiado com sucesso!");
              }}
              className="flex justify-center items-center space-x-1.5 h-10 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all shrink-0"
            >
              <Users size={14} />
              <span>Colaborar</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const token = await generateShareToken(id);
                  navigator.clipboard.writeText(token);
                  showToast("Token Gerado!", `Código copiado: ${token}`);
                } catch (error) {
                  showToast("Erro", "Salve antes de gerar o token.", 'error');
                }
              }}
              className="flex justify-center items-center space-x-1.5 h-10 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl shadow-sm hover:shadow-md transition-all shrink-0"
            >
              <Key size={14} />
              <span>Criar Cópia</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex justify-center items-center space-x-1.5 h-10 text-xs font-medium rounded-xl shadow-sm hover:shadow-md transition-all shrink-0 ${isSaving ? 'bg-indigo-50 text-indigo-400 border border-indigo-200 cursor-not-allowed' : 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'}`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Salvar</span>
            </button>
          </div>
        </header>

        {/* Desktop Navbar (Only visible on desktop) */}
        <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 items-center justify-between px-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] shrink-0 gap-3">
          <div className="flex items-center space-x-4">
            <a href="/" className="text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors shrink-0">← Voltar</a>

            <div className="flex bg-slate-100 rounded-lg p-1 shrink-0">
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
              onChange={(e) => setSchema(prev => prev ? { ...prev, title: e.target.value } : prev)}
              className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-64 truncate text-lg"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const url = `${window.location.origin}/f/${id}`;
                navigator.clipboard.writeText(url);
                showToast("Link Copiado!", "Link para responder copiado!");
              }}
              className="flex items-center justify-center space-x-2 px-4 h-10 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
            >
              <Share2 size={16} />
              <span>Responder</span>
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/builder/${id}`;
                navigator.clipboard.writeText(url);
                showToast("Link Copiado!", "Link para colaboração copiado!");
              }}
              className="flex items-center justify-center space-x-2 px-4 h-10 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
            >
              <Users size={16} />
              <span>Colaborar</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const token = await generateShareToken(id);
                  navigator.clipboard.writeText(token);
                  showToast("Token Gerado!", `Código copiado: ${token}`);
                } catch (error) {
                  showToast("Erro", "Salve o formulário antes de gerar o token.", 'error');
                }
              }}
              className="flex items-center justify-center space-x-2 px-4 h-10 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
            >
              <Key size={16} />
              <span>Criar Cópia</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center justify-center space-x-2 px-6 h-10 text-sm font-medium rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0 ${isSaving ? 'bg-indigo-50 text-indigo-400 border border-indigo-200 cursor-not-allowed' : 'text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Salvar</span>
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto relative bg-[#f0ebf8] scrollbar-hide md:scrollbar-default">

          {/* BUILDER TAB */}
          <div className={`p-4 md:p-8 ${activeTab === 'build' ? 'block' : 'hidden'}`}>
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32">

              {schema.sections?.map((section, index) => (
                <div
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`bg-white rounded-2xl shadow-sm border-t-[10px] border-t-[#673ab7] border-x border-b border-slate-200 transition-all duration-300 relative ${activeSectionId === section.id ? 'ring-1 ring-purple-200 shadow-lg' : 'opacity-90 hover:opacity-100 hover:shadow-md'}`}
                >
                  <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex justify-between items-start group bg-slate-50/50 rounded-t-xl">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Seção {index + 1} {activeSectionId === section.id && "(Ativa)"}</p>
                      <AutoResizeTextarea
                        value={section.title}
                        rows={1}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          setSchema(prev => prev ? ({
                            ...prev,
                            sections: prev.sections?.map(s => s.id === section.id ? { ...s, title: newTitle } : s)
                          }) : prev);
                        }}
                        className="text-2xl md:text-3xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none w-full pb-1"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSection(section.id);
                      }}
                      className="text-slate-400 hover:text-red-500 p-2 transition-colors shrink-0"
                      title="Deletar Seção"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Questions */}
                  <div className="p-4 md:p-8 space-y-4">
                    {(!section.questions || section.questions.length === 0) && (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-purple-200 rounded-xl bg-white/50">
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
                className="w-full py-6 border-2 border-dashed border-purple-300 rounded-2xl text-purple-600 font-medium hover:border-purple-500 hover:text-purple-700 transition-all duration-300 flex flex-col items-center justify-center space-y-2 bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-xl hover:shadow-purple-100/50 hover:-translate-y-1"
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 md:bottom-8 right-4 md:right-8 z-50 p-4 rounded-xl shadow-2xl border flex items-start space-x-3 transition-all duration-300 animate-in slide-in-from-bottom-5 ${toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="shrink-0 mt-0.5">
            {toastMessage.type === 'success' ? <CheckSquare size={18} className="text-green-600" /> : <X size={18} className="text-red-600" />}
          </div>
          <div>
            <h4 className="font-semibold text-sm">{toastMessage.title}</h4>
            <p className="text-sm mt-1 opacity-90 max-w-xs">{toastMessage.desc}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="opacity-50 hover:opacity-100 p-1 ml-4">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// Subcomponents

function AutoResizeTextarea({ value, onChange, className, placeholder, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      onChange={onChange}
      className={`${className} resize-none overflow-hidden`}
      placeholder={placeholder}
      rows={props.rows || 1}
    />
  );
}

function SidebarItem({ icon, label, onClick, className = "" }: { icon: React.ReactNode, label: string, onClick: () => void, className?: string }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:shadow-lg hover:shadow-indigo-100/40 hover:-translate-y-0.5 transition-all duration-200 group shrink-0 ${className}`}
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
    <div className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-purple-200 hover:shadow-md transition-all duration-300 focus-within:border-purple-400 focus-within:shadow-lg focus-within:ring-1 focus-within:ring-purple-400 overflow-hidden shadow-sm">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-focus-within:bg-[#4285f4] transition-colors rounded-l-xl"></div>
      <div className="absolute left-1 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab text-slate-200 hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={16} />
      </div>

      <div className="pl-5 md:pl-6">
        <div className="flex flex-col md:flex-row md:justify-between items-start mb-2 gap-2 md:gap-0">
          <div className="flex items-start space-x-2 flex-1 w-full min-w-0">
            <span className="font-bold text-slate-400 mt-1.5 shrink-0">{number}.</span>
            <AutoResizeTextarea
              value={question.label}
              rows={1}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className="font-semibold text-slate-800 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none w-full py-1"
              placeholder="Digite sua pergunta aqui..."
            />
          </div>
          <div className="flex items-center justify-between w-full md:w-auto md:ml-4 shrink-0">
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium border border-slate-200">{typeLabels[question.type] || question.type}</span>
            <button onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1 transition-colors ml-auto md:ml-2" title="Deletar Pergunta">
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
                  <AutoResizeTextarea
                    value={opt.label}
                    rows={1}
                    onChange={(e) => onUpdateOptionLabel && onUpdateOptionLabel(opt.id, e.target.value)}
                    className="text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none w-full min-w-0 py-1 leading-tight mt-0.5"
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
