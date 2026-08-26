"use client";

import React, { useState, useEffect, use } from "react";
import { Form, Section, Question } from "../../../types/form";
import { getFormByShareToken, submitFormResponse } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { Loader2, ChevronRight, ChevronLeft, Calendar, UploadCloud, FileText, Headphones, Video, Lock, Key, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { token } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Private Form Passcode Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  useEffect(() => {
    async function loadForm() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch from database using the share token
        const dbData = await getFormByShareToken(token);
        if (dbData) {
          setSchema(dbData);
          
          // O dono nunca precisa do token; respondentes precisam digitar uma única vez
          const isOwner = session?.user && session.user.id === dbData.user_id;
          const isPrivate = dbData.settings?.visibility === 'private' && Boolean(dbData.settings?.access_token);
          
          if (isPrivate && !isOwner) {
            const expectedToken = dbData.settings?.access_token?.trim().toUpperCase();
            const storedToken = typeof window !== 'undefined' ? (
              localStorage.getItem(`gt6_respondent_token_${dbData.id}`) ||
              sessionStorage.getItem(`gt6_respondent_token_${dbData.id}`)
            ) : null;
            const alreadyVerified = Boolean(storedToken && storedToken === expectedToken);
            setIsUnlocked(alreadyVerified);
          } else {
            // Dono ou formulário público tem acesso livre imediato
            setIsUnlocked(true);
          }
        } else {
          setSchema(null);
        }
      } catch (error) {
        console.error("Erro ao carregar formulário:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadForm();
  }, [token]);

  const handleUnlockPrivateForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!schema || !schema.settings?.access_token) return;

    const expectedToken = schema.settings.access_token.trim().toUpperCase();
    const enteredToken = inputPasscode.trim().toUpperCase();

    if (enteredToken === expectedToken) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`gt6_respondent_token_${schema.id}`, expectedToken);
        sessionStorage.setItem(`gt6_respondent_token_${schema.id}`, expectedToken);
      }
      setIsUnlocked(true);
      setPasscodeError(null);
    } else {
      setPasscodeError("Código de acesso incorreto. Verifique e tente novamente.");
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  if (!schema) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Formulário não encontrado ou link inválido.</div>;

  // Se for formulário privado e ainda não foi desbloqueado com o token
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50 shadow-inner">
            <Lock size={32} />
          </div>

          <div className="text-center mb-6">
            <span className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full mb-3">
              <Key size={12} className="mr-1" /> Formulário Privado
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-snug">
              {schema.title || "Questionário Protegido"}
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Este formulário requer um código de acesso para ser respondido. Digite o token fornecido pelo autor abaixo:
            </p>
          </div>

          <form onSubmit={handleUnlockPrivateForm} className="space-y-4">
            <div>
              <input 
                type="text"
                autoFocus
                value={inputPasscode}
                onChange={(e) => {
                  setInputPasscode(e.target.value.toUpperCase());
                  if (passcodeError) setPasscodeError(null);
                }}
                placeholder="Ex: GT-4821"
                className="w-full font-mono text-center font-bold tracking-widest text-lg text-slate-900 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 outline-none uppercase transition-all shadow-inner"
              />
              {passcodeError && (
                <div className="flex items-center space-x-1.5 text-xs text-red-600 font-semibold mt-2 pl-1 animate-in fade-in">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputPasscode.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Acessar Questionário</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Ambiente Seguro • Plataforma de Maturidade GT6
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sections = schema.sections || [];
  const currentSection = sections[activeSectionIndex];

  const totalQuestions = sections.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0);
  
  const answeredQuestionsCount = Object.keys(answers).filter(key => {
    const val = answers[key];
    if (Array.isArray(val)) return val.length > 0;
    return val !== undefined && val !== null && val !== '';
  }).length;

  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestionsCount / totalQuestions) * 100) : 0;

  const validateCurrentSection = () => {
    if (!currentSection || !currentSection.questions) return true;
    for (const q of currentSection.questions) {
      if (q.required && q.type !== 'DYNAMIC_REPEATER') {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
      }
    }
    return true;
  };

  const handleNextSection = () => {
    if (!validateCurrentSection()) {
      alert("Por favor, responda todas as perguntas obrigatórias antes de prosseguir.");
      return;
    }
    if (activeSectionIndex < sections.length - 1) {
      setActiveSectionIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmitResponse = async () => {
    if (!validateCurrentSection()) {
      alert("Por favor, responda todas as perguntas obrigatórias antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const answersData = Object.keys(answers).map(questionId => {
        const val = answers[questionId];
        let answer_text = null;
        let answer_json = null;
        
        if (typeof val === 'string') {
          answer_text = val;
        } else {
          answer_json = val;
        }
        
        return { question_id: questionId, answer_text, answer_json };
      });
      
      const res = await submitFormResponse(schema.id, answersData);
      
      if (res.success) {
        setHasSubmitted(true);
        window.scrollTo(0, 0);
      } else {
        alert("Ocorreu um erro ao enviar suas respostas. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-indigo-600 text-white py-6 px-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mt-1">{schema.title || "Formulário"}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full p-4 flex-1 mt-6">
        {hasSubmitted ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
             </div>
             <h2 className="text-3xl font-bold text-slate-800 mb-4">Respostas Enviadas!</h2>
             <p className="text-slate-500 text-lg">Muito obrigado por sua participação. Suas respostas foram registradas com sucesso.</p>
          </div>
        ) : (
          <>
        
        {/* Progress Indicator */}
        {sections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 mb-6">
            <div className="flex items-center justify-between text-sm font-medium text-slate-500 mb-2">
              <span>{answeredQuestionsCount} de {totalQuestions} perguntas respondidas</span>
              <span>{progressPercentage}% concluído</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Section Content */}
        {currentSection ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Section Header & Context Card */}
            <div className="bg-slate-50 border-b border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-800">{currentSection.title || `Seção ${activeSectionIndex + 1}`}</h2>
              {currentSection.description && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 whitespace-pre-wrap">
                  {currentSection.description}
                </div>
              )}
            </div>

            {/* Questions List */}
            <div className="p-6 sm:p-8 space-y-10">
              {(!currentSection.questions || currentSection.questions.length === 0) && (
                <div className="text-center text-slate-500 py-8">Nenhuma pergunta nesta seção.</div>
              )}
              {currentSection.questions?.map((q, qIndex) => (
                <QuestionRenderer 
                  key={q.id} 
                  question={q} 
                  number={qIndex + 1} 
                  value={answers[q.id]}
                  onChange={(val) => handleAnswerChange(q.id, val)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500 border border-slate-200">
            Formulário sem seções configuradas.
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pb-12">
          <button 
            onClick={() => {
              setActiveSectionIndex(prev => prev - 1);
              window.scrollTo(0, 0);
            }}
            disabled={activeSectionIndex === 0}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${activeSectionIndex === 0 ? 'hidden sm:flex opacity-0 pointer-events-none' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            <ChevronLeft size={18} />
            <span>Voltar</span>
          </button>
          
          {activeSectionIndex < sections.length - 1 ? (
            <button 
              onClick={handleNextSection}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm ml-auto"
            >
              <span>Próxima Seção</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleSubmitResponse}
              disabled={isSubmitting}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl font-bold transition-colors ml-auto ${isSubmitting ? 'bg-indigo-400 text-white cursor-wait' : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200'}`}
            >
              <span>{isSubmitting ? 'Enviando...' : 'Finalizar e Enviar Respostas'}</span>
            </button>
          )}
        </div>

      </>
        )}
      </main>
    </div>
  );
}

// Helper component to render each question type in interactive mode for the preview
function QuestionRenderer({ question, number, value, onChange }: { question: Question, number: number, value: any, onChange: (val: any) => void }) {
  return (
    <div className="group">
      <div className="flex items-start mb-4">
        <span className="font-bold text-slate-400 mr-3 text-lg mt-0.5">{number}.</span>
        <label className="font-semibold text-slate-800 text-lg leading-snug">
          {question.label || "Pergunta sem título"}
          {question.required && <span className="text-red-500 ml-1" title="Obrigatório">*</span>}
        </label>
      </div>

      <div className="pl-7 sm:pl-9">
        {question.type === 'TEXT_SHORT' && (
          <input 
            type="text" 
            className="w-full sm:w-2/3 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder-slate-400" 
            placeholder="Sua resposta" 
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        
        {question.type === 'TEXT_LONG' && (
          <textarea 
            className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder-slate-400" 
            rows={4} 
            placeholder="Sua resposta" 
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )}

        {question.type === 'RADIO_SINGLE' && (
          <div className="space-y-3">
            {question.options?.map(opt => (
              <label key={opt.id} className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="radio" 
                  name={`q_${question.id}`} 
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" 
                  checked={value === opt.id}
                  onChange={() => onChange(opt.id)}
                />
                <span className="text-slate-700">{opt.label}</span>
              </label>
            ))}
            {question.allow_add_item && (
              <label className="flex items-center space-x-3 mt-4">
                <input 
                  type="radio" 
                  name={`q_${question.id}`} 
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" 
                  checked={value?.startsWith('other:')}
                  onChange={() => onChange('other:')}
                />
                <span className="text-slate-700">Outro:</span>
                <input 
                  type="text" 
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none px-2 py-1 flex-1 bg-transparent max-w-xs text-slate-900 placeholder-slate-400" 
                  value={value?.startsWith('other:') ? value.replace('other:', '') : ''}
                  onChange={(e) => onChange(`other:${e.target.value}`)}
                  onClick={() => { if (!value?.startsWith('other:')) onChange('other:'); }}
                />
              </label>
            )}
          </div>
        )}

        {question.type === 'CHECKBOX_MULTIPLE' && (
          <div className="space-y-3">
            {question.options?.map(opt => (
              <label key={opt.id} className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" 
                  checked={(value || []).includes(opt.id)}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    if (e.target.checked) onChange([...current, opt.id]);
                    else onChange(current.filter((v: string) => v !== opt.id));
                  }}
                />
                <span className="text-slate-700">{opt.label}</span>
              </label>
            ))}
            {question.allow_add_item && (
              <label className="flex items-center space-x-3 mt-4">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" 
                  checked={(value || []).some((v: string) => v.startsWith('other:'))}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    if (e.target.checked) onChange([...current, 'other:']);
                    else onChange(current.filter((v: string) => !v.startsWith('other:')));
                  }}
                />
                <span className="text-slate-700">Outro:</span>
                <input 
                  type="text" 
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none px-2 py-1 flex-1 bg-transparent max-w-xs text-slate-900 placeholder-slate-400"
                  value={Array.isArray(value) ? (value.find((v: string) => v.startsWith('other:'))?.replace('other:', '') || '') : ''}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    const filtered = current.filter((v: string) => !v.startsWith('other:'));
                    onChange([...filtered, `other:${e.target.value}`]);
                  }}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    if (!current.some((v: string) => v.startsWith('other:'))) onChange([...current, 'other:']);
                  }}
                />
              </label>
            )}
          </div>
        )}

        {question.type === 'DYNAMIC_REPEATER' && (
          <div className="space-y-4">
            {question.options?.map((opt: any) => {
              const isSelected = (value?.selected || []).includes(opt.id);
              return (
                <div key={opt.id} className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-indigo-300 ring-1 ring-indigo-300 shadow-sm' : 'border-slate-200'}`}>
                  <label className={`flex items-start sm:items-center space-x-3 p-4 cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/50' : 'bg-white'}`}>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer mt-0.5 sm:mt-0" 
                      checked={isSelected}
                      onChange={(e) => {
                        const current = value?.selected || [];
                        let newSelected;
                        if (e.target.checked) newSelected = [...current, opt.id];
                        else newSelected = current.filter((v: string) => v !== opt.id);
                        onChange({ ...value, selected: newSelected });
                      }}
                    />
                    <span className="text-slate-700 font-medium leading-snug">{opt.label}</span>
                  </label>
                  
                  {isSelected && question.sub_question_template?.sub_questions && (
                    <div className="p-4 sm:p-6 bg-white border-t border-slate-100 space-y-6">
                      {question.sub_question_template.sub_questions.map((subQ: any) => (
                        <div key={subQ.id}>
                          <label className="block font-semibold text-slate-800 text-sm mb-3">
                            {subQ.label}
                            {subQ.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          
                          {subQ.type === 'RADIO_SINGLE' && (
                            <div className="space-y-2">
                              {subQ.options?.map((subOpt: string) => (
                                <label key={subOpt} className="flex items-start sm:items-center space-x-3 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={`sq_${opt.id}_${subQ.id}`} 
                                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer mt-0.5 sm:mt-0" 
                                    checked={value?.answers?.[opt.id]?.[subQ.id] === subOpt}
                                    onChange={() => {
                                      const answers = value?.answers || {};
                                      const optAnswers = answers[opt.id] || {};
                                      onChange({
                                        ...value,
                                        answers: {
                                          ...answers,
                                          [opt.id]: {
                                            ...optAnswers,
                                            [subQ.id]: subOpt
                                          }
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-slate-600 text-sm leading-snug">{subOpt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {subQ.type === 'TEXT_SHORT' && (
                            <input 
                              type="text" 
                              className="w-full sm:w-2/3 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900"
                              value={value?.answers?.[opt.id]?.[subQ.id] || ''}
                              onChange={(e) => {
                                const answers = value?.answers || {};
                                const optAnswers = answers[opt.id] || {};
                                onChange({
                                  ...value,
                                  answers: {
                                    ...answers,
                                    [opt.id]: {
                                      ...optAnswers,
                                      [subQ.id]: e.target.value
                                    }
                                  }
                                });
                              }}
                            />
                          )}
                          
                          {subQ.type === 'DROPDOWN' && (
                            <select 
                              className="w-full sm:w-2/3 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-800"
                              value={value?.answers?.[opt.id]?.[subQ.id] || ''}
                              onChange={(e) => {
                                const answers = value?.answers || {};
                                const optAnswers = answers[opt.id] || {};
                                onChange({
                                  ...value,
                                  answers: {
                                    ...answers,
                                    [opt.id]: {
                                      ...optAnswers,
                                      [subQ.id]: e.target.value
                                    }
                                  }
                                });
                              }}
                            >
                              <option value="">Selecione...</option>
                              {subQ.options?.map((subOpt: string) => (
                                <option key={subOpt} value={subOpt}>{subOpt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {question.type === 'DROPDOWN' && (
          <select 
            className="w-full sm:w-2/3 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white text-slate-800 font-medium" 
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="" className="text-slate-500">Selecione uma opção...</option>
            {question.options?.map((opt: any) => (
              <option key={opt.id} value={opt.id} className="text-slate-800 font-medium">{opt.label}</option>
            ))}
          </select>
        )}
        {question.type === 'TEXT_MARKDOWN' && question.sub_question_template?.markdown_content && (
          <div className="mb-6 px-4 py-4 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap text-slate-700 font-medium">
            {question.sub_question_template.markdown_content}
          </div>
        )}

        {question.type === 'MEDIA_AUDIO' && (
          <div className="flex justify-center mb-6">
            {question.sub_question_template?.audio_url && (
               <audio src={question.sub_question_template.audio_url} controls className="w-full max-w-md shadow-sm rounded-full" />
            )}
          </div>
        )}

        {question.type === 'MEDIA_IMAGE' && (
          <div className="flex justify-center mb-6">
            {question.sub_question_template?.image_url && (
               <img src={question.sub_question_template.image_url} alt="Media" className="max-w-full rounded-lg shadow-sm max-h-[500px] object-contain border border-slate-200" />
            )}
          </div>
        )}

        {question.type === 'MEDIA_VIDEO' && (
          <div className="space-y-4">
            {question.video_url && (question.video_url.includes('youtube.com') || question.video_url.includes('youtu.be')) ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-xl shadow-md bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={question.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  title="Video Preview"
                  allowFullScreen
                />
              </div>
            ) : question.video_url && question.video_url.includes('supabase.co') ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-black">
                <video 
                  className="w-full max-h-[500px]"
                  src={question.video_url}
                  controls
                />
              </div>
            ) : (
              <div className="w-full max-w-2xl h-48 bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 border-dashed">
                <Video size={32} className="mb-2 text-slate-300" />
                <span>Vídeo não configurado ou link inválido</span>
              </div>
            )}
          </div>
        )}

        {question.type === 'DATE_TIME' && (
          <div className="relative w-max">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="datetime-local" 
              className="border border-slate-300 rounded-lg pl-10 pr-4 py-2 outline-none text-slate-900" 
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        )}

        {question.type === 'FILE_UPLOAD' && (
          <div className="w-full max-w-md border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50">
            <UploadCloud size={32} className="mb-3 text-indigo-400" />
            <span className="font-medium">Clique ou arraste arquivos para enviar</span>
            <span className="text-xs mt-1 text-slate-400">Suporta PDF, JPG, PNG (Max 10MB)</span>
          </div>
        )}

        {question.type === 'TEXT_MARKDOWN' && (
          <div className="prose prose-slate prose-indigo max-w-none bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-slate-500 italic">Bloco de texto markdown formatado aparecerá aqui.</p>
          </div>
        )}

      </div>
    </div>
  );
}
