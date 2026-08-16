"use client";

import React, { useState } from "react";
import { supabase, getFriendlyAuthError } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, AlertCircle, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      setMessage("Conta criada com sucesso! Redirecionando...");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setError(getFriendlyAuthError(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4 text-indigo-600">
              <UserPlus size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Criar Nova Conta</h1>
            <p className="text-slate-500 mt-2">Comece a construir seus questionários</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r text-sm flex items-start">
              <AlertCircle size={16} className="mt-0.5 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r text-sm">
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-slate-900 placeholder-slate-400"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha (mín. 6 caracteres)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors text-slate-900 placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSignUp}
                disabled={isLoading}
                className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Finalizar Cadastro
              </button>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Já tem uma conta? <a href="/login" className="text-indigo-600 font-medium hover:underline">Faça login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
