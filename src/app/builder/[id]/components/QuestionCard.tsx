import React, { useState } from "react";
import {
  GripVertical, Trash2, MessageSquare, X, Plus, Calendar, UploadCloud,
  FileText, Image as ImageIcon, Headphones, Video, Loader2, Settings
} from "lucide-react";
import { Question } from "@/types/form";
import { supabase, getFriendlyErrorMessage } from "@/lib/supabase";
import { globalToast } from "@/context/ToastContext";

interface QuestionCardProps {
  question: Question;
  number: number;
  isSelected?: boolean;
  onClick?: () => void;
  onUpdateLabel: (l: string) => void;
  onUpdateVideoUrl?: (url: string) => void;
  onDelete: () => void;
  onAddOption?: () => void;
  onUpdateOptionLabel?: (optId: string, l: string) => void;
  onDeleteOption?: (optId: string) => void;
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  openCommentsCount?: number;
  onCommentClick?: () => void;
  onUpdateSubQuestionTemplate?: (tpl: any) => void;
}

export function QuestionCard({
  question,
  number,
  isSelected,
  onClick,
  onUpdateLabel,
  onUpdateVideoUrl,
  onDelete,
  onAddOption,
  onUpdateOptionLabel,
  onDeleteOption,
  draggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  openCommentsCount,
  onCommentClick,
  onUpdateSubQuestionTemplate
}: QuestionCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [isDragEnabled, setIsDragEnabled] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateVideoUrl) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB
      globalToast.warning("O vídeo ultrapassa o limite permitido de 50MB. Selecione um arquivo menor.", "Arquivo muito grande");
      return;
    }

    setIsUploading(true);
    try {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_")
        .toLowerCase();

      const fileName = `${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from('form-media')
        .upload(fileName, file, { upsert: false });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('form-media')
        .getPublicUrl(fileName);

      onUpdateVideoUrl(publicData.publicUrl);
    } catch (err: any) {
      console.error(err);
      globalToast.error(getFriendlyErrorMessage(err), "Erro no Upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      draggable={draggable && isDragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`group relative bg-white border rounded-lg p-3 sm:p-5 hover:shadow-sm transition-all focus-within:ring-1 
        ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-slate-200 hover:border-indigo-300'}
        ${isDragging ? 'opacity-50 scale-[0.98]' : ''}
        ${isDragOver ? 'border-t-4 border-t-indigo-500' : ''}
      `}
    >
      {question.required && (
        <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
          Obrigatório
        </div>
      )}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 flex items-center justify-center cursor-grab text-slate-300 hover:text-indigo-500"
        onMouseEnter={() => setIsDragEnabled(true)}
        onMouseLeave={() => setIsDragEnabled(false)}
        onTouchStart={() => setIsDragEnabled(true)}
        onTouchEnd={() => setIsDragEnabled(false)}
      >
        <GripVertical size={16} />
      </div>

      <div className="pl-4 sm:pl-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2 sm:gap-0">
          <div className="flex items-start space-x-2 flex-1 w-full">
            <span className="font-bold text-slate-400 mt-1 text-sm sm:text-base">{number}.</span>
            <input
              value={question.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className="font-semibold text-slate-800 text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-1"
              placeholder="Digite sua pergunta..."
            />
          </div>
          <div className="flex items-center space-x-2 sm:ml-4 shrink-0 self-end sm:self-auto">
            {onCommentClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onCommentClick(); }}
                className="flex items-center space-x-1 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded-full transition-colors cursor-pointer"
                title="Comentários"
              >
                <MessageSquare size={14} />
                {openCommentsCount ? (
                  <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 font-bold leading-tight">
                    {openCommentsCount}
                  </span>
                ) : null}
              </button>
            )}
            <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium border border-slate-200">{question.type.replace('_', ' ')}</span>
            <button onClick={onDelete} className="text-slate-400 hover:text-red-500 p-1 transition-colors bg-slate-50 hover:bg-red-50 rounded cursor-pointer" title="Deletar Pergunta">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          {question.type === 'TEXT_SHORT' && (
            <div className="h-10 bg-slate-50 border border-slate-200 rounded-md flex items-center px-3">
              Campo de texto curto...
            </div>
          )}
          {question.type === 'TEXT_LONG' && (
            <div className="h-20 bg-slate-50 border border-slate-200 rounded-md flex items-start p-3">
              Campo de texto longo...
            </div>
          )}
          {(question.type === 'RADIO_SINGLE' || question.type === 'CHECKBOX_MULTIPLE' || question.type === 'DROPDOWN') && (
            <div className="space-y-2">
              {question.options?.map((opt) => (
                <div key={opt.id} className="flex items-center space-x-2 group/opt">
                  <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center shrink-0 ${question.type === 'RADIO_SINGLE' || question.type === 'DROPDOWN' ? 'rounded-full' : 'rounded'}`}></div>
                  <input
                    value={opt.label}
                    onChange={(e) => onUpdateOptionLabel && onUpdateOptionLabel(opt.id, e.target.value)}
                    className="text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-1"
                  />
                  <button onClick={() => onDeleteOption && onDeleteOption(opt.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity p-1 cursor-pointer" title="Remover Opção">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div onClick={(e) => { e.stopPropagation(); onAddOption && onAddOption(); }} className="flex items-center space-x-2 text-indigo-500 cursor-pointer hover:text-indigo-700 mt-2 p-1 w-max rounded-md hover:bg-indigo-50">
                <Plus size={14} />
                <span className="text-xs font-medium">Adicionar Opção</span>
              </div>
              {question.allow_add_item && (
                <div className="flex items-center space-x-2 group/opt mt-2">
                  <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center shrink-0 ${question.type === 'RADIO_SINGLE' || question.type === 'DROPDOWN' ? 'rounded-full' : 'rounded'}`}></div>
                  <span className="text-slate-400 text-sm py-1 border-b border-transparent">Outro (Adicionar item)</span>
                </div>
              )}
            </div>
          )}
          {question.type === 'DATE_TIME' && (
            <div className="h-10 w-48 bg-slate-50 border border-slate-200 rounded-md flex items-center px-3 text-slate-400">
              <Calendar size={16} className="mr-2" /> Selecione a data/hora
            </div>
          )}
          {question.type === 'FILE_UPLOAD' && (
            <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
              <UploadCloud size={24} className="mb-2" /> Arraste e solte arquivos aqui
            </div>
          )}
          {question.type === 'TEXT_MARKDOWN' && (
            <div className="space-y-2">
              <textarea
                placeholder="Digite o conteúdo do seu texto de aviso ou instrução aqui..."
                value={question.sub_question_template?.markdown_content || ''}
                onChange={(e) => onUpdateSubQuestionTemplate && onUpdateSubQuestionTemplate({ ...question.sub_question_template, markdown_content: e.target.value })}
                rows={4}
                className="w-full text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none resize-y"
              />
            </div>
          )}
          {question.type === 'MEDIA_IMAGE' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Cole o link da imagem aqui (ex: https://site.com/imagem.png)"
                value={question.sub_question_template?.image_url || ''}
                onChange={(e) => onUpdateSubQuestionTemplate && onUpdateSubQuestionTemplate({ ...question.sub_question_template, image_url: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
              />
              {question.sub_question_template?.image_url ? (
                <div className="flex justify-center border border-slate-200 rounded-lg p-2 bg-slate-50">
                  <img src={question.sub_question_template.image_url} alt="Preview" className="max-h-64 object-contain rounded-md" />
                </div>
              ) : (
                <div className="h-24 bg-slate-50 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
                  <ImageIcon size={24} className="mb-2" />
                  <span className="text-sm">Cole a URL da imagem acima</span>
                </div>
              )}
            </div>
          )}
          {question.type === 'MEDIA_AUDIO' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Cole o link do áudio aqui (ex: https://site.com/audio.mp3)"
                value={question.sub_question_template?.audio_url || ''}
                onChange={(e) => onUpdateSubQuestionTemplate && onUpdateSubQuestionTemplate({ ...question.sub_question_template, audio_url: e.target.value })}
                className="w-full text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
              />
              {question.sub_question_template?.audio_url ? (
                <div className="flex justify-center border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <audio src={question.sub_question_template.audio_url} controls className="w-full max-w-md" />
                </div>
              ) : (
                <div className="h-16 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 border-dashed">
                  <Headphones size={20} className="mr-2" /> Cole a URL do áudio acima
                </div>
              )}
            </div>
          )}
          {question.type === 'MEDIA_VIDEO' && (
            <div className="space-y-4">
              <div className="flex space-x-2 border-b border-slate-200">
                <button
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'url' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('url')}
                >
                  Link Externo (YouTube)
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('upload')}
                >
                  Fazer Upload (Nativo)
                </button>
              </div>

              {activeTab === 'url' ? (
                <input
                  type="text"
                  placeholder="Cole o link do vídeo aqui (ex: https://youtube.com/watch?v=...)"
                  value={question.video_url || ''}
                  onChange={(e) => onUpdateVideoUrl && onUpdateVideoUrl(e.target.value)}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                  {isUploading ? (
                    <div className="flex flex-col items-center text-slate-500">
                      <Loader2 size={24} className="animate-spin mb-2 text-indigo-600" />
                      <span className="text-sm">Enviando vídeo (isso pode demorar)...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={24} className="mb-2 text-slate-400" />
                      <span className="text-sm text-slate-600 mb-4">Envie um arquivo MP4 ou WebM (Max 50MB)</span>
                      <label className="cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Selecionar Arquivo
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {question.video_url && (question.video_url.includes('youtube.com') || question.video_url.includes('youtu.be')) ? (
                <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={question.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    title="Video Preview"
                    allowFullScreen
                  />
                </div>
              ) : question.video_url && question.video_url.includes('supabase.co') ? (
                <div className="relative w-full overflow-hidden rounded-lg bg-black">
                  <video
                    className="w-full max-h-80"
                    src={question.video_url}
                    controls
                  />
                </div>
              ) : (
                <div className="h-32 bg-slate-100 border border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 border-dashed">
                  <Video size={24} className="mb-2 text-slate-300" />
                  <span>Nenhuma pré-visualização de vídeo disponível</span>
                </div>
              )}
            </div>
          )}
          {(question.type === 'DYNAMIC_REPEATER' || question.type === 'CONDITIONAL_LOGIC') && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium flex items-center">
              <Settings size={14} className="mr-2" />
              Configuração de lógica e campos aninhados em breve...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

