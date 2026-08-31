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

export async function registerAccessedForm(formId: string) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    
    const currentShared: string[] = authData.user.user_metadata?.shared_forms || [];
    if (!currentShared.includes(formId)) {
      const updatedShared = [...currentShared, formId];
      await supabase.auth.updateUser({
        data: { ...authData.user.user_metadata, shared_forms: updatedShared }
      });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`gt6_shared_forms_${authData.user.id}`, JSON.stringify(updatedShared));
      }
    }
  } catch (err) {
    console.error("Erro ao registrar formulário compartilhado:", err);
  }
}

export async function removeSharedForm(formId: string) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    const currentShared: string[] = authData.user.user_metadata?.shared_forms || [];
    const updatedShared = currentShared.filter(id => id !== formId);
    await supabase.auth.updateUser({
      data: { ...authData.user.user_metadata, shared_forms: updatedShared }
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`gt6_shared_forms_${authData.user.id}`, JSON.stringify(updatedShared));
    }
  } catch (err) {
    console.error("Erro ao remover formulário compartilhado:", err);
  }
}

export async function getForms(): Promise<Form[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return [];

  // 1. Formulários criados pelo próprio usuário logado
  const { data: myForms, error } = await supabase
    .from('forms')
    .select('*')
    .eq('user_id', authData.user.id)
    .order('updated_at', { ascending: false });
    
  if (error) throw error;

  const result: Form[] = (myForms || []).map(f => ({ ...f, is_shared: false }));

  // 2. Formulários compartilhados que o usuário acessou via colaboração
  let sharedIds: string[] = authData?.user?.user_metadata?.shared_forms || [];
  if (typeof window !== 'undefined') {
    try {
      const localShared = JSON.parse(sessionStorage.getItem(`gt6_shared_forms_${authData.user.id}`) || '[]');
      sharedIds = Array.from(new Set([...sharedIds, ...localShared]));
    } catch (e) {}
  }

  const validSharedIds = sharedIds.filter(id => !result.some(f => f.id === id));

  if (validSharedIds.length > 0) {
    const { data: sharedForms } = await supabase
      .from('forms')
      .select('*')
      .in('id', validSharedIds);

    if (sharedForms) {
      sharedForms.forEach(sf => {
        result.push({ ...sf, is_shared: true });
      });
    }
  }

  return result;
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
        if (q.sub_question_template) {
          if (q.type === 'MEDIA_VIDEO' && q.sub_question_template.video_url) {
            q.video_url = q.sub_question_template.video_url;
          }
          if (q.sub_question_template.tags) {
            q.tags = q.sub_question_template.tags;
          }
        }
      });
    });
  }

  return {
    ...form,
    sections: sections || []
  };
}

export function generateAccessToken(prefix: string = "GT-"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
}

