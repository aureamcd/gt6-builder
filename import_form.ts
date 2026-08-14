import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch![1].trim(), keyMatch![1].trim());

const formId = "2efd1df6-4480-4d7e-9b27-352abf41c6d2"; // Known from previous check

const generateId = () => crypto.randomUUID();

const formStructure = [
  {
    title: "Seção 1 – Identificação e Perfil Tecnológico",
    description: "Identificar gargalos técnicos, semânticos, organizacionais e legais no fluxo de dados da rede municipal de saúde, a fim de subsidiar melhorias na integração de sistemas.",
    questions: [
      { type: "TEXT_SHORT", label: "1. Unidade/Serviço", required: true },
      { type: "TEXT_SHORT", label: "2. Cargo/Função", required: true },
      { type: "RADIO_SINGLE", label: "3. Tempo de atuação", options: ["Menos de 1 ano", "1–3 anos", "Mais de 3 anos"] },
      { type: "CHECKBOX_MULTIPLE", label: "4. Sistemas utilizados simultaneamente", options: ["Prontuário Eletrônico (PEC e-SUS)", "Regula Piauí", "Salutem", "Epicollect5"], allow_add_item: true },
      { type: "TEXT_LONG", label: "4.1 Para cada sistema utilizado, informe a frequência de uso (Sempre, Frequentemente, Às vezes, Raramente, Nunca):" },
      { type: "RADIO_SINGLE", label: "4.2 Existem atividades realizadas manualmente para complementar ou corrigir informações dos sistemas?", options: ["Sim", "Não"], allow_add_item: true },
      { type: "RADIO_SINGLE", label: "Se sim, qual a frequência dessas atividades manuais?", options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"] },
      { type: "RADIO_SINGLE", label: "5. Módulo principal avaliado", options: ["Cadastro", "Agendamento", "Atendimento", "Regulação", "Exames", "Farmácia"], allow_add_item: true },
      { type: "RADIO_SINGLE", label: "6. Existe um Identificador Único do Paciente compartilhado entre os sistemas?", options: ["Sim, utilizamos CNS/CPF integrado automaticamente.", "Não, existem registros diferentes para o mesmo paciente.", "Não sei informar."] }
    ]
  },
  {
    title: "Seção 2 – Interoperabilidade Técnica e Fluxo de Dados (TIMAPS)",
    questions: [
      { type: "RADIO_SINGLE", label: "7. Como os dados passam de um sistema para outro?", options: ["Automaticamente, sem necessidade de intervenção.", "Por arquivos exportados/importados.", "Manualmente, digitando novamente."] },
      { type: "RADIO_SINGLE", label: "8. Os sistemas compartilham informações automaticamente?", options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"] },
      { type: "RADIO_SINGLE", label: "9. Quando um dado é alterado em um sistema, ele atualiza automaticamente nos outros?", options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"] },
      { type: "RADIO_SINGLE", label: "10. Você precisa redigitar informações já registradas em outro sistema?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] }
    ]
  },
  {
    title: "Seção 3 – Interoperabilidade Semântica (SIMAPS)",
    questions: [
      { type: "RADIO_SINGLE", label: "11. Ao registrar um diagnóstico, o sistema utiliza qual padrão?", options: ["CID-10 / CID-11", "Texto livre digitado", "Códigos internos do sistema", "Não sei informar"] },
      { type: "RADIO_SINGLE", label: "12. Ao receber um dado externo (ex.: laudo), as informações aparecem em campos estruturados?", options: ["Sim, o dado é incorporado aos campos do sistema.", "Não, aparece apenas como anexo.", "O dado não chega ao sistema."] },
      { type: "RADIO_SINGLE", label: "13. Existem informações iguais apresentadas de formas diferentes entre sistemas?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] },
      { type: "RADIO_SINGLE", label: "14. Você precisa interpretar ou corrigir informações manualmente ao trocar de sistema?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] },
      { type: "RADIO_SINGLE", label: "15. Você confia nos dados apresentados pelos sistemas?", options: ["1 - Nada", "2 - Pouco", "3 - Moderadamente", "4 - Muito", "5 - Totalmente"] }
    ]
  },
  {
    title: "Seção 4 – Interoperabilidade Organizacional e Continuidade do Cuidado (OIMAPS)",
    questions: [
      { type: "RADIO_SINGLE", label: "16. Você consegue visualizar o histórico do paciente realizado em outras unidades?", options: ["Sim, o histórico é unificado.", "Apenas se o paciente trouxer documentos.", "Não."] },
      { type: "RADIO_SINGLE", label: "17. Você precisa entrar em contato com outras unidades para confirmar informações?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] },
      { type: "RADIO_SINGLE", label: "18. O fluxo entre unidades ocorre sem interrupções?", options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"] },
      { type: "RADIO_SINGLE", label: "19. Existem diferenças no processo de atendimento entre unidades?", options: ["Sim", "Não", "Não sei informar"] },
      { type: "RADIO_SINGLE", label: "20. Com que frequência você utiliza sistemas alternativos (WhatsApp, Gmail e outros) para suprir falhas dos sistemas oficiais?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] },
      { type: "CHECKBOX_MULTIPLE", label: "21. Para qual finalidade você utiliza esses meios?", options: ["Comunicação com paciente", "Confirmação de consulta", "Compartilhamento de exames", "Compartilhamento de informações clínicas"], allow_add_item: true }
    ]
  },
  {
    title: "Seção 5 – Interoperabilidade Legal e Governança (LIMAPS)",
    questions: [
      { type: "RADIO_SINGLE", label: "22. Existem restrições de acesso que dificultam a continuidade do atendimento?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] },
      { type: "RADIO_SINGLE", label: "23. Você sabe quais informações podem ser compartilhadas entre os sistemas?", options: ["Sim", "Parcialmente", "Não"] },
      { type: "RADIO_SINGLE", label: "24. Já deixou de acessar uma informação necessária devido a permissões do sistema?", options: ["Sim", "Não"] },
      { type: "RADIO_SINGLE", label: "25. Existem dúvidas sobre responsabilidade ou sigilo das informações?", options: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] }
    ]
  },
  {
    title: "Seção 6 – Eficiência e Segurança do Paciente",
    questions: [
      { type: "CHECKBOX_MULTIPLE", label: "26. Assinale as falhas já observadas devido à falta de integração", options: ["Duplicidade de exames", "Divergência em medicamentos", "Atraso na regulação", "Perda de vaga", "Cadastro desatualizado", "Perda de informações clínicas"], allow_add_item: true },
      { type: "RADIO_SINGLE", label: "27. Quanto tempo por dia é perdido devido a dificuldades entre sistemas?", options: ["Menos de 30 minutos", "30 minutos a 1 hora", "Mais de 1 hora"] },
      { type: "TEXT_LONG", label: "28. Avalie o impacto da falta de integração sobre: Tempo de atendimento, Retrabalho, Segurança do paciente, Comunicação entre equipes, Confiabilidade dos dados (1 = Nenhum impacto, 5 = Impacto crítico)" }
    ]
  },
  {
    title: "Seção 7 – Problemas e Sugestões",
    questions: [
      { type: "TEXT_LONG", label: "29. Qual o maior problema causado pela falta de integração entre os sistemas?" },
      { type: "TEXT_LONG", label: "30. Qual sistema apresenta mais dificuldades?" },
      { type: "TEXT_LONG", label: "31. O que deveria melhorar nos sistemas atuais?" },
      { type: "RADIO_SINGLE", label: "32. Um sistema único resolveria os problemas?", options: ["Sim", "Parcialmente", "Não"] }
    ]
  }
];

async function run() {
  console.log("Fetching existing sections to get max order_index...");
  const { data: existingSections } = await supabase.from('sections').select('order_index').eq('form_id', formId);
  let startOrder = 0;
  if (existingSections && existingSections.length > 0) {
    startOrder = Math.max(...existingSections.map(s => s.order_index)) + 1;
  }

  for (let sIdx = 0; sIdx < formStructure.length; sIdx++) {
    const s = formStructure[sIdx];
    const sectionId = generateId();
    console.log(`Inserting section ${sIdx+1}: ${s.title}`);
    
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

  // Update the form's updated_at timestamp to trigger UI refresh/sync logic
  await supabase.from('forms').update({ updated_at: new Date().toISOString() }).eq('id', formId);
  console.log("Done adding all sections and questions!");
}

run().catch(console.error);
