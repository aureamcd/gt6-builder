import React from "react";
import {
  Layers, X, Type, AlignLeft, CheckSquare, List, ChevronDown, Calendar, UploadCloud,
  FileText, Image as ImageIcon, Video, Headphones, Settings, Globe, Lock, Key, RefreshCw, Copy, Trash2
} from "lucide-react";
import { Form, QuestionType } from "@/types/form";
import { generateAccessToken } from "@/lib/api";

interface SectionSidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  addQuestion: (type: QuestionType) => void;
  schema: Form;
  setSchema: React.Dispatch<React.SetStateAction<Form | null>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setIsDeleteModalOpen: (open: boolean) => void;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

function SidebarItem({ icon, label, onClick, className }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer shadow-2xs ${className || ''}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function SectionSidebar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  addQuestion,
  schema,
  setSchema,
  showToast,
  setIsDeleteModalOpen
}: SectionSidebarProps) {
  return (
    <>
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
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
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
                      className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
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
                className="w-full flex items-center justify-center space-x-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Excluir este Questionário</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

