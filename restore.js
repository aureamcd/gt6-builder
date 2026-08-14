const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

function generateUUID() {
  return crypto.randomUUID();
}

async function restore() {
  const formId = '2efd1df6-4480-4d7e-9b27-352abf41c6d2';

  // Wipe old just in case
  await supabase.from('sections').delete().eq('form_id', formId);

  const section1Id = generateUUID();
  const sectionsData = [{
    id: section1Id,
    form_id: formId,
    title: 'Seção 1 – Identificação e Perfil Tecnológico',
    description: 'Identificar gargalos técnicos, semânticos, organizacionais e legais no fluxo de dados da rede municipal de saúde, a fim de subsidiar melhorias na integração de sistemas.',
    order_index: 0
  }];

  await supabase.from('sections').insert(sectionsData);

  const questionsData = [];
  const optionsData = [];

  function addQ(type, label, opts = []) {
    const qId = generateUUID();
    questionsData.push({
      id: qId,
      section_id: section1Id,
      type: type,
      label: label,
      required: false,
      allow_add_item: false,
      order_index: questionsData.length
    });
    opts.forEach((opt, idx) => {
      optionsData.push({
        id: generateUUID(),
        question_id: qId,
        label: opt,
        order_index: idx
      });
    });
  }

  addQ('TEXT_SHORT', '1. Unidade/Serviço');
  addQ('TEXT_SHORT', '2. Cargo/Função');
  addQ('RADIO_SINGLE', '3. Tempo de atuação', ['Menos de 1 ano', '1–3 anos', 'Mais de 3 anos']);
  addQ('CHECKBOX_MULTIPLE', '4. Sistemas utilizados simultaneamente', ['Prontuário Eletrônico (PEC e-SUS)', 'Regula Piauí', 'Salutem', 'Outro']);
  addQ('TEXT_SHORT', '4.1 Sistema utilizado:');
  addQ('RADIO_SINGLE', '4.1 Frequência de uso:', ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca']);
  addQ('RADIO_SINGLE', '4.2 Existem atividades realizadas manualmente para complementar ou corrigir informações dos sistemas?', ['Sim', 'Não']);
  addQ('TEXT_SHORT', 'Se sim: Qual atividade?');
  addQ('RADIO_SINGLE', 'Frequência da atividade manual:', ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca']);

  await supabase.from('questions').insert(questionsData);
  await supabase.from('options').insert(optionsData);

  console.log('Restaurado!');
}

restore().catch(console.error);
