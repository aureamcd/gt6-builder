#!/usr/bin/env node
import { spawn } from 'child_process';
import readline from 'readline';

const suites = [
  {
    id: 'smoke',
    title: '1. Testes de Fumaça (Smoke & Health Check)',
    desc: 'Verifica saúde da API, conexão com DB e renderização básica',
    files: ['e2e/smoke.spec.ts', 'e2e/api.spec.ts', 'e2e/database-functions.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'auth',
    title: '2. Autenticação & Cadastro de Usuários',
    desc: 'Testa login, registro de conta, validação de senhas e erros amigáveis',
    files: ['e2e/auth.spec.ts', 'e2e/user-registration-flow.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'builder',
    title: '3. Construtor & Navegação de Formulários',
    desc: 'Testa criação de seções, reordenação, painel de propriedades e autosave',
    files: ['e2e/builder-navigation.spec.ts', 'e2e/form-flow.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'campos',
    title: '4. Todos os Tipos de Campos & Fórmulas/Cálculos',
    desc: 'Testa campos de texto, números, datas, matrizes, uploads e campos calculados',
    files: ['e2e/all-field-types-complete.spec.ts', 'e2e/form-calculations.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'preview',
    title: '5. Pré-visualização & Simulação Interativa',
    desc: 'Testa modo preview, validação de regras obrigatórias e simulação sem salvar no DB',
    files: ['e2e/preview-complete.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'sharing',
    title: '6. Compartilhamento, Tokens, Senha & Multi-usuário',
    desc: 'Testa links públicos com token (/f/[token]), senha de acesso e múltiplos usuários',
    files: ['e2e/form-sharing.spec.ts', 'e2e/multi-user-sharing.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'xml',
    title: '7. Processador de XML (Import / Export / GT6)',
    desc: 'Testa conversão de schemas XML para formulários e exportação',
    files: ['e2e/xml-handler.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'responsive',
    title: '8. Responsividade Multi-dispositivo (Mobile & Tablet)',
    desc: 'Testa visualização no Desktop Chrome, Mobile Chrome (Pixel 7) e Safari (iPhone)',
    files: ['e2e/responsive.spec.ts'],
    project: null, // Roda em todos os devices configurados
  },
  {
    id: 'consistency',
    title: '9. Consistência de Front & Navegação de Ida e Volta',
    desc: 'Testa ida e volta de seções (stepper), rotas, histórico (back/forward) e persistência de dados no front',
    files: ['e2e/front-consistency-navigation.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'journey',
    title: '10. Jornada Humana Completa (End-to-End Human Flow)',
    desc: 'Fluxo completo: Registro -> Criação de Form -> Adição de Seções -> Preview -> Compartilhamento',
    files: ['e2e/human-journey.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'all',
    title: '10. Executar TODAS as Rotinas (Suíte Completa)',
    desc: 'Roda todos os testes de todas as rotinas em lote',
    files: ['e2e/*.spec.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'vercel',
    title: '11. Testar Ambiente Vercel / Produção',
    desc: 'Executa a suíte de testes contra a URL pública da Vercel',
    files: [],
    customArgs: ['--config', 'playwright.vercel.config.ts'],
    project: 'Desktop Chrome',
  },
  {
    id: 'ui',
    title: '12. Abrir Interface Interativa do Playwright (UI Mode)',
    desc: 'Abre o painel visual do Playwright para depurar e rodar testes com 1 clique',
    customArgs: ['--ui'],
  },
  {
    id: 'report',
    title: '13. Abrir Último Relatório de Testes (HTML Report)',
    desc: 'Abre o relatório detalhado com vídeos, prints e tempos de execução',
    isReport: true,
  },
];

function runCommand(command, args) {
  console.log(`\n\x1b[36m🚀 Executando:\x1b[0m \x1b[1m${command} ${args.join(' ')}\x1b[0m\n`);
  const child = spawn(command, args, { stdio: 'inherit', shell: true });
  return new Promise((resolve) => {
    child.on('close', (code) => {
      resolve(code);
    });
  });
}

async function showMenu() {
  console.clear();
  console.log('\x1b[34m===============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[32m       🚀 GT6 BUILDER - CENTRAL DE ROTINAS DE TESTE          \x1b[0m');
  console.log('\x1b[34m===============================================================\x1b[0m\n');
  console.log('Selecione a rotina que deseja executar:\n');

  suites.forEach((suite, index) => {
    console.log(`  \x1b[33m[${index + 1}]\x1b[0m \x1b[1m${suite.title.replace(/^\d+\.\s*/, '')}\x1b[0m`);
    console.log(`      \x1b[90m↳ ${suite.desc}\x1b[0m`);
  });

  console.log(`\n  \x1b[31m[0]\x1b[0m Sair\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  const option = await question('\x1b[36mDigite o número da opção desejada (0-13): \x1b[0m');

  const num = parseInt(option.trim(), 10);
  if (isNaN(num) || num < 0 || num > suites.length) {
    console.log('\x1b[31mOpção inválida!\x1b[0m');
    rl.close();
    return;
  }

  if (num === 0) {
    console.log('Saindo do executor de testes...');
    rl.close();
    process.exit(0);
  }

  const selectedSuite = suites[num - 1];

  if (selectedSuite.isReport) {
    rl.close();
    await runCommand('npx', ['playwright', 'show-report']);
    return;
  }

  if (selectedSuite.id === 'ui') {
    rl.close();
    await runCommand('npx', ['playwright', 'test', '--ui']);
    return;
  }

  const mode = await question('\n\x1b[36mDeseja abrir o navegador visualmente (Headed)? [S/n]: \x1b[0m');
  const isHeaded = !mode.trim().toLowerCase().startsWith('n');

  rl.close();

  const args = ['playwright', 'test'];

  if (selectedSuite.files && selectedSuite.files.length > 0) {
    args.push(...selectedSuite.files);
  }

  if (selectedSuite.customArgs) {
    args.push(...selectedSuite.customArgs);
  }

  if (selectedSuite.project) {
    args.push(`--project="${selectedSuite.project}"`);
  }

  if (isHeaded) {
    args.push('--headed');
    args.push('--workers=1');
  }

  const exitCode = await runCommand('npx', args);

  if (exitCode === 0) {
    console.log('\n\x1b[32m✔ Todos os testes da rotina foram concluídos com SUCESSO!\x1b[0m\n');
  } else {
    console.log(`\n\x1b[31m✖ Falha em alguns testes (Código: ${exitCode}). Verifique o log acima.\x1b[0m\n`);
  }
}

// Verifica se foi passado argumento direto por linha de comando (ex: node scripts/test-runner.mjs auth)
const directSuiteArg = process.argv[2];
if (directSuiteArg) {
  const found = suites.find(
    (s) => s.id === directSuiteArg.toLowerCase() || s.id.includes(directSuiteArg.toLowerCase())
  );
  if (found) {
    const isHeaded = process.argv.includes('--headed');
    const args = ['playwright', 'test'];
    if (found.files && found.files.length > 0) args.push(...found.files);
    if (found.customArgs) args.push(...found.customArgs);
    if (found.project) args.push(`--project="${found.project}"`);
    if (isHeaded) {
      args.push('--headed');
      args.push('--workers=1');
    }
    await runCommand('npx', args);
    process.exit(0);
  }
}

showMenu();
