"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { Form, Section, Question } from "../../../types/form";
import { getFormByShareToken, submitFormResponse } from "../../../lib/api";
import { supabase, getFriendlyErrorMessage } from "../../../lib/supabase";
import { useToast } from "../../../context/ToastContext";
import { Loader2, ChevronRight, ChevronLeft, Calendar, UploadCloud, FileText, Headphones, Video, Lock, Key, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import QuestionRenderer from "../../../components/QuestionRenderer";

const calculateSectionTimeRaw = (section: Section) => {
  let seconds = 0;
  if (section.video_url) {
    seconds += (section.unlock_at_seconds !== undefined && section.unlock_at_seconds !== null ? section.unlock_at_seconds : 60);
  }
  section.questions?.forEach(q => {
    switch(q.type) {
      case 'TEXT_SHORT': seconds += 15; break;
      case 'TEXT_LONG': seconds += 45; break;
      case 'RADIO_SINGLE': seconds += 10; break;
      case 'CHECKBOX_MULTIPLE': seconds += 15; break;
      case 'GRID_LIKERT': seconds += 30; break;
      case 'DROPDOWN': seconds += 10; break;
      case 'DATE_TIME': seconds += 15; break;
      case 'FILE_UPLOAD': seconds += 30; break;
      case 'MEDIA_VIDEO': seconds += (q.sub_question_template?.unlock_at_seconds !== undefined && q.sub_question_template?.unlock_at_seconds !== null ? q.sub_question_template.unlock_at_seconds : 60); break;
      case 'MEDIA_AUDIO': seconds += 30; break;
      case 'MEDIA_IMAGE': seconds += 10; break;
      case 'TEXT_MARKDOWN': seconds += 15; break;
      default: seconds += 10;
    }
  });
  return seconds;
};

const formatTime = (seconds: number) => {
  if (seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${mins}m ${remainingSecs > 0 ? remainingSecs + 's' : ''}`;
};

export default function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [unansweredIds, setUnansweredIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lockedVideos, setLockedVideos] = useState<Record<string, boolean>>({});
  const maxTimeRef = React.useRef<Record<string, number>>({});

  // Private Form Passcode Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setUnansweredIds(prev => prev.filter(id => id !== questionId));
  };

  useEffect(() => {
    async function loadForm() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch from database using the share token
        const dbData = await getFormByShareToken(token);
        if (dbData) {
          setSchema(dbData);

          const initialLocked: Record<string, boolean> = {};
          dbData.sections?.forEach((sec: Section) => {
            if (sec.unlock_at_seconds) {
              initialLocked[sec.id] = true;
            }
            sec.questions?.forEach((q: Question) => {
              if (q.type === 'MEDIA_VIDEO' && q.sub_question_template?.unlock_at_seconds) {
                initialLocked[q.id] = true;
              }
            });
          });
          setLockedVideos(initialLocked);
          
          // O dono nunca precisa do token; respondentes precisam digitar uma única vez
          const isOwner = session?.user && session.user.id === dbData.user_id;
          const isPrivate = dbData.settings?.visibility === 'private' && Boolean(dbData.settings?.access_token);
          
          if (isPrivate && !isOwner) {
            const expectedToken = dbData.settings?.access_token?.trim().toUpperCase();
            const storedToken = typeof window !== 'undefined' ? (
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

  const isCurrentSectionHidden = currentSection?.unlock_at_seconds ? lockedVideos[currentSection.id] : false;
  const isCurrentSectionLocked = isCurrentSectionHidden || (currentSection?.questions?.some(q => lockedVideos[q.id]) || false);

  const handleVideoTimeUpdate = (questionId: string, currentTime: number, unlockAt: number) => {
    if (lockedVideos[questionId] && currentTime >= unlockAt) {
      setLockedVideos(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const totalTimeSeconds = schema?.sections?.reduce((acc, sec) => acc + calculateSectionTimeRaw(sec), 0) || 0;

  const validateCurrentSection = () => {
    if (!currentSection || !currentSection.questions) return { isValid: true, missingIds: [] };
    const missingIds: string[] = [];
    for (const q of currentSection.questions) {
      if (q.required && q.type !== 'DYNAMIC_REPEATER') {
        const val = answers[q.id];
        const isMissing = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
        if (isMissing) {
          missingIds.push(q.id);
        }
      }
    }
    return { isValid: missingIds.length === 0, missingIds };
  };

  const handleNextSection = () => {
    if (isCurrentSectionLocked) {
      toast.warning("Por favor, assista ao vídeo explicativo até o tempo necessário para prosseguir.", "Vídeo Obrigatório");
      return;
    }

    const { isValid, missingIds } = validateCurrentSection();
    if (!isValid) {
      setUnansweredIds(missingIds);
      const firstEl = document.getElementById(`q_wrapper_${missingIds[0]}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.warning("Por favor, preencha todos os campos obrigatórios (*) antes de avançar.", "Campos Obrigatórios");
      return;
    }
    setUnansweredIds([]);
    if (activeSectionIndex < sections.length - 1) {
      setActiveSectionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitResponse = async () => {
    if (isCurrentSectionLocked) {
      toast.warning("Por favor, assista ao vídeo explicativo até o tempo necessário para prosseguir.", "Vídeo Obrigatório");
      return;
    }

    const { isValid, missingIds } = validateCurrentSection();
    if (!isValid) {
      setUnansweredIds(missingIds);
      const firstEl = document.getElementById(`q_wrapper_${missingIds[0]}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.warning("Por favor, preencha todos os campos obrigatórios (*) antes de finalizar.", "Campos Obrigatórios");
      return;
    }
    setUnansweredIds([]);

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
        toast.success("Suas respostas foram registradas com sucesso!", "Formulário Concluído");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(getFriendlyErrorMessage(res.error), "Erro no Envio");
      }
    } catch (error) {
      console.error(error);
      toast.error(getFriendlyErrorMessage(error), "Falha na Conexão");
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
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span>{answeredQuestionsCount} de {totalQuestions} perguntas respondidas</span>
                {schema?.settings?.show_estimated_time && totalTimeSeconds > 0 && (
                  <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs" title="Tempo estimado para todo o formulário">
                    ⏱️ ~{formatTime(totalTimeSeconds)} no total
                  </span>
                )}
              </div>
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
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{currentSection.title || `Seção ${activeSectionIndex + 1}`}</h2>
                {schema?.settings?.show_estimated_time && (
                  <div className="mt-2 flex items-center gap-1 text-sm font-medium text-slate-500" title="Tempo estimado para esta seção">
                    ⏱️ ~{formatTime(calculateSectionTimeRaw(currentSection))}
                  </div>
                )}
              </div>
              {currentSection.description && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 whitespace-pre-wrap">
                  {currentSection.description}
                </div>
              )}
              
              {currentSection.video_url && (
                <div className="mt-6 w-full max-w-3xl mx-auto overflow-hidden rounded-xl shadow-md bg-black">
                  {(currentSection.video_url.includes('youtube.com') || currentSection.video_url.includes('youtu.be')) ? (
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      <iframe 
                        className="absolute top-0 left-0 w-full h-full"
                        src={currentSection.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        title="Section Video"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video 
                      className="w-full max-h-[500px]"
                      src={currentSection.video_url}
                      controls
                      onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        const maxTime = maxTimeRef.current[currentSection.id] || 0;
                        if (video.currentTime > maxTime + 1) {
                          video.currentTime = maxTime;
                        } else if (video.currentTime > maxTime) {
                          maxTimeRef.current[currentSection.id] = video.currentTime;
                        }

                        if (currentSection.unlock_at_seconds) {
                          handleVideoTimeUpdate(currentSection.id, video.currentTime, currentSection.unlock_at_seconds);
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Questions List */}
            {isCurrentSectionHidden ? (
              <div className="p-12 text-center flex flex-col items-center justify-center bg-white">
                <Video size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-700">Perguntas Bloqueadas</h3>
                <p className="text-slate-500 mt-2 max-w-md">As perguntas desta seção estão ocultas. Assista ao vídeo explicativo acima até {currentSection.unlock_at_seconds} segundos para liberá-las.</p>
              </div>
            ) : (
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
                  hasError={unansweredIds.includes(q.id)}
                  onChange={(val) => handleAnswerChange(q.id, val)}
                  onAnswerChange={handleAnswerChange}
                  answers={answers}
                  schema={schema}
                  onVideoTimeUpdate={(time) => {
                    if (q.sub_question_template?.unlock_at_seconds) {
                      handleVideoTimeUpdate(q.id, time, q.sub_question_template.unlock_at_seconds);
                    }
                  }}
                />
              ))}
              </div>
            )}
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
              disabled={isCurrentSectionLocked}
              title={isCurrentSectionLocked ? "Assista ao vídeo para prosseguir" : ""}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 rounded-xl font-semibold transition-colors ml-auto ${isCurrentSectionLocked ? 'bg-indigo-400 text-white cursor-not-allowed opacity-75' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm cursor-pointer'}`}
            >
              <span>{isCurrentSectionLocked ? 'Vídeo Bloqueado' : 'Próxima Seção'}</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleSubmitResponse}
              disabled={isSubmitting || isCurrentSectionLocked}
              title={isCurrentSectionLocked ? "Assista ao vídeo para prosseguir" : ""}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl font-bold transition-colors ml-auto ${isCurrentSectionLocked ? 'bg-slate-400 text-white cursor-not-allowed opacity-75' : (isSubmitting ? 'bg-indigo-400 text-white cursor-wait' : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200 cursor-pointer')}`}
            >
              <span>{isCurrentSectionLocked ? 'Vídeo Bloqueado' : (isSubmitting ? 'Enviando...' : 'Finalizar e Enviar Respostas')}</span>
            </button>
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}
