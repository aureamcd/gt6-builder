"use client";

import React, { useState, useEffect } from "react";
import { getForms, createEmptyForm } from "../lib/api";
import { Form } from "../types/form";
import { Plus, FileText, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data = await getForms();
        setForms(data);
      } catch (error) {
        console.error("Erro ao carregar formulários:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Meus Formulários</h1>
            <p className="text-slate-500 mt-1">Gerencie os questionários de Maturidade e Interoperabilidade.</p>
          </div>
          <button 
            onClick={handleCreateNew}
            disabled={isCreating}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span>Criar Novo Formulário</span>
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
            <p>Carregando seus formulários...</p>
          </div>
        ) : forms.length === 0 ? (
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
                <p className="text-xs text-slate-400 mt-auto">Atualizado em {new Date(form.updated_at).toLocaleDateString('pt-BR')}</p>
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
