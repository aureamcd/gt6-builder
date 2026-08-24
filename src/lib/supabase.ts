import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpsqzohwxnzhvpalkmx.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_72LpPhENZcb4izysMuWUxA_WmmSzt3h'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function getFriendlyAuthError(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();
  if (msg.includes('rate limit')) return "Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.";
  if (msg.includes('user already registered')) return "Este e-mail já está cadastrado. Vá para a tela de login.";
  if (msg.includes('invalid login credentials')) return "E-mail ou senha incorretos.";
  if (msg.includes('at least 6 characters')) return "A senha deve ter no mínimo 6 caracteres.";
  if (msg.includes('invalid format')) return "O formato do e-mail é inválido.";
  if (msg.includes('valid password')) return "Por favor, digite uma senha válida.";
  if (msg.includes('not confirmed')) return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  
  return "Ocorreu um erro inesperado: " + errorMessage;
}
