"use client";

import React, { useState, useEffect, useRef } from "react";
import { getForms, createEmptyForm, cloneFormByToken, getFormByShareToken, deleteForm, generateAccessToken, removeSharedForm } from "../lib/api";
import { Form, FormSettings } from "../types/form";
import {
  Plus, FileText, Loader2, ArrowRight, Save, Download, FileCode, LogOut,
  BarChart3, Trash2, Users, Globe, Lock, RefreshCw, Key, ShieldCheck,
  AlertCircle, Search, Copy, Check, ExternalLink, Eye, Sparkles, Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, getFriendlyErrorMessage } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { QuestLinkLogo } from "../components/QuestLinkLogo";

export default function Dashboard() {
  const { toast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formToDelete, setFormToDelete] = useState<{ id: string, title: string, is_shared?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTokenInput, setImportTokenInput] = useState("");
  const [importPasscodeInput, setImportPasscodeInput] = useState("");
  const [isPasscodeRequired, setIsPasscodeRequired] = useState(false);
  const [targetTemplateTitle, setTargetTemplateTitle] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const hasProcessedImportRef = useRef(false);

  // Busca, Filtros e Ações Rápidas do Painel
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'shared' | 'private' | 'public'>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Modal de Criação de Formulário (Público vs Privado)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState("Novo Questionário");
  const [newFormVisibility, setNewFormVisibility] = useState<'public' | 'private'>('public');
  const [newFormAccessToken, setNewFormAccessToken] = useState(generateAccessToken());
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (typeof window !== 'undefined') {
            router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          } else {
            router.push("/login");
          }
          return;
        }
        setUser(session.user);

        // Check if redirected with import_token query param
        if (typeof window !== 'undefined' && !hasProcessedImportRef.current) {
          const params = new URLSearchParams(window.location.search);
          const importToken = params.get('import_token');
          const accessTokenFromUrl = params.get('access_token');
          if (importToken) {
            hasProcessedImportRef.current = true;
            try {
              const sourceForm = await getFormByShareToken(importToken);
              if (sourceForm) {
                const isOwner = session.user && session.user.id === sourceForm.user_id;
                const isPrivate = sourceForm.settings?.visibility === 'private' && Boolean(sourceForm.settings?.access_token);
                const expectedToken = sourceForm.settings?.access_token?.trim().toUpperCase();
                if (isPrivate && !isOwner && (!accessTokenFromUrl || accessTokenFromUrl.trim().toUpperCase() !== expectedToken)) {
                  // Requer código de acesso do template privado
                  setImportTokenInput(importToken);
                  setTargetTemplateTitle(sourceForm.title);
                  setIsPasscodeRequired(true);
                  setIsImportModalOpen(true);
                } else {
                  setIsImporting(true);
                  const validToken = accessTokenFromUrl || undefined;
                  const newForm = await cloneFormByToken(importToken, validToken);
                  if (newForm) {
                    toast.success("Questionário importado com sucesso!", "Template Carregado");
                    router.push(`/builder/${newForm.id}`);
                    return;
                  }
                }
              }
            } catch (err: any) {
              console.error("Erro ao clonar template:", err);
              toast.error(getFriendlyErrorMessage(err), "Erro na Importação");
            } finally {
              setIsImporting(false);
            }
          }
        }

        const data = await getForms();
        setForms(data);
      } catch (error) {
        console.error("Erro ao carregar formulários:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [router, toast]);

  const handleOpenCreateModal = () => {
    setNewFormTitle("Novo Questionário");
    setNewFormVisibility('public');
    setNewFormAccessToken(generateAccessToken());
    setIsCreateModalOpen(true);
  };

  const handleExecuteCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = newFormTitle.trim() || "Novo Questionário";
    setIsCreating(true);
    try {
      const settings: FormSettings = {
        visibility: newFormVisibility,
        access_token: newFormVisibility === 'private' ? newFormAccessToken.trim() : null
      };

      const newForm = await createEmptyForm(finalTitle, settings);
      setIsCreateModalOpen(false);
      toast.success("Questionário criado com sucesso!", "Pronto para Editar");
      router.push(`/builder/${newForm.id}`);
    } catch (error) {
      console.error("Erro ao criar formulário:", error);
      toast.error(getFriendlyErrorMessage(error), "Erro ao Criar");
      setIsCreating(false);
    }
  };

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
    setImportTokenInput("");
    setImportPasscodeInput("");
    setIsPasscodeRequired(false);
    setTargetTemplateTitle(null);
    setImportError(null);
  };

  const handleExecuteImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!importTokenInput.trim()) {
      setImportError("Por favor, cole um token ou link válido.");
      return;
    }

    let cleanToken = importTokenInput.trim();
    if (cleanToken.includes('import_token=')) {
      try {
        const url = new URL(cleanToken);
        cleanToken = url.searchParams.get('import_token') || cleanToken;
      } catch (e) {
        // use as is
      }
    } else if (cleanToken.includes('/f/')) {
      cleanToken = cleanToken.split('/f/')[1]?.split('?')[0] || cleanToken;
    } else if (cleanToken.includes('/builder/')) {
      cleanToken = cleanToken.split('/builder/')[1]?.split('?')[0] || cleanToken;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const newForm = await cloneFormByToken(cleanToken, importPasscodeInput.trim() || undefined);
      if (newForm) {
        setIsImportModalOpen(false);
        toast.success("Questionário importado com sucesso!", "Template Clonado");
        router.push(`/builder/${newForm.id}`);
      }
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      const errMsg = error?.message || "";
      if (errMsg.toLowerCase().includes("código") || errMsg.toLowerCase().includes("privado") || errMsg.toLowerCase().includes("passcode")) {
        setIsPasscodeRequired(true);
        setImportError(getFriendlyErrorMessage(errMsg));
      } else {
        setImportError(getFriendlyErrorMessage(error));
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmDelete = async (forcePermanent = false) => {
    if (!formToDelete) return;
    setIsDeleting(true);
    try {
      if (formToDelete.is_shared && !forcePermanent) {
        // Remover apenas da lista de compartilhados do usuário
        await removeSharedForm(formToDelete.id);
        toast.success("Formulário removido da sua lista!", "Item Removido");
      } else {
        // Excluir permanentemente do banco
        await deleteForm(formToDelete.id);
        toast.success("Formulário excluído permanentemente!", "Item Excluído");
      }
      setForms(prev => prev.filter(f => f.id !== formToDelete.id));
      setFormToDelete(null);
    } catch (err: any) {
      console.error("Erro ao remover formulário:", err);
      toast.error(getFriendlyErrorMessage(err), "Erro ao Remover");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      try {
        localStorage.clear();
      } catch (e) {}
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading || isImporting) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        {isImporting && <p className="text-sm font-medium text-slate-600">Importando template para a sua conta...</p>}
      </div>
    );
  }

  const totalFormsCount = forms.length;
  const ownFormsCount = forms.filter(f => !f.is_shared).length;
  const sharedFormsCount = forms.filter(f => f.is_shared).length;
  const privateFormsCount = forms.filter(f => f.settings?.visibility === 'private').length;
  const publicFormsCount = totalFormsCount - privateFormsCount;

  const filteredForms = forms.filter(form => {
    const matchesSearch =
      !searchQuery.trim() ||
      (form.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'mine') return !form.is_shared;
    if (activeFilter === 'shared') return Boolean(form.is_shared);
    if (activeFilter === 'private') return form.settings?.visibility === 'private';
    if (activeFilter === 'public') return form.settings?.visibility !== 'private';
    return true;
  });

  const handleQuickCopy = (e: React.MouseEvent, text: string, keyId: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedTokenId(keyId);
    toast.success(`${label} copiado para a área de transferência!`, "Copiado");
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      {/* Top Navbar Fixa e Limpa */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <QuestLinkLogo size="md" subtitle="Diagnóstico & Formulários" />

          <div className="flex items-center gap-2.5 sm:gap-3">
            {user?.email && (
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-full pl-1.5 pr-3.5 py-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center uppercase shadow-2xs">
                  {user.email.charAt(0)}
                </div>
                <span className="text-xs font-medium text-slate-600 max-w-[180px] truncate">
                  {user.email}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Encerrar sessão"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-9 flex-1 space-y-6 sm:space-y-8">
        {/* Cabeçalho de Boas-vindas + Ações Principais */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md mb-2">
              <Sparkles size={12} /> Painel de Controle
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Meus Formulários
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Crie, compartilhe e acompanhe diagnósticos de maturidade e interoperabilidade em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <button
              onClick={handleOpenImportModal}
              disabled={isImporting}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-slate-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-70"
            >
              <Download size={16} className="text-indigo-600" />
              <span>Importar Template</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              disabled={isCreating}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-70"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Criar Novo Questionário</span>
            </button>
          </div>
        </div>

        {/* Cards de Resumo (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Questionários</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{totalFormsCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                {ownFormsCount} {ownFormsCount === 1 ? 'próprio' : 'próprios'} • {sharedFormsCount} {sharedFormsCount === 1 ? 'compartilhado' : 'compartilhados'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Protegidos com Senha</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{privateFormsCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                Acesso restrito via código de segurança
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Lock size={22} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Acesso Público Livre</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{publicFormsCount}</p>
              <p className="text-xs text-slate-500 mt-1">
                Abertos para resposta direta via link
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Globe size={22} />
            </div>
          </div>
        </div>

        {/* Barra de Busca e Filtros */}
        {forms.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar questionário pelo título ou descrição..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { key: 'all', label: `Todos (${totalFormsCount})` },
                { key: 'mine', label: `Meus (${ownFormsCount})` },
                { key: 'shared', label: `Compartilhados (${sharedFormsCount})` },
                { key: 'private', label: `Privados (${privateFormsCount})` },
                { key: 'public', label: `Públicos (${publicFormsCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === tab.key
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Listagem de Questionários */}
        {forms.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 px-4 text-center shadow-2xs">
            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 mb-4 border border-indigo-100">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Nenhum formulário encontrado</h3>
            <p className="text-slate-500 mt-2 max-w-sm text-sm">
              Você ainda não possui formulários criados. Comece criando o seu primeiro questionário inteligente.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all text-sm shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Criar Formulário Agora</span>
            </button>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center py-14 px-4 text-center">
            <p className="text-base font-bold text-slate-700">Nenhum questionário corresponde ao filtro selecionado</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Tente limpar o termo de busca ou alternar a aba de filtro.</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveFilter('all'); }}
              className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredForms.map(form => {
              const isPrivate = form.settings?.visibility === 'private';
              const accessCode = form.settings?.access_token;
              const publicLink = typeof window !== 'undefined' && form.share_token
                ? `${window.location.origin}/f/${form.share_token}`
                : '';

              return (
                <div
                  key={form.id}
                  onClick={() => router.push(`/builder/${form.id}`)}
                  className="group relative bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Barra de Destaque Superior */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      form.is_shared
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400'
                    }`}
                  />

                  <div>
                    {/* Topo do Card: Badges + Excluir */}
                    <div className="flex items-start justify-between gap-2 mb-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div
                          className={`p-2 rounded-xl transition-colors ${
                            form.is_shared
                              ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                              : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}
                        >
                          <FileText size={19} />
                        </div>

                        {form.is_shared ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">
                            <Users size={11} />
                            <span>Compartilhado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                            <span>Meu</span>
                          </span>
                        )}

                        {isPrivate ? (
                          <span
                            className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full"
                            title={accessCode ? `Código de acesso: ${accessCode}` : 'Protegido por código de acesso'}
                          >
                            <Lock size={10} />
                            <span>Privado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <Globe size={10} />
                            <span>Público</span>
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormToDelete({ id: form.id, title: form.title, is_shared: form.is_shared });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title={form.is_shared ? "Remover ou excluir formulário" : "Excluir formulário"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Título & Descrição */}
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 line-clamp-2 mb-1.5 group-hover:text-indigo-600 transition-colors">
                      {form.title || "Formulário Sem Título"}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {form.description || "Questionário estruturado para coleta de respostas e avaliação de maturidade institucional."}
                    </p>

                    {/* Atalhos Rápidos de Acesso (Código de Senha & Copiar Link) */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {isPrivate && accessCode && (
                        <button
                          onClick={(e) => handleQuickCopy(e, accessCode, `code_${form.id}`, "Código de acesso")}
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold bg-amber-50/90 hover:bg-amber-100 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Clique para copiar o código de acesso"
                        >
                          <Key size={11} className="text-amber-600" />
                          <span>{accessCode}</span>
                          {copiedTokenId === `code_${form.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={10} className="opacity-60" />}
                        </button>
                      )}

                      {form.share_token && (
                        <button
                          onClick={(e) => handleQuickCopy(e, publicLink, `link_${form.id}`, "Link de resposta")}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Copiar link público para respondentes"
                        >
                          {copiedTokenId === `link_${form.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          <span>Copiar Link</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                    <span className="inline-flex items-center gap-1 text-slate-400" title="Última atualização">
                      <Calendar size={12} />
                      <span>{new Date(form.updated_at || form.created_at || new Date()).toLocaleDateString('pt-BR')}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/preview/${form.id}`);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer"
                        title="Pré-visualizar questionário"
                      >
                        <Eye size={13} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/builder/${form.id}?tab=responses`);
                        }}
                        className="inline-flex items-center space-x-1 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Ver respostas e diagnóstico IMAPS"
                      >
                        <BarChart3 size={13} />
                        <span>Respostas</span>
                      </button>

                      <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 pl-1">
                        Editar <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Card Interativo para Criar Novo Questionário */}
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="group min-h-[210px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-white/50 hover:bg-indigo-50/20 p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-3 shadow-2xs">
                <Plus size={24} />
              </div>
              <span className="font-bold text-sm sm:text-base text-slate-700 group-hover:text-indigo-700 transition-colors">
                Criar Novo Questionário
              </span>
              <span className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Adicione um novo formulário em branco Público ou Privado
              </span>
            </button>
          </div>
        )}
      </main>

        {/* Modal de Criação de Formulário com Opção Público / Privado */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-3 mb-5">
                <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Criar Novo Questionário</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Configure o título e a privacidade de acesso do formulário.</p>
                </div>
              </div>

              <form onSubmit={handleExecuteCreate} className="space-y-5">
                {/* Título */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Título do Questionário
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newFormTitle}
                    onChange={(e) => setNewFormTitle(e.target.value)}
                    placeholder="Ex: Diagnóstico de Maturidade"
                    className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all"
                  />
                </div>

                {/* Visibilidade (Público vs Privado) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Privacidade & Acesso
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opção Público */}
                    <div 
                      onClick={() => setNewFormVisibility('public')}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        newFormVisibility === 'public'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <div className={`p-1.5 rounded-lg ${newFormVisibility === 'public' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Globe size={18} />
                        </div>
                        <span className="font-bold text-sm text-slate-800">Público</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Qualquer pessoa com o link pode acessar e responder livremente.
                      </p>
                    </div>

                    {/* Opção Privado */}
                    <div 
                      onClick={() => setNewFormVisibility('private')}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        newFormVisibility === 'private'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <div className={`p-1.5 rounded-lg ${newFormVisibility === 'private' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Lock size={18} />
                        </div>
                        <span className="font-bold text-sm text-slate-800">Privado</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Exige um token / código para que o respondente possa abrir o formulário.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detalhes do Token Privado */}
                {newFormVisibility === 'private' && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Key size={14} className="text-amber-600" />
                        <span>Código / Token de Acesso Gerado:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewFormAccessToken(generateAccessToken())}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                        title="Gerar outro código aleatório"
                      >
                        <RefreshCw size={12} />
                        <span>Gerar outro</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newFormAccessToken}
                      onChange={(e) => setNewFormAccessToken(e.target.value.toUpperCase())}
                      placeholder="Ex: GT-4821"
                      className="w-full font-mono text-center font-bold tracking-widest text-base sm:text-lg text-slate-800 bg-white border border-amber-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 outline-none uppercase shadow-inner"
                    />

                    <p className="text-[11px] text-amber-800 leading-tight">
                      🔒 Ao abrir o link, uma janela solicitará esse código para liberar o questionário. Você poderá alterá-lo ou consultá-lo no editor quando quiser.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || (newFormVisibility === 'private' && !newFormAccessToken.trim())}
                    className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span>{isCreating ? 'Criando...' : 'Criar Questionário'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Bonito de Confirmação de Exclusão */}
        {formToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center">
                {formToDelete.is_shared ? 'Remover da sua lista?' : 'Excluir Questionário?'}
              </h3>
              <p className="text-sm text-slate-500 text-center mt-2 leading-relaxed">
                Você tem certeza que deseja {formToDelete.is_shared ? 'remover' : 'excluir'} o questionário <strong className="text-slate-800">"{formToDelete.title}"</strong>?
              </p>
              <div className={`mt-2 p-3 rounded-lg text-xs text-center border ${formToDelete.is_shared ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {formToDelete.is_shared 
                  ? 'O formulário será removido apenas da sua visualização e continuará ativo para o criador.' 
                  : 'Esta ação apagará permanentemente todas as perguntas e respostas recebidas.'}
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setFormToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(false)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-70 cursor-pointer"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    <span>{isDeleting ? 'Processando...' : (formToDelete.is_shared ? 'Remover da Lista' : 'Sim, Excluir')}</span>
                  </button>
                </div>
                {formToDelete.is_shared && (
                  <button
                    onClick={() => handleConfirmDelete(true)}
                    disabled={isDeleting}
                    className="w-full py-2 px-4 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Excluir permanentemente do banco de dados para todos
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Modal Bonito de Importar Template */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isPasscodeRequired ? 'bg-amber-50 text-amber-600 ring-4 ring-amber-50' : 'bg-indigo-50 text-indigo-600'}`}>
                {isPasscodeRequired ? <Lock size={24} /> : <Download size={24} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 text-center">
                {isPasscodeRequired ? "Template Privado Protegido" : "Importar Template"}
              </h3>
              <p className="text-sm text-slate-500 text-center mt-1.5 leading-relaxed">
                {isPasscodeRequired 
                  ? targetTemplateTitle 
                    ? `O questionário "${targetTemplateTitle}" é privado e exige um código de acesso para clonagem:` 
                    : "Este template é privado e exige o código de acesso para clonagem:"
                  : "Cole o token ou o link completo do questionário que você recebeu para criar uma cópia na sua conta."}
              </p>

              <form onSubmit={handleExecuteImport} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Token ou Link do Template
                  </label>
                  <input
                    type="text"
                    autoFocus={!isPasscodeRequired}
                    placeholder="Cole aqui o token ou link..."
                    value={importTokenInput}
                    onChange={(e) => {
                      setImportTokenInput(e.target.value);
                      if (importError) setImportError(null);
                    }}
                    className="w-full text-sm text-slate-900 bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all shadow-inner font-mono"
                  />
                </div>

                {isPasscodeRequired && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Key size={12} />
                      <span>Código de Acesso (Token de Proteção)</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ex: GT-A1B2"
                      value={importPasscodeInput}
                      onChange={(e) => {
                        setImportPasscodeInput(e.target.value.toUpperCase());
                        if (importError) setImportError(null);
                      }}
                      className="w-full uppercase font-mono tracking-widest text-center text-base font-bold text-slate-800 bg-amber-50/50 border-2 border-amber-300 focus:border-amber-500 focus:bg-white rounded-xl py-2.5 px-3.5 outline-none transition-all shadow-inner placeholder:font-normal placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
                    />
                  </div>
                )}

                {importError && (
                  <p className="text-xs text-red-600 font-medium pl-1 flex items-center gap-1">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{importError}</span>
                  </p>
                )}

                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsImportModalOpen(false); setImportError(null); setIsPasscodeRequired(false); }}
                    disabled={isImporting}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-70"
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span>{isImporting ? 'Importando...' : 'Importar e Abrir'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      <footer className="border-t border-slate-200/70 bg-white/60 py-4 px-4 text-center text-xs text-slate-400">
        QuestLink Builder • Plataforma de Diagnóstico e Questionários Inteligentes
      </footer>
    </div>
  );
}
