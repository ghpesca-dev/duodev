# Nível "Aprofundar" do DuoDev: exercícios de aplicação para cada unidade.
# Importado por gerar_curso.py. Cada unidade tem 2 lições com 6 desafios:
# cenários práticos, encontre o bug, ordenar passos e trade-offs.
# Convenção: em sc() e to(), a resposta certa é sempre a PRIMEIRA opção;
# em order(), os passos vêm na ordem certa; em bug(), a linha do bug é
# indicada por um trecho de texto que aparece só nela.
import textwrap


def sc(context, prompt, options, explanation, code=None):
    """Cenário prático: uma situação real e a pergunta sobre o que fazer."""
    return {"type": "scenario", "context": context, "prompt": prompt, "code": code,
            "options": options, "explanation": explanation}


def bug(prompt, code, line, explanation, fix, also=()):
    """Encontre o bug: o aluno toca na linha errada do código."""
    return {"type": "find_bug", "prompt": prompt, "code": textwrap.dedent(code).strip("\n"),
            "line": line, "also": list(also), "fix": textwrap.dedent(fix).strip("\n"),
            "explanation": explanation}


def order(prompt, steps, explanation, code=None):
    """Ordenar passos: `steps` na ordem certa; o app embaralha."""
    return {"type": "order", "prompt": prompt, "code": code, "items": steps, "explanation": explanation}


def to(compare, prompt, options, explanation, code=None):
    """Trade-off: compara duas abordagens e pede a melhor escolha com o motivo certo."""
    return {"type": "tradeoff", "compare": compare, "prompt": prompt, "code": code,
            "options": options, "explanation": explanation}


def D(title, concepts, questions):
    return {"title": title, "concepts": concepts, "questions": questions}


