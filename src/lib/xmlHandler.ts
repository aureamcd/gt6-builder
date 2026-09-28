import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { Form, Section, Question, Option } from "../types/form";

export const exportFormToXML = (schema: Form): { content: string; filename: string } => {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    arrayNodeName: "item",
  });
  const xmlContent = builder.build({ FormSchema: schema });
  const filename = `schema_${schema.title?.replace(/\s+/g, '_') || 'form'}.xml`;
  return {
    content: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xmlContent,
    filename
  };
};

export const parseFormFromXML = (xmlContent: string): Form => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    isArray: (name: string) => { 
      return ['sections', 'questions', 'options', 'sub_questions'].includes(name);
    }
  });

  const parsed = parser.parse(xmlContent);
  if (!parsed || !parsed.FormSchema) {
    throw new Error("Formato XML inválido. Elemento 'FormSchema' não encontrado.");
  }

  const raw = parsed.FormSchema;

  // Normalização profunda para garantir integridade do formulário e evitar objetos nulos ou tipos corrompidos
  const normalizedSections: Section[] = (Array.isArray(raw.sections) ? raw.sections : (raw.sections ? [raw.sections] : [])).map((sec: any, sIdx: number) => {
    const secId = String(sec.id || crypto.randomUUID());
    const rawQuestions = Array.isArray(sec.questions) ? sec.questions : (sec.questions ? [sec.questions] : []);

    const questions: Question[] = rawQuestions.map((q: any, qIdx: number) => {
      const qId = String(q.id || crypto.randomUUID());

      // Normalizar options
      let cleanOptions = undefined;
      if (Array.isArray(q.options)) {
        const filtered = q.options.filter((opt: any) => opt !== null && opt !== undefined && opt !== "");
        if (filtered.length > 0) {
          cleanOptions = filtered.map((opt: any, oIdx: number) => {
            if (typeof opt === 'object' && opt !== null) {
              return {
                id: String(opt.id || crypto.randomUUID()),
                question_id: qId,
                label: String(opt.label !== undefined && opt.label !== null ? opt.label : `Opção ${oIdx + 1}`),
                weight: opt.weight !== "" && opt.weight !== null && opt.weight !== undefined ? Number(opt.weight) : null,
                order_index: typeof opt.order_index === 'number' ? opt.order_index : oIdx,
                created_at: opt.created_at || new Date().toISOString()
              };
            }
            return {
              id: crypto.randomUUID(),
              question_id: qId,
              label: String(opt),
              weight: null,
              order_index: oIdx,
              created_at: new Date().toISOString()
            };
          });
        }
      }

      // Normalizar sub_question_template
      let cleanTpl = q.sub_question_template;
      if (typeof cleanTpl === 'string') {
        if (!cleanTpl.trim()) {
          cleanTpl = undefined;
        } else {
          try {
            cleanTpl = JSON.parse(cleanTpl);
          } catch {
            cleanTpl = undefined;
          }
        }
      } else if (cleanTpl && typeof cleanTpl === 'object') {
        if (cleanTpl.sub_questions && Array.isArray(cleanTpl.sub_questions)) {
          cleanTpl.sub_questions = cleanTpl.sub_questions.map((sq: any, sqIdx: number) => ({
            ...sq,
            id: String(sq.id || crypto.randomUUID()),
            label: String(sq.label || `Critério ${sqIdx + 1}`),
            options: Array.isArray(sq.options) ? sq.options.map((so: any) => ({
              id: String(so.id || crypto.randomUUID()),
              label: String(so.label !== undefined ? so.label : so)
            })) : undefined
          }));
        }
      } else {
        cleanTpl = undefined;
      }

      return {
        id: qId,
        section_id: secId,
        type: q.type || 'TEXT_SHORT',
        label: String(q.label || `Pergunta ${qIdx + 1}`),
        required: Boolean(q.required === true || q.required === 'true'),
        allow_add_item: Boolean(q.allow_add_item === true || q.allow_add_item === 'true'),
        order_index: typeof q.order_index === 'number' ? q.order_index : qIdx,
        created_at: q.created_at || new Date().toISOString(),
        options: cleanOptions,
        sub_question_template: cleanTpl,
        video_url: q.video_url || null,
        trigger_source_question_id: q.trigger_source_question_id || null,
        tags: Array.isArray(q.tags) ? q.tags : undefined
      };
    });

    return {
      id: secId,
      form_id: String(sec.form_id || raw.id || ''),
      title: String(sec.title || `Seção ${sIdx + 1}`),
      description: sec.description ? String(sec.description) : undefined,
      video_url: sec.video_url ? String(sec.video_url) : undefined,
      unlock_at_seconds: sec.unlock_at_seconds !== undefined && sec.unlock_at_seconds !== null && sec.unlock_at_seconds !== "" ? Number(sec.unlock_at_seconds) : undefined,
      order_index: typeof sec.order_index === 'number' ? sec.order_index : sIdx,
      created_at: sec.created_at || new Date().toISOString(),
      questions
    };
  });

  return {
    id: String(raw.id || ''),
    title: String(raw.title || 'Formulário Importado'),
    description: raw.description ? String(raw.description) : undefined,
    status: (raw.status === 'published' || raw.status === 'archived') ? raw.status : 'draft',
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: String(raw.user_id || ''),
    share_token: raw.share_token ? String(raw.share_token) : undefined,
    settings: {
      visibility: raw.settings?.visibility === 'private' ? 'private' : 'public',
      access_token: raw.settings?.access_token ? String(raw.settings.access_token) : '',
      show_estimated_time: Boolean(raw.settings?.show_estimated_time === true || raw.settings?.show_estimated_time === 'true')
    },
    sections: normalizedSections
  };
};

