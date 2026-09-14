const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuid } = require('crypto');

const supabase = createClient('https://gmpsqzohwxnzhvpalkmx.supabase.co', 'sb_publishable_72LpPhENZcb4izysMuWUxA_WmmSzt3h');

async function run() {
  const qId = uuid();
  const subQs = [
    { id: uuid(), label: 'Com que frequência você utiliza este sistema?', type: 'RADIO_SINGLE', options: ['Diariamente','Semanalmente','Raramente'].map(label => ({ id: uuid(), label })) },
    { id: uuid(), label: 'Qual é o principal módulo que você utiliza neste sistema?', type: 'TEXT_SHORT' },
    { id: uuid(), label: 'Você precisa realizar alguma atividade manual para complementar informações deste sistema?', type: 'RADIO_SINGLE', options: ['Sim','Não'].map(label => ({ id: uuid(), label })) },
    { id: uuid(), label: 'Se sim: Qual atividade?', type: 'TEXT_SHORT' },
    { id: uuid(), label: 'Se sim: Com que frequência você realiza essa atividade?', type: 'TEXT_SHORT' }
  ];

  const question = {
    id: qId,
    section_id: '2696e4db-8f6e-4c81-89ae-7ea21b9993b6',
    type: 'DYNAMIC_REPEATER',
    label: '5. Detalhes sobre os sistemas utilizados',
    required: false,
    allow_add_item: true,
    order_index: 4,
    sub_question_template: { sub_questions: subQs }
  };

  const { error } = await supabase.from('questions').insert(question);
  if (error) {
    console.error('Error inserting question', error);
    return;
  }

  const sistemas = ['Prontuário Eletrônico (PEC e-SUS)', 'Regula Piauí', 'Salutem'];
  const options = sistemas.map((s, i) => ({
    id: uuid(),
    question_id: qId,
    label: s,
    order_index: i
  }));

  const { error: optErr } = await supabase.from('options').insert(options);
  if (optErr) console.error('Error inserting options', optErr);
  else console.log('Restored DYNAMIC_REPEATER successfully!');
}

run();
