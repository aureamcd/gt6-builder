import React from "react";
import { Lock, Key, AlertCircle, ArrowRight } from "lucide-react";

interface PasscodeLockModalProps {
  title?: string;
  inputPasscode: string;
  setInputPasscode: (val: string) => void;
  passcodeError: string | null;
  setPasscodeError: (val: string | null) => void;
  onUnlock: (e?: React.FormEvent) => void;
}

export function PasscodeLockModal({
  title,
  inputPasscode,
  setInputPasscode,
  passcodeError,
  setPasscodeError,
  onUnlock
}: PasscodeLockModalProps) {
  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50 shadow-inner">
          <Lock size={32} />
        </div>

        <div className="text-center mb-6">
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full mb-3">
            <Key size={12} className="mr-1" /> Edição Colaborativa Privada
          </span>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-snug">
            {title || "Questionário Protegido"}
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Este formulário é privado. Para participar da edição simultânea e visualizar as perguntas, insira o código de acesso fornecido pelo proprietário:
          </p>
        </div>

        <form onSubmit={onUnlock} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Ex: GT-A1B2"
                value={inputPasscode}
                onChange={(e) => {
                  setInputPasscode(e.target.value.toUpperCase());
                  if (passcodeError) setPasscodeError(null);
                }}
                className="w-full uppercase font-mono tracking-widest text-center text-lg font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl py-3 px-4 outline-none transition-all shadow-inner placeholder:font-normal placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
              />
            </div>
            {passcodeError && (
              <div className="flex items-center space-x-1.5 text-xs text-red-600 font-medium mt-2 pl-1">
                <AlertCircle size={14} className="shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            <span>Desbloquear Edição</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <a
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Voltar para Meus Formulários
          </a>
        </div>
      </div>
    </div>
  );
}

