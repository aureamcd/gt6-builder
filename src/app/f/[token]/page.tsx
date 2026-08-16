"use client";

import React, { useState, useEffect, use } from "react";
import { Form, Section, Question } from "../../../types/form";
import { getFormByShareToken } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { Loader2, ChevronRight, ChevronLeft, Calendar, UploadCloud, FileText, Headphones, Video } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { token } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  useEffect(() => {
    async function checkAuthAndLoadForm() {
      try {
        // 1. Check Authentication (Opcional - podemos manter fechado ou aberto)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push(`/login?redirectTo=/f/${token}`);
          return;
        }

        // 2. Fetch from database using the token
        const dbData = await getFormByShareToken(token);
        if (dbData) {
          setSchema(dbData);
        } else {
          // Token inválido
          setSchema(null);
        }
      } catch (error) {
        console.error("Erro ao carregar formulário:", error);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuthAndLoadForm();

  }, [token, router]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  if (!schema) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Formulário não encontrado ou link inválido.</div>;

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
    } else {
      alert("Formulário finalizado! (A gravação de respostas será implementada em breve)");
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Progress Indicator */}
        {sections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
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
                    />
                  )}
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
              disabled={activeSectionIndex === sections.length - 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeSectionIndex === sections.length - 1 ? 'bg-indigo-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
            >
              <span>Próxima</span>
              <ChevronRight size={20} />
            </button>
          </div>
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
