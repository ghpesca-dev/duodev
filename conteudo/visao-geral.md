# DuoDev: curso "Dev Backend Node.js"

Gerado a partir do seu roadmap (Fases 0 a 6). Cada fase virou uma **unidade**, e os blocos de cada fase viraram **lições** de 4 a 8 perguntas (uma sessão de 2 a 4 minutos).

**Total:** 7 unidades, 27 lições, 157 perguntas (102 múltipla escolha, 35 verdadeiro/falso, 20 completar a lacuna). Toda pergunta tem resposta e uma explicação curta, mostrada depois que você responde.

## Trilha

| Unidade | Lições (nº de perguntas) |
|---|---|
| 1. JS moderno e Node | Sintaxe moderna (6) · Arrays, Map, Set e closures (6) · Módulos e async/await (6) · Event loop (6) · Módulos nativos e streams (5) · npm e o processo (6) |
| 2. API REST | Fundamentos de HTTP (7) · Rotas REST com Fastify (5) · Validação e erros (6) · Paginação, config e Express (5) |
| 3. Banco de dados | Consultas SQL (7) · Modelagem (5) · ORM e migrations (6) · Consistência (7) |
| 4. Autenticação e segurança | Senhas e tokens (6) · Guardando e revogando tokens (4) · Autorização e OWASP (8) |
| 5. Qualidade e entrega | TypeScript (6) · Testes automatizados (5) · Operação: logs, Docker e CI (7) |
| 6. Assíncrono e integrações | Redis e cache (5) · Consumindo APIs externas (4) · Filas com BullMQ (7) · Webhooks (6) |
| 7. Projeto final | Arquitetura (5) · Feature com LLM (6) · Entrega e observabilidade (5) |

## Exemplos

**Múltipla escolha** (Event loop)
> Em que ordem os logs aparecem?
> ```js
> console.log('A');
> setTimeout(() => console.log('B'), 0);
> Promise.resolve().then(() => console.log('C'));
> console.log('D');
> ```
> Resposta: **A, D, C, B**. Primeiro o código síncrono, depois as microtasks (`.then`), por último as macrotasks (`setTimeout`).

**Verdadeiro ou falso** (Webhooks)
> Para comparar a assinatura recebida com a calculada, `===` é a melhor opção.
> Resposta: **Falso**. Use `crypto.timingSafeEqual` para evitar timing attacks.

**Completar a lacuna** (Consistência)
> Uma transação usa BEGIN, COMMIT e ___.
> Banco de palavras: ROLLBACK · UNDO · REVERT · CANCEL. Resposta: **ROLLBACK**.

## O que ficou de fora

Seções sobre o método de estudo (checklist diário, como usar IA, portfólio e candidatura) e os enunciados dos projetos práticos não viraram perguntas, porque são tarefas para fazer, não conceitos para memorizar. Os temas de entrevista (event loop, concorrência vs paralelismo, SQL) já estão cobertos nas unidades.

## Arquivos

- `curso.json`: os dados que o app vai carregar.
- `gerar_curso.py`: fonte editável das perguntas; rode `python3 gerar_curso.py curso.json` para regerar o JSON.

### Formato do JSON

```
units[]   -> id, title, description, lessons[]
lessons[] -> id, title, concepts[], xp, questions[]
question  -> id, type, prompt, code?, explanation, e:
  multiple_choice: options[], answer (índice da opção certa)
  true_false:      answer (true/false)
  fill_blank:      prompt com "___", options[] (banco de palavras), answer, accept[] (respostas aceitas se digitadas)
```

Os IDs (`u2-l3-q4`) são estáveis, para o passo 3 (repetição espaçada) poder guardar o histórico de cada pergunta.
