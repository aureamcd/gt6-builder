"use client";

import React, { useState } from "react";
import { 
  GripVertical, Plus, Settings, ChevronDown, CheckSquare, 
  Type, List, AlignLeft, Grid, Eye, Save, Play, Layers, Trash2, X
} from "lucide-react";
import { FormSchema, Section, Question, QuestionType, Option } from "../types/form";

const initialFormState: FormSchema = {
  form_id: "gt6-questionario",
  title: "Questionário de Maturidade e Interoperabilidade em Saúde (GT6)",
  sections: [
    {
      id: "sec_1",
      title: "Seção 1 – Identificação e Perfil Tecnológico",
      blocks: [
        { id: "q1", type: "TEXT_SHORT", label: "Unidade/Serviço", required: true },
        { id: "q2", type: "TEXT_SHORT", label: "Cargo/Função", required: true }
      ]
    }
  ]
};

export default function FormBuilderSketch() {
  const [schema, setSchema] = useState<FormSchema>(initialFormState);
  const [activeSectionId, setActiveSectionId] = useState<string>("sec_1");

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      label: `Nova Pergunta (${type})`,
      required: false,
      options: type === 'RADIO_SINGLE' || type === 'CHECKBOX_MULTIPLE' 
        ? [{ id: `opt_${Date.now()}`, label: "Opção 1" }] 
        : undefined
    };

    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === activeSectionId 
          ? { ...sec, blocks: [...sec.blocks, newQuestion] }
          : sec
      )
    }));
  };

  const updateQuestionLabel = (sectionId: string, questionId: string, newLabel: string) => {
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === sectionId 
          ? {
              ...sec,
              blocks: sec.blocks.map(q => q.id === questionId ? { ...q, label: newLabel } : q)
            }
          : sec
      )
    }));
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setSchema(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === sectionId 
          ? { ...sec, blocks: sec.blocks.filter(q => q.id !== questionId) }
          : sec
      )
    }));
  };

  const addSection = () => {
    const newSection: Section = {
      id: `sec_${Date.now()}`,
      title: "Nova Seção",
      blocks: []
    };
    setSchema(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSectionId(newSection.id);
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
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Editando</span>
            <input 
              value={schema.title}
              onChange={(e) => setSchema({...schema, title: e.target.value})}
              className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 w-96"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
              <Save size={16} />
              <span>Salvar Formulário</span>
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="max-w-4xl mx-auto space-y-8 pb-32">
            
            {schema.sections.map((section, index) => (
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
                        setSchema(prev => ({
                          ...prev,
                          sections: prev.sections.map(s => s.id === section.id ? { ...s, title: newTitle } : s)
                        }));
                      }}
                      className="text-lg font-bold text-slate-800 mt-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                    />
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {section.blocks.length === 0 && (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                      Nenhuma pergunta nesta seção. Clique nos componentes na barra lateral para adicionar.
                    </div>
                  )}

                  {section.blocks.map((q, qIndex) => (
                    <QuestionCard 
                      key={q.id}
                      question={q}
                      number={qIndex + 1}
                      onUpdateLabel={(newLabel) => updateQuestionLabel(section.id, q.id, newLabel)}
                      onDelete={() => deleteQuestion(section.id, q.id)}
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
  onDelete 
}: { 
  question: Question, 
  number: number,
  onUpdateLabel: (l: string) => void,
  onDelete: () => void 
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
                <div key={opt.id} className="flex items-center space-x-2">
                  <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center ${question.type === 'RADIO_SINGLE' ? 'rounded-full' : 'rounded'}`}></div>
                  <span className="text-slate-700">{opt.label}</span>
                </div>
              ))}
              <div className="flex items-center space-x-2 text-indigo-500 cursor-pointer hover:text-indigo-700 mt-2">
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
