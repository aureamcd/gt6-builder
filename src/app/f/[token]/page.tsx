"use client";

import React, { useState, useEffect, use } from "react";
import { getFormById, submitFormResponse } from "../../../lib/api";
import { Form, QuestionType, Option } from "../../../types/form";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function RespondentView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [schema, setSchema] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // answers map: { [question_id]: string | string[] }
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadForm() {
      try {
        const data = await getFormById(token); // token is the form ID
        if (data) {
          setSchema(data);
        } else {
          setError("Formulário não encontrado.");
        }
      } catch (err) {
        console.error("Erro ao carregar:", err);
        setError("Ocorreu um erro ao carregar o formulário.");
      } finally {
        setIsLoading(false);
      }
    }
    loadForm();
  }, [token]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (checked) {
        return { ...prev, [questionId]: [...current, optionId] };
      } else {
        return { ...prev, [questionId]: current.filter((id: string) => id !== optionId) };
      }
    });
  };

  const handleSubmit = async () => {
    // Basic validation
    let missingRequired = false;
    schema?.sections?.forEach(sec => {
      sec.questions?.forEach(q => {
        if (q.required && (!answers[q.id] || answers[q.id].length === 0)) {
          missingRequired = true;
        }
      });
    });

    if (missingRequired) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFormResponse(token, answers);
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar respostas. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-slate-950 text-red-500 font-medium"><AlertCircle className="mr-2"/> {error}</div>;
  if (!schema) return null;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-6 border border-green-500/20">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Muito obrigado!</h2>
          <p className="text-slate-400">Sujas respostas foram enviadas e registradas com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900 rounded-t-2xl border-t-4 border-t-indigo-500 p-8 shadow-xl mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{schema.title}</h1>
          <p className="text-slate-400 text-sm">Responda às perguntas abaixo com atenção.</p>
        </div>

        <div className="space-y-6">
          {schema.sections?.map(section => (
            <div key={section.id} className="bg-slate-900 rounded-xl shadow-xl p-6 md:p-8 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-slate-800">{section.title}</h2>
              
              <div className="space-y-8">
                {section.questions?.map((q, index) => (
                  <div key={q.id}>
                    <label className="block text-base font-medium text-slate-200 mb-3">
                      {index + 1}. {q.label} {q.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    
                    <div className="mt-2">
                      {q.type === 'TEXT_SHORT' && (
                        <input
                          type="text"
                          className="w-full bg-slate-950 border-slate-700 text-white border rounded-lg px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="Sua resposta"
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        />
                      )}
                      
                      {q.type === 'TEXT_LONG' && (
                        <textarea
                          rows={4}
                          className="w-full bg-slate-950 border-slate-700 text-white border rounded-lg px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="Sua resposta..."
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        />
                      )}

                      {q.type === 'RADIO_SINGLE' && (
                        <div className="space-y-3">
                          {q.options?.map((opt: Option) => (
                            <label key={opt.id} className="flex items-center p-4 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors has-[:checked]:bg-indigo-900/30 has-[:checked]:border-indigo-500">
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                className="h-4 w-4 text-indigo-500 bg-slate-950 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                checked={answers[q.id] === opt.id}
                                onChange={() => handleAnswerChange(q.id, opt.id)}
                              />
                              <span className="ml-3 block text-sm font-medium text-slate-300">
                                {opt.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'CHECKBOX_MULTIPLE' && (
                        <div className="space-y-3">
                          {q.options?.map((opt: Option) => {
                            const isChecked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id);
                            return (
                              <label key={opt.id} className="flex items-center p-4 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors has-[:checked]:bg-indigo-900/30 has-[:checked]:border-indigo-500">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-indigo-500 bg-slate-950 border-slate-600 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
                                  checked={isChecked}
                                  onChange={(e) => handleCheckboxChange(q.id, opt.id, e.target.checked)}
                                />
                                <span className="ml-3 block text-sm font-medium text-slate-300">
                                  {opt.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {(q.type === 'GRID_LIKERT' || q.type === 'DYNAMIC_REPEATER' || q.type === 'CONDITIONAL_LOGIC') && (
                        <div className="p-4 bg-amber-900/20 text-amber-300 border border-amber-900/50 rounded-lg text-sm">
                          Este tipo de campo ({q.type}) ainda está em desenvolvimento para visualização.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4 pb-12">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium text-lg hover:bg-indigo-500 shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Enviar Respostas</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
