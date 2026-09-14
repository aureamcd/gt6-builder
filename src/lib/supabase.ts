import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpsqzohwxnzhvpalkmx.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_72LpPhENZcb4izysMuWUxA_WmmSzt3h'

if (typeof window !== 'undefined') {
  try {
    // Limpar resíduos antigos de sessões e tokens no localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('gt6_') || key.startsWith('form_preview_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // ignore
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
})

export function getFriendlyErrorMessage(error: any): string {
  if (!error) return "Ocorreu um erro inesperado. Por favor, tente novamente.";
  
  const rawMsg = typeof error === 'string' 
    ? error 
    : (error.message || error.error_description || error.details || error.error || JSON.stringify(error));
  const msg = rawMsg.toLowerCase();

  // 1. Senhas e Autenticação
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit') || msg.includes('over_request_rate_limit')) {
    return "Você realizou muitas tentativas em pouco tempo. Por segurança, aguarde alguns minutos antes de tentar novamente.";
  }
  if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('user_already_exists') || msg.includes('user with this email already exists')) {
    return "Este endereço de e-mail já está cadastrado. Por favor, acesse a tela de login para entrar na sua conta.";
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('invalid grant') || msg.includes('bad credentials')) {
    return "E-mail ou senha incorretos. Verifique os dados digitados e tente novamente.";
  }
  if (msg.includes('at least 6 characters') || msg.includes('password should be at least') || msg.includes('weak_password') || msg.includes('password is too short')) {
    return "A sua senha é muito curta. Crie uma senha com no mínimo 6 caracteres para garantir sua segurança.";
  }
  if (msg.includes('password') && (msg.includes('letter') || msg.includes('number') || msg.includes('special') || msg.includes('complexity') || msg.includes('strength'))) {
    return "A sua senha não atende aos requisitos de segurança. Escolha uma senha mais forte contendo letras e números.";
  }
  if (msg.includes('passwords do not match') || msg.includes('passwords must match') || msg.includes('senhas não coincidem')) {
    return "As senhas digitadas não coincidem. Certifique-se de preencher a mesma senha nos dois campos.";
  }
  if (msg.includes('invalid format') || msg.includes('unable to validate email') || msg.includes('invalid email') || msg.includes('email format')) {
    return "O formato do e-mail digitado é inválido. Por favor, use o formato correto (exemplo: seu.nome@email.com).";
  }
  if (msg.includes('valid password') || msg.includes('password is required')) {
    return "O campo de senha é obrigatório. Por favor, digite sua senha.";
  }
  if (msg.includes('not confirmed') || msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return "O seu e-mail ainda não foi confirmado. Verifique a caixa de entrada ou a pasta de spam do seu e-mail para ativar sua conta.";
  }
  if (msg.includes('signup disabled') || msg.includes('signups not allowed') || msg.includes('signup_disabled')) {
    return "O cadastro de novos usuários está temporariamente desativado pelo administrador.";
  }
  if (msg.includes('user not found') || msg.includes('user_not_found')) {
    return "Nenhum usuário foi encontrado com este e-mail.";
  }
  if (msg.includes('jwt expired') || msg.includes('token expired') || msg.includes('session expired') || msg.includes('refresh_token_not_found') || msg.includes('bad_jwt')) {
    return "Sua sessão expirou por inatividade. Por favor, faça login novamente para continuar.";
  }

  // 2. Código de Acesso, Tokens e Templates
  if (msg.includes('código de acesso incorreto') || msg.includes('passcode') || msg.includes('código incorreto')) {
    return "Código de acesso incorreto. Verifique o código fornecido pelo autor do formulário e tente novamente.";
  }
  if (msg.includes('formulário não encontrado') || msg.includes('token inválido') || msg.includes('template não encontrado')) {
    return "Formulário não encontrado. O link pode estar incorreto ou ter sido removido.";
  }

  // 3. Banco de Dados, Duplicidade e Permissões (PostgreSQL & Supabase)
  if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('permission denied') || msg.includes('not authorized') || msg.includes('unauthorized') || msg.includes('42501')) {
    return "Permissão negada. Você não tem permissão para visualizar, editar ou excluir este item.";
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists') || msg.includes('23505')) {
    return "Este item já está cadastrado no sistema (já existe um registro idêntico com estas informações).";
  }
  if (msg.includes('foreign key') || msg.includes('violates foreign key') || msg.includes('23503')) {
    return "Não é possível excluir ou alterar este registro porque outros dados no sistema estão vinculados a ele.";
  }
  if (msg.includes('null value in column') || msg.includes('violates not-null') || msg.includes('23502')) {
    return "Existem informações obrigatórias em branco. Por favor, preencha todos os campos obrigatórios.";
  }

  // 4. Armazenamento, Mídia e Upload (Supabase Storage)
  if (msg.includes('bucket not found')) {
    return "O local de armazenamento de arquivos não foi encontrado. Entre em contato com o suporte técnico.";
  }
  if (msg.includes('payload too large') || msg.includes('entity too large') || msg.includes('maximum allowed size') || msg.includes('exceeded') || msg.includes('413') || msg.includes('muito grande')) {
    return "O arquivo enviado ultrapassa o tamanho limite permitido (máximo de 50MB). Escolha um arquivo menor.";
  }
  if (msg.includes('mime type') || msg.includes('unsupported file type') || msg.includes('invalid file type')) {
    return "O formato do arquivo enviado não é suportado. Envie um arquivo com extensão válida.";
  }
  if (msg.includes('invalid key') || msg.includes('invalid character')) {
    return "O nome do arquivo contém caracteres especiais não suportados. Renomeie o arquivo e tente novamente.";
  }

  // 5. Conexão e Rede
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed') || msg.includes('connection refused') || msg.includes('econnrefused')) {
    return "Falha na conexão de internet. Verifique sua conexão com a rede e tente novamente.";
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('gateway timeout') || msg.includes('504')) {
    return "O servidor demorou muito para responder. Verifique sua internet e tente novamente em instantes.";
  }
  if (msg.includes('internal server error') || msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return "O servidor encontrou uma instabilidade momentânea. Por favor, aguarde alguns segundos e tente novamente.";
  }

  // 6. Mensagens já formatadas em português
  if (/[áàâãéèêíïóôõöúçñ]/i.test(rawMsg)) {
    return rawMsg;
  }

  return "Não foi possível concluir a ação. Detalhe: " + rawMsg;
}

export const getFriendlyAuthError = getFriendlyErrorMessage;
