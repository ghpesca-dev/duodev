# DuoDev

App web estático (HTML, CSS e JS puro, sem build) que também é um PWA instalável e abre offline.

## Rodar localmente
```
cd duodev
python3 -m http.server 8000
# abra http://localhost:8000
```
Precisa ser servido por HTTP (abrir o index.html direto do disco não carrega o curso.json).
Para testar no celular na mesma rede, use o IP do computador (a instalação como app exige HTTPS fora de localhost).

## Arquivos
- `index.html`, `styles.css`, `app.js`: o app.
- `config.js`: URL e chave pública do Supabase. Em branco, o app funciona só local, sem login.
- `sync.js` + `vendor/supabase.js` (supabase-js 2.45.4, MIT): login e sincronização.
- `sounds.js`: efeitos sonoros sintetizados com Web Audio (sem arquivos de áudio). Ver “Sons” abaixo.
- `curso.json`: cópia do curso. Após editar `conteudo/gerar_curso.py`, rode `python3 conteudo/gerar_curso.py curso.json` (na raiz do repositório).
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA. Ao mudar arquivos, aumente `CACHE` em `sw.js`.

## Regras do jogo (topo do app.js)
- Lição nova: +10 XP, +5 se não errar nada. Refazer lição concluída: +5 XP.
- 5 vidas; cada erro em lição nova custa 1. Volta 1 vida a cada 30 min. Refazer lição concluída não custa vidas e devolve 1.
- Pergunta errada volta no fim da lição. A lição termina quando todas forem acertadas.
- Ofensiva: dias seguidos com pelo menos uma lição. Meta do dia: 20 XP.
- Progresso salvo no localStorage (chave `duodev:v1`). Atalhos: 1 a 4 escolhem, Enter verifica/continua, Esc sai.

## Revisão espaçada (passo 3)
- Cada pergunta respondida vira um cartão em `srs` no localStorage: `{ box, due, last, reps, lapses }`, pelo id estável da pergunta.
- Caixas de Leitner com intervalos de 1, 1, 3, 7, 16, 35 e 90 dias (`INTERVALS` no app.js). Acertar sobe uma caixa; errar volta para a caixa 0 e a pergunta reaparece no dia seguinte. Pergunta nova acertada de primeira volta em 3 dias.
- Só a primeira tentativa de cada pergunta numa sessão conta; a repetição dentro da lição não mexe no agendamento.
- "Revisão do dia" junta as perguntas vencidas (mais atrasadas e mais fracas primeiro), até 15 por rodada, misturando lições. Não gasta vidas, devolve 1 vida, dá 5 XP + 1 por acerto de primeira e conta para a ofensiva.
- Na trilha, cada lição concluída mostra quantas perguntas dela vencem hoje. A tela de progresso mostra a memória (aprendendo, firme, dominada, não vistas), a previsão de revisões dos próximos 7 dias e as perguntas que você mais erra.

## Login e sincronização (passo 4)
- Login com e-mail e senha pelo Supabase Auth; Google fica disponível com `google: true` no `config.js` depois de ativar o provedor no Supabase.
- O progresso continua no localStorage (funciona offline). Com login, cada mudança sobe 1,5 s depois para a tabela `progress` (uma linha por usuário, `data` jsonb), e o app puxa da nuvem ao abrir, ao voltar para a aba e quando a internet volta.
- Mescla sem perder progresso: lições concluídas (união), XP por dia (maior valor), XP total (maior entre os dois lados e a soma dos dias), cartões de revisão (o respondido mais recentemente), ofensiva (a de data mais recente), vidas (do aparelho que salvou por último).
- No primeiro login, o progresso que já estava no aparelho vai para a conta. Progresso local de outra conta não é misturado. Sair zera o aparelho (o progresso fica na conta). "Apagar progresso" com login zera também a nuvem.
- Tabela e política de segurança: `supabase/schema.sql`. A chave do `config.js` é a anon/publishable, pública por natureza; quem protege os dados é a RLS.

## Sons
- Gerados na hora pelo `sounds.js` (Web Audio), originais: toque ao escolher, acerto, erro, lição concluída, lição perfeita, novo dia de ofensiva, meta do dia batida e vidas esgotadas.
- Liga/desliga no ícone de alto-falante dentro da lição ou em Progresso > Aplicativo. A preferência fica no aparelho (chave `duodev:sound`), não vai para a nuvem.
- iPhone: o Safari só libera áudio depois de um toque; o primeiro toque na página destrava. Com a chave lateral no silencioso, o iPhone não toca efeitos de sites/PWAs.
