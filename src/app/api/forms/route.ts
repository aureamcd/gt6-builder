import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    
    if (!body.form_id || !body.title) {
      return NextResponse.json({ error: 'form_id and title are required' }, { status: 400 });
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
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Form saved successfully', data });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
