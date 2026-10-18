import React, { useState } from "react";
import { X, GripVertical, Plus, Settings, UploadCloud, Video, Loader2 } from "lucide-react";
import { Form, Section, Question, QuestionType } from "@/types/form";
import { supabase, getFriendlyErrorMessage } from "@/lib/supabase";
import { globalToast } from "@/context/ToastContext";

interface PropertyInspectorProps {
  selectedElementType: 'question' | 'section' | null;
  setSelectedElementType: (type: 'question' | 'section' | null) => void;
  isMobileInspectorOpen?: boolean;
  setIsMobileInspectorOpen?: (open: boolean) => void;
  selectedSection: Section | null;
  selectedQuestion: Question | null;
  activeSectionId: string;
  schema: Form;
  setSchema: React.Dispatch<React.SetStateAction<Form | null>>;
  updateSectionProperty: (sectionId: string, key: keyof Section, value: any) => void;
  updateQuestionProperty: (sectionId: string, questionId: string, key: keyof Question, value: any) => void;
  updateOptionWeight: (sectionId: string, questionId: string, optionId: string, weight: number | null) => void;
  generateId: () => string;
}

function SectionVideoUploader({ videoUrl, onUpdate }: { videoUrl: string, onUpdate: (url: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      onUpdate(publicData.publicUrl);
    } catch (err: any) {
      console.error(err);
      globalToast.error(getFriendlyErrorMessage(err), "Erro no Upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'url' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('url')}
        >
          YouTube
        </button>
        <button
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Local
        </button>
      </div>

      {activeTab === 'url' ? (
        <input
          type="text"
          placeholder="Ex: https://youtube.com/watch?v=..."
          value={videoUrl || ''}
          onChange={(e) => onUpdate(e.target.value)}
          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
          {isUploading ? (
            <div className="flex flex-col items-center text-slate-500">
              <Loader2 size={24} className="animate-spin mb-2 text-indigo-600" />
              <span className="text-xs">Enviando vídeo...</span>
            </div>
          ) : (
            <label className="cursor-pointer bg-white px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50">
              Selecionar MP4/WebM
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          )}
        </div>
      )}

      {videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) ? (
        <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
            title="Preview"
            allowFullScreen
          />
        </div>
      ) : videoUrl && videoUrl.includes('vimeo.com') ? (
        <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
            title="Preview"
            allowFullScreen
          />
        </div>
      ) : videoUrl && videoUrl.trim() !== '' ? (
        <div className="relative w-full overflow-hidden rounded-md bg-black">
          <video className="w-full max-h-40" src={videoUrl} controls />
        </div>
      ) : null}
    </div>
  );
}

export function PropertyInspector({
  selectedElementType,
  setSelectedElementType,
  isMobileInspectorOpen = false,
  setIsMobileInspectorOpen,
  selectedSection,
  selectedQuestion,
  activeSectionId,
  schema,
  setSchema,
  updateSectionProperty,
  updateQuestionProperty,
  updateOptionWeight,
  generateId
}: PropertyInspectorProps) {
  const [dragEnabledSubQId, setDragEnabledSubQId] = useState<string | null>(null);

  if (!((selectedElementType === 'question' && selectedQuestion) || (selectedElementType === 'section' && selectedSection))) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay for Right Sidebar */}
      {isMobileInspectorOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileInspectorOpen?.(false)}
        />
      )}
      <aside className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 flex-col shadow-2xl lg:shadow-xl lg:relative lg:w-80 lg:z-20 shrink-0 transition-transform ${isMobileInspectorOpen ? 'flex' : 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800">
            {selectedElementType === 'section' ? 'Propriedades da Seção' : 'Propriedades da Pergunta'}
          </h2>
          <button
            onClick={() => {
              setIsMobileInspectorOpen?.(false);
              setSelectedElementType(null);
            }}
            className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">

          {/* --- SECTION PROPERTIES --- */}
          {selectedElementType === 'section' && selectedSection && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Título da Seção</label>
                <input
                  type="text"
                  value={selectedSection.title}
                  onChange={(e) => updateSectionProperty(selectedSection.id, 'title', e.target.value)}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Descrição / Contexto</label>
                <p className="text-xs text-slate-500">Aparecerá como um bloco de texto explicativo no topo da seção (Cards de contexto).</p>
                <textarea
                  value={selectedSection.description || ''}
                  onChange={(e) => updateSectionProperty(selectedSection.id, 'description', e.target.value)}
                  rows={4}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none resize-none"
                  placeholder="Ex: O objetivo desta seção é avaliar..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Vídeo Explicativo</label>
                <p className="text-xs text-slate-500">Adicione um vídeo no cabeçalho desta seção.</p>
                <SectionVideoUploader
                  videoUrl={selectedSection.video_url || ''}
                  onUpdate={(url) => updateSectionProperty(selectedSection.id, 'video_url', url)}
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-sm font-medium text-slate-700">Bloquear Perguntas (Segundos)</label>
                <p className="text-xs text-slate-500">Oculta as perguntas desta seção até que o vídeo acima atinja o tempo definido (apenas vídeos nativos). Deixe 0 para não ocultar.</p>
                <input
                  type="number"
                  placeholder="Ex: 30"
                  min="0"
                  value={selectedSection.unlock_at_seconds ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateSectionProperty(selectedSection.id, 'unlock_at_seconds', isNaN(val) ? undefined : val);
                  }}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-sm font-medium text-slate-700">Tag de Camada (IMAPS)</label>
                <p className="text-xs text-slate-500">Clique para selecionar ou digite tags separadas por vírgula:</p>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {(['TIMAPS', 'SIMAPS', 'OIMAPS', 'LIMAPS'] as const).map(tag => {
                    const isSelected = selectedSection.tags?.map(t => t.toUpperCase()).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const current = selectedSection.tags || [];
                          const exists = current.some(t => t.toUpperCase() === tag);
                          const next = exists
                            ? current.filter(t => t.toUpperCase() !== tag)
                            : [...current, tag];
                          updateSectionProperty(selectedSection.id, 'tags', next.length > 0 ? next : undefined);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Adicionar tags separadas por vírgula..."
                  value={selectedSection.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    updateSectionProperty(selectedSection.id, 'tags', tags.length > 0 ? tags : undefined);
                  }}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                />
              </div>
            </>
          )}

          {/* --- QUESTION PROPERTIES --- */}
          {selectedElementType === 'question' && selectedQuestion && (
            <>
              {/* Question Label / Title */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="text-sm font-medium text-slate-700">Título da Pergunta</label>
                <input
                  type="text"
                  value={selectedQuestion.label || ''}
                  onChange={(e) => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'label', e.target.value)}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                  placeholder="Escreva sua pergunta aqui..."
                />
              </div>

              {/* Question Description */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="text-sm font-medium text-slate-700">Descrição Opcional</label>
                <textarea
                  value={selectedQuestion.description || ''}
                  onChange={(e) => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'description', e.target.value)}
                  rows={2}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none resize-none"
                  placeholder="Texto auxiliar para a pergunta..."
                />
              </div>

              {/* Question Type Changer */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="text-sm font-medium text-slate-700">Tipo de Pergunta</label>
                <select
                  value={selectedQuestion.type}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType;
                    const needsOptions = ['RADIO_SINGLE', 'CHECKBOX_MULTIPLE', 'DROPDOWN', 'GRID_LIKERT'].includes(newType);

                    const updates: Partial<Question> = { type: newType };

                    if (needsOptions && (!selectedQuestion.options || selectedQuestion.options.length === 0)) {
                      updates.options = newType === 'GRID_LIKERT'
                        ? [1, 2, 3, 4, 5].map((n, idx) => ({ id: generateId(), label: String(n), weight: n, order_index: idx }) as any)
                        : [
                          { id: generateId(), label: "Opção 1" } as any,
                          { id: generateId(), label: "Opção 2" } as any
                        ];
                    }

                    if (newType === 'GRID_LIKERT' && (!selectedQuestion.sub_question_template?.sub_questions || selectedQuestion.sub_question_template.sub_questions.length === 0)) {
                      updates.sub_question_template = {
                        ...selectedQuestion.sub_question_template,
                        sub_questions: [
                          { id: generateId(), label: "Critério 1" },
                          { id: generateId(), label: "Critério 2" }
                        ]
                      };
                    }

                    setSchema(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        sections: prev.sections?.map(sec =>
                          sec.id === activeSectionId
                            ? {
                              ...sec,
                              questions: sec.questions?.map(q =>
                                q.id === selectedQuestion.id ? { ...q, ...updates } : q
                              )
                            }
                            : sec
                        )
                      };
                    });
                  }}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none font-medium"
                >
                  <optgroup label="Texto">
                    <option value="TEXT_SHORT">Resposta Curta</option>
                    <option value="TEXT_LONG">Parágrafo</option>
                  </optgroup>
                  <optgroup label="Múltipla Escolha & Escala">
                    <option value="RADIO_SINGLE">Múltipla Escolha (1 Opção)</option>
                    <option value="CHECKBOX_MULTIPLE">Caixas de Seleção</option>
                    <option value="DROPDOWN">Menu Suspenso (Dropdown)</option>
                    <option value="GRID_LIKERT">Matriz / Escala Likert</option>
                  </optgroup>
                  <optgroup label="Upload & Data">
                    <option value="FILE_UPLOAD">Upload de Arquivo</option>
                    <option value="DATE_TIME">Data e Hora</option>
                  </optgroup>
                  <optgroup label="Mídia & Visual">
                    <option value="TEXT_MARKDOWN">Bloco de Texto Formato (Aviso)</option>
                    <option value="MEDIA_VIDEO">Vídeo (YouTube/Upload)</option>
                    <option value="MEDIA_IMAGE">Imagem</option>
                    <option value="MEDIA_AUDIO">Áudio</option>
                  </optgroup>
                  <optgroup label="Lógica Avançada">
                    <option value="DYNAMIC_REPEATER">Repetidor Dinâmico</option>
                    <option value="CONDITIONAL_LOGIC">Regra Condicional</option>
                  </optgroup>
                </select>
              </div>

              {/* Required Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Obrigatória</label>
                <div
                  onClick={() => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'required', !selectedQuestion.required)}
                  className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${selectedQuestion.required ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${selectedQuestion.required ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Tags / Metadata */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tag de Camada (IMAPS)</label>
                {selectedSection?.tags && selectedSection.tags.length > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 leading-relaxed">
                    <strong>Tags herdadas da seção:</strong> A seção atual já possui tags configuradas ({selectedSection.tags.join(', ')}). Todas as perguntas desta seção herdam automaticamente essa camada.
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500">Clique para selecionar ou digite tags separadas por vírgula:</p>
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {(['TIMAPS', 'SIMAPS', 'OIMAPS', 'LIMAPS'] as const).map(tag => {
                        const isSelected = selectedQuestion.tags?.map(t => t.toUpperCase()).includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const current = selectedQuestion.tags || [];
                              const exists = current.some(t => t.toUpperCase() === tag);
                              const next = exists
                                ? current.filter(t => t.toUpperCase() !== tag)
                                : [...current, tag];
                              updateQuestionProperty(activeSectionId, selectedQuestion.id, 'tags', next.length > 0 ? next : undefined);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="Adicionar tags separadas por vírgula..."
                      value={selectedQuestion.tags?.join(', ') || ''}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        updateQuestionProperty(activeSectionId, selectedQuestion.id, 'tags', tags.length > 0 ? tags : undefined);
                      }}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                    />
                  </>
                )}
              </div>

              {/* Video Unlock Settings */}
              {selectedQuestion.type === 'MEDIA_VIDEO' && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="text-sm font-medium text-slate-700">Bloquear Respostas (Segundos)</label>
                  <p className="text-xs text-slate-500">Impedir respostas até que o vídeo atinja o tempo definido abaixo. (Deixe 0 para não bloquear).</p>
                  <input
                    type="number"
                    placeholder="Ex: 30"
                    min="0"
                    value={selectedQuestion.sub_question_template?.unlock_at_seconds || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                        ...selectedQuestion.sub_question_template,
                        unlock_at_seconds: isNaN(val) ? undefined : val
                      });
                    }}
                    className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                  />
                </div>
              )}

              {/* Allow Add Item (for Checkbox/Radio) */}
              {(selectedQuestion.type === 'RADIO_SINGLE' || selectedQuestion.type === 'CHECKBOX_MULTIPLE') && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700">Opção "Outros"</label>
                    <span className="text-xs text-slate-500">Permite texto livre</span>
                  </div>
                  <div
                    onClick={() => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'allow_add_item', !selectedQuestion.allow_add_item)}
                    className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${selectedQuestion.allow_add_item ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${selectedQuestion.allow_add_item ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              )}

              {/* GRID LIKERT PROPERTIES */}
              {selectedQuestion.type === 'GRID_LIKERT' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Linhas da Matriz (Critérios)</label>
                    <p className="text-xs text-slate-500">Adicione os itens que serão avaliados na escala.</p>
                    <div className="space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
                      {(selectedQuestion.sub_question_template?.sub_questions || []).map((row: any, rIdx: number) => (
                        <div key={row.id || rIdx} className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded">
                          <input
                            type="text"
                            value={row.label || ''}
                            onChange={(e) => {
                              const newRows = [...(selectedQuestion.sub_question_template?.sub_questions || [])];
                              newRows[rIdx] = { ...newRows[rIdx], label: e.target.value };
                              updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                                ...selectedQuestion.sub_question_template,
                                sub_questions: newRows
                              });
                            }}
                            placeholder={`Critério ${rIdx + 1}`}
                            className="flex-1 text-xs text-slate-800 bg-transparent outline-none font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newRows = (selectedQuestion.sub_question_template?.sub_questions || []).filter((_: any, i: number) => i !== rIdx);
                              updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                                ...selectedQuestion.sub_question_template,
                                sub_questions: newRows
                              });
                            }}
                            className="text-slate-300 hover:text-red-500 p-1 cursor-pointer"
                            title="Remover linha"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const currentRows = selectedQuestion.sub_question_template?.sub_questions || [];
                          const newRow = { id: generateId(), label: `Critério ${currentRows.length + 1}` };
                          updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                            ...selectedQuestion.sub_question_template,
                            sub_questions: [...currentRows, newRow]
                          });
                        }}
                        className="w-full py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 border-dashed rounded flex justify-center items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Adicionar Linha / Critério
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Option Weights & Question Importance */}
              {(selectedQuestion.type === 'RADIO_SINGLE' || selectedQuestion.type === 'CHECKBOX_MULTIPLE' || selectedQuestion.type === 'DROPDOWN' || selectedQuestion.type === 'GRID_LIKERT') && selectedQuestion.options && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Pesos Analíticos (IMAPS)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const count = selectedQuestion.options?.length || 0;
                          if (count === 0) return;
                          selectedQuestion.options?.forEach((opt, idx) => {
                            const w = count === 1 ? 5 : Number((1 + (idx / (count - 1)) * 4).toFixed(1));
                            updateOptionWeight(activeSectionId, selectedQuestion.id, opt.id, w);
                          });
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                        title="Distribuir pesos crescentes de 1 a 5"
                      >
                        1 → 5
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const count = selectedQuestion.options?.length || 0;
                          if (count === 0) return;
                          selectedQuestion.options?.forEach((opt, idx) => {
                            const w = count === 1 ? 5 : Number((5 - (idx / (count - 1)) * 4).toFixed(1));
                            updateOptionWeight(activeSectionId, selectedQuestion.id, opt.id, w);
                          });
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                        title="Distribuir pesos decrescentes de 5 a 1"
                      >
                        5 → 1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          selectedQuestion.options?.forEach(opt => {
                            updateOptionWeight(activeSectionId, selectedQuestion.id, opt.id, null);
                          });
                        }}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-200 hover:text-red-600 cursor-pointer"
                        title="Limpar pesos desta pergunta"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Atribua valores de 1 a 5 para o cálculo de maturidade. Deixe vazio (<strong>N/A</strong>) em opções neutras como <em>"Não se aplica"</em> para ignorá-las na média.
                  </p>
                  <div className="space-y-1.5">
                    {selectedQuestion.options.map(opt => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <span className="flex-1 text-xs text-slate-600 truncate" title={opt.label}>{opt.label || 'Sem rótulo'}</span>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="N/A"
                          value={opt.weight ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            updateOptionWeight(activeSectionId, selectedQuestion.id, opt.id, val);
                          }}
                          className="w-16 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center outline-none focus:border-indigo-500 font-semibold text-slate-800"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Multiplicador de Importância da Pergunta */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <label className="text-xs font-semibold text-slate-700 block">Importância da Pergunta</label>
                      <span className="text-[10px] text-slate-400 block">Peso desta pergunta na média da camada</span>
                    </div>
                    <select
                      value={selectedQuestion.sub_question_template?.question_weight || 1}
                      onChange={(e) => {
                        const qWeight = Number(e.target.value) || 1;
                        updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                          ...(selectedQuestion.sub_question_template || {}),
                          question_weight: qWeight
                        });
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none font-semibold text-slate-700 focus:border-indigo-500"
                    >
                      <option value={1}>1x (Normal)</option>
                      <option value={2}>2x (Alta)</option>
                      <option value={3}>3x (Estrutural / Crítica)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* DYNAMIC REPEATER PROPERTIES */}
              {selectedQuestion.type === 'DYNAMIC_REPEATER' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Pergunta Base (Gatilho)</label>
                    <p className="text-xs text-slate-500">Selecione a pergunta de múltipla escolha que irá gerar os blocos de repetição.</p>
                    <select
                      value={selectedQuestion.trigger_source_question_id || ''}
                      onChange={(e) => updateQuestionProperty(activeSectionId, selectedQuestion.id, 'trigger_source_question_id', e.target.value)}
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-3 py-2 outline-none"
                    >
                      <option value="">Selecione uma pergunta...</option>
                      {schema?.sections?.flatMap(s => s.questions || [])
                        .filter(q => (q.type === 'CHECKBOX_MULTIPLE' || q.type === 'RADIO_SINGLE' || q.type === 'DROPDOWN') && q.id !== selectedQuestion.id)
                        .map(q => (
                          <option key={q.id} value={q.id}>{q.label || 'Sem título'}</option>
                        ))
                      }
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Sub-perguntas (Bloco)</label>
                    <p className="text-xs text-slate-500">Estas perguntas serão repetidas para cada opção selecionada na Pergunta Base.</p>

                    <div className="space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
                      {selectedQuestion.sub_question_template?.sub_questions?.map((subQ: any, index: number) => (
                        <div
                          key={subQ.id}
                          className="bg-white border border-slate-200 p-2 pl-7 rounded text-sm relative group/sub"
                          draggable={dragEnabledSubQId === subQ.id}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', index.toString());
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedIndexStr = e.dataTransfer.getData('text/plain');
                            if (!draggedIndexStr) return;
                            const draggedIndex = parseInt(draggedIndexStr, 10);
                            if (isNaN(draggedIndex) || draggedIndex === index) return;

                            const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                            const item = newSubQs.splice(draggedIndex, 1)[0];
                            newSubQs.splice(index, 0, item);
                            updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                          }}
                        >
                          <div
                            className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 cursor-grab hover:text-slate-500 active:cursor-grabbing"
                            onMouseEnter={() => setDragEnabledSubQId(subQ.id)}
                            onMouseLeave={() => setDragEnabledSubQId(null)}
                            onTouchStart={() => setDragEnabledSubQId(subQ.id)}
                            onTouchEnd={() => setDragEnabledSubQId(null)}
                          >
                            <GripVertical size={16} />
                          </div>
                          <input
                            type="text"
                            value={subQ.label}
                            onChange={(e) => {
                              const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                              newSubQs[index] = { ...newSubQs[index], label: e.target.value };
                              updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                            }}
                            className="w-full border-none bg-transparent font-medium focus:ring-0 p-0 text-slate-800 pr-5"
                            placeholder="Título da sub-pergunta"
                          />
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={subQ.type}
                                onChange={(e) => {
                                  const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                  newSubQs[index] = { ...newSubQs[index], type: e.target.value };
                                  updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                }}
                                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none font-medium"
                              >
                                <option value="TEXT_SHORT">Texto Curto</option>
                                <option value="TEXT_LONG">Texto Longo</option>
                                <option value="RADIO_SINGLE">Única Escolha</option>
                                <option value="CHECKBOX_MULTIPLE">Múltipla Escolha</option>
                              </select>
                              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600 shrink-0">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={Boolean(subQ.required)}
                                  onChange={(e) => {
                                    const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                    newSubQs[index] = { ...newSubQs[index], required: e.target.checked };
                                    updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                  }}
                                />
                                Obrig.
                              </label>
                            </div>

                            {(subQ.type === 'RADIO_SINGLE' || subQ.type === 'CHECKBOX_MULTIPLE') && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Digite as opções separadas por vírgula..."
                                  value={subQ._rawOptionsText !== undefined ? subQ._rawOptionsText : (subQ.options?.map((o: any) => o.label).join(', ') || '')}
                                  onChange={(e) => {
                                    const rawText = e.target.value;
                                    const existingOpts: any[] = subQ.options || [];
                                    const opts = rawText
                                      .split(',')
                                      .map((t, oIdx) => {
                                        const trimmed = t.trim();
                                        const matchByIndexOrLabel =
                                          existingOpts.find((eo: any) => eo.label?.toLowerCase() === trimmed.toLowerCase()) ||
                                          existingOpts[oIdx];
                                        return {
                                          id: matchByIndexOrLabel?.id || generateId(),
                                          label: trimmed,
                                          weight: matchByIndexOrLabel?.weight ?? null
                                        };
                                      })
                                      .filter(o => o.label);
                                    const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                    newSubQs[index] = { ...newSubQs[index], options: opts, _rawOptionsText: rawText };
                                    updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                  }}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={subQ.allow_add_item || false}
                                    onChange={(e) => {
                                      const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                      newSubQs[index] = { ...newSubQs[index], allow_add_item: e.target.checked };
                                      updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                    }}
                                  />
                                  Adicionar opção "Outros" (Permite texto livre)
                                </label>

                                {/* Pesos das Opções da Sub-pergunta do Repetidor */}
                                {subQ.options && subQ.options.length > 0 && (
                                  <div className="pt-2 mt-1 border-t border-slate-100 space-y-1.5 bg-slate-50/80 p-2 rounded">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Pesos IMAPS (1 a 5)
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const count = subQ.options.length;
                                            const updatedOpts = subQ.options.map((o: any, oIdx: number) => ({
                                              ...o,
                                              weight: count === 1 ? 5 : Number((1 + (oIdx / (count - 1)) * 4).toFixed(1))
                                            }));
                                            const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                            newSubQs[index] = { ...newSubQs[index], options: updatedOpts };
                                            updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                                              ...selectedQuestion.sub_question_template,
                                              sub_questions: newSubQs
                                            });
                                          }}
                                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                                        >
                                          1→5
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const count = subQ.options.length;
                                            const updatedOpts = subQ.options.map((o: any, oIdx: number) => ({
                                              ...o,
                                              weight: count === 1 ? 5 : Number((5 - (oIdx / (count - 1)) * 4).toFixed(1))
                                            }));
                                            const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                            newSubQs[index] = { ...newSubQs[index], options: updatedOpts };
                                            updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                                              ...selectedQuestion.sub_question_template,
                                              sub_questions: newSubQs
                                            });
                                          }}
                                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                                        >
                                          5→1
                                        </button>
                                      </div>
                                    </div>
                                    {subQ.options.map((opt: any, optIdx: number) => (
                                      <div key={opt.id || optIdx} className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-slate-600 truncate flex-1" title={opt.label}>
                                          {opt.label}
                                        </span>
                                        <input
                                          type="number"
                                          step="0.5"
                                          placeholder="N/A"
                                          value={opt.weight ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            const updatedOpts = subQ.options.map((o: any, i: number) =>
                                              i === optIdx ? { ...o, weight: val } : o
                                            );
                                            const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                            newSubQs[index] = { ...newSubQs[index], options: updatedOpts };
                                            updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                                              ...selectedQuestion.sub_question_template,
                                              sub_questions: newSubQs
                                            });
                                          }}
                                          className="w-14 text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center outline-none focus:border-indigo-500 font-semibold text-slate-800"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Condition UI */}
                          {index > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Condição de Exibição (Opcional)</label>
                              <select
                                value={subQ.depends_on_id || ''}
                                onChange={(e) => {
                                  const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                  newSubQs[index] = { ...newSubQs[index], depends_on_id: e.target.value || undefined, depends_on_label: undefined };
                                  updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                }}
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-700"
                              >
                                <option value="">Sempre exibir</option>
                                {selectedQuestion.sub_question_template.sub_questions.slice(0, index).filter((sq: any) => sq.type === 'RADIO_SINGLE' || sq.type === 'CHECKBOX_MULTIPLE').map((sq: any) => (
                                  <option key={sq.id} value={sq.id}>Se a resposta de "{sq.label || 'Sem título'}" for...</option>
                                ))}
                              </select>

                              {subQ.depends_on_id && (
                                <input
                                  type="text"
                                  placeholder="Resposta exata (ex: Sim)"
                                  value={subQ.depends_on_label || ''}
                                  onChange={(e) => {
                                    const newSubQs = [...(selectedQuestion.sub_question_template.sub_questions || [])];
                                    newSubQs[index] = { ...newSubQs[index], depends_on_label: e.target.value };
                                    updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                                  }}
                                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                />
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              const newSubQs = selectedQuestion.sub_question_template.sub_questions.filter((_: any, i: number) => i !== index);
                              updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', { ...selectedQuestion.sub_question_template, sub_questions: newSubQs });
                            }}
                            className="absolute right-1 top-1 text-slate-400 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover/sub:opacity-100 p-1 cursor-pointer"
                            title="Remover sub-pergunta"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          const newSub = { id: generateId(), type: 'TEXT_SHORT', label: 'Nova sub-pergunta', options: [] };
                          const currentSubs = selectedQuestion.sub_question_template?.sub_questions || [];
                          updateQuestionProperty(activeSectionId, selectedQuestion.id, 'sub_question_template', {
                            ...selectedQuestion.sub_question_template,
                            sub_questions: [...currentSubs, newSub]
                          });
                        }}
                        className="w-full py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 border-dashed rounded flex justify-center items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Adicionar Sub-pergunta
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </aside>
    </>
  );
}

