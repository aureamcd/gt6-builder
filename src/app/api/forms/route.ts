import { NextResponse } from 'next/server';
import { supabase, getFriendlyErrorMessage } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    
    if (!body.form_id || !body.title) {
      return NextResponse.json({ error: 'O ID do formulário e o título são obrigatórios.' }, { status: 400 });
    }

    // Insert or update (upsert) the form in the 'forms' table
    const { data, error } = await supabase
      .from('forms')
      .upsert({
        id: body.form_id,
        title: body.title,
        schema: body, // store the whole object as jsonb
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Erro Supabase:', error);
      return NextResponse.json({ error: getFriendlyErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ message: 'Formulário salvo com sucesso.', data });

  } catch (error: any) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: getFriendlyErrorMessage(error) }, { status: 500 });
  }
}
