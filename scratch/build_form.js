const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://gmpsqzohwxnzhvpalkmx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72LpPhENZcb4izysMuWUxA_WmmSzt3h';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function uuid() {
  return crypto.randomUUID();
}

async function run() {
  console.log("Logging in as temp user...");
  // Sign in or sign up a temp user
  const email = 'temp-builder-admin@gt6.com';
  const password = 'TempPassword123!';
  
  let { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError && authError.message.includes('already registered')) {
    const res = await supabase.auth.signInWithPassword({ email, password });
    authData = res.data;
    authError = res.error;
  }
  
  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log("Logged in! User ID:", userId);
  
  const formId = uuid();
  const shareToken = uuid();
  
  console.log("Creating form...");
  const { error: formError } = await supabase.from('forms').insert({
    id: formId,
    title: 'Diagnóstico de Maturidade',
    user_id: userId,
    share_token: shareToken,
    settings: { visibility: 'private', access_token: '123456' }
  });
  
  if (formError) {
    console.error("Form error:", formError);
    return;
  }
  
  // Create sections
  const sections = [
    { id: uuid(), title: 'Seção 1 - Informações Iniciais', order_index: 0 },
    { id: uuid(), title: 'Seção 2 - Técnica', order_index: 1 },
    { id: uuid(), title: 'Seção 3 - Diagnósticos e Informações', order_index: 2 },
    { id: uuid(), title: 'Seção 4 - Fluxo e Atendimento', order_index: 3 },
    { id: uuid(), title: 'Seção 5 - Acesso e Permissões', order_index: 4 },
    { id: uuid(), title: 'Seção 6 - Impacto e Problemas', order_index: 5 },
    { id: uuid(), title: 'Seção 7 - Avaliação Geral', order_index: 6 }
  ];
  
  // Set descriptions with the video template
  const desc = 'Vamos falar sobre este tema. Primeiro, assista ao vídeo com as orientações. Em seguida, responda às perguntas.';
  for (const s of sections) {
    s.description = desc;
  }
  
  const sectionsToInsert = sections.map(s => ({
    id: s.id,
    form_id: formId,
    title: s.title,
    description: s.description,
    order_index: s.order_index
  }));
  
  await supabase.from('sections').insert(sectionsToInsert);
  
  console.log("Creating questions...");
  const questionsToInsert = [];
  const optionsToInsert = [];
  
  function addQ(secIdx, type, label, opts = []) {
    const qId = uuid();
    const q = {
      id: qId,
      section_id: sections[secIdx].id,
      type,
      label,
      required: true,
      allow_add_item: false,
      order_index: questionsToInsert.filter(q => q.section_id === sections[secIdx].id).length
    };
    questionsToInsert.push(q);
    
    opts.forEach((o, idx) => {
      optionsToInsert.push({
        id: uuid(),
        question_id: qId,
        label: o,
        order_index: idx
      });
    });
    return qId;
  }

  function addDynamicQ(secIdx, label, subQs) {
    const qId = uuid();
    const q = {
      id: qId,
      section_id: sections[secIdx].id,
      type: 'DYNAMIC_REPEATER',
      label,
      required: true,
      allow_add_item: true,
      order_index: questionsToInsert.filter(q => q.section_id === sections[secIdx].id).length,
      sub_question_template: { sub_questions: subQs }
    };
    questionsToInsert.push(q);
    return qId;
  }

  // Sec 1
  addQ(0, 'TEXT_SHORT', '1. Em qual unidade ou serviço você trabalha?');
  addQ(0, 'TEXT_SHORT', '2. Qual é a sua função?');
  addQ(0, 'RADIO_SINGLE', '3. Há quanto tempo você atua nessa função?', ['Menos de 1 ano', 'De 1 a 3 anos', 'Mais de 3 anos']);
  addDynamicQ(0, '4. Quais sistemas você utiliza no seu dia a dia?', [
    { id: uuid(), type: 'RADIO_SINGLE', label: '4.1 Com que frequência você utiliza este sistema?', options: [{label:'Sempre'},{label:'Frequentemente'},{label:'Às vezes'},{label:'Raramente'},{label:'Nunca'}], required: true },
    { id: uuid(), type: 'TEXT_SHORT', label: '4.2 Qual é o principal módulo que você utiliza neste sistema?', required: true },
    { id: uuid(), type: 'TEXT_LONG', label: '4.3 Você precisa realizar alguma atividade manual para complementar ou corrigir informações deste sistema? (Se sim: Qual atividade? Com que frequência?)', required: true }
  ]);

  // Sec 2
  addQ(1, 'RADIO_SINGLE', '7. Como as informações passam de um sistema para outro?', ['Automaticamente, sem intervenção.', 'Por meio de arquivos exportados e importados.', 'Manualmente, digitando as informações novamente.', 'Não sei informar.']);
  addQ(1, 'RADIO_SINGLE', '8. Os sistemas compartilham informações automaticamente?', ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca', 'Não sei informar']);
  addQ(1, 'RADIO_SINGLE', '9. Quando uma informação é alterada em um sistema, ela é atualizada automaticamente nos outros?', ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca', 'Não sei informar']);
  addQ(1, 'RADIO_SINGLE', '10. Você precisa redigitar informações que já foram registradas em outro sistema?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
  addQ(1, 'RADIO_SINGLE', '11. Os sistemas conseguem identificar automaticamente o mesmo paciente?', ['Sim, utilizando CNS ou CPF.', 'Não, o mesmo paciente pode ter registros diferentes.', 'Não sei informar.']);

  // Sec 3
  addQ(2, 'RADIO_SINGLE', '12. Como os diagnósticos são registrados no sistema que você utiliza?', ['Utilizando CID-10/CID-11', 'Digitando livremente', 'Utilizando códigos próprios do sistema', 'Não sei informar']);
  addQ(2, 'RADIO_SINGLE', '13. Quando você recebe informações de outro sistema, como elas aparecem?', ['Já aparecem organizadas nos campos do sistema.', 'Aparecem apenas como arquivo/anexo.', 'Não chegam ao sistema.', 'Não sei informar.']);
  addQ(2, 'RADIO_SINGLE', '14. Você encontra a mesma informação apresentada de formas diferentes nos sistemas?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
  addQ(2, 'RADIO_SINGLE', '15. Você precisa interpretar ou corrigir alguma informação ao passar de um sistema para outro?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
  addQ(2, 'RADIO_SINGLE', '16. Quanto você confia nas informações apresentadas pelos sistemas?', ['1 — Nada', '2 — Pouco', '3 — Moderadamente', '4 — Muito', '5 — Totalmente']);

  // Sec 4
  addQ(3, 'RADIO_SINGLE', '17. Você consegue ver o histórico do paciente realizado em outras unidades?', ['Sim, o histórico é unificado.', 'Apenas quando o paciente traz documentos.', 'Não.']);
  addQ(3, 'RADIO_SINGLE', '18. Você precisa entrar em contato com outra unidade para confirmar informações?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
  addQ(3, 'RADIO_SINGLE', '19. O atendimento consegue seguir normalmente quando o paciente passa de uma unidade para outra?', ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca']);
  addQ(3, 'RADIO_SINGLE', '20. Você percebe diferenças na forma como o atendimento é realizado entre as unidades?', ['Sim', 'Não', 'Não sei informar']);
  addQ(3, 'RADIO_SINGLE', '21. Você utiliza outros meios, como WhatsApp ou e-mail, para suprir dificuldades dos sistemas oficiais?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
  addQ(3, 'CHECKBOX_MULTIPLE', '22. Para que você utiliza esses meios?', ['Comunicação com paciente', 'Confirmação de consulta', 'Compartilhamento de exames', 'Compartilhamento de informações clínicas', 'Outro']);

  // Sec 5
  addQ(4, 'RADIO_SINGLE', '23. Você encontra alguma dificuldade para acessar informações necessárias ao atendimento?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);
  addQ(4, 'RADIO_SINGLE', '24. Você sabe quais informações podem ser compartilhadas entre os sistemas?', ['Sim', 'Parcialmente', 'Não']);
  addQ(4, 'RADIO_SINGLE', '25. Você já deixou de acessar uma informação necessária por causa das permissões do sistema?', ['Sim', 'Não', 'Não sei informar']);
  addQ(4, 'RADIO_SINGLE', '26. Você tem dúvidas sobre quem pode acessar ou compartilhar determinadas informações?', ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre']);

  // Sec 6
  addQ(5, 'CHECKBOX_MULTIPLE', '27. Quais problemas você já percebeu por causa da falta de integração entre os sistemas?', ['Duplicidade de exames', 'Divergência em medicamentos', 'Atraso na regulação', 'Perda de vaga', 'Cadastro desatualizado', 'Perda de informações clínicas', 'Outro']);
  addQ(5, 'RADIO_SINGLE', '28. Quanto tempo por dia você estima perder por causa de dificuldades entre os sistemas?', ['Menos de 30 minutos', 'De 30 minutos a 1 hora', 'Mais de 1 hora']);
  
  // For Likert scale in question 29:
  addQ(5, 'RADIO_SINGLE', '29.1 Quanto a falta de integração impacta no Tempo de Atendimento? (1 = Nenhum impacto | 5 = Impacto muito alto)', ['1', '2', '3', '4', '5']);
  addQ(5, 'RADIO_SINGLE', '29.2 Quanto a falta de integração impacta no Retrabalho? (1 = Nenhum impacto | 5 = Impacto muito alto)', ['1', '2', '3', '4', '5']);
  addQ(5, 'RADIO_SINGLE', '29.3 Quanto a falta de integração impacta na Segurança do Paciente? (1 = Nenhum impacto | 5 = Impacto muito alto)', ['1', '2', '3', '4', '5']);
  addQ(5, 'RADIO_SINGLE', '29.4 Quanto a falta de integração impacta na Comunicação entre Equipes? (1 = Nenhum impacto | 5 = Impacto muito alto)', ['1', '2', '3', '4', '5']);
  addQ(5, 'RADIO_SINGLE', '29.5 Quanto a falta de integração impacta na Confiabilidade das Informações? (1 = Nenhum impacto | 5 = Impacto muito alto)', ['1', '2', '3', '4', '5']);

  // Sec 7
  addQ(6, 'TEXT_LONG', '30. Qual é o maior problema que você enfrenta com os sistemas utilizados?');
  addQ(6, 'TEXT_SHORT', '31. Qual sistema apresenta mais dificuldades?');
  addQ(6, 'TEXT_LONG', '32. O que você gostaria que melhorasse nos sistemas atuais?');
  addQ(6, 'RADIO_SINGLE', '33. Você acha que um sistema integrado ajudaria a melhorar seu trabalho?', ['Sim', 'Parcialmente', 'Não', 'Não sei informar']);

  
  console.log("Inserting Questions...");
  for (let i = 0; i < questionsToInsert.length; i += 10) {
    await supabase.from('questions').insert(questionsToInsert.slice(i, i + 10));
  }
  
  console.log("Inserting Options...");
  for (let i = 0; i < optionsToInsert.length; i += 20) {
    await supabase.from('options').insert(optionsToInsert.slice(i, i + 20));
  }
  
  console.log(`\n\n=== DONE ===`);
  console.log(`Form Link: http://localhost:3000/builder/${formId}`);
  console.log(`Share Token: ${shareToken}`);
  console.log(`Access Token (Senha): 123456`);
}

run();
