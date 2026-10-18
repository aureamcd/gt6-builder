import React, { useState } from "react";
import {
  Share2, X, Lock, Globe, FileCode, Users, CheckSquare, Copy,
  ExternalLink, QrCode, Download, MessageCircle, Sparkles, Key, ShieldCheck
} from "lucide-react";
import { Form } from "@/types/form";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: Form;
  formId: string;
}

export function ShareModal({ isOpen, onClose, schema, formId }: ShareModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'respondents' | 'team'>('all');
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/f/${schema.share_token}`;
  const templateUrl = `${origin}/?import_token=${schema.share_token}`;
  const collabUrl = `${origin}/builder/${formId}`;
  const isPrivate = schema.settings?.visibility === 'private';
  const accessToken = schema.settings?.access_token || '';

  const buildInviteText = () => {
    const title = schema.title || 'Questionário';
    if (isPrivate && accessToken) {
      return `📋 *${title}*\n\nVocê foi convidado(a) para responder ao diagnóstico.\n🔗 *Link de acesso:* ${publicUrl}\n🔑 *Código de acesso:* ${accessToken}`;
    }
    return `📋 *${title}*\n\nVocê foi convidado(a) para responder ao diagnóstico.\n🔗 *Link de acesso:* ${publicUrl}`;
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(buildInviteText());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(publicUrl)}`;

  const handleDownloadQrCode = async () => {
    try {
      setIsDownloadingQr(true);
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanName = (schema.title || 'questionario').toLowerCase().replace(/[^a-z0-9]/gi, '_');
      link.href = blobUrl;
      link.download = `qrcode_${cleanName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrCodeUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden transform transition-all max-h-[92vh] flex flex-col">
        {/* Header Limpo e Claro */}
        <div className="relative bg-gradient-to-b from-indigo-50/50 to-white border-b border-slate-200/80 p-5 sm:p-6 shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/70 px-2.5 py-0.5 rounded-full">
                  <Share2 size={12} /> Central de Compartilhamento
                </span>
                {isPrivate ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Lock size={11} /> Privado (Com Senha)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <Globe size={11} /> Público (Acesso Livre)
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-800 tracking-tight truncate max-w-md">
                {schema.title || "Compartilhar Questionário"}
              </h3>
            </div>
            <button
              onClick={() => { onClose(); setCopiedKey(null); }}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Abas de Filtro Rápido */}
          <div className="flex items-center gap-1.5 mt-5 bg-white/10 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Visão Geral
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('respondents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'respondents' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe size={13} /> Coletar Respostas & QR
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users size={13} /> Equipe & Templates
            </button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto bg-slate-50/50 flex-1">
          {/* Card de Segurança / Privacidade */}
          {isPrivate ? (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-2xl shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <Key size={16} />
                  </div>
                  <span>Formulário Protegido por Código de Acesso</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
                  Acesso Restrito
                </span>
              </div>
              <p className="text-xs text-amber-900/85 leading-relaxed">
                Este código é solicitado uma única vez para <strong>Responder</strong>, <strong>Importar como Template</strong> ou <strong>Editar em Equipe</strong>:
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white border border-amber-300/90 rounded-xl p-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Token Ativo</span>
                    <span className="font-mono font-extrabold text-lg text-slate-900 tracking-widest">{accessToken || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-slate-500 hidden sm:block">
                    Envie junto com o link para liberar o acesso.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => accessToken && handleCopy(accessToken, 'token')}
                    className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'token' ? <CheckSquare size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'token' ? 'Código Copiado!' : 'Copiar Código'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(buildInviteText().replace(/\*/g, ''), 'full_invite')}
                    className="flex-1 sm:flex-initial justify-center px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Copia uma mensagem pronta com o link e a senha de acesso"
                  >
                    {copiedKey === 'full_invite' ? <CheckSquare size={14} /> : <Sparkles size={14} />}
                    <span>{copiedKey === 'full_invite' ? 'Convite Copiado!' : 'Copiar Convite + Senha'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
                  <ShieldCheck size={18} className="text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-950">Formulário Público (Acesso Direto)</h4>
                  <p className="text-xs text-emerald-700">Qualquer pessoa com o link ou QR Code pode responder sem precisar de senha.</p>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 1: Coletar Respostas + QR Code */}
          {(activeFilter === 'all' || activeFilter === 'respondents') && (
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Globe size={17} />
                  </div>
                  <span>1. Link para Respondentes {isPrivate ? '(Protegido por Senha)' : ''}</span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Coleta de Respostas
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Envie este link para os participantes preencherem o diagnóstico. O progresso de preenchimento deles é salvo automaticamente no navegador.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(publicUrl, 'public')}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
                    copiedKey === 'public' ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {copiedKey === 'public' ? <CheckSquare size={16} className="mr-1.5" /> : <Copy size={16} className="mr-1.5" />}
                  {copiedKey === 'public' ? 'Copiado!' : 'Copiar Link'}
                </button>
              </div>

              {/* Ações Rápidas para Respondentes */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors"
                >
                  <ExternalLink size={13} /> Abrir em Nova Aba
                </a>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer"
                >
                  <MessageCircle size={13} /> Compartilhar no WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(buildInviteText().replace(/\*/g, ''), 'invite_msg')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors cursor-pointer"
                >
                  {copiedKey === 'invite_msg' ? <CheckSquare size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === 'invite_msg' ? 'Convite Copiado!' : 'Copiar Convite Formatado'}</span>
                </button>
              </div>

              {/* QR Code Integrado */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 rounded-xl p-3.5 border">
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code do Questionário"
                    className="w-24 h-24 rounded-lg object-contain"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800">
                    <QrCode size={14} className="text-indigo-600" />
                    <span>QR Code de Acesso Rápido pelo Celular</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isPrivate
                      ? `Ao escanear, o participante abrirá a tela do questionário e informará o código ${accessToken}.`
                      : 'Aponte a câmera do celular para abrir o questionário diretamente.'}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadQrCode}
                      disabled={isDownloadingQr}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>{isDownloadingQr ? 'Baixando...' : 'Baixar QR Code (PNG)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 2 & 3: Equipe & Templates */}
          {(activeFilter === 'all' || activeFilter === 'team') && (
            <div className="grid grid-cols-1 gap-4">
              {/* Opção 2: Compartilhar Template */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-purple-200/90 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-purple-800 font-bold text-sm">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <FileCode size={17} />
                    </div>
                    <span>2. Enviar como Template (Cópia Independente)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                    Clonagem Segura
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A outra pessoa receberá uma cópia idêntica deste questionário na conta dela para editar livremente sem alterar o seu original.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={templateUrl}
                    className="flex-1 bg-purple-50/40 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 outline-none select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(templateUrl, 'template')}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
                      copiedKey === 'template' ? 'bg-emerald-600' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {copiedKey === 'template' ? <CheckSquare size={16} className="mr-1.5" /> : <Copy size={16} className="mr-1.5" />}
                    {copiedKey === 'template' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>

              {/* Opção 3: Edição Colaborativa */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-amber-200/90 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Users size={17} />
                    </div>
                    <span>3. Edição Direta (Colaboração em Tempo Real)</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tempo Real
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Compartilhe o link do editor com sua equipe para que trabalhem juntos neste mesmo formulário com sincronização ao vivo.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={collabUrl}
                    className="flex-1 bg-amber-50/40 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 outline-none select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(collabUrl, 'collab')}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${
                      copiedKey === 'collab' ? 'bg-emerald-600' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {copiedKey === 'collab' ? <CheckSquare size={16} className="mr-1.5" /> : <Copy size={16} className="mr-1.5" />}
                    {copiedKey === 'collab' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Alterações de privacidade podem ser feitas na barra lateral esquerda.</span>
          <button
            type="button"
            onClick={() => { onClose(); setCopiedKey(null); }}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}


