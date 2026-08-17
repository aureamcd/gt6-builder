"use client";

import React, { useState, useEffect } from "react";
import { getForms, createEmptyForm, cloneFormByToken, deleteForm } from "../lib/api";
import { Form } from "../types/form";
import { Plus, FileText, Loader2, ArrowRight, Save, Download, FileCode, LogOut, BarChart3, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formToDelete, setFormToDelete] = useState<{ id: string, title: string, is_shared?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setUser(session.user);

        // Check if redirected with import_token query param
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const importToken = params.get('import_token');
          if (importToken) {
            setIsImporting(true);
            try {
              const newForm = await cloneFormByToken(importToken);
              if (newForm) {
                router.push(`/builder/${newForm.id}`);
                return;
              }
            } catch (err: any) {
              console.error("Erro ao clonar template:", err);
              alert("Erro ao importar questionário a partir do link: " + (err.message || "Token inválido"));
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
  }, [router]);

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      const newForm = await createEmptyForm("Novo Questionário GT6");
      router.push(`/builder/${newForm.id}`);
    } catch (error) {
      console.error("Erro ao criar formulário:", error);
      alert("Erro ao criar o formulário.");
      setIsCreating(false);
    }
  };

  const handleImportToken = async () => {
    const token = prompt("Insira o token ou link de compartilhamento do template:");
    if (!token) return;
    
    // Suporta tanto o token puro quanto a URL completa
    let cleanToken = token.trim();
    if (cleanToken.includes('import_token=')) {
      const url = new URL(cleanToken);
      cleanToken = url.searchParams.get('import_token') || cleanToken;
    } else if (cleanToken.includes('/f/')) {
      cleanToken = cleanToken.split('/f/')[1]?.split('?')[0] || cleanToken;
    }

    setIsImporting(true);
    try {
      const newForm = await cloneFormByToken(cleanToken);
      if (newForm) {
        alert("Template importado com sucesso! Redirecionando para o construtor...");
        router.push(`/builder/${newForm.id}`);
      }
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      alert("Erro ao importar formulário: " + (error.message || "Token inválido"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete) return;
    setIsDeleting(true);
    try {
      if (formToDelete.is_shared) {
        // Remover apenas da visualização local do usuário
        if (typeof window !== 'undefined') {
          const accessed: string[] = JSON.parse(localStorage.getItem('gt6_accessed_forms') || '[]');
          const updated = accessed.filter(id => id !== formToDelete.id);
          localStorage.setItem('gt6_accessed_forms', JSON.stringify(updated));
        }
      } else {
        // Excluir permanentemente do banco (é o autor original)
        await deleteForm(formToDelete.id);
      }
      setForms(prev => prev.filter(f => f.id !== formToDelete.id));
      setFormToDelete(null);
    } catch (err: any) {
      console.error("Erro ao remover formulário:", err);
      alert("Erro ao remover formulário: " + (err.message || "Erro inesperado"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Meus Formulários</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">Gerencie os questionários de Maturidade e Interoperabilidade.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button 
              onClick={handleImportToken}
              disabled={isImporting}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span>Importar Template</span>
            </button>

            <button 
              onClick={handleCreateNew}
              disabled={isCreating}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Criar Novo</span>
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-all"
              title="Encerrar sessão"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {forms.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="bg-indigo-50 p-4 rounded-full text-indigo-500 mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Nenhum formulário encontrado</h3>
            <p className="text-slate-500 mt-2 max-w-sm text-sm">Você ainda não possui formulários criados. Comece criando o seu primeiro questionário.</p>
            <button 
              onClick={handleCreateNew}
              className="mt-6 text-indigo-600 font-medium hover:text-indigo-800 transition-colors text-sm"
            >
              Criar Formulário Agora →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {forms.map(form => (
              <div 
                key={form.id} 
                onClick={() => router.push(`/builder/${form.id}`)}
                className="group bg-white rounded-xl border border-slate-200 p-5 sm:p-6 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg transition-colors ${form.is_shared ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                        <FileText size={20} />
                      </div>
                      {form.is_shared ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                          <Users size={11} />
                          <span>Compartilhado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          <span>Meu</span>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormToDelete({ id: form.id, title: form.title, is_shared: form.is_shared });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={form.is_shared ? "Remover da minha lista" : "Excluir formulário"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-700 transition-colors">{form.title}</h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-400">
                    {new Date(form.updated_at || form.created_at || new Date()).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/builder/${form.id}?tab=responses`);
                      }}
                      className="flex items-center space-x-1 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded-md transition-colors"
                      title="Ver respostas"
                    >
                      <BarChart3 size={13} />
                      <span>Respostas</span>
                    </button>
                    <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Editar <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
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

              <div className="mt-6 flex items-center justify-center space-x-3">
                <button
                  onClick={() => setFormToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-70"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>{isDeleting ? 'Removendo...' : (formToDelete.is_shared ? 'Sim, Remover' : 'Sim, Excluir')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
