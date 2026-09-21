import React, { useState, useRef, useEffect } from "react";
import {
  Undo2, Redo2, Menu, ArrowLeft, BarChart3, Share2, FileDown, ExternalLink, Save, Loader2, MoreVertical
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="relative z-30 h-16 bg-white border-b border-slate-200 px-2 sm:px-4 shadow-sm shrink-0 flex items-center justify-between gap-1 sm:gap-2 lg:gap-3">
      {/* Lado Esquerdo: Voltar primeiro, depois Undo/Redo e Título */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink min-w-0">
        <a 
          href="/" 
          className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 gap-1.5 border border-slate-200" 
          title="Voltar para Meus Questionários"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Questionários</span>
        </a>

        <div className="h-4 w-[1px] bg-slate-200 mx-1 shrink-0 hidden sm:block"></div>

        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className="flex items-center justify-center p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0 cursor-pointer"
        >
          <Undo2 size={17} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          title="Refazer (Ctrl+Y)"
          className="flex items-center justify-center p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:bg-transparent transition-colors shrink-0 cursor-pointer"
        >
          <Redo2 size={17} />
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-md shrink-0 cursor-pointer"
          title="Menu Principal"
        >
          <Menu size={17} />
        </button>

        <input
          value={schema.title || ''}
          onChange={(e) => setSchema(prev => prev ? { ...prev, title: e.target.value } : prev)}
          className="font-bold text-slate-800 text-xs sm:text-sm md:text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-1 w-24 sm:w-36 md:w-44 lg:w-56 truncate min-w-[70px]"
          placeholder="Título do formulário..."
        />
      </div>

      {/* Centro: Alternador de Abas (Construtor / Respostas) */}
      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTab('builder')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'builder' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          title="Construtor"
        >
          <span className="hidden sm:inline">Construtor</span>
          <span className="sm:hidden"><Menu size={13} /></span>
        </button>
        <button
          onClick={() => { setActiveTab('responses'); fetchResponses(); }}
          className={`flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'responses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          title="Respostas"
        >
          <BarChart3 size={13} />
          <span className="hidden sm:inline">Respostas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'responses' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
            {responsesCount}
          </span>
        </button>
      </div>

      {/* Lado Direito: Ações Principais (Auto-save, Compartilhar, Salvar) + Menu Três Pontinhos */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
        {/* Colaboradores Online */}
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

        {/* 1. Auto-save Button */}
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

        {/* 2. Pré-visualização Button */}
        <button
          onClick={() => window.open(`/preview/${id}`, '_blank')}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
          title="Pré-visualizar Questionário"
        >
          <ExternalLink size={14} className="text-blue-600" />
          <span className="hidden md:inline font-semibold">Pré-visualizar</span>
        </button>

        {/* 3. Compartilhar Button */}
        <button
          onClick={onShareClick}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
          title="Compartilhar Questionário"
        >
          <Share2 size={14} className="text-indigo-600" />
          <span className="hidden md:inline font-semibold">Compartilhar</span>
        </button>

        {/* 4. Menu Três Pontinhos (Salvar, Exportar XML, Importar XML) */}
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
            title="Mais Opções"
          >
            <MoreVertical size={16} />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  onSaveClick();
                  setIsMoreMenuOpen(false);
                }}
                disabled={isSaving}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin text-indigo-600" /> : <Save size={14} className="text-indigo-600" />}
                <span className="font-semibold text-slate-800">{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>

              <div className="h-[1px] bg-slate-100 my-1"></div>

              <button
                onClick={() => {
                  onExportXML();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <FileDown size={14} className="text-emerald-600" />
                <span>Exportar XML</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <FileDown size={14} className="rotate-180 text-purple-600" />
                <span>Importar XML</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={onImportXML}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