# Uma lista por unidade, na mesma ordem de UNITS em gerar_curso.py.
DEEP = [
# ---------------------------------------------------------------- 1. JS moderno e Node
[
  D("Assincronia na prática", ["Promise.all", "forEach com async", "await e try/catch", "event loop bloqueado"], [
    sc("Sua rota busca o usuário, os pedidos e as notificações dele: três chamadas independentes de ~200 ms, feitas com três `await` seguidos. A rota leva ~600 ms.",
       "Qual mudança reduz o tempo sem mudar o resultado?",
       ["Disparar as três juntas com `await Promise.all([...])`",
        "Trocar cada `await` por `.then()`",
        "Colocar um `setTimeout(..., 0)` antes de cada chamada",
        "Mover as chamadas para um `worker_thread`"],
       "Como nenhuma depende da outra, `Promise.all` faz as três esperas ao mesmo tempo e a rota cai para ~200 ms (a mais lenta). `.then` encadeado continua sequencial, e worker threads servem para trabalho de CPU, não para esperar I/O."),
    bug("Esta função deveria somar os pedidos de todos os usuários, mas sempre devolve 0. Toque na linha com o bug.",
        """
        async function totalPedidos(ids) {
          let total = 0;
          ids.forEach(async (id) => {
            const pedidos = await buscarPedidos(id);
            total += pedidos.length;
          });
          return total;
        }
        """,
        "ids.forEach(",
        "`forEach` não espera callbacks `async`: dispara todos e segue, então o `return` roda antes de qualquer `await` terminar. Use `for...of` com `await` (um por vez) ou `Promise.all(ids.map(...))` (todos juntos).",
        """
        const listas = await Promise.all(ids.map((id) => buscarPedidos(id)));
        return listas.reduce((t, p) => t + p.length, 0);
        """),
    order("Coloque na ordem o que acontece quando uma rota executa `await fetch(url)`.",
          ["A função async roda de forma síncrona até chegar no `await`",
           "A requisição de rede é entregue ao sistema operacional (via libuv)",
           "O event loop fica livre e atende outras requisições",
           "A resposta chega e a continuação da função entra na fila de microtasks",
           "O código depois do `await` volta a executar"],
          "É por isso que `await` não bloqueia o servidor: enquanto a rede trabalha, a única thread do JavaScript atende outras requisições. Só depois que a Promise resolve a função continua, como uma microtask."),
    to(["Promise.all", "Promise.allSettled"],
       "Um painel carrega 5 widgets de serviços diferentes. Se um serviço falhar, os outros 4 precisam aparecer mesmo assim. O que usar?",
       ["`Promise.allSettled`, porque devolve o resultado de cada promessa, com sucesso ou erro",
        "`Promise.all`, porque rejeita assim que um falha e economiza tempo",
        "`Promise.allSettled`, porque cancela as outras promessas quando uma falha",
        "`Promise.race`, porque devolve a primeira que responder"],
       "`allSettled` espera todas e devolve `{ status, value }` ou `{ status, reason }` para cada uma, então dá para mostrar 4 widgets e um aviso no quinto. `Promise.all` rejeita na primeira falha e você perde os outros resultados. Nenhuma das duas cancela promessas."),
    bug("O erro do banco não está sendo registrado nem convertido em `ErroDeBanco`. Qual linha causa isso?",
        """
        async function salvar(dados) {
          try {
            db.inserir(dados);
          } catch (err) {
            log.error(err);
            throw new ErroDeBanco();
          }
        }
        """,
        "db.inserir(dados);",
        "Sem `await`, o `try` termina antes de a Promise rejeitar. A rejeição escapa do `catch` e vira um `unhandledRejection`, que no Node atual derruba o processo.",
        "await db.inserir(dados);"),
    sc("Um usuário gera um relatório que faz um loop pesado de 3 s em JavaScript puro. Enquanto isso, todas as outras requisições ficam paradas, até o health check.",
       "Qual é a causa e a correção?",
       ["O loop ocupa a única thread do event loop; mova o cálculo para um `worker_thread` ou para um job numa fila",
        "O banco está lento; aumente o pool de conexões",
        "Falta `await` no loop; adicione `await` a cada iteração",
        "O Node só atende uma requisição por vez; troque para Express"],
       "Código síncrono pesado (CPU) bloqueia o event loop e nada mais roda até ele acabar. I/O não bloqueia, mas CPU sim. Worker threads rodam em outra thread; uma fila tira o trabalho do processo da API."),
  ]),
  D("Node no dia a dia", ["streams e memória", "ESM e caminhos", "variáveis de ambiente", "semver e lockfile", "desligamento gracioso"], [
    sc("Você precisa importar um CSV de 4 GB linha a linha. Com `fs.readFile`, o processo morre por falta de memória.",
       "Qual é a abordagem certa?",
       ["Ler com `fs.createReadStream` e processar em pedaços com `pipeline`",
        "Aumentar o limite com `--max-old-space-size=8192`",
        "Usar `fs.readFileSync`, que não carrega tudo na memória",
        "Converter o arquivo para JSON antes de ler"],
       "Stream lê em pedaços (64 KB por padrão), então a memória fica constante, seja o arquivo de 4 MB ou 4 GB. `pipeline` ainda cuida do backpressure e propaga erros. Aumentar a memória só adia o problema."),
    bug("Este módulo ESM falha ao iniciar com `ReferenceError`. Qual linha?",
        """
        import { readFile } from 'node:fs/promises';
        import path from 'node:path';

        const caminho = path.join(__dirname, 'config.json');
        const config = JSON.parse(await readFile(caminho, 'utf8'));
        """,
        "__dirname",
        "`__dirname` e `__filename` só existem em CommonJS. Em ESM use `import.meta.dirname` (Node 20.11+) ou `fileURLToPath(new URL('.', import.meta.url))`.",
        "const caminho = path.join(import.meta.dirname, 'config.json');"),
    order("O orquestrador mandou `SIGTERM` para a sua API. Ordene um desligamento gracioso.",
          ["Receber o sinal `SIGTERM`",
           "Parar de aceitar conexões novas (`server.close()`)",
           "Esperar as requisições em andamento terminarem",
           "Fechar conexões com banco e Redis",
           "Sair com `process.exit(0)`"],
          "Assim nenhum usuário recebe erro no meio de um deploy: quem já entrou termina, quem chega depois vai para a instância nova. Fechar o banco antes de as requisições acabarem quebraria justamente essas requisições."),
    to(["npm install", "npm ci"],
       "Qual comando usar no pipeline de CI?",
       ["`npm ci`, porque instala exatamente o que está no lockfile e falha se ele não bater com o package.json",
        "`npm install`, porque atualiza para a última versão compatível a cada build",
        "`npm ci`, porque ignora o lockfile e baixa as versões mais novas",
        "`npm install`, porque é o único que respeita o package-lock.json"],
       "`npm ci` apaga a `node_modules`, instala as versões exatas do lockfile e nunca altera o lockfile. O build fica reproduzível: o que passou no CI é o que vai para produção. `npm install` pode resolver versões diferentes."),
    bug("Mesmo com `DEBUG=false` no ambiente, o log entra em modo debug. Qual linha?",
        """
        const porta = Number(process.env.PORT ?? 3000);
        const debug = process.env.DEBUG ?? false;

        if (debug) {
          logger.level = 'debug';
        }
        """,
        "const debug =",
        "Variáveis de ambiente são sempre strings. `'false'` é uma string não vazia, logo é truthy. Compare com o texto esperado, ou valide a config com Zod (`z.coerce.boolean()` também cai nessa armadilha; prefira `z.enum(['true', 'false'])`).",
        "const debug = process.env.DEBUG === 'true';"),
    sc("Seu package.json tem `\"lib-x\": \"^2.3.1\"`. A lib publicou a 2.9.0 com um bug, e o build de hoje quebrou sem ninguém mexer no código. O package-lock.json está no `.gitignore`.",
       "O que causou isso e o que evita?",
       ["O `^` aceita qualquer 2.x.x; commitar o package-lock.json e instalar com `npm ci` fixa as versões",
        "O `^` aceita a 3.0.0; basta trocar por `~`",
        "O cache do npm corrompeu; apague a pasta `~/.npm`",
        "O npm ignora a versão do package.json; use outro gerenciador"],
       "`^2.3.1` aceita de 2.3.1 até antes de 3.0.0. Sem lockfile versionado, cada instalação pega a versão mais nova da faixa. Com o lockfile no Git, você só muda de versão quando decide (ex.: num PR do Dependabot)."),
  ]),
],
# ---------------------------------------------------------------- 2. API REST
[
  D("Desenho de API", ["idempotência", "PUT vs PATCH", "status codes certos", "ações como recursos", "ciclo de vida do Fastify"], [
    sc("O app fez `POST /pedidos`, a resposta demorou, a conexão caiu por timeout e o app repetiu a requisição. O cliente foi cobrado duas vezes.",
       "Qual é a solução mais robusta?",
       ["Aceitar um header `Idempotency-Key` e, se a chave já foi processada, devolver o mesmo resultado",
        "Trocar o método para `GET`, que é idempotente",
        "Aumentar o timeout do app para 60 s",
        "Proibir o app de repetir requisições"],
       "Repetir é inevitável em rede ruim. Com uma chave gerada pelo cliente por operação, o servidor grava `chave → resultado` e, na repetição, devolve o mesmo pedido em vez de criar outro. É o que Stripe e outros gateways fazem."),
    to(["PUT", "PATCH"],
       "O front quer mudar só o e-mail do usuário, sem reenviar os outros 15 campos. Qual rota?",
       ["`PATCH /usuarios/:id` com `{ email }`, porque é uma atualização parcial",
        "`PUT /usuarios/:id` com `{ email }`, porque PUT altera só os campos enviados",
        "`POST /usuarios/:id/email`, porque navegadores não enviam PATCH",
        "`PATCH`, porque é sempre idempotente e PUT não"],
       "PUT substitui o recurso inteiro: mandar só `{ email }` significaria apagar o resto. PATCH aplica uma mudança parcial. Detalhe: PUT é idempotente por definição; PATCH pode ou não ser, depende da operação."),
    bug("O front não consegue diferenciar sucesso de erro neste cadastro. Qual linha está errada?",
        """
        fastify.post('/usuarios', async (req, reply) => {
          const existe = await repo.buscarPorEmail(req.body.email);
          if (existe) {
            return reply.code(200).send({ erro: 'E-mail já cadastrado' });
          }
          const usuario = await repo.criar(req.body);
          return reply.code(201).send(usuario);
        });
        """,
        "reply.code(200)",
        "Erro respondido com 200 engana clientes, caches e monitoramento (a taxa de erro some dos gráficos). Recurso que já existe é conflito: 409. Validação inválida seria 400 ou 422.",
        "return reply.code(409).send({ erro: 'E-mail já cadastrado' });"),
    order("Ordene as etapas de uma requisição no Fastify.",
          ["Hook `onRequest` (ex.: gerar o id da requisição)",
           "Leitura (parse) do corpo",
           "Validação do schema de body, params e query",
           "Hook `preHandler` (ex.: checar permissão)",
           "Handler da rota",
           "Serialização e envio da resposta"],
          "Saber a ordem diz onde cada coisa entra: no `onRequest` o corpo ainda não foi lido; no `preHandler` o body já foi validado, então é um bom lugar para autorização que depende dele. Depois do handler, a resposta é serializada pelo schema de resposta, se houver."),
    sc("Você precisa expor a ação \"cancelar pedido\", que muda o status e dispara um reembolso. O pedido continua existindo para o histórico.",
       "Qual desenho de rota é o melhor?",
       ["`POST /pedidos/:id/cancelamento`, criando um cancelamento",
        "`GET /pedidos/:id/cancelar`",
        "`DELETE /pedidos/:id`",
        "`PUT /cancelarPedido?id=123`"],
       "GET nunca deve ter efeito colateral (navegadores, crawlers e prefetch fazem GET sozinhos). DELETE diria que o pedido deixou de existir. Modelar a ação como um sub-recurso criado com POST mantém o REST e ainda dá onde guardar motivo e data."),
    bug("Esta rota de exclusão quebra alguns clientes HTTP. Qual linha?",
        """
        fastify.delete('/posts/:id', async (req, reply) => {
          await repo.remover(req.params.id);
          return reply.code(204).send({ ok: true });
        });
        """,
        "reply.code(204)",
        "204 No Content significa resposta sem corpo. Mandar um corpo junto viola o protocolo; o Fastify descarta, outros servidores e proxies se confundem. Ou use 204 sem corpo, ou 200 com corpo.",
        "return reply.code(204).send();"),
  ]),
  D("Robustez da API", ["validar query string", "error handler seguro", "offset vs cursor", "config na inicialização", "erros de domínio"], [
    bug("Alguém chamou `GET /produtos?limite=1000000` e derrubou o banco. Qual linha deixou isso acontecer?",
        """
        fastify.get('/produtos', async (req) => {
          const { pagina = 1, limite = 20 } = req.query;
          const offset = (pagina - 1) * limite;
          return repo.listar({ limite, offset });
        });
        """,
        "= req.query;",
        "Query string é entrada do usuário e chega como texto. Valide e limite: número inteiro, mínimo 1, máximo (ex.: 100). Com Zod: `z.coerce.number().int().min(1).max(100).default(20)`.",
        "const { pagina, limite } = Paginacao.parse(req.query);"),
    bug("Este error handler cria um problema de segurança e outro de semântica. Qual linha?",
        """
        fastify.setErrorHandler((err, req, reply) => {
          req.log.error(err);
          reply.code(500).send({ erro: err.message, stack: err.stack });
        });
        """,
        "reply.code(500)",
        "Devolver `stack` e mensagens internas expõe caminhos, versões e consultas para um atacante. E tratar tudo como 500 transforma erro de validação (400) e de permissão (403) em erro do servidor. Use o status do erro quando existir e uma mensagem genérica para erros inesperados.",
        """
        const status = err.statusCode ?? 500;
        reply.code(status).send({ erro: status < 500 ? err.message : 'Erro interno' });
        """),
    to(["Offset", "Cursor"],
       "Um feed infinito tem milhões de posts e recebe posts novos o tempo todo. Como paginar?",
       ["Cursor (`?depois=<id>`), porque não repete nem pula itens quando entram posts novos e não fica lento em páginas fundas",
        "Offset (`?pagina=500`), porque o banco pula direto para a página sem ler as anteriores",
        "Cursor, porque permite pular direto para a página 37",
        "Offset, porque posts novos não alteram a contagem"],
       "`OFFSET 10000` obriga o banco a ler e descartar 10 mil linhas, e um post novo empurra tudo uma posição (você vê itens repetidos). Cursor usa `WHERE id < $1 ORDER BY id DESC LIMIT 20` com índice. A troca: com cursor não dá para pular para uma página específica."),
    sc("Em produção, a API subiu sem a variável `DATABASE_URL` e só quebrou 20 minutos depois, na primeira consulta, no meio do horário de pico.",
       "O que evita isso?",
       ["Validar todas as variáveis na inicialização (ex.: com Zod) e encerrar o processo se faltar alguma",
        "Usar `localhost` como valor padrão para `DATABASE_URL`",
        "Envolver cada consulta em `try/catch`",
        "Ler `process.env` só dentro das funções que usam"],
       "Falhar rápido (fail fast): se a config está errada, o processo nem sobe, o deploy falha e a versão anterior continua no ar. Um padrão como `localhost` esconde o erro em produção."),
    order("Ordene o caminho de um erro de domínio até virar resposta HTTP.",
          ["O serviço detecta falta de estoque e lança `new ErroDeDominio('SEM_ESTOQUE')`",
           "A exceção sobe pelo handler da rota, que não tem `try/catch`",
           "O error handler central reconhece que é um `ErroDeDominio`",
           "Ele traduz o código para o status 422 e um corpo padronizado",
           "O cliente recebe `{ erro: 'SEM_ESTOQUE', mensagem }`"],
          "O serviço não conhece HTTP: só lança um erro com significado de negócio. Um único lugar decide status e formato, então todas as rotas respondem erros do mesmo jeito e nenhuma precisa de `try/catch` repetido."),
    to(["Validar na API", "Constraints no banco"],
       "Onde garantir que o e-mail é obrigatório e único?",
       ["Nos dois: Zod na entrada para dar um erro 400 claro, e `NOT NULL`/`UNIQUE` no banco como garantia final",
        "Só no Zod, porque constraints no banco são redundantes",
        "Só no banco, porque o Zod não roda em produção",
        "Em nenhum: o formulário do front já valida"],
       "A validação na API dá mensagens boas e barra lixo cedo. A constraint protege contra o que a API não vê: outro serviço, um script, uma corrida entre duas requisições. A validação do front é só conforto: qualquer um chama a API direto."),
  ]),
],
# ---------------------------------------------------------------- 3. Banco de dados
[
  D("Consultas e desempenho", ["N+1", "índice composto", "WHERE vs HAVING", "ordem lógica do SQL", "LEFT JOIN e COUNT", "índice de expressão"], [
    bug("Esta listagem de 20 posts faz 21 consultas ao banco. Qual linha causa isso?",
        """
        const posts = await db.query('SELECT * FROM posts LIMIT 20');
        for (const post of posts) {
          post.autor = await db.query(
            'SELECT * FROM usuarios WHERE id = $1', [post.autor_id]);
        }
        return posts;
        """,
        "post.autor = await db.query(",
        "É o problema N+1: 1 consulta para a lista e mais 1 por item. Com 20 itens são 21 idas ao banco; com 1.000, 1.001. Resolva com um JOIN ou com uma segunda consulta `WHERE id = ANY($1)` buscando todos os autores de uma vez.",
        """
        SELECT p.*, u.nome AS autor_nome
        FROM posts p JOIN usuarios u ON u.id = p.autor_id
        LIMIT 20
        """,
        also=["'SELECT * FROM usuarios"]),
    sc("Esta consulta ficou lenta com 5 milhões de pedidos. O `EXPLAIN` mostra `Seq Scan on pedidos`.",
       "Qual é a melhor correção?",
       ["Criar um índice composto em `(cliente_id, criado_em DESC)`",
        "Criar um índice só em `criado_em`",
        "Trocar `SELECT *` por `SELECT id`, que elimina o Seq Scan",
        "Aumentar o `LIMIT` para o banco usar o cache"],
       "O índice composto atende o filtro e a ordenação juntos: o banco vai direto para os pedidos daquele cliente, já ordenados, e lê só 10 entradas. Um índice só em `criado_em` ainda varreria pedidos de todos os clientes.",
       code="SELECT * FROM pedidos\nWHERE cliente_id = $1\nORDER BY criado_em DESC\nLIMIT 10;"),
    bug("O banco recusa esta consulta. Qual linha está errada?",
        """
        SELECT cliente_id, COUNT(*) AS total
        FROM pedidos
        WHERE COUNT(*) > 5
        GROUP BY cliente_id;
        """,
        "WHERE COUNT(*)",
        "`WHERE` filtra linhas antes do agrupamento, quando `COUNT(*)` ainda não existe. Filtro sobre agregados vai no `HAVING`, depois do `GROUP BY`.",
        """
        GROUP BY cliente_id
        HAVING COUNT(*) > 5;
        """),
    order("Ordene as cláusulas na ordem lógica em que o banco as avalia.",
          ["FROM e JOIN", "WHERE", "GROUP BY", "HAVING", "SELECT", "ORDER BY e LIMIT"],
          "Essa ordem explica erros comuns: um apelido criado no `SELECT` não pode ser usado no `WHERE` (que roda antes), mas pode no `ORDER BY` (que roda depois). E agregados só existem a partir do `GROUP BY`."),
    to(["INNER JOIN", "LEFT JOIN"],
       "O relatório precisa listar TODOS os clientes com o total de pedidos, inclusive quem nunca comprou (com 0). Qual consulta?",
       ["`LEFT JOIN` com `COUNT(p.id)`, porque mantém clientes sem pedidos e conta só pedidos que existem",
        "`INNER JOIN` com `COUNT(*)`, porque conta todos os clientes",
        "`LEFT JOIN` com `COUNT(*)`, porque conta 0 para quem não tem pedido",
        "`INNER JOIN`, porque `LEFT JOIN` duplica os clientes"],
       "`INNER JOIN` descarta quem não tem pedido. Com `LEFT JOIN`, quem não comprou vem numa linha com as colunas de `p` nulas: `COUNT(*)` contaria essa linha (1), e `COUNT(p.id)` ignora nulos (0).",
       code="SELECT c.nome, COUNT(p.id) AS pedidos\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nGROUP BY c.id, c.nome;"),
    sc("A busca `WHERE email = $1` usa o índice de `email`. Para ignorar maiúsculas, você trocou por `WHERE LOWER(email) = LOWER($1)` e ela virou `Seq Scan`.",
       "Como resolver?",
       ["Criar um índice de expressão em `LOWER(email)`, ou guardar o e-mail já em minúsculas",
        "Rodar `VACUUM` na tabela",
        "Trocar `=` por `LIKE`",
        "Usar `SELECT DISTINCT`"],
       "O índice guarda os valores de `email`, não de `LOWER(email)`. Aplicar uma função na coluna impede o uso do índice comum. `CREATE INDEX ON usuarios (LOWER(email))` indexa exatamente a expressão buscada."),
  ]),
  D("Consistência na prática", ["condição de corrida", "transações", "dinheiro sem float", "migrations sem downtime", "soft delete", "UNIQUE contra cliques duplos"], [
    bug("Com duas compras simultâneas do último item, as duas passam e o estoque fica errado. Qual linha é o problema?",
        """
        async function comprar(produtoId) {
          const { estoque } = await db.one(
            'SELECT estoque FROM produtos WHERE id = $1', [produtoId]);
          if (estoque < 1) throw new ErroSemEstoque();
          await db.none(
            'UPDATE produtos SET estoque = $1 WHERE id = $2', [estoque - 1, produtoId]);
        }
        """,
        "SET estoque = $1",
        "As duas requisições leem `estoque = 1`, as duas passam no `if` e as duas gravam 0: uma venda a mais (lost update). Faça a checagem e a escrita numa única instrução atômica e confira quantas linhas mudaram.",
        """
        const r = await db.result(
          'UPDATE produtos SET estoque = estoque - 1 WHERE id = $1 AND estoque > 0', [produtoId]);
        if (r.rowCount === 0) throw new ErroSemEstoque();
        """,
        also=["'UPDATE produtos"]),
    sc("Uma transferência debita a conta A e depois credita a conta B, com dois `UPDATE` separados. O servidor caiu entre os dois e o dinheiro sumiu.",
       "Como evitar?",
       ["Envolver os dois `UPDATE` numa transação (`BEGIN` … `COMMIT`): ou os dois valem, ou nenhum",
        "Creditar primeiro e debitar depois",
        "Repetir o débito se o crédito falhar",
        "Guardar os saldos no Redis"],
       "Atomicidade é o A do ACID. Se algo falha antes do `COMMIT`, o banco desfaz tudo (rollback). Inverter a ordem só troca o problema: em vez de sumir, o dinheiro apareceria do nada."),
    bug("Esta tabela vai gerar centavos errados nos relatórios. Qual linha?",
        """
        CREATE TABLE pedidos (
          id BIGSERIAL PRIMARY KEY,
          cliente_id BIGINT NOT NULL REFERENCES clientes(id),
          total FLOAT NOT NULL,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """,
        "total FLOAT",
        "Ponto flutuante não representa 0,10 exatamente (`0.1 + 0.2 = 0.30000000000000004`), e os erros se acumulam em somas. Guarde dinheiro em centavos inteiros ou em `NUMERIC(12,2)`.",
        "total_centavos BIGINT NOT NULL,"),
    order("Você precisa de uma nova coluna `NOT NULL` numa tabela grande, com o app no ar. Ordene os passos.",
          ["Migration que adiciona a coluna aceitando nulo",
           "Deploy do código que já preenche a coluna nas linhas novas",
           "Script que preenche as linhas antigas, em lotes",
           "Migration que adiciona a restrição `NOT NULL`"],
          "É o padrão expandir e contrair. Adicionar a coluna já `NOT NULL` quebraria o código antigo, que ainda não grava nela, e preencher milhões de linhas numa única transação trava a tabela. Cada passo é compatível com o anterior."),
    to(["Soft delete", "Hard delete"],
       "Usuários podem \"excluir\" pedidos, mas o financeiro precisa do histórico para auditoria. O que fazer?",
       ["Soft delete (coluna `deleted_at`), filtrando os excluídos nas consultas, porque preserva o histórico",
        "Hard delete (`DELETE`), porque o banco mantém um histórico automático",
        "Soft delete, porque deixa as consultas mais simples e rápidas",
        "Hard delete com `ON DELETE CASCADE`, que gera a auditoria"],
       "Soft delete preserva os dados, mas tem custo: todo `SELECT` precisa de `WHERE deleted_at IS NULL`, e índices `UNIQUE` precisam ser parciais. E atenção à LGPD: dados pessoais às vezes precisam ser apagados ou anonimizados de verdade."),
    sc("Dois cliques rápidos em \"Cadastrar\" criaram dois usuários com o mesmo e-mail, mesmo com o código fazendo um `SELECT` para checar antes do `INSERT`.",
       "Qual é a correção confiável?",
       ["Criar uma constraint `UNIQUE` em `email` e tratar a violação (código 23505) como 409",
        "Esperar 500 ms antes do `INSERT`",
        "Só desabilitar o botão no front",
        "Fazer o `SELECT` duas vezes"],
       "Checar e depois inserir tem uma janela de corrida: as duas requisições checam antes de qualquer uma inserir. Só o banco consegue garantir unicidade de forma atômica. Desabilitar o botão ajuda a UX, mas não impede requisições diretas."),
  ]),
],
# ---------------------------------------------------------------- 4. Autenticação e segurança
[
  D("Autenticação na prática", ["verificar hash", "verify vs decode", "token curto + refresh", "rotação de refresh token", "onde guardar tokens", "enumeração de contas"], [
    bug("Nenhum usuário consegue fazer login, nem com a senha certa. Qual linha causa isso?",
        """
        async function login(email, senha) {
          const user = await repo.buscarPorEmail(email);
          if (!user) throw new ErroCredenciais();
          const hash = await argon2.hash(senha);
          if (hash !== user.senhaHash) throw new ErroCredenciais();
          return gerarTokens(user);
        }
        """,
        "argon2.hash(senha)",
        "Cada `hash` gera um salt aleatório novo, então o resultado nunca é igual ao guardado. Para conferir, use `argon2.verify`, que lê o salt e os parâmetros de dentro do hash salvo.",
        "if (!(await argon2.verify(user.senhaHash, senha))) throw new ErroCredenciais();",
        also=["hash !== user.senhaHash"]),
    bug("Qualquer pessoa consegue se passar por outro usuário nesta API. Qual linha?",
        """
        import jwt from 'jsonwebtoken';

        function autenticar(req) {
          const token = req.headers.authorization?.replace('Bearer ', '');
          const payload = jwt.decode(token);
          if (!payload) throw new ErroNaoAutenticado();
          return payload.sub;
        }
        """,
        "jwt.decode(token)",
        "`decode` só lê o payload (que é base64, não criptografado) e não confere a assinatura. Qualquer um monta um token com `sub` de outra pessoa. `verify` checa assinatura e expiração.",
        "const payload = jwt.verify(token, process.env.JWT_SECRET);"),
    sc("O access token JWT vale 7 dias. Um token vazou num log e não há como invalidá-lo antes de expirar.",
       "Qual desenho reduz esse risco?",
       ["Access token curto (ex.: 15 min) e refresh token guardado no servidor, com rotação e revogação",
        "Aumentar a validade para 30 dias para o usuário logar menos",
        "Guardar o JWT no localStorage em vez de cookie",
        "Criptografar o payload do JWT"],
       "JWT é verificado sem consultar o banco, por isso não dá para revogar. Com validade curta, um vazamento vale minutos. O refresh token fica numa tabela, então dá para revogar no logout ou ao detectar abuso."),
    order("O access token expirou. Ordene o fluxo de renovação com rotação de refresh token.",
          ["A API responde 401 porque o access token expirou",
           "O cliente envia o refresh token para `POST /auth/refresh`",
           "O servidor confere se o refresh token existe, está válido e não foi revogado",
           "O servidor invalida esse refresh token e emite um par novo (access + refresh)",
           "O cliente repete a requisição original com o access token novo"],
          "Com rotação, cada refresh token só serve uma vez. Se um token já usado aparecer de novo, é sinal de roubo: o servidor pode revogar toda a família de tokens daquela sessão."),
    to(["Cookie httpOnly", "localStorage"],
       "Onde um SPA deve guardar o refresh token?",
       ["Cookie `httpOnly` + `Secure` + `SameSite`, porque nenhum JavaScript, nem um script injetado por XSS, consegue lê-lo",
        "localStorage, porque cookies são enviados para qualquer site",
        "localStorage, porque é imune a XSS",
        "Cookie sem `httpOnly`, para o front conseguir ler e renovar"],
       "Tudo que está no localStorage um XSS consegue ler e mandar para fora. Cookie `httpOnly` é invisível ao JavaScript. O risco que sobra é CSRF, reduzido com `SameSite=Lax` ou `Strict` e com a rota de refresh aceitando só POST."),
    sc("A tela de login responde \"E-mail não cadastrado\" ou \"Senha incorreta\", conforme o caso.",
       "Qual é o problema?",
       ["Permite descobrir quais e-mails têm conta; responda sempre \"E-mail ou senha inválidos\"",
        "Nenhum: mensagens específicas são boa prática de UX",
        "O e-mail inexistente deveria responder 404",
        "Deveria redirecionar para o cadastro automaticamente"],
       "Isso é enumeração de contas: um atacante testa uma lista de e-mails e descobre quem é cliente, para depois tentar senhas vazadas. Use a mesma mensagem e um tempo de resposta parecido nos dois casos."),
  ]),
  D("Ataques e defesas", ["BOLA/IDOR", "mass assignment", "força bruta", "CORS com cookies", "segredo vazado"], [
    bug("Um usuário logado consegue ver a fatura de outros trocando o número na URL. Qual linha?",
        """
        fastify.get('/faturas/:id', { preHandler: autenticar }, async (req) => {
          const fatura = await repo.faturas.buscar(req.params.id);
          if (!fatura) throw new ErroNaoEncontrado();
          return fatura;
        });
        """,
        "repo.faturas.buscar(",
        "Autenticar não é autorizar: a rota sabe QUEM é o usuário, mas não confere se a fatura é DELE. É o BOLA/IDOR, primeiro do OWASP API Top 10. Filtre sempre pelo dono e responda 404 (não 403) para não confirmar que o id existe.",
        "const fatura = await repo.faturas.buscar({ id: req.params.id, donoId: req.user.id });"),
    bug("Um usuário mandou `{ \"nome\": \"Ana\", \"role\": \"admin\" }` para esta rota e virou administrador. Qual linha?",
        """
        fastify.patch('/me', { preHandler: autenticar }, async (req) => {
          const dados = req.body;
          return repo.usuarios.atualizar(req.user.id, dados);
        });
        """,
        "const dados = req.body;",
        "É mass assignment: o body vai inteiro para o banco, inclusive campos que o usuário não deveria controlar (`role`, `saldo`, `verificado`). Passe por um schema com só os campos permitidos. O `z.object` do Zod descarta chaves desconhecidas por padrão.",
        "const dados = AtualizarPerfil.parse(req.body); // z.object({ nome, bio })"),
    sc("Os logs mostram 50 mil tentativas de login por hora, de vários IPs, testando senhas comuns em muitas contas diferentes.",
       "Qual é a melhor resposta?",
       ["Rate limit no login por IP e por conta, com espera progressiva, alerta e, se possível, MFA",
        "Trocar Argon2 por SHA-256 para o login responder mais rápido",
        "Responder 404 em vez de 401 nas falhas",
        "Desligar o CORS da API"],
       "É credential stuffing ou password spraying. Limitar por conta pega ataques distribuídos em muitos IPs; limitar por IP pega um IP testando muitas contas. Hash lento é proposital: deixa caro testar senhas se o banco vazar."),
    to(["origin: '*'", "Lista de origens"],
       "Sua API usa cookie de sessão e só o seu front em `app.exemplo.com` deve chamá-la. Como configurar o CORS?",
       ["Lista explícita (`origin: ['https://app.exemplo.com']`) com `credentials: true`",
        "`origin: '*'` com `credentials: true`, que libera tudo e funciona com cookies",
        "`origin: '*'`, porque CORS protege o servidor contra qualquer ataque",
        "Desligar o CORS, porque o navegador já bloqueia tudo"],
       "O navegador recusa `*` junto com credenciais, então só uma lista funciona com cookie. E CORS não protege o servidor: é uma regra do navegador sobre quais sites podem ler a resposta. `curl` ou um script ignoram CORS, por isso a autenticação continua necessária."),
    order("Uma chave de API de produção foi parar num commit público. Ordene a resposta.",
          ["Revogar ou rotacionar a chave no provedor imediatamente",
           "Colocar a chave nova no gerenciador de segredos e fazer o deploy",
           "Verificar nos logs do provedor se a chave vazada foi usada",
           "Limpar o histórico do Git e ativar varredura de segredos no CI"],
          "Robôs varrem o GitHub e usam chaves em minutos, então apagar o commit não resolve: a chave já deve ser considerada comprometida. Primeiro corte o acesso, depois restaure o serviço, investigue o estrago e por fim evite que aconteça de novo."),
    sc("Para depurar, um dev adicionou `req.log.info({ headers: req.headers }, 'requisição')` em todas as rotas, e isso foi para produção.",
       "Qual é o risco principal?",
       ["Os logs passam a guardar tokens e cookies do header `Authorization`, e quem lê os logs pode sequestrar sessões",
        "Os logs ficam maiores, mas não há risco de segurança",
        "O Fastify bloqueia a requisição quando ela é logada",
        "Os headers aparecem para o usuário na resposta"],
       "Logs costumam ter acesso mais amplo e retenção maior que o banco. Use o `redact` do Pino (ex.: `redact: ['req.headers.authorization', 'req.headers.cookie']`) e nunca logue senha, token ou corpo inteiro de login."),
  ]),
],
# ---------------------------------------------------------------- 5. Qualidade e entrega
[
  D("TypeScript e testes", ["strict e undefined", "await em asserções", "banco real nos testes", "pirâmide de testes", "TDD", "z.infer"], [
    bug("Com `strict: true`, o `tsc` acusa um erro neste arquivo. Em qual linha?",
        """
        type Usuario = { id: number; nome: string; email?: string };

        function dominio(u: Usuario): string {
          return u.email.split('@')[1];
        }
        """,
        "return u.email",
        "`email?` significa `string | undefined`. Com `strictNullChecks`, o TypeScript não deixa chamar `.split` em algo que pode ser `undefined`, o que seria um `TypeError` em produção. Trate o caso ausente.",
        "return u.email?.split('@')[1] ?? 'sem-email';"),
    bug("Este teste passa mesmo quando `criarUsuario` aceita o e-mail duplicado. Qual linha?",
        """
        test('rejeita e-mail duplicado', async () => {
          await criarUsuario({ email: 'a@a.com' });
          expect(criarUsuario({ email: 'a@a.com' })).rejects.toThrow(ErroConflito);
        });
        """,
        "expect(criarUsuario(",
        "`.rejects` devolve uma Promise. Sem `await`, o teste termina antes de a asserção rodar e passa sem checar nada (o Vitest só avisa no console). Asserções assíncronas sempre precisam de `await`.",
        "await expect(criarUsuario({ email: 'a@a.com' })).rejects.toThrow(ErroConflito);"),
    sc("Os testes de integração usam SQLite em memória, mas produção usa PostgreSQL. Uma consulta com `ILIKE` e JSONB passou nos testes e quebrou em produção.",
       "O que muda isso?",
       ["Rodar os testes de integração contra um PostgreSQL real e descartável (ex.: Testcontainers)",
        "Subir a cobertura para 100%",
        "Mockar o banco em todos os testes",
        "Testar direto em produção com feature flag"],
       "Teste de integração só vale se integra com a coisa real. SQLite não tem `ILIKE` nem JSONB do mesmo jeito. Testcontainers sobe um Postgres da mesma versão num container por execução. Cobertura alta com o banco errado continua deixando o bug passar."),
    to(["Testes unitários", "Testes de integração"],
       "Você precisa testar uma regra de desconto com 10 faixas de preço e também que `POST /pedidos` grava o pedido no banco. Como dividir?",
       ["Unitários para as 10 faixas (rápidos, sem I/O) e alguns de integração para a rota com banco real",
        "Só integração, passando pela rota uma vez para cada faixa",
        "Só unitários com o banco mockado, que já garantem a gravação",
        "Só um teste end-to-end, que cobre tudo"],
       "Regra pura com muitas combinações é ideal para teste unitário: milissegundos cada. A gravação no banco só se prova com integração. Passar as 10 faixas pela rota funciona, mas fica lento e o erro aponta para longe da causa."),
    order("Ordene um ciclo de TDD.",
          ["Escrever um teste para o comportamento que ainda não existe",
           "Rodar e ver o teste falhar pelo motivo certo",
           "Escrever o código mínimo para o teste passar",
           "Refatorar com os testes continuando verdes"],
          "Ver o teste falhar primeiro prova que ele testa algo: um teste que nunca falhou pode estar passando por engano, como um `expect` sem `await`. Só depois de verde vale refatorar, com a rede de segurança ligada."),
    sc("Você tem um schema Zod `CriarUsuario` e também uma `interface CriarUsuarioDTO` escrita à mão. Os dois vivem divergindo depois de cada mudança.",
       "Qual é a solução?",
       ["Derivar o tipo do schema com `type CriarUsuarioDTO = z.infer<typeof CriarUsuario>`",
        "Trocar o tipo do DTO por `any`",
        "Gerar o schema a partir da interface em tempo de execução",
        "Apagar o schema e confiar só no tipo"],
       "Tipos do TypeScript somem na compilação, então não validam nada em runtime: o schema é necessário. Com `z.infer`, o schema é a fonte única e o tipo acompanha sozinho. Não dá para fazer o caminho inverso, porque a interface não existe em runtime."),
  ]),
  D("Docker, logs e CI", ["cache de camadas", "dados sensíveis em log", "logs estruturados", "etapas do CI", "multi-stage", "depends_on com healthcheck"], [
    bug("Qualquer mudança em qualquer arquivo faz o `npm ci` rodar de novo no build da imagem. Qual linha causa isso?",
        """
        FROM node:22-slim
        WORKDIR /app
        COPY . .
        RUN npm ci
        CMD ["node", "dist/server.js"]
        """,
        "COPY . .",
        "O Docker reaproveita uma camada só se nada antes dela mudou. Copiando tudo antes do `npm ci`, qualquer edição invalida a instalação. Copie primeiro só os manifests, instale e depois copie o código. E use um `.dockerignore` para `node_modules` e `.env`.",
        """
        COPY package.json package-lock.json ./
        RUN npm ci
        COPY . .
        """),
    bug("Este log de auditoria expõe dados que nunca deveriam ser gravados. Qual linha?",
        """
        fastify.post('/login', async (req, reply) => {
          req.log.info({ body: req.body }, 'tentativa de login');
          const tokens = await auth.login(req.body.email, req.body.senha);
          return tokens;
        });
        """,
        "{ body: req.body }",
        "O corpo do login tem a senha em texto puro, que vai parar no arquivo de log, na ferramenta de logs e em backups. Logue só o necessário (o e-mail ou um id) e configure `redact` no Pino como segunda barreira.",
        "req.log.info({ email: req.body.email }, 'tentativa de login');"),
    sc("Um cliente relatou um erro às 14h32. Os logs são `console.log('deu erro aqui')` em texto livre, de 6 instâncias misturadas, e você não acha a requisição dele.",
       "O que resolve?",
       ["Logs estruturados em JSON (Pino) com `reqId`, nível, rota e id do usuário, para filtrar por campo",
        "Mais `console.log` em cada linha do código",
        "Gravar os logs num arquivo dentro do container",
        "Desligar os logs em produção para ganhar desempenho"],
       "Com JSON dá para buscar `userId = 42 AND level >= 50` e seguir uma requisição pelo `reqId` em todas as linhas que ela gerou. Arquivo dentro do container some quando ele é recriado."),
    order("Ordene as etapas de um pipeline de CI para um pull request.",
          ["Checkout do código",
           "Instalar dependências com `npm ci`",
           "Lint e checagem de tipos (`tsc --noEmit`)",
           "Testes automatizados",
           "Build da imagem Docker"],
          "As checagens baratas e rápidas vêm primeiro: se o lint falha em 20 s, não vale gastar 5 min em testes e build. O build da imagem vem por último porque só interessa se o código está correto."),
    to(["Imagem única", "Multi-stage"],
       "Por que usar multi-stage no Dockerfile de produção de uma API TypeScript?",
       ["Multi-stage: compila numa etapa com as devDependencies e copia só o `dist` e as dependências de produção para a imagem final, menor e com menos superfície de ataque",
        "Imagem única, porque multi-stage deixa o container mais lento em execução",
        "Multi-stage, porque executa as etapas em paralelo em produção",
        "Imagem única, porque as devDependencies são necessárias em produção"],
       "O compilador, os tipos e as ferramentas de teste só servem no build. Deixá-los na imagem final aumenta o tamanho (deploy mais lento) e o número de pacotes com possíveis vulnerabilidades. Em execução, as duas imagens rodam igual."),
    sc("No `docker compose`, a API sobe antes de o Postgres aceitar conexões e falha na inicialização. A API já tem `depends_on: [db]`.",
       "Qual é a correção?",
       ["`healthcheck` no Postgres (ex.: `pg_isready`) e `depends_on` com `condition: service_healthy`, mais retry de conexão no app",
        "Um `sleep 30` no início do comando da API",
        "Rodar o Postgres e a API no mesmo container",
        "Nada: o `depends_on` simples já espera o banco aceitar conexões"],
       "O `depends_on` simples só espera o container iniciar, não o banco ficar pronto. Com healthcheck o compose espera o `pg_isready` passar. O retry no app continua importante, porque em produção o banco também pode reiniciar."),
  ]),
],
# ---------------------------------------------------------------- 6. Assíncrono e integrações
[
  D("Cache e APIs externas", ["TTL no cache", "timeout no fetch", "cache stampede", "backoff exponencial", "o que repetir", "circuit breaker"], [
    bug("Mudanças de preço não aparecem nunca para os clientes. Qual linha?",
        """
        async function buscarProduto(id) {
          const cache = await redis.get(`produto:${id}`);
          if (cache) return JSON.parse(cache);
          const produto = await db.produtos.buscar(id);
          await redis.set(`produto:${id}`, JSON.stringify(produto));
          return produto;
        }
        """,
        "await redis.set(",
        "Sem TTL, a chave fica no Redis para sempre e o preço antigo nunca sai. Defina uma expiração e também apague a chave (`redis.del`) quando o produto for atualizado.",
        "await redis.set(`produto:${id}`, JSON.stringify(produto), 'EX', 300);"),
    bug("Quando a API de câmbio trava, as requisições do seu servidor ficam penduradas por minutos e as conexões se acumulam. Qual linha?",
        """
        async function cotacao(moeda) {
          const res = await fetch(`https://api.cambio.exemplo/${moeda}`);
          if (!res.ok) throw new ErroExterno(res.status);
          return res.json();
        }
        """,
        "await fetch(",
        "O `fetch` nativo não tem timeout por padrão. Um serviço lento prende suas requisições, memória e conexões até tudo cair junto. Sempre defina um limite com `AbortSignal.timeout`.",
        "const res = await fetch(url, { signal: AbortSignal.timeout(3000) });"),
    sc("Um produto muito acessado fica em cache com TTL de 60 s. Quando a chave expira, 2 mil requisições batem no banco ao mesmo tempo e ele trava.",
       "O que evita isso?",
       ["Deixar só uma requisição recalcular (um lock no Redis) enquanto as outras esperam ou usam o valor antigo, e variar o TTL com jitter",
        "Remover o TTL da chave",
        "Baixar o TTL para 1 s",
        "Aumentar o pool do banco para 2 mil conexões"],
       "Isso é cache stampede. Com um lock (`SET chave:lock 1 NX EX 5`), só quem pegou o lock vai ao banco. O jitter evita que muitas chaves expirem no mesmo segundo. Remover o TTL troca o problema por dados velhos."),
    order("Ordene o que acontece numa chamada com retry e backoff exponencial.",
          ["A 1ª tentativa falha com 503",
           "Espera ~200 ms (com jitter) e tenta de novo",
           "Falha outra vez e espera ~400 ms",
           "Falha outra vez e espera ~800 ms",
           "Esgotadas as tentativas, lança o erro ou usa um fallback"],
          "Dobrar a espera dá tempo para o serviço se recuperar sem afogá-lo em tentativas. O jitter (um valor aleatório somado) evita que milhares de clientes tentem de novo exatamente no mesmo instante."),
    to(["Repetir", "Falhar logo"],
       "Quais erros de uma API externa vale repetir automaticamente?",
       ["Repetir 429, 503 e timeouts, que são transitórios; não repetir 400, 401 e 404, que vão falhar de novo",
        "Repetir todos os erros até dar certo",
        "Repetir só o 400, porque o corpo pode ter chegado corrompido",
        "Nunca repetir, porque retry sempre duplica dados"],
       "Erros 4xx (exceto 408 e 429) dizem que o problema está no pedido: repetir só gasta cota. 429 deve respeitar o header `Retry-After`. E repetir um POST só é seguro se a operação for idempotente (ex.: com `Idempotency-Key`)."),
    sc("O serviço externo de frete está fora há 10 minutos. Cada pedido espera 3 s de timeout e mais 3 retries antes de falhar, e o checkout ficou lento para todo mundo.",
       "Qual padrão resolve?",
       ["Circuit breaker: depois de várias falhas, parar de chamar por um tempo e usar um fallback (ex.: frete fixo)",
        "Aumentar o timeout para 30 s",
        "Aumentar os retries para 10",
        "Guardar o erro no cache para sempre"],
       "Com o circuito aberto, as chamadas falham na hora e o fallback entra, em vez de cada usuário pagar 12 s por uma resposta que já se sabe que não vem. De tempos em tempos, uma chamada de teste verifica se o serviço voltou (meio-aberto)."),
  ]),
  D("Filas e webhooks", ["assinatura sobre o corpo bruto", "jobs idempotentes", "responder rápido", "ciclo de vida do job", "fila vs chamada direta", "eventos fora de ordem"], [
    bug("Webhooks legítimos do provedor estão sendo rejeitados por \"assinatura inválida\" de vez em quando. Qual linha?",
        """
        fastify.post('/webhooks/pagamento', async (req, reply) => {
          const assinatura = req.headers['x-assinatura'];
          const esperada = crypto.createHmac('sha256', SEGREDO)
            .update(JSON.stringify(req.body))
            .digest('hex');
          if (!iguais(assinatura, esperada)) return reply.code(401).send();
          await fila.add('pagamento', req.body);
          return reply.code(200).send();
        });
        """,
        "JSON.stringify(req.body)",
        "O provedor assinou os bytes exatos que enviou. Reconverter o objeto em JSON pode mudar espaços, ordem de chaves e escapes, e o HMAC deixa de bater. Calcule sobre o corpo bruto (`rawBody`) e compare com `crypto.timingSafeEqual`.",
        ".update(req.rawBody)"),
    bug("Quando o banco falha depois da cobrança, o retry do job cobra o cliente de novo. Qual linha precisa mudar?",
        """
        new Worker('cobrancas', async (job) => {
          const { pedidoId, valor } = job.data;
          await gateway.cobrar(pedidoId, valor);
          await db.pedidos.marcarPago(pedidoId);
        }, { connection });
        """,
        "await gateway.cobrar(",
        "Filas entregam pelo menos uma vez, então todo job pode rodar de novo. Passe uma chave de idempotência estável para o gateway: na repetição ele devolve a cobrança já feita em vez de criar outra.",
        "await gateway.cobrar(pedidoId, valor, { idempotencyKey: `cobranca-${pedidoId}` });"),
    sc("O provedor de pagamentos espera resposta do webhook em até 5 s. Seu handler emite a nota fiscal e envia e-mail antes de responder (~15 s). O provedor marca como falha e reenvia o evento.",
       "Como resolver?",
       ["Validar a assinatura, gravar ou enfileirar o evento e responder 2xx na hora; processar depois num worker",
        "Pedir ao provedor para aumentar o timeout",
        "Responder 500 para o provedor tentar mais tarde",
        "Usar `Promise.all` na nota e no e-mail para caber em 5 s"],
       "O webhook só precisa confirmar o recebimento. O trabalho pesado vai para a fila, com retries próprios. Como o provedor pode reenviar mesmo assim, deduplique pelo id do evento."),
    order("Ordene o ciclo de vida de um job no BullMQ que falha uma vez e depois dá certo.",
          ["A API adiciona o job com `queue.add`",
           "Um worker pega o job, que fica ativo",
           "O processamento lança um erro",
           "O job espera o backoff e volta para a fila",
           "Um worker tenta de novo e o job é concluído"],
          "Com `attempts` e `backoff` nas opções do job, o BullMQ cuida das novas tentativas. Se todas falharem, o job vai para a lista de falhos, de onde dá para investigar e reprocessar."),
    to(["Chamada direta", "Fila"],
       "No cadastro, o usuário recebe um e-mail de boas-vindas. Enviar dentro da requisição ou por uma fila?",
       ["Fila: a rota responde rápido e o envio ganha retries se o provedor de e-mail cair",
        "Direto na requisição, porque filas perdem mensagens",
        "Fila, porque garante entrega exatamente uma vez",
        "Direto, porque o `await` já repete se falhar"],
       "Dentro da requisição, um provedor de e-mail lento atrasa ou derruba o cadastro. Na fila, o cadastro conclui e o e-mail tem retries. Mas filas entregam pelo menos uma vez, não exatamente uma: o worker deve ser idempotente."),
    sc("Seu webhook recebeu `pagamento.aprovado` e, segundos depois, `pagamento.criado` (fora de ordem). O pedido voltou para \"pendente\".",
       "Como tratar isso?",
       ["Não confiar na ordem: comparar a data ou versão do evento com o estado atual e ignorar eventos mais antigos",
        "Esperar 5 s antes de processar cada webhook",
        "Recusar com 400 os eventos fora de ordem",
        "Trocar para HTTP/2, que garante a ordem"],
       "Webhooks chegam fora de ordem e repetidos por causa de retries e paralelismo. Guarde o id dos eventos processados (deduplicação) e só aplique uma mudança se ela for mais nova que o estado atual, ou consulte o estado na API do provedor."),
  ]),
],
# ---------------------------------------------------------------- 7. Projeto final
[
  D("Arquitetura", ["serviço sem HTTP", "repositório e injeção", "ADRs", "caminho entre camadas", "monólito modular", "regra num lugar só"], [
    bug("Este serviço não pode ser reaproveitado num job ou num CLI. Qual linha quebra a separação de camadas?",
        """
        // services/pedidos.js
        export async function criarPedido(dados, reply) {
          if (dados.itens.length === 0) {
            return reply.code(400).send({ erro: 'Pedido vazio' });
          }
          return pedidosRepo.criar(dados);
        }
        """,
        "return reply.code(400)",
        "O serviço é a camada de regras de negócio e não deve saber o que é HTTP. Com `reply` dentro dele, um worker ou um script não conseguem usá-lo. Lance um erro de domínio e deixe o error handler traduzir para 400.",
        "throw new ErroDeDominio('PEDIDO_VAZIO');",
        also=["export async function criarPedido(dados, reply)"]),
    bug("Para testar este serviço é preciso um banco de verdade, e ele pula uma camada. Qual linha é o problema?",
        """
        import { db } from '../db.js';

        export class PedidosService {
          async total(clienteId) {
            const pedidos = await db.query('SELECT total FROM pedidos WHERE cliente_id = $1', [clienteId]);
            return pedidos.reduce((s, p) => s + p.total, 0);
          }
        }
        """,
        "await db.query(",
        "O serviço fala SQL direto, misturando regra e acesso a dados. Receba um repositório no construtor (injeção de dependência simples): em produção vai o repositório real, no teste um objeto falso.",
        """
        constructor(pedidosRepo) { this.repo = pedidosRepo; }
        const pedidos = await this.repo.listarPorCliente(clienteId);
        """,
        also=["import { db }"]),
    sc("Seis meses depois, alguém pergunta por que o projeto usa Fastify e não Express, e ninguém lembra. A discussão recomeça do zero.",
       "O que teria evitado isso?",
       ["Registrar decisões importantes em ADRs curtos (contexto, decisão, consequências) no repositório",
        "Listar as dependências no README",
        "Comentar o motivo dentro do package.json",
        "Trocar para Express, que é mais popular"],
       "Um ADR (Architecture Decision Record) é um arquivo curto e datado, como `docs/adr/0003-fastify.md`. Ele guarda o porquê, que o código não mostra, e evita refazer a mesma discussão quando o time muda."),
    order("Ordene o caminho de `POST /pedidos` numa arquitetura em camadas.",
          ["A rota valida o body e pega o usuário autenticado",
           "O serviço aplica as regras de negócio (estoque, desconto)",
           "O repositório grava o pedido no banco",
           "O serviço devolve o pedido criado",
           "A rota responde 201 com o pedido serializado"],
          "Cada camada tem um papel: a rota cuida de HTTP (entrada e saída), o serviço das regras e o repositório do banco. A dependência vai sempre para dentro: a rota chama o serviço, nunca o contrário."),
    to(["Microsserviços", "Monólito modular"],
       "Time de 3 pessoas, produto novo, ainda descobrindo o domínio. Qual arquitetura?",
       ["Monólito modular, com módulos bem separados: simples de desenvolver, testar e publicar, e dá para extrair serviços depois",
        "Microsserviços desde o início, porque escalam melhor em qualquer cenário",
        "Monólito sem módulos, porque organização só importa em projetos grandes",
        "Microsserviços, porque reduzem a complexidade operacional"],
       "Microsserviços trocam complexidade de código por complexidade de operação: rede, deploys independentes, consistência distribuída, observabilidade. Valem quando times grandes precisam de autonomia. Com o domínio ainda mudando, fronteiras erradas entre serviços custam caro."),
    sc("A regra \"cliente VIP tem frete grátis acima de R$ 100\" está copiada na rota de checkout, no job de recálculo e no relatório. As três versões divergiram.",
       "Qual é a melhor correção?",
       ["Centralizar a regra numa função de domínio (ex.: `calcularFrete`) usada pelos três",
        "Mover a regra para uma trigger no banco",
        "Documentar a regra no README",
        "Copiar a versão mais recente para os três lugares"],
       "Regra de negócio duplicada diverge, é questão de tempo. Uma função única no serviço, com testes unitários, garante que checkout, job e relatório deem o mesmo resultado."),
  ]),
  D("LLM e produção", ["ferramentas com autorização", "validar a saída do LLM", "custo e timeout", "RAG com embeddings", "métricas e alertas", "rollback com migrations"], [
    bug("Com o prompt \"mostre o pedido 1042\", um usuário viu o pedido de outra pessoa pelo chat com LLM. Qual linha?",
        """
        async function executarFerramenta(nome, input, usuario) {
          if (nome === 'buscar_pedido') {
            return repo.pedidos.buscar(input.pedidoId);
          }
          throw new Error(`Ferramenta desconhecida: ${nome}`);
        }
        """,
        "repo.pedidos.buscar(input.pedidoId)",
        "Os argumentos de uma ferramenta vêm do modelo, e o modelo obedece ao texto do usuário (prompt injection). Trate o input como entrada não confiável e aplique a mesma autorização da API: filtre pelo usuário logado, que vem da sessão e não do prompt.",
        "return repo.pedidos.buscar({ id: input.pedidoId, donoId: usuario.id });"),
    bug("Um dia o LLM devolveu `\"preco\": \"grátis\"` e o produto ficou com preço inválido. Qual linha deveria ter barrado isso?",
        """
        const resposta = await llm.gerar({ prompt, formato: 'json' });
        const sugestao = JSON.parse(resposta.texto);
        await repo.produtos.atualizar(sugestao.id, { preco: sugestao.preco });
        """,
        "JSON.parse(resposta.texto)",
        "Saída de LLM é entrada não confiável, como um body de usuário: pode vir com formato errado, campos faltando ou valores absurdos. Valide com um schema antes de usar e tenha um plano para quando falhar (repetir, usar um padrão ou pedir revisão humana).",
        "const sugestao = Sugestao.parse(JSON.parse(resposta.texto)); // Zod: id, preco > 0"),
    sc("A feature de resumo com LLM às vezes leva 40 s e, num pico de uso, consumiu o orçamento do mês em um dia.",
       "Qual conjunto de medidas resolve?",
       ["Timeout com fallback, limite de `max_tokens`, cache de respostas repetidas e limite de uso por usuário, com alerta de custo",
        "Trocar para o maior modelo disponível",
        "Remover o timeout para a chamada nunca falhar",
        "Chamar o LLM duas vezes e usar a resposta mais rápida"],
       "Chamadas a LLM são lentas, caras e às vezes falham, então trate como qualquer serviço externo: timeout, fallback e limites. Custo cresce com tokens, então `max_tokens`, cache e cotas por usuário controlam o gasto. O alerta avisa antes de a fatura chegar."),
    order("Ordene o fluxo de uma busca com embeddings e pgvector (RAG).",
          ["Ao indexar, gerar o embedding de cada trecho dos documentos e salvar no pgvector",
           "Na pergunta do usuário, gerar o embedding da pergunta",
           "Buscar os trechos mais próximos (`ORDER BY embedding <=> $1 LIMIT 5`)",
           "Montar o prompt com a pergunta e os trechos encontrados",
           "O LLM responde com base nos trechos, citando as fontes"],
          "O embedding transforma texto em vetor, e textos de sentido parecido ficam próximos. A indexação acontece antes, uma vez por documento; na hora da pergunta só se gera um embedding e se faz uma busca por proximidade. O LLM responde com base no que foi recuperado, o que reduz invenções."),
    to(["Logs", "Métricas"],
       "Você quer ser avisado quando a taxa de erros 5xx passar de 2% por 5 minutos. O que usar?",
       ["Uma métrica de taxa de erro com alerta por limite, e os logs para investigar o detalhe depois",
        "Ler os logs todo dia de manhã",
        "Um log por requisição, que já dispara o alerta sozinho",
        "Um teste end-to-end em produção a cada hora"],
       "Métricas são números agregados, baratos e feitos para alertas (\"taxa > 2% por 5 min\"). Logs têm o detalhe de cada evento e servem para entender o porquê. Um avisa, o outro explica. Ler logs à mão não escala e chega tarde."),
    sc("Um deploy das 18h subiu com bug. O código novo dependia de uma migration que renomeou uma coluna, e o rollback do código quebrou tudo porque a coluna antiga não existe mais.",
       "Como evitar isso nos próximos deploys?",
       ["Fazer migrations compatíveis com a versão anterior (expandir e depois contrair), para poder voltar o código sem mexer no banco",
        "Nunca fazer rollback, só corrigir para frente",
        "Rodar as migrations manualmente depois do deploy",
        "Renomear a coluna de volta direto em produção"],
       "Renomear de uma vez quebra a versão anterior. Em passos: criar a coluna nova, gravar nas duas, migrar os dados, ler da nova e só num deploy posterior remover a antiga. Assim qualquer versão recente roda com o banco atual e o rollback é seguro."),
  ]),
],
]
