"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { Form, Section, Question } from "../../../types/form";
import { getFormById } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { Loader2, ChevronRight, ChevronLeft, Calendar, UploadCloud, FileText, Headphones, Video, MessageSquare } from "lucide-react";
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
    const { isValid, missingIds } = validateCurrentSection();
    if (!isValid) {
      setUnansweredIds(missingIds);
      const firstEl = document.getElementById(`prev_q_${missingIds[0]}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.warning("Por favor, preencha todas as perguntas obrigatórias antes de prosseguir.", "Campos Obrigatórios");
      return;
    }
    setUnansweredIds([]);
    
    if (activeSectionIndex === sections.length - 1) {
      toast.success("Pré-visualização concluída! Em produção, as respostas serão gravadas no banco.", "Fim da Pré-visualização");
    } else {
      setActiveSectionIndex(prev => Math.min(sections.length - 1, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-indigo-600 text-white py-6 px-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Modo de Pré-visualização</span>
            <h1 className="text-2xl font-bold mt-1">{schema.title || "Formulário Sem Título"}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Progress Indicator */}
        {sections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
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
            <div className="bg-slate-50 border-b border-slate-200 p-6 sm:p-8 relative group/section">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 pr-8">{currentSection.title || `Seção ${activeSectionIndex + 1}`}</h2>
                  {schema?.settings?.show_estimated_time && (
                    <div className="mt-2 flex items-center gap-1 text-sm font-medium text-slate-500" title="Tempo estimado para esta seção">
                      ⏱️ ~{formatTime(calculateSectionTimeRaw(currentSection))}
                    </div>
                  )}
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
        {sections.length > 0 && (
          <div className="flex items-center justify-between mt-4 pb-12">
            <button
              onClick={() => setActiveSectionIndex(prev => Math.max(0, prev - 1))}
              disabled={activeSectionIndex === 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeSectionIndex === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm'}`}
            >
              <ChevronLeft size={20} />
              <span>Anterior</span>
            </button>
            <button
              onClick={handleNextSection}
              disabled={isCurrentSectionLocked}
              title={isCurrentSectionLocked ? "Assista ao vídeo para prosseguir" : ""}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${isCurrentSectionLocked ? 'bg-indigo-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
            >
              <span>{isCurrentSectionLocked ? 'Vídeo Bloqueado' : (activeSectionIndex === sections.length - 1 ? 'Enviar Formulário' : 'Próxima')}</span>
              {activeSectionIndex !== sections.length - 1 && <ChevronRight size={20} />}
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
