"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { Form, Section, Question } from "../../../types/form";
import { getFormByShareToken, submitFormResponse } from "../../../lib/api";
import { supabase, getFriendlyErrorMessage } from "../../../lib/supabase";
import { useToast } from "../../../context/ToastContext";
import { Loader2, ChevronRight, ChevronLeft, Calendar, UploadCloud, FileText, Headphones, Video, Lock, Key, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import QuestionRenderer from "../../../components/QuestionRenderer";
import { QuestLinkLogo } from "../../../components/QuestLinkLogo";
import { generateConsolidatedMaturityReport } from "../../../lib/maturityAnalytics";
import { RespondentMaturitySummaryCard } from "../../../components/MaturityAnalyticsSection";

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

          // Restaurar rascunho salvo localmente (respostas, seção atual e vídeos já desbloqueados)
          let restoredLocked = initialLocked;
          if (typeof window !== 'undefined') {
            try {
              const savedDraftRaw = localStorage.getItem(`gt6_draft_${dbData.id}`);
              if (savedDraftRaw) {
                const savedDraft = JSON.parse(savedDraftRaw);
                if (savedDraft && typeof savedDraft === 'object') {
                  if (savedDraft.answers && typeof savedDraft.answers === 'object') {
                    setAnswers(savedDraft.answers);
                  }
                  if (typeof savedDraft.activeSectionIndex === 'number' && dbData.sections) {
                    const validIdx = Math.max(0, Math.min(dbData.sections.length - 1, savedDraft.activeSectionIndex));
                    setActiveSectionIndex(validIdx);
                  }
                  if (savedDraft.lockedVideos && typeof savedDraft.lockedVideos === 'object') {
                    restoredLocked = { ...initialLocked };
                    Object.keys(savedDraft.lockedVideos).forEach(k => {
                      if (savedDraft.lockedVideos[k] === false) {
                        restoredLocked[k] = false;
                      }
                    });
                  }
                }
              }
            } catch (e) {
              // ignore draft parse errors
            }
          }
          setLockedVideos(restoredLocked);
          
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

  // Auto-save do rascunho do respondente no localStorage
  useEffect(() => {
    if (!schema || hasSubmitted || isLoading) return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`gt6_draft_${schema.id}`, JSON.stringify({
          answers,
          activeSectionIndex,
          lockedVideos,
          updatedAt: Date.now()
        }));
      } catch (e) {
        // ignore storage quota errors
      }
    }
  }, [answers, activeSectionIndex, lockedVideos, schema, hasSubmitted, isLoading]);

  const handleUnlockPrivateForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!schema || !schema.settings?.access_token) return;

    const expectedToken = schema.settings.access_token.trim().toUpperCase();
    const enteredToken = inputPasscode.trim().toUpperCase();

    if (enteredToken === expectedToken) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`gt6_respondent_token_${schema.id}`, expectedToken);
        try {
          localStorage.setItem(`gt6_respondent_token_${schema.id}`, expectedToken);
        } catch (e) {}
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
          <div className="flex justify-center mb-5">
            <QuestLinkLogo size="md" subtitle="Diagnóstico & Formulários" />
          </div>
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-8 ring-amber-50/50 shadow-inner">
            <Lock size={28} />
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
              Ambiente Seguro • QuestLink
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sections = schema.sections || [];
  const currentSection = sections[activeSectionIndex];

  const isAnswerableQuestion = (q: Question) =>
    !['DYNAMIC_REPEATER', 'MEDIA_VIDEO', 'MEDIA_IMAGE', 'MEDIA_AUDIO', 'TEXT_MARKDOWN', 'CONDITIONAL_LOGIC'].includes(q.type);

  const isQuestionConditionallySkipped = (q: Question, sectionQuestions: Question[]) => {
    // Se a pergunta for "Para que você utiliza esses meios?" e a anterior ("Você utiliza outros meios...") tiver sido respondida com "Nunca"
    if (q.label && q.label.toLowerCase().includes('para que você utiliza esses meios')) {
      const qIdx = sectionQuestions.findIndex(item => item.id === q.id);
      if (qIdx > 0) {
        const prevQ = sectionQuestions[qIdx - 1];
        const prevAns = answers[prevQ.id];
        if (prevAns) {
          const selectedOpt = prevQ.options?.find(o => o.id === prevAns);
          if (selectedOpt && selectedOpt.label.trim().toLowerCase() === 'nunca') {
            return true;
          }
        }
      }
    }
    return false;
  };

  const answerableQuestions = sections.flatMap(sec => (sec.questions || []).filter(isAnswerableQuestion));
  const totalQuestions = answerableQuestions.length;
  
  const answeredQuestionsCount = answerableQuestions.filter(q => {
    const val = answers[q.id];
    if (q.type === 'GRID_LIKERT') {
      const rows = q.sub_question_template?.sub_questions || [];
      if (rows.length === 0) return Boolean(val && Object.keys(val).length > 0);
      return Boolean(val && typeof val === 'object' && rows.every((r: any) => val[r.id] !== undefined && val[r.id] !== null && val[r.id] !== ''));
    }
    if (Array.isArray(val)) return val.length > 0;
    return val !== undefined && val !== null && val !== '';
  }).length;

  const progressPercentage = totalQuestions > 0 ? Math.min(100, Math.round((answeredQuestionsCount / totalQuestions) * 100)) : 0;

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
      if (isQuestionConditionallySkipped(q, currentSection.questions)) {
        continue;
      }

      if (q.type === 'DYNAMIC_REPEATER') {
        const triggerValue = answers?.[q.trigger_source_question_id || ''];
        if (triggerValue && (!Array.isArray(triggerValue) || triggerValue.length > 0)) {
          const selectedValues = Array.isArray(triggerValue) ? triggerValue : [triggerValue];
          const subQuestions = q.sub_question_template?.sub_questions || [];
          for (const val of selectedValues) {
            for (const subQ of subQuestions) {
              if (!subQ.required) continue;
              if (subQ.depends_on_id && subQ.depends_on_label) {
                const depAnswerKey = `${q.id}_${val}_${subQ.depends_on_id}`;
                const depAnswerValue = answers?.[depAnswerKey];
                const depSubQ = subQuestions.find((sq: any) => sq.id === subQ.depends_on_id);
                const depValues = Array.isArray(depAnswerValue) ? depAnswerValue : [depAnswerValue];
                const hasMatchingLabel = depValues.some((v: any) => {
                  if (!v) return false;
                  if (typeof v === 'string' && v.startsWith('other:')) {
                    return v.replace('other:', '').toLowerCase().trim() === subQ.depends_on_label.toLowerCase().trim();
                  }
                  const opt = depSubQ?.options?.find((o: any) => o.id === v);
                  return opt?.label?.toLowerCase().trim() === subQ.depends_on_label.toLowerCase().trim();
                });
                if (!hasMatchingLabel) continue;
              }
              const subKey = `${q.id}_${val}_${subQ.id}`;
              const subVal = answers?.[subKey];
              const isSubMissing = subVal === undefined || subVal === null || subVal === '' || (Array.isArray(subVal) && subVal.length === 0);
              if (isSubMissing) {
                missingIds.push(subKey);
              }
            }
          }
        }
        continue;
      }

      if (q.required) {
        const val = answers[q.id];
        if (q.type === 'GRID_LIKERT') {
          const rows = q.sub_question_template?.sub_questions || [];
          const isGridMissing = !val || typeof val !== 'object' || rows.some((r: any) => !val[r.id]);
          if (isGridMissing) {
            missingIds.push(q.id);
          }
        } else {
          const isMissing = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
          if (isMissing) {
            missingIds.push(q.id);
          }
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
      const firstId = missingIds[0];
      const firstEl = document.getElementById(`q_wrapper_${firstId}`) || document.getElementById(`q_wrapper_${firstId.split('_')[0]}`);
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
      const firstId = missingIds[0];
      const firstEl = document.getElementById(`q_wrapper_${firstId}`) || document.getElementById(`q_wrapper_${firstId.split('_')[0]}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.warning("Por favor, preencha todos os campos obrigatórios (*) antes de finalizar.", "Campos Obrigatórios");
      return;
    }
    setUnansweredIds([]);

    setIsSubmitting(true);
    try {
      const allQuestions = sections.flatMap(s => s.questions || []);
      const validQuestionIds = new Set(allQuestions.map(q => q.id));
      const repeaterQuestions = allQuestions.filter(q => q.type === 'DYNAMIC_REPEATER');

      const directAnswers: { question_id: string; answer_text: string | null; answer_json: any }[] = [];
      const repeaterGrouped: Record<string, Record<string, Record<string, any>>> = {};

      Object.keys(answers).forEach(key => {
        const val = answers[key];
        if (val === undefined || val === null || val === '') return;

        if (validQuestionIds.has(key)) {
          directAnswers.push({
            question_id: key,
            answer_text: typeof val === 'string' ? val : null,
            answer_json: typeof val === 'string' ? null : val
          });
          return;
        }

        // Verificar se a chave pertence a um DYNAMIC_REPEATER: `${repeaterQ.id}_${optVal}_${subQ.id}`
        const matchingRepeater = repeaterQuestions.find(rq => key.startsWith(`${rq.id}_`));
        if (matchingRepeater) {
          const rest = key.slice(matchingRepeater.id.length + 1);
          const subQuestions = matchingRepeater.sub_question_template?.sub_questions || [];
          const matchingSubQ = subQuestions.find((sq: any) => rest.endsWith(`_${sq.id}`));
          if (matchingSubQ) {
            const optVal = rest.slice(0, rest.length - matchingSubQ.id.length - 1);
            if (!repeaterGrouped[matchingRepeater.id]) {
              repeaterGrouped[matchingRepeater.id] = {};
            }
            if (!repeaterGrouped[matchingRepeater.id][optVal]) {
              repeaterGrouped[matchingRepeater.id][optVal] = {};
            }
            repeaterGrouped[matchingRepeater.id][optVal][matchingSubQ.id] = val;
          }
        }
      });

      Object.entries(repeaterGrouped).forEach(([repeaterId, groupedVal]) => {
        directAnswers.push({
          question_id: repeaterId,
          answer_text: null,
          answer_json: groupedVal
        });
      });
      
      const res = await submitFormResponse(schema.id, directAnswers);
      
      if (res.success) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`gt6_draft_${schema.id}`);
          } catch (e) {}
        }
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
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      {/* Top Navbar Limpa e Clara */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <QuestLinkLogo size="sm" />
            <span className="hidden sm:inline-block h-4 w-px bg-slate-200" />
            <span className="hidden sm:inline-block text-xs sm:text-sm font-semibold text-slate-700 truncate max-w-xs md:max-w-md">
              {schema.title || "Formulário"}
            </span>
          </div>

          {!hasSubmitted && sections.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {schema?.settings?.show_estimated_time && totalTimeSeconds > 0 && (
                <span
                  className="hidden md:inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium"
                  title="Tempo estimado para todo o formulário"
                >
                  ⏱️ ~{formatTime(totalTimeSeconds)}
                </span>
              )}
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
                <span>Etapa {activeSectionIndex + 1}/{sections.length}</span>
                <span className="text-indigo-300">•</span>
                <span>{progressPercentage}%</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {hasSubmitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center my-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Respostas Enviadas!</h2>
            <p className="text-slate-500 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              Muito obrigado por sua participação. Suas respostas foram registradas com segurança.
            </p>
            <RespondentMaturitySummaryCard
              result={generateConsolidatedMaturityReport(schema, [{ id: "current", answers }]).bySubmission.get("current") || null}
            />
          </div>
        ) : (
          <>
            {/* Section Content Card Unificado */}
            {currentSection ? (
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden relative">
                {/* Filete Gradiente Superior */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />

                {/* Faixa de Progresso e Contexto do Questionário Integrada no Topo do Card */}
                <div className="px-6 sm:px-8 pt-5 pb-4 bg-slate-50/60 border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
                        Etapa {activeSectionIndex + 1} de {sections.length}
                      </span>
                      {schema?.settings?.show_estimated_time && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-white border border-slate-200/70 px-2.5 py-0.5 rounded-full" title="Tempo estimado para esta seção">
                          ⏱️ ~{formatTime(calculateSectionTimeRaw(currentSection))} nesta seção
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      <strong className="text-slate-700 font-semibold">{answeredQuestionsCount}</strong> de{" "}
                      <strong className="text-slate-700 font-semibold">{totalQuestions}</strong> respondidas ({progressPercentage}%)
                    </div>
                  </div>
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Cabeçalho da Seção Atual */}
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {schema.title || "Questionário"}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {currentSection.title || `Seção ${activeSectionIndex + 1}`}
                  </h1>

                  {currentSection.description && (
                    <div className="mt-4 p-4 bg-indigo-50/45 border border-indigo-100 rounded-xl text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
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
              <div className="p-10 sm:p-12 text-center flex flex-col items-center justify-center bg-white">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
                  <Video size={28} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Assista ao vídeo para liberar as perguntas</h3>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
                  As perguntas desta etapa serão exibidas automaticamente após você assistir ao vídeo de orientação acima (mínimo de {currentSection.unlock_at_seconds}s).
                </p>
              </div>
            ) : (
              <div className="p-4 sm:p-8 space-y-8 sm:space-y-10">
                {(!currentSection.questions || currentSection.questions.length === 0) && (
                  <div className="text-center text-slate-500 py-8">Nenhuma pergunta nesta seção.</div>
                )}
              {currentSection.questions?.map((q, qIndex) => {
                if (isQuestionConditionallySkipped(q, currentSection.questions || [])) {
                  return null;
                }
                return (
                  <QuestionRenderer 
                    key={q.id} 
                    question={q} 
                    number={qIndex + 1} 
                    value={answers[q.id]}
                    hasError={unansweredIds.includes(q.id)}
                    unansweredIds={unansweredIds}
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
                );
              })}
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
              title={isCurrentSectionLocked ? "Assista ao vídeo acima para liberar o avanço" : ""}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-7 py-3 rounded-xl font-semibold transition-colors ml-auto ${isCurrentSectionLocked ? 'bg-slate-200 text-slate-500 border border-slate-300/80 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm cursor-pointer'}`}
            >
              {isCurrentSectionLocked && <Lock size={16} className="shrink-0" />}
              <span>{isCurrentSectionLocked ? 'Assista ao vídeo para avançar' : 'Próxima Seção'}</span>
              {!isCurrentSectionLocked && <ChevronRight size={18} />}
            </button>
          ) : (
            <button 
              onClick={handleSubmitResponse}
              disabled={isSubmitting || isCurrentSectionLocked}
              title={isCurrentSectionLocked ? "Assista ao vídeo acima para liberar o envio" : ""}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-7 py-3.5 rounded-xl font-bold transition-colors ml-auto ${isCurrentSectionLocked ? 'bg-slate-200 text-slate-500 border border-slate-300/80 cursor-not-allowed' : (isSubmitting ? 'bg-indigo-400 text-white cursor-wait' : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200 cursor-pointer')}`}
            >
              {isCurrentSectionLocked && <Lock size={16} className="shrink-0" />}
              <span>{isCurrentSectionLocked ? 'Assista ao vídeo para finalizar' : (isSubmitting ? 'Enviando...' : 'Finalizar e Enviar Respostas')}</span>
            </button>
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
}
