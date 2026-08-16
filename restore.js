import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const formId = "2efd1df6-4480-4d7e-9b27-352abf41c6d2"; // Assuming this is the current form
const generateId = () => crypto.randomUUID();

const formStructure = [
  {
    title: "Seção 1 – Identificação e Sistemas Utilizados",
    description: "Vamos começar conhecendo um pouco sobre você e sua rotina de trabalho. Primeiro, assista ao vídeo com as orientações desta seção. Em seguida, responda às perguntas abaixo.",
    questions: [
      { 
        type: "MEDIA_VIDEO", 
        label: "Vídeo de Orientações", 
        sub_question_template: { video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", unlock_at_seconds: 15 }
      },
      { 
        type: "DROPDOWN", 
        label: "1. Em qual unidade ou serviço você trabalha?", 
        options: ["UBS", "UPA", "Hospital", "CAPS", "Secretaria Municipal de Saúde"], 
        allow_add_item: true,
        required: true
      },
      { 
        type: "DROPDOWN", 
        label: "2. Qual é a sua função?", 
        options: ["Médico(a)", "Enfermeiro(a)", "Técnico(a) de Enfermagem", "Agente Comunitário de Saúde", "Farmacêutico(a)", "Dentista", "Recepcionista", "Gestor(a)"], 
        allow_add_item: true,
        required: true
      },
      { 
        type: "RADIO_SINGLE", 
        label: "3. Há quanto tempo você atua nessa função?", 
        options: ["Menos de 1 ano", "Entre 1 e 3 anos", "Entre 4 e 10 anos", "Mais de 10 anos"],
        required: true
      },
      { 
        type: "DYNAMIC_REPEATER", 
        label: "4. Quais sistemas você utiliza no seu dia a dia?", 
        options: ["Prontuário Eletrônico (PEC e-SUS)", "Regula Piauí", "Salutem", "GAL", "Hórus", "SISREG"], 
        allow_add_item: true,
        required: true,
        sub_question_template: {
          sub_questions: [
            {
              id: generateId(),
              type: "RADIO_SINGLE",
              label: "Com que frequência você utiliza este sistema?",
              options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"],
              required: true
            },
            {
              id: generateId(),
              type: "DROPDOWN",
              label: "Qual é o principal módulo que você utiliza neste sistema?",
              options: ["Cadastro", "Agendamento", "Atendimento", "Regulação", "Exames", "Farmácia"],
              allow_add_item: true,
              required: true
            },
            {
              id: generateId(),
              type: "RADIO_SINGLE",
              label: "Você precisa realizar alguma atividade manual para complementar ou corrigir informações deste sistema?",
              options: ["Sim", "Não"],
              required: true
            },
            {
              id: generateId(),
              type: "TEXT_SHORT",
              label: "Qual atividade?",
              required: false
            },
            {
              id: generateId(),
              type: "RADIO_SINGLE",
              label: "Com que frequência você realiza essa atividade?",
              options: ["Sempre", "Frequentemente", "Às vezes", "Raramente"],
              required: false
            }
          ]
        }
      }
    ]
  }
];

async function run() {
  console.log("Restaurando a Seção 1...");
  
  // Clean up current sections just in case
  await supabase.from('sections').delete().eq('form_id', formId);

  let startOrder = 0;

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
  console.log("Restauração concluída! Recarregue a página.");
}

run().catch(console.error);
