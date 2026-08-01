import { supabase } from './supabase';
import { Form, Section, Question, Option } from '../types/form';

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function getForms(): Promise<Form[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('user_id', authData.user.id)
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
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id || null;

  const newFormId = generateUUID();
  const form: Form = {
    id: newFormId,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId,
    sections: []
  };

  const { error } = await supabase.from('forms').insert({
    id: form.id,
    title: form.title,
    created_at: form.created_at,
    updated_at: form.updated_at,
    user_id: form.user_id
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
        share_token: form.share_token || null
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

export async function submitFormResponse(formId: string, answers: any) {
  const { error } = await supabase.from('submissions').insert({
    form_id: formId,
    answers: answers
  });
  
  if (error) throw error;
  return true;
}

export async function getFormSubmissions(formId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('form_id', formId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function generateShareToken(formId: string): Promise<string> {
  const token = generateUUID();
  const { error } = await supabase
    .from('forms')
    .update({ share_token: token })
    .eq('id', formId);
    
  if (error) throw error;
  return token;
}

export async function cloneFormByToken(token: string): Promise<Form | null> {
  // 1. Get current logged in user
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  
  if (!userId) throw new Error("Usuário não autenticado");

  // 2. Find form by share_token
  const { data: sourceForm, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('share_token', token)
    .single();
    
  if (formError || !sourceForm) throw new Error("Token inválido ou formulário não encontrado");

  // 3. Fetch full source form with sections/questions/options
  const fullSourceForm = await getFormById(sourceForm.id);
  if (!fullSourceForm) throw new Error("Erro ao carregar estrutura do formulário original");

  // 4. Create new cloned form with new IDs
  const newFormId = generateUUID();
  
  const clonedForm: Form = {
    ...fullSourceForm,
    id: newFormId,
    title: `${fullSourceForm.title} (Cópia)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId,
    share_token: null, // Don't copy the share token
    sections: fullSourceForm.sections?.map(sec => {
      const newSecId = generateUUID();
      return {
        ...sec,
        id: newSecId,
        form_id: newFormId,
        questions: sec.questions?.map(q => {
          const newQId = generateUUID();
          return {
            ...q,
            id: newQId,
            section_id: newSecId,
            options: q.options?.map(opt => ({
              ...opt,
              id: generateUUID(),
              question_id: newQId
            }))
          };
        })
      };
    })
  };

  // 5. Save the cloned form to the DB
  const result = await saveFormState(clonedForm);
  if (!result.success) throw result.error;
  
  return clonedForm;
}