export async function createEmptyForm(
  title: string = "Novo Formulário",
  settings?: import('../types/form').FormSettings
): Promise<Form> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id || null;

  const newFormId = generateUUID();
  const shareToken = generateUUID();
  const defaultSettings: import('../types/form').FormSettings = settings || { visibility: 'public' };

  const form: Form = {
    id: newFormId,
    title,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId || "",
    share_token: shareToken,
    settings: defaultSettings,
    sections: []
  };

  const { error } = await supabase.from('forms').insert({
    id: form.id,
    title: form.title,
    created_at: form.created_at,
    updated_at: form.updated_at,
    user_id: userId,
    share_token: shareToken,
    settings: defaultSettings
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

    // We will save sections, questions and options.
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
      video_url: s.video_url || null,
      unlock_at_seconds: s.unlock_at_seconds || null,
      order_index: s.order_index
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .upsert(sectionsData, { onConflict: 'id' });

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
        .upsert(questionsData, { onConflict: 'id' });
        
      if (questionsError) throw questionsError;
    }

    // 4. Insert Options
    const optionsData: any[] = [];
    form.sections.forEach(sec => {
      if (sec.questions) {
        sec.questions.forEach(q => {
          if (q.options) {
            q.options.forEach((opt, idx) => {
              optionsData.push({
                id: opt.id,
                question_id: q.id,
                label: opt.label,
                weight: opt.weight || null,
                order_index: opt.order_index ?? idx
              });
            });
          }
        });
      }
    });

    if (optionsData.length > 0) {
      const { error: optionsError } = await supabase
        .from('options')
        .upsert(optionsData, { onConflict: 'id' });
        
      if (optionsError) throw optionsError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving form to DB:', error);
    return { success: false, error };
  }
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

export async function getFormByShareToken(token: string): Promise<Form | null> {
  let { data: sourceForm, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('share_token', token)
    .single();
    
  if (!sourceForm) {
    const { data: byId } = await supabase
      .from('forms')
      .select('*')
      .eq('id', token)
      .single();
    if (byId) sourceForm = byId;
  }

  if (!sourceForm) return null;

  return getFormById(sourceForm.id);
}

export async function cloneFormByToken(token: string, passcode?: string): Promise<Form | null> {
  const sourceForm = await getFormByShareToken(token);
  if (!sourceForm) throw new Error("Formulário não encontrado para este token");

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id || "";

  // Se o formulário for privado e o usuário não for o dono, exigir e validar o código de acesso
  const isPrivate = sourceForm.settings?.visibility === 'private' && Boolean(sourceForm.settings?.access_token);
  const isOwner = userId && userId === sourceForm.user_id;

  if (isPrivate && !isOwner) {
    if (!passcode || passcode.trim().toUpperCase() !== sourceForm.settings?.access_token?.trim().toUpperCase()) {
      throw new Error("Código de acesso incorreto ou obrigatório para clonar este template privado.");
    }
  }

  const newFormId = generateUUID();
  const clonedForm: Form = {
    ...sourceForm,
    id: newFormId,
    title: `${sourceForm.title} (Cópia)`,
    user_id: userId,
    share_token: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: sourceForm.sections?.map(s => {
      const newSectionId = generateUUID();
      return {
        ...s,
        id: newSectionId,
        form_id: newFormId,
        questions: s.questions?.map(q => {
          const newQuestionId = generateUUID();
          return {
            ...q,
            id: newQuestionId,
            section_id: newSectionId,
            options: q.options?.map(o => ({
              ...o,
              id: generateUUID(),
              question_id: newQuestionId
            }))
          };
        })
      };
    }) || []
  };

  await saveFormState(clonedForm);
  return clonedForm;
}

export async function getComments(formId: string) {
  const { data, error } = await supabase
    .from('form_comments')
    .select('*')
    .eq('form_id', formId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return data || [];
}

export async function addComment(formId: string, elementId: string, text: string) {
  const { data, error } = await supabase
    .from('form_comments')
    .insert([
      { form_id: formId, element_id: elementId, text, status: 'open' }
    ])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }
  return data;
}

export async function updateCommentStatus(commentId: string, status: 'open' | 'resolved') {
  const { data, error } = await supabase
    .from('form_comments')
    .update({ status })
    .eq('id', commentId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating comment:', error);
    return null;
  }
  return data;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('form_comments')
    .delete()
    .eq('id', commentId);
    
  if (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
  return true;
}

export async function submitFormResponse(formId: string, answersData: { question_id: string, answer_text?: string | null, answer_json?: any }[]) {
  // 1. Create a response entry
  const { data: response, error: responseError } = await supabase
    .from('responses')
    .insert({
      form_id: formId,
      submitted_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (responseError) {
    console.error("Error creating response:", responseError);
    return { success: false, error: responseError };
  }

  const responseId = response.id;

  // 2. Prepare and insert answers
  const formattedAnswers = answersData.map(a => ({
    response_id: responseId,
    question_id: a.question_id,
    answer_text: a.answer_text || null,
    answer_json: a.answer_json || null
  }));

  if (formattedAnswers.length > 0) {
    const { error: answersError } = await supabase
      .from('answers')
      .insert(formattedAnswers);

    if (answersError) {
      console.error("Error inserting answers:", answersError);
      return { success: false, error: answersError };
    }
  }

  // 3. Broadcast realtime event to form builder
  try {
    const channel = supabase.channel(`form_builder_realtime_${formId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'new_response_submitted',
          payload: {
            formId,
            responseId,
            submittedAt: new Date().toISOString()
          }
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        });
      }
    });
  } catch (e) {
    console.warn("Could not broadcast response submission:", e);
  }

  return { success: true, responseId };
}

export async function getFormResponses(formId: string) {
  const { data: responses, error: respError } = await supabase
    .from('responses')
    .select('*, answers(*)')
    .eq('form_id', formId)
    .order('submitted_at', { ascending: false });

  if (respError) {
    console.error('Error fetching responses:', respError);
    return [];
  }

  return responses || [];
}

export async function deleteForm(formId: string): Promise<boolean> {
  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('id', formId);

  if (error) {
    console.error('Error deleting form:', error);
    throw error;
  }

  return true;
}
