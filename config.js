// Configuração do DuoDev. Deixe em branco para usar só o progresso local (sem login).
// Project URL e chave anon/publishable ficam em Supabase > Project Settings > API.
// Elas são públicas por natureza: quem protege os dados é a política RLS da tabela `progress`.
// NUNCA coloque aqui a chave service_role/secret.
window.DUODEV_CONFIG = {
  supabaseUrl: 'https://inlisauikepprovgfokg.supabase.co',
  supabaseKey: 'sb_publishable_JXlzR1i6h6WMPR7tHxz-QQ_XwFS2l5Y',
  google: false, // true depois de ativar o provedor Google no Supabase
};
