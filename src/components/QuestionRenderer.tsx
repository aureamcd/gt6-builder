import React, { useState, useRef } from "react";
import { Question } from "../types/form";
import {
  Calendar, UploadCloud, Video, AlertCircle, Loader2,
  CheckCircle2, FileText, Trash2, Image as ImageIcon,
  Headphones, ExternalLink
} from "lucide-react";
import { supabase, getFriendlyErrorMessage } from "@/lib/supabase";
import { globalToast } from "@/context/ToastContext";

interface QuestionRendererProps {
  question: Question;
  number: number | string;
  value: any;
  hasError?: boolean;
  onChange: (val: any) => void;
  onAnswerChange?: (id: string, val: any) => void;
  answers?: any;
  schema?: any;
  onVideoTimeUpdate?: (time: number) => void;
  renderCommentButton?: (questionId: string, questionLabel: string) => React.ReactNode;
}

function FileUploadAnswerField({
  value,
  onChange,
  questionId
}: {
  value: any;
  onChange: (val: any) => void;
  questionId: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) { // 25MB
      const msg = "O arquivo ultrapassa o limite permitido de 25MB. Escolha um arquivo menor.";
      setUploadError(msg);
      globalToast.warning(msg, "Arquivo muito grande");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_")
        .toLowerCase();

      const fileName = `sub_${questionId}_${Date.now()}_${safeName}`;

      // Tenta fazer upload no bucket form-submissions ou form-media
      let uploadedUrl: string | null = null;
      const res1 = await supabase.storage.from('form-submissions').upload(fileName, file, { upsert: false });
      if (!res1.error) {
        const { data } = supabase.storage.from('form-submissions').getPublicUrl(fileName);
        uploadedUrl = data?.publicUrl || null;
      } else {
        const res2 = await supabase.storage.from('form-media').upload(fileName, file, { upsert: false });
        if (!res2.error) {
          const { data } = supabase.storage.from('form-media').getPublicUrl(fileName);
          uploadedUrl = data?.publicUrl || null;
        } else {
          // Se nenhum bucket de storage estiver configurado no Supabase, usa fallback local Base64 para arquivos até 3MB
          if (file.size <= 3 * 1024 * 1024) {
            await new Promise<void>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (reader.result) {
                  onChange(reader.result.toString());
                  globalToast.info("Arquivo anexado localmente.", "Upload Concluído");
                  resolve();
                } else {
                  reject(new Error("Falha ao ler arquivo local"));
                }
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });
            return;
          }
          throw res1.error;
        }
      }

      if (uploadedUrl) {
        onChange(uploadedUrl);
        globalToast.success("Arquivo enviado com sucesso!", "Upload Concluído");
      }
    } catch (err: any) {
      console.error("Erro no upload do arquivo:", err);
      // Fallback base64 para arquivos pequenos se houver erro de permissão/rede
      if (file.size <= 3 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            onChange(reader.result.toString());
            globalToast.info("Arquivo anexado localmente.", "Upload Salvo");
          }
        };
        reader.readAsDataURL(file);
      } else {
        const errorFriendly = getFriendlyErrorMessage(err);
        setUploadError(errorFriendly);
        globalToast.error(errorFriendly, "Erro no Upload");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getFileName = (val: string) => {
    if (!val) return '';
    if (val.startsWith('data:')) return 'Arquivo anexado (base64)';
    try {
      const parts = val.split('/');
      const rawName = parts[parts.length - 1];
      const cleanName = rawName.replace(/^sub_[^_]+_\d+_/, '').replace(/^\d+_/, '');
      return decodeURIComponent(cleanName) || rawName;
    } catch {
      return 'Arquivo anexado';
    }
  };

  if (value) {
    const isImage = typeof value === 'string' && (/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value) || value.startsWith('data:image/'));
    const fileName = getFileName(typeof value === 'string' ? value : value?.name || '');

    return (
      <div className="w-full max-w-lg bg-white border border-indigo-100 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate" title={fileName}>
                {fileName}
              </p>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> Arquivo anexado com sucesso
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={typeof value === 'string' ? value : (value as any)?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Abrir / Visualizar arquivo"
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Remover arquivo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {isImage && (
          <div className="mt-2 border border-slate-100 rounded-lg overflow-hidden max-h-48 bg-slate-50 flex items-center justify-center">
            <img src={value} alt="Preview do Arquivo" className="max-h-48 object-contain" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/20'
        } ${isUploading ? 'opacity-75 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Enviando arquivo...</span>
            <span className="text-xs text-slate-400">Aguarde o upload ser concluído</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <UploadCloud size={24} />
            </div>
            <span className="font-semibold text-sm text-slate-700">
              Clique ou arraste um arquivo para enviar
            </span>
            <span className="text-xs mt-1 text-slate-400">
              Suporta PDF, JPG, PNG, DOCX, ZIP (Máx 25MB)
            </span>
          </>
        )}
      </div>
      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium pl-1">
          <AlertCircle size={14} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}

export default function QuestionRenderer({ 
  question, 
  number, 
  value, 
  hasError, 
  onChange, 
  onAnswerChange, 
  answers, 
  schema,
  onVideoTimeUpdate,
  renderCommentButton
}: QuestionRendererProps) {
  const maxTimeRef = useRef<number>(0);

  if (question.type === 'DYNAMIC_REPEATER') {
    const triggerValue = answers?.[question.trigger_source_question_id || ''];
    if (!triggerValue || (Array.isArray(triggerValue) && triggerValue.length === 0)) {
      return null;
    }
    
    const selectedValues = Array.isArray(triggerValue) ? triggerValue : [triggerValue];
    const subQuestions = question.sub_question_template?.sub_questions || [];
    
    const getOptionLabel = (val: string) => {
      if (val.startsWith('other:')) return val.replace('other:', '');
      const triggerQ = schema?.sections?.flatMap((s: any) => s.questions || []).find((sq: any) => sq.id === question.trigger_source_question_id);
      const opt = triggerQ?.options?.find((o: any) => o.id === val);
      return opt ? opt.label : val;
    };
    
    let baseNumber = number;
    if (schema?.sections) {
      const allQs = schema.sections.flatMap((s: any) => s.questions || []);
      const triggerIdx = allQs.findIndex((sq: any) => sq.id === question.trigger_source_question_id);
      if (triggerIdx >= 0) {
        const currentSec = schema.sections.find((s: any) => s.questions?.some((sq: any) => sq.id === question.id));
        if (currentSec) {
          const localTriggerIdx = currentSec.questions.findIndex((sq: any) => sq.id === question.trigger_source_question_id);
          if (localTriggerIdx >= 0) baseNumber = localTriggerIdx + 1;
        }
      }
    }

    return (
      <div key={question.id} className="relative group/question space-y-6 bg-slate-50 p-6 rounded-xl border border-indigo-100">
        {question.label && question.label.trim() !== '' && (
          <div className="flex items-start mb-4">
            <span className="font-bold text-slate-400 mr-3 text-lg mt-0.5">{number}.</span>
            <label className="font-semibold text-slate-800 text-lg leading-snug">
              {question.label}
            </label>
          </div>
        )}
        <div className="space-y-6">
          {selectedValues.map((val: string) => (
            <div key={`${question.id}_${val}`} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
              <h4 className="text-sm font-bold text-indigo-600 mb-4 uppercase tracking-wider">
                Referente a: {getOptionLabel(val)}
              </h4>
              <div className="space-y-6">
                {subQuestions.map((subQ: any, subIndex: number) => {
                  if (subQ.depends_on_id && subQ.depends_on_label) {
                    const depAnswerKey = `${question.id}_${val}_${subQ.depends_on_id}`;
                    const depAnswerValue = answers?.[depAnswerKey];
                    const depSubQ = subQuestions.find((sq: any) => sq.id === subQ.depends_on_id);
                    const depValues = Array.isArray(depAnswerValue) ? depAnswerValue : [depAnswerValue];
                    
                    const hasMatchingLabel = depValues.some(v => {
                      if (!v) return false;
                      if (v.startsWith('other:')) {
                        return v.replace('other:', '').toLowerCase().trim() === subQ.depends_on_label.toLowerCase().trim();
                      }
                      const opt = depSubQ?.options?.find((o: any) => o.id === v);
                      return opt?.label?.toLowerCase().trim() === subQ.depends_on_label.toLowerCase().trim();
                    });

                    if (!hasMatchingLabel) return null;
                  }

                  const answerKey = `${question.id}_${val}_${subQ.id}`;
                  return (
                    <QuestionRenderer 
                      key={answerKey}
                      question={subQ}
                      number={`${baseNumber}.${subIndex + 1}`}
                      value={answers?.[answerKey]}
                      hasError={false}
                      onChange={(newVal) => onAnswerChange?.(answerKey, newVal)}
                      onAnswerChange={onAnswerChange}
                      answers={answers}
                      schema={schema}
                      onVideoTimeUpdate={onVideoTimeUpdate}
                      renderCommentButton={renderCommentButton}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {renderCommentButton?.(question.id, question.label || `Pergunta ${number}`)}
      </div>
    );
  }

  return (
    <div 
      id={`q_wrapper_${question.id}`} 
      className={`group/question relative transition-all duration-300 rounded-2xl ${hasError ? 'p-4 sm:p-5 bg-red-50/60 border-2 border-red-300 shadow-sm ring-4 ring-red-50' : 'p-2'}`}
    >
      <div className="flex items-start mb-4">
        <span className={`font-bold mr-3 text-lg mt-0.5 ${hasError ? 'text-red-500' : 'text-slate-400'}`}>{number}.</span>
        <div>
          <label className={`font-semibold text-lg leading-snug ${hasError ? 'text-red-900' : 'text-slate-800'}`}>
            {question.label || "Pergunta sem título"}
            {question.required && <span className="text-red-500 ml-1 font-bold" title="Obrigatório">*</span>}
          </label>
          {hasError && (
            <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1 animate-in fade-in">
              <AlertCircle size={13} className="shrink-0" />
              Esta pergunta é obrigatória. Por favor, responda para continuar.
            </p>
          )}
        </div>
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
            {question.options?.map((opt: any) => (
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
            {question.options?.map((opt: any) => (
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
            
            {/* Exibir outros adicionados customizados (Preview) */}
            {Array.isArray(value) && value.filter((v: string) => v.startsWith('other:')).map(customVal => (
              <label key={customVal} className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" 
                  checked={true}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(current.filter((v: string) => v !== customVal));
                  }}
                />
                <span className="text-slate-700">{customVal.replace('other:', '')}</span>
              </label>
            ))}

            {question.allow_add_item && (
              <div className="flex items-center space-x-3 mt-4">
                <span className="text-slate-700 font-medium">Adicionar outro:</span>
                <input 
                  type="text" 
                  className="border-b border-slate-300 focus:border-indigo-500 outline-none px-2 py-1 flex-1 bg-transparent max-w-xs text-slate-900 placeholder-slate-400" 
                  placeholder="Digite e aperte Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      e.preventDefault();
                      const newVal = `other:${e.currentTarget.value.trim()}`;
                      const current = Array.isArray(value) ? value : [];
                      if (!current.includes(newVal)) {
                        onChange([...current, newVal]);
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
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
            {question.sub_question_template?.audio_url ? (
               <audio src={question.sub_question_template.audio_url} controls className="w-full max-w-md shadow-sm rounded-full" />
            ) : (
               <div className="h-16 w-full max-w-md bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
                 <span className="text-sm">Áudio não configurado</span>
               </div>
            )}
          </div>
        )}

        {question.type === 'MEDIA_IMAGE' && (
          <div className="flex justify-center mb-6">
            {question.sub_question_template?.image_url ? (
               <img src={question.sub_question_template.image_url} alt="Media" className="max-w-full rounded-lg shadow-sm max-h-[500px] object-contain border border-slate-200" />
            ) : (
               <div className="h-32 w-full max-w-lg bg-slate-50 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
                 <span className="text-sm">Imagem não configurada</span>
               </div>
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
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : question.video_url && question.video_url.includes('vimeo.com') ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-xl shadow-md bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={question.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                  title="Video Preview"
                  allowFullScreen
                />
              </div>
            ) : question.video_url && question.video_url.trim() !== '' ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-black shadow-md">
                <video 
                  className="w-full max-h-[500px]"
                  src={question.video_url}
                  controls
                  playsInline
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    if (video.currentTime > maxTimeRef.current + 1) {
                      video.currentTime = maxTimeRef.current;
                    } else if (video.currentTime > maxTimeRef.current) {
                      maxTimeRef.current = video.currentTime;
                    }
                    if (onVideoTimeUpdate) onVideoTimeUpdate(video.currentTime);
                  }}
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
          <FileUploadAnswerField
            value={value}
            onChange={onChange}
            questionId={question.id}
          />
        )}

        {question.type === 'TEXT_MARKDOWN' && (
          <div className="prose prose-slate prose-indigo max-w-none bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-slate-500 italic">Bloco de texto markdown formatado aparecerá aqui.</p>
          </div>
        )}

      </div>
      {renderCommentButton?.(question.id, question.label || `Pergunta ${number}`)}
    </div>
  );
}
