"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { Form, Section, Question } from "../../../types/form";
import { getFormById } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { Loader2, ChevronRight, ChevronLeft, Calendar, UploadCloud, FileText, Headphones, Video, MessageSquare, ArrowLeft, Eye, Info, CheckCircle2, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import CommentsPanel from "../../../components/CommentsPanel";
import QuestionRenderer from "../../../components/QuestionRenderer";

import { useToast } from "../../../context/ToastContext";

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

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [unansweredIds, setUnansweredIds] = useState<string[]>([]);
  const [activeCommentElement, setActiveCommentElement] = useState<{id: string, title: string} | null>(null);
  const [lockedVideos, setLockedVideos] = useState<Record<string, boolean>>({});
  const maxTimeRef = useRef<Record<string, number>>({});

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setUnansweredIds(prev => prev.filter(qId => qId !== questionId));
  };

  useEffect(() => {
    async function checkAuthAndLoadForm() {
      try {
        // 1. Check Authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push(`/login?redirectTo=/preview/${id}`);
          return;
        }

        // 2. Try to load from sessionStorage first (for live sync)
        const localData = typeof window !== 'undefined' ? sessionStorage.getItem(`form_preview_${id}`) : null;
        let formToUse = null;

        if (localData) {
          formToUse = JSON.parse(localData);
          setSchema(formToUse);
        } else {
          // Fallback to database
          const dbData = await getFormById(id);
          if (dbData) {
            formToUse = dbData;
            setSchema(dbData);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(`form_preview_${id}`, JSON.stringify(dbData));
            }
          }
        }

        // Initialize locked videos
        if (formToUse) {
          const initialLocked: Record<string, boolean> = {};
          formToUse.sections?.forEach((sec: Section) => {
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
        }
      } catch (error) {
        console.error("Erro ao carregar preview:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuthAndLoadForm();
  }, [id]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  if (!schema) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Formulário não encontrado para preview.</div>;

  const sections = schema.sections || [];
  const currentSection = sections[activeSectionIndex];

  const isAnswerableQuestion = (q: Question) =>
    !['DYNAMIC_REPEATER', 'MEDIA_VIDEO', 'MEDIA_IMAGE', 'MEDIA_AUDIO', 'TEXT_MARKDOWN', 'CONDITIONAL_LOGIC'].includes(q.type);

  const isQuestionConditionallySkipped = (q: Question, sectionQuestions: Question[]) => {
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
    const { isValid, missingIds } = validateCurrentSection();
    if (!isValid) {
      setUnansweredIds(missingIds);
      const firstId = missingIds[0];
      const firstEl = document.getElementById(`q_wrapper_${firstId}`) || document.getElementById(`q_wrapper_${firstId.split('_')[0]}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.warning("Por favor, preencha todas as perguntas obrigatórias antes de prosseguir.", "Campos Obrigatórios");
      return;
    }
    setUnansweredIds([]);
    
    if (activeSectionIndex === sections.length - 1) {
      toast.success("Simulação finalizada! Nenhuma resposta foi gravada no banco de dados. Redirecionando para o editor...", "Fim da Pré-visualização");
      setTimeout(() => {
        router.push(`/builder/${id}`);
      }, 1500);
    } else {
      setActiveSectionIndex(prev => Math.min(sections.length - 1, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800">
      {/* Header Claro e Limpo */}
      <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Início (Esquerda): Menu Principal */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-slate-200 cursor-pointer"
              title="Ir para o menu principal de formulários"
            >
              <Home size={15} />
              <span>Menu Principal</span>
            </button>
          </div>

          {/* Centro: Badge de Status */}
          <div className="flex items-center">
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-xs text-indigo-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold">Pré-visualização</span>
              <span className="hidden sm:inline text-indigo-600/80 border-l border-indigo-200 pl-2 text-[11px]">Respostas não são salvas</span>
            </div>
          </div>

          {/* Canto (Direita): Voltar para a Edição */}
          <div className="flex items-center">
            <button
              onClick={() => router.push(`/builder/${id}`)}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Voltar para a edição do formulário"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Editor</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Section Content Unificado */}
        {currentSection ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden relative">
            {/* Filete Gradiente Superior */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />

            {/* Faixa de Progresso e Etapa no Topo do Card */}
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

            {/* Section Header & Context Card */}
            <div className="bg-white border-b border-slate-100 p-6 sm:p-8 relative group/section">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {schema.title || "Formulário Sem Título"}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 pr-8 tracking-tight">
                    {currentSection.title || `Seção ${activeSectionIndex + 1}`}
                  </h1>
                </div>
                <button 
                  onClick={() => setActiveCommentElement({ id: currentSection.id, title: currentSection.title || `Seção ${activeSectionIndex + 1}` })}
                  className="opacity-0 group-hover/section:opacity-100 p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-all absolute right-6 top-6"
                  title="Comentar nesta seção"
                >
                  <MessageSquare size={20} />
                </button>
              </div>
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
                    renderCommentButton={(questionId, questionLabel) => (
                      <button 
                        onClick={() => setActiveCommentElement({ id: questionId, title: questionLabel })}
                        className="opacity-0 group-hover/question:opacity-100 p-1.5 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-all absolute -right-2 top-0"
                        title="Comentar nesta pergunta"
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
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
        {sections.length > 0 ? (
          <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pb-12">
            <button
              onClick={() => setActiveSectionIndex(prev => Math.max(0, prev - 1))}
              disabled={activeSectionIndex === 0}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeSectionIndex === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed hidden sm:flex opacity-0 pointer-events-none' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm'}`}
            >
              <ChevronLeft size={20} />
              <span>Anterior</span>
            </button>
            <button
              onClick={handleNextSection}
              disabled={isCurrentSectionLocked}
              title={isCurrentSectionLocked ? "Assista ao vídeo para prosseguir" : ""}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ml-auto ${isCurrentSectionLocked ? 'bg-indigo-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
            >
              {activeSectionIndex === sections.length - 1 && <CheckCircle2 size={18} />}
              <span>{isCurrentSectionLocked ? 'Vídeo Bloqueado' : (activeSectionIndex === sections.length - 1 ? 'Concluir Simulação' : 'Próxima')}</span>
              {activeSectionIndex !== sections.length - 1 && <ChevronRight size={20} />}
            </button>
          </div>
        ) : (
          <div className="mt-6 sm:mt-8 flex items-center justify-end pb-12">
            <button
              onClick={() => {
                toast.success("Simulação finalizada! Nenhuma resposta foi gravada no banco de dados. Redirecionando para o editor...", "Fim da Pré-visualização");
                setTimeout(() => {
                  router.push(`/builder/${id}`);
                }, 1500);
              }}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm cursor-pointer"
            >
              <CheckCircle2 size={18} />
              <span>Concluir Simulação</span>
            </button>
          </div>
        )}

      </main>
      
      {activeCommentElement && (
        <CommentsPanel 
          formId={schema.id}
          elementId={activeCommentElement.id}
          elementTitle={activeCommentElement.title}
          isEditorMode={false}
          onClose={() => setActiveCommentElement(null)}
        />
      )}
    </div>
  );
}
