const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'src/lib/api.ts');
let content = fs.readFileSync(p, 'utf-8');

const originalFunction = `export async function createEmptyForm(title: string = "Novo Formulário"): Promise<Form> {
  const newFormId = crypto.randomUUID();
  const form: Form = {
    id: newFormId,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "",
    sections: []
  };

  const { error } = await supabase.from('forms').insert({
    id: form.id,
    title: form.title,
    created_at: form.created_at,
    updated_at: form.updated_at
  });
  if (error) throw error;
  
  return form;
}

export async function saveFormState(form: Form) {
  try {
    // 1. Upsert Form
    const { error: formError } = await supabase
      .from('forms')
      .upsert({
        id: form.id,
        title: form.title,
        updated_at: new Date().toISOString(),
        user_id: form.user_id || null,
        share_token: form.share_token || null,
        settings: form.settings || null
      }, { onConflict: 'id' });

    if (formError) throw formError;

    const { error: deleteError } = await supabase
      .from('sections')
      .delete()
      .eq('form_id', form.id);
      
    if (deleteError) throw deleteError;

    if (!form.sections || form.sections.length === 0) return { success: true };

    const sectionsData = form.sections.map(s => ({
      id: s.id,
      form_id: s.form_id,
      title: s.title,
      description: s.description,
      video_url: s.video_url || null,
      unlock_at_seconds: s.unlock_at_seconds || null,
      order_index: s.order_index
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sectionsData);

    if (sectionsError) throw sectionsError;

    const questionsData: any[] = [];
    form.sections.forEach(sec => {
      if (sec.questions) {
        sec.questions.forEach(q => {
          questionsData.push({
            id: q.id,
            section_id: sec.id,
            type: q.type,
            label: q.label,
            required: q.required,
            allow_add_item: q.allow_add_item,
            trigger_source_question_id: q.trigger_source_question_id || null,
            sub_question_template: (() => {
              let tpl = q.sub_question_template || {};
              if (q.type === 'MEDIA_VIDEO') tpl = { ...tpl, video_url: q.video_url };
              if (q.tags) tpl = { ...tpl, tags: q.tags };
              return Object.keys(tpl).length > 0 ? tpl : null;
            })(),
            order_index: q.order_index
          });
        });
      }
    });

    if (questionsData.length > 0) {
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);
        
      if (questionsError) throw questionsError;
    }

    // 4. Insert Options
    const optionsData: any[] = [];
    form.sections.forEach(sec => {
      if (sec.questions) {
        sec.questions.forEach(q => {
          if (q.options) {
            q.options.forEach(opt => {
              optionsData.push({
                id: opt.id,
                question_id: q.id,
                label: opt.label,
                weight: opt.weight || null,
                order_index: opt.order_index
              });
            });
          }
        });
      }
    });

    if (optionsData.length > 0) {
      const { error: optionsError } = await supabase
        .from('options')
        .insert(optionsData);
        
      if (optionsError) throw optionsError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving form to DB:', error);
    return { success: false, error };
  }
}
`;

content = content.replace(/export async function createEmptyForm[\s\S]+?Error saving form to DB:[\s\S]+?\}\n\}/, originalFunction);
fs.writeFileSync(p, content);
console.log('Fixed');
