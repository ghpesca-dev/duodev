/* DuoDev: conta e sincronização na nuvem (Supabase).
   O progresso continua no localStorage (funciona offline); com login, ele também vai para a
   tabela `progress` do Supabase e é mesclado com o que estiver lá, para PC e celular ficarem iguais.
   Sem config.js preenchido, nada disto liga e o app funciona só local. */
window.DuoSync = (() => {
  'use strict';
  const cfg = window.DUODEV_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient);
  const PUSH_DELAY = 1500;

  let client = null;
  let hooks = null;
  let user = null;
  let ready = false;          // já sabemos se há sessão salva
  let status = 'idle';        // idle | syncing | ok | offline | error
  let lastSync = null;
  let timer = null;
  let running = null;         // promessa da sincronização em andamento
  let again = false;          // pediram outra sincronização enquanto uma rodava
  let recovery = false;       // voltou do link de "esqueci a senha"

  const notify = () => { try { hooks && hooks.onChange(); } catch (e) { /* ignora */ } };
  const setStatus = (s) => { status = s; notify(); };
  const redirectTo = () => location.origin + location.pathname;

  function init(h) {
    hooks = h;
    if (!enabled) { ready = true; return; }
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'duodev:auth' },
    });
    client.auth.onAuthStateChange((event, session) => {
      const u = session ? session.user : null;
      const changed = (u && u.id) !== (user && user.id);
      user = u;
      ready = true;
      if (event === 'PASSWORD_RECOVERY') recovery = true;
      // Tira tokens e códigos de retorno do endereço (link de confirmação, Google).
      if (/access_token|error_description|[?&]code=/.test(location.hash + location.search)) {
        history.replaceState(null, '', redirectTo());
      }
      // Fora do callback: chamar a API do Supabase aqui dentro trava o cliente.
      setTimeout(() => {
        if (changed && user) { hooks.onLogin(user); sync(); }
        notify();
        if (recovery && hooks.onRecovery) { recovery = false; hooks.onRecovery(); }
      }, 0);
    });
    window.addEventListener('online', () => sync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  }

  // Lê a nuvem, mescla com o local e grava de volta se algo mudou.
  function sync() {
    if (!client || !user) return Promise.resolve();
    clearTimeout(timer);
    if (running) { again = true; return running; }
    running = (async () => {
      setStatus('syncing');
      try {
        const uid = user.id;
        const { data, error } = await client.from('progress').select('data').eq('user_id', uid).maybeSingle();
        if (error) throw error;
        if (!user || user.id !== uid) return;
        const merged = data && data.data ? hooks.merge(data.data) : hooks.getState();
        if (!data || JSON.stringify(stripMeta(data.data)) !== JSON.stringify(stripMeta(merged))) {
          const { error: e2 } = await client.from('progress').upsert({ user_id: uid, data: merged, updated_at: new Date().toISOString() });
          if (e2) throw e2;
        }
        lastSync = Date.now();
        setStatus('ok');
      } catch (e) {
        console.warn('[DuoDev] sincronização falhou', e);
        setStatus(navigator.onLine === false || /fetch|network/i.test(String(e && e.message)) ? 'offline' : 'error');
      } finally {
        running = null;
        if (again) { again = false; queue(); }
      }
    })();
    return running;
  }
  function stripMeta(s) {
    const c = Object.assign({}, s); delete c._updated; delete c._owner;
    // Com vidas cheias (5) o app atualiza o horário sozinho; isso não é progresso novo.
    if (c.lives && c.lives.n >= 5) c.lives = { n: c.lives.n };
    return canon(c);
  }
  // Ordena as chaves para comparar estados sem depender da ordem em que foram montados.
  function canon(v) {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach((k) => { o[k] = canon(v[k]); }); return o; }
    return v;
  }

  // Chamado a cada save(): envia depois de uma pausa, para juntar várias mudanças.
  function queue() {
    if (!client || !user) return;
    clearTimeout(timer);
    timer = setTimeout(sync, PUSH_DELAY);
  }

  const PT = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/already registered|already been registered|already exists/i, 'Já existe uma conta com esse e-mail. Use “Entrar”.'],
    [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos e tente de novo.'],
    [/password should be at least|password.*(short|length)|weak password/i, 'A senha precisa de pelo menos 6 caracteres.'],
    [/rate limit|too many|security purposes/i, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'],
    [/invalid email|unable to validate email|email address .* is invalid/i, 'Esse e-mail não parece válido.'],
    [/provider is not enabled|unsupported provider/i, 'Login com Google ainda não foi ativado no Supabase.'],
    [/same.*password|different from the old/i, 'A nova senha precisa ser diferente da antiga.'],
    [/fetch|network/i, 'Sem conexão com a internet. Tente de novo quando estiver online.'],
  ];
  function friendly(err) {
    const m = String((err && (err.message || err.error_description)) || err || '');
    const hit = PT.find(([re]) => re.test(m));
    return hit ? hit[1] : 'Algo deu errado: ' + m;
  }
  async function call(p) {
    try { const r = await p; if (r && r.error) return { error: friendly(r.error) }; return r || {}; }
    catch (e) { return { error: friendly(e) }; }
  }

  return {
    enabled,
    google: enabled && !!cfg.google,
    init,
    queue,
    sync,
    get user() { return user; },
    get ready() { return ready; },
    get status() { return status; },
    get lastSync() { return lastSync; },
    signIn: (email, password) => call(client.auth.signInWithPassword({ email, password })),
    async signUp(email, password) {
      const r = await call(client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }));
      if (r.error) return r;
      // Com confirmação de e-mail ligada, não vem sessão. Identities vazio = e-mail já cadastrado.
      const d = r.data || {};
      if (d.user && Array.isArray(d.user.identities) && d.user.identities.length === 0) return { error: PT[1][1] };
      return { needsConfirm: !d.session };
    },
    google_: () => call(client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })),
    resetPassword: (email) => call(client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() })),
    updatePassword: (password) => call(client.auth.updateUser({ password })),
    // Grava o estado local por cima da nuvem, sem mesclar (usado em "Apagar progresso").
    async overwrite() {
      if (!client || !user) return {};
      clearTimeout(timer);
      if (running) await running;
      const r = await call(client.from('progress').upsert({ user_id: user.id, data: hooks.getState(), updated_at: new Date().toISOString() }));
      if (!r.error) { lastSync = Date.now(); setStatus('ok'); }
      return r;
    },
    async signOut() {
      clearTimeout(timer);
      if (user) await sync();
      const r = await call(client.auth.signOut({ scope: 'local' }));
      user = null; status = 'idle'; lastSync = null;
      notify();
      return r;
    },
  };
})();
