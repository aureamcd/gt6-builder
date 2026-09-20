import React from "react";
import {
  Undo2, Redo2, Menu, ArrowLeft, BarChart3, Share2, FileDown, ExternalLink, Save, Loader2
} from "lucide-react";
import { Form } from "@/types/form";

interface BuilderHeaderProps {
  schema: Form;
  setSchema: React.Dispatch<React.SetStateAction<Form | null>>;
  activeTab: 'builder' | 'responses';
  setActiveTab: (tab: 'builder' | 'responses') => void;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onlineCollaborators: Array<{ clientId: string; name: string; email: string; color: string }>;
  isAutoSaveEnabled: boolean;
  setIsAutoSaveEnabled: (enabled: boolean) => void;
  isSaving: boolean;
  responsesCount: number;
  onShareClick: () => void;
  onExportXML: () => void;
  onImportXML: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveClick: () => void;
  fetchResponses: () => void;
  id: string;
}

export function BuilderHeader({
  schema,
  setSchema,
  activeTab,
  setActiveTab,
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  setIsMobileMenuOpen,
  onlineCollaborators,
  isAutoSaveEnabled,
  setIsAutoSaveEnabled,
  isSaving,
  responsesCount,
  onShareClick,
  onExportXML,
  onImportXML,
  onSaveClick,
  fetchResponses,
  id
}: BuilderHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-2 sm:px-4 shadow-sm shrink-0 flex items-center justify-between gap-1 sm:gap-2 lg:gap-3 overflow-hidden">
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink min-w-0">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className="flex items-center justify-center p-1 sm:p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0"
        >
          <Undo2 size={17} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
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
        <a 
          href="/" 
          className="inline-flex items-center text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 gap-1" 
          title="Voltar para Questionários"
        >
          <ArrowLeft size={14} />
          <span className="hidden 2xl:inline">Questionários</span>
        </a>
        <input
          value={schema.title || ''}
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
            {responsesCount}
          </span>
        </button>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Online Collaborators Badge */}
        {onlineCollaborators.length > 0 && (
          <div className="flex items-center space-x-1.5 bg-indigo-50/95 border border-indigo-200/90 px-2 py-1 rounded-lg shrink-0 shadow-xs">
            <div className="flex items-center -space-x-1.5">
              {onlineCollaborators.map((c, i) => (
                <div
                  key={c.clientId || i}
                  style={{ backgroundColor: c.color || '#6366f1' }}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ring-2 ring-white shadow-sm uppercase cursor-default shrink-0 select-none"
                >
                  {c.name ? c.name.slice(0, 2) : 'U'}
                </div>
              ))}
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="text-[11px] font-bold text-indigo-800">
              {onlineCollaborators.length}
            </span>
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
          onClick={onShareClick}
          className="flex items-center justify-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 whitespace-nowrap"
          title="Compartilhar"
        >
          <Share2 size={14} />
          <span className="hidden xl:inline">Compartilhar</span>
        </button>
        <label className="cursor-pointer flex items-center justify-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 whitespace-nowrap" title="Importar XML">
          <FileDown size={14} className="rotate-180" />
          <span className="hidden xl:inline">Importar XML</span>
          <input type="file" accept=".xml" className="hidden" onChange={onImportXML} />
        </label>
        <button
          onClick={onExportXML}
          className="flex items-center justify-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 whitespace-nowrap"
          title="Exportar XML"
        >
          <FileDown size={14} />
          <span className="hidden xl:inline">Exportar XML</span>
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
          onClick={onSaveClick}
          disabled={isSaving}
          className={`flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white rounded-lg shadow-sm transition-colors shrink-0 whitespace-nowrap ${isSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          title="Salvar Formulário"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
        </button>
      </div>
    </header>
  );
}

