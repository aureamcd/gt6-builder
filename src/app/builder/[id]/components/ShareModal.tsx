import React, { useState } from "react";
import { Share2, X, Lock, Globe, FileCode, Users, CheckSquare, Copy } from "lucide-react";
import { Form } from "@/types/form";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: Form;
  formId: string;
}

export function ShareModal({ isOpen, onClose, schema, formId }: ShareModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <h3 className="font-bold text-lg text-slate-800 flex items-center">
            <Share2 size={20} className="mr-2 text-indigo-600" />
            Compartilhar Questionário
          </h3>
          <button 
            onClick={() => { onClose(); setCopiedKey(null); }} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
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
                      handleCopy(schema.settings.access_token, 'token');
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
              <span>1. Link para Respondentes {schema.settings?.visibility === 'private' ? '(Protegido por Senha)' : ''}</span>
            </div>
            <p className="text-xs text-slate-500">Envie este link para as pessoas responderem e enviarem dados do questionário.</p>
            <div className="flex">
              <input
                type="text"
                readOnly
                value={`${origin}/f/${schema.share_token}`}
                className="flex-1 bg-white border border-slate-200 rounded-l-lg px-3 py-2 text-xs sm:text-sm text-slate-600 outline-none select-all font-mono"
              />
              <button
                onClick={() => handleCopy(`${origin}/f/${schema.share_token}`, 'public')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-r-lg transition-colors flex items-center shrink-0 ${copiedKey === 'public' ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {copiedKey === 'public' ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                {copiedKey === 'public' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Opção 2: Compartilhar Template */}
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
                value={`${origin}/?import_token=${schema.share_token}`}
                className="flex-1 bg-white border border-purple-200 rounded-l-lg px-3 py-2 text-xs sm:text-sm text-slate-600 outline-none select-all font-mono"
              />
              <button
                onClick={() => handleCopy(`${origin}/?import_token=${schema.share_token}`, 'template')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-r-lg transition-colors flex items-center shrink-0 ${copiedKey === 'template' ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                {copiedKey === 'template' ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                {copiedKey === 'template' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Opção 3: Edição Colaborativa */}
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
                value={`${origin}/builder/${formId}`}
                className="flex-1 bg-white border border-amber-200 rounded-l-lg px-3 py-2 text-xs sm:text-sm text-slate-600 outline-none select-all font-mono"
              />
              <button
                onClick={() => handleCopy(`${origin}/builder/${formId}`, 'collab')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-r-lg transition-colors flex items-center shrink-0 ${copiedKey === 'collab' ? 'bg-green-600' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {copiedKey === 'collab' ? <CheckSquare size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                {copiedKey === 'collab' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Código QR */}
          {schema.settings?.visibility !== 'private' && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Código QR (Link Público)</label>
              <div className="flex items-center space-x-4 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${origin}/f/${schema.share_token}`)}`}
                  alt="QR Code"
                  className="w-20 h-20 rounded-lg border border-white shadow-sm shrink-0"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

