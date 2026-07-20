import { supabase } from './supabase';
import { Form, Section, Question, Option } from '../types/form';

export async function getForms(): Promise<Form[]> {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .order('updated_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function getFormById(id: string): Promise<Form | null> {
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single();

  if (formError || !form) return null;

  const { data: sections } = await supabase
    .from('sections')
    .select('*, questions(*, options(*))')
    .eq('form_id', id)
    .order('order_index');

  // Supabase returns nested relations, we just need to ensure the sorting is correct
  if (sections) {
    sections.forEach(s => {
      s.questions?.sort((a: any, b: any) => a.order_index - b.order_index);
      s.questions?.forEach((q: any) => {
        q.options?.sort((a: any, b: any) => a.order_index - b.order_index);
      });
    });
  }

  return {
    ...form,
    sections: sections || []
  };
}

export async function createEmptyForm(title: string = "Novo Formulário"): Promise<Form> {
  const newFormId = crypto.randomUUID();
  const form: Form = {
    id: newFormId,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (formError) throw formError;

    // We will save sections, questions and options.
    // To handle deletions (things removed in UI), we can delete existing ones not in the payload.
    // Or simpler for a sketch: delete all sections for this form and recreate them (cascade will handle questions/options).
    // Let's do the clean approach: Delete all sections, then insert everything.
    
    // WARNING: In production, you might want to carefully upsert and delete missing items to preserve answer data.
    // Since this is a builder sketch, wiping and rewriting structure is the easiest way to perfectly sync state.
    const { error: deleteError } = await supabase
      .from('sections')
      .delete()
      .eq('form_id', form.id);
      
    if (deleteError) throw deleteError;

    if (!form.sections || form.sections.length === 0) return { success: true };

    // 2. Insert Sections
    const sectionsData = form.sections.map(s => ({
      id: s.id,
      form_id: s.form_id,
      title: s.title,
      description: s.description,
      order_index: s.order_index
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sectionsData);

    if (sectionsError) throw sectionsError;

    // 3. Insert Questions
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
            sub_question_template: q.sub_question_template || null,
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
