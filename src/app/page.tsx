"use client";

import React, { useState, useEffect } from "react";
import { getForms, createEmptyForm, cloneFormByToken } from "../lib/api";
import { Form } from "../types/form";
import { Plus, FileText, Loader2, ArrowRight, Save, Download, FileCode, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Meus Formulários</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">Gerencie os questionários de Maturidade e Interoperabilidade.</p>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button 
              onClick={handleImportToken}
              disabled={isImporting}
              className="flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 sm:py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <Download size={18} />
              <span>Importar Template</span>
            </button>

            <button 
              onClick={handleCreateNew}
              disabled={isCreating}
              className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span>Criar Novo Formulário</span>
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium shadow-sm transition-all w-full sm:w-auto"
              title="Encerrar sessão"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {forms.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-indigo-50 p-4 rounded-full text-indigo-500 mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Nenhum formulário encontrado</h3>
            <p className="text-slate-500 mt-2 max-w-sm">Você ainda não possui formulários criados. Comece criando o seu primeiro questionário.</p>
            <button 
              onClick={handleCreateNew}
              className="mt-6 text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
            >
              Criar Formulário Agora →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map(form => (
              <div 
                key={form.id} 
                onClick={() => router.push(`/builder/${form.id}`)}
                className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-700 transition-colors">{form.title}</h3>
                <p className="text-xs text-slate-400 mt-auto">Atualizado em {new Date(form.updated_at || form.created_at || new Date()).toLocaleDateString('pt-BR')}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Editar formulário</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
