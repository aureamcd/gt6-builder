function QuestionRenderer({ question, number, value, hasError, onChange, onVideoTimeUpdate }: { question: any, number: number | string, value: any, hasError?: boolean, onChange: (val: any) => void, onVideoTimeUpdate?: (time: number) => void }) {
  const maxTimeRef = useRef<number>(0);
  return (
    <div 
      id={`prev_q_${question.id}`}
      className={`group transition-all duration-300 rounded-2xl ${hasError ? 'p-4 sm:p-5 bg-red-50/60 border-2 border-red-300 shadow-sm ring-4 ring-red-50' : 'p-1'}`}
    >
      <div className="flex items-start mb-4">
        <span className={`font-bold mr-3 text-lg mt-0.5 ${hasError ? 'text-red-500' : 'text-slate-400'}`}>{number}.</span>
        <div>
          <label className={`font-semibold text-lg leading-snug ${hasError ? 'text-red-900' : 'text-slate-800'}`}>
            {question.label || "Pergunta sem título"}
            {question.required && <span className="text-red-500 ml-1 font-bold" title="Obrigatório">*</span>}
          </label>
          {hasError && (
            <p className="text-xs font-semibold text-red-600 mt-1">
              * Pergunta obrigatória. Por favor, preencha para prosseguir.
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
            
            {/* Display multiple "Other" options that have been added */}
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
               <img src={question.sub_question_template.image_url} alt="Media preview" className="max-w-full rounded-lg shadow-sm max-h-[500px] object-contain border border-slate-200" />
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
                />
              </div>
            ) : question.video_url && question.video_url.includes('supabase.co') ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-black">
                <video 
                  className="w-full max-h-[500px]"
                  src={question.video_url}
                  controls
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
