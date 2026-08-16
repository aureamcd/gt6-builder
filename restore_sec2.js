import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const formId = "2efd1df6-4480-4d7e-9b27-352abf41c6d2";
const generateId = () => crypto.randomUUID();

const formStructure = [
  {
    title: "Seção 2 – Interoperabilidade Técnica e Fluxo de Dados (TIMAPS)",
    description: "Agora vamos falar sobre como as informações circulam entre os sistemas que você utiliza. Primeiro, assista ao vídeo com as orientações desta seção. Em seguida, responda às perguntas.",
    questions: [
      { 
        type: "MEDIA_VIDEO", 
        label: "Vídeo de Orientações", 
        sub_question_template: { video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", unlock_at_seconds: 15 }
      },
      { 
        type: "RADIO_SINGLE", 
        label: "7. Os sistemas conseguem identificar automaticamente o mesmo paciente?", 
        options: ["Sim, utilizando CNS ou CPF.", "Não, o mesmo paciente pode ter registros diferentes.", "Não sei informar."], 
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "8. Como as informações passam de um sistema para outro?", 
        options: ["Automaticamente, sem intervenção.", "Por meio de arquivos exportados e importados.", "Manualmente, digitando as informações novamente.", "Não sei informar."], 
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "9. Os sistemas compartilham informações automaticamente?", 
        options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca", "Não sei informar"],
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "10. Quando uma informação é alterada em um sistema, ela é atualizada automaticamente nos outros?", 
        options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca", "Não sei informar"],
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "11. Você precisa redigitar informações que já foram registradas em outro sistema?", 
        options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"],
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "12. Com que frequência você encontra problemas ao trocar informações entre os sistemas?", 
        options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre", "Não sei informar"],
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "13. As informações de que você precisa ficam disponíveis quando você precisa delas?", 
        options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca", "Não sei informar"],
        required: true
      }
    ]
  }
];

async function run() {
  console.log("Adicionando a Seção 2...");
  
  const { data: existingSections } = await supabase.from('sections').select('order_index').eq('form_id', formId);
  let startOrder = 0;
  if (existingSections && existingSections.length > 0) {
    startOrder = Math.max(...existingSections.map(s => s.order_index)) + 1;
  }

  for (let sIdx = 0; sIdx < formStructure.length; sIdx++) {
    const s = formStructure[sIdx];
    const sectionId = generateId();
    console.log(`Inserting section: ${s.title}`);
    
    await supabase.from('sections').insert({
      id: sectionId,
      form_id: formId,
      title: s.title,
      description: s.description || null,
      order_index: startOrder + sIdx,
    });

    for (let qIdx = 0; qIdx < s.questions.length; qIdx++) {
      const q = s.questions[qIdx];
      const questionId = generateId();
      
      await supabase.from('questions').insert({
        id: questionId,
        section_id: sectionId,
        type: q.type,
        label: q.label,
        required: q.required || false,
        allow_add_item: q.allow_add_item || false,
        order_index: qIdx,
        sub_question_template: q.sub_question_template || null
      });

      if (q.options) {
        const optionRows = q.options.map((opt, oIdx) => ({
          id: generateId(),
          question_id: questionId,
          label: opt,
          order_index: oIdx,
        }));
        if (optionRows.length > 0) {
          await supabase.from('options').insert(optionRows);
        }
      }
    }
  }

  // Update the form timestamp
  await supabase.from('forms').update({ updated_at: new Date().toISOString() }).eq('id', formId);
  console.log("Seção 2 adicionada com sucesso!");
}

run().catch(console.error);
