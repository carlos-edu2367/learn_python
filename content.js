// ============================================================
// QUERYQUEST — Conteúdo didático completo
// 8 módulos existentes preservados (IDs l11–l8x)
// Novos módulos: ORDER BY, GROUP BY/HAVING, Subqueries
// ============================================================

export const modules = [
  // ---- MÓDULO 1: Pensando em dados ----
  {
    id: 'm1', icon: '⌁', color: 'cyan',
    title: 'Pensando em dados', subtitle: 'Do Python para o banco',
    desc: 'Descubra como suas classes viram tabelas e como os dados se conectam.',
    lessons: [
      {
        id: 'l11', title: 'Da lista Python para uma tabela', tag: 'COMECE AQUI', time: '8 min', xp: 50, type: 'lesson',
        intro: `Enquanto um programa Python está em execução, listas e dicionários mantêm dados na memória RAM. A memória é volátil: ao fechar o programa ou desligar o computador, tudo some.

Um banco de dados resolve isso guardando informações em disco — permanentemente, estruturadamente, e pronto para consulta a qualquer momento.

A menor unidade de organização no banco é a **tabela**. Uma tabela nada mais é que uma planilha com colunas definidas (cada uma com um tipo) e linhas contendo os registros reais. Pense numa tabela como uma classe que guarda estado.`,
        explanation: `<p><strong>Por que tabelas?</strong></p>
<p>Sem uma tabela, você teria que salvar tudo como texto bruto — impossível de buscar de forma inteligente depois. Com tabelas:</p>
<ul>
<li>Cada coluna tem um <em>tipo</em> definido (inteiro, texto, booleano).</li>
<li>Cada linha é um registro completo.</li>
<li>O banco impõe regras: valores únicos, obrigatoriedade, referência cruzada.</li>
</ul>
<p>No seu projeto TaskQuest, a entidade central é <strong>Tarefa</strong>. Ela precisa de um identificador único, um título e um status de conclusão. Isso se traduz naturalmente numa tabela com três colunas.</p>`,
        example: `-- A tabela "tarefas" armazena cada item da lista
CREATE TABLE tarefas (
  id INTEGER PRIMARY KEY,     -- identificador único automático
  titulo TEXT NOT NULL,       -- nome da tarefa (não pode faltar)
  feito BOOLEAN DEFAULT FALSE -- começou como pendente?
);

-- Inserir algumas linhas de exemplo
INSERT INTO tarefas (titulo, feito) VALUES ('Estudar SQL', FALSE);
INSERT INTO tarefas (titulo, feito) VALUES ('Fazer compras', TRUE);`,
        py: `# model.py — mapeia a tabela "tarefas" para Python
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase): pass

class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    titulo = Column(String, nullable=False)
    feito = Column(Boolean, default=False)

    def __repr__(self):
        return f"<Tarefa(id={self.id}, titulo='{self.titulo}', feito={self.feito})>"`,
        attention: `Sempre dê um nome claro e no plural à tabela: <code>tarefas</code>, não <code>tarefa</code>. O plural indica que ela guarda múltiplos registros.`,
        mini_practice: `Se você criasse uma tabela chamada <code>usuarios</code> para armazenar login de pessoas, quais três colunas seriam essenciais? Pense em: identificador, nome e algo sobre status de acesso.`,
        quiz: {
          q: 'Qual parte da definição garante que nenhum registro fique sem título?',
          opts: ['PRIMARY KEY', 'DEFAULT FALSE', 'NOT NULL', 'INTEGER'],
          answer: 2,
          why: 'O NOT NULL diz ao banco que aquela coluna deve sempre receber um valor. Sem ele, você poderia criar uma tarefa sem nome — algo que dificilmente faria sentido.'
        }
      },
      {
        id: 'l12', title: 'Comentários e relações', tag: 'FUNDAMENTO', time: '10 min', xp: 60, type: 'lesson',
        intro: `Uma tabela isolada é útil, mas a vida real raramente é linear. Em sistemas reais, entidades se relacionam: uma tarefa tem comentários; um usuário tem várias tarefas; cada comentário pertence a exatamente uma tarefa.

Isso chama-se **relação um-para-muitos (1:N)**. Entender como modelar esse vínculo é fundamental para qualquer aplicação que trabalhe com dados persistentes.`,
        explanation: `<p><strong>Relação 1:N explicada</strong></p>
<p>Pense assim: você tem uma tarefa e quer que várias pessoas deixem comentários sobre ela. Cada comentário tem um autor, um texto e data — mas todos estão ligados a UMA tarefa específica.</p>
<p>A forma mais comum de representar isso em SQL é com uma <strong>chave estrangeira</strong> (foreign key): uma coluna na tabela "filha" (comentários) que aponta para o ID da tabela "pai" (tarefas).</p>
<p>O banco usa essa referência para garantir <em>integridade referencial</em>: você não pode criar um comentário apontando para uma tarefa que não existe.</p>`,
        example: `-- Tabela secundária: comentários ligados a uma tarefa
CREATE TABLE comentarios_tarefa (
  id INTEGER PRIMARY KEY,
  tarefa_id INTEGER NOT NULL,         -- ligação com a tabela "tarefas"
  conteudo TEXT NOT NULL,             -- texto do comentário
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id)
    ON DELETE CASCADE                -- se apagar a tarefa, apaga tb os comentários
);

-- Consultando juntos: título da tarefa + todos seus comentários
SELECT t.titulo, c.conteudo
FROM tarefas t
JOIN comentarios_tarefa c ON c.tarefa_id = t.id
WHERE t.id = 1;`,
        py: `# model.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime

class Base(DeclarativeBase): pass

class Tarefa(Base):
    __tablename__ = "tarefas"
    id = Column(Integer, primary_key=True)
    titulo = Column(String, nullable=False)
    # Relação: uma tarefa tem muitos comentários
    comentarios = relationship("Comentario", back_populates="tarefa", cascade="all, delete-orphan")

class Comentario(Base):
    __tablename__ = "comentarios_tarefa"
    id = Column(Integer, primary_key=True)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"), nullable=False)
    conteudo = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Voltar à tarefa pai
    tarefa = relationship("Tarefa", back_populates="comentarios")`,
        attention: `O <code>ON DELETE CASCADE</code> faz com que, ao excluir uma tarefa, todos os comentários dela sejam apagados automaticamente. Sem isso, o banco recusaria a exclusão se existissem comentários atrelados.`,
        mini_practice: `Imagine um blog. Posts têm muitos Comentários. Qual seria a chave estrangeira? Onde ela ficaria definida?`,
        quiz: {
          q: 'Onde fica a chave estrangeira que liga comentários à tarefa?',
          opts: ['Na tabela tarefas', 'Na tabela comentarios_tarefa', 'Em uma terceira tabela separada', 'No campo id da tarefa'],
          answer: 1,
          why: 'A foreign key mora na tabela "filha". Cada comentário sabe a qual tarefa pertence porque guarda o tarefa_id dentro dele próprio.'
        }
      }
    ]
  },

  // ---- MÓDULO 2: Consultas SQL ----
  {
    id: 'm2', icon: '⌕', color: 'purple',
    title: 'Consultas SQL', subtitle: 'Busque exatamente o que precisa',
    desc: 'SELECT, filtros e consultas que respondem perguntas reais.',
    lessons: [
      {
        id: 'l21', title: 'SELECT: sua primeira busca', tag: 'SQL NA PRÁTICA', time: '9 min', xp: 70, type: 'lesson',
        intro: `Depois de criar as tabelas, chega a hora mais gratificante: perguntar ao banco o que ele guarda. O comando SELECT é sua ferramenta principal para isso.

Pense no SELECT como uma pergunta em linguagem natural traduzida para o banco. Você especifica <em>quais colunas quer</em>, <em>de qual tabela</em>, e opcionalmente <em>que filtro aplicar</em>.

O SELECT é a base de toda consulta — dominá-lo abre portas para tudo o resto.`,
        explanation: `<p><strong>Estrutura básica do SELECT</strong></p>
<p>Todo SELECT segue esta ordem lógica:</p>
<ol>
<li><code>SELECT</code> → quais colunas retornar (<code>*</code> = todas, ou liste nomes)</li>
<li><code>FROM</code> → qual tabela consultar</li>
<li><code>WHERE</code> → quais linhas filtrar (opcional)</li>
<li><code>ORDER BY</code> → como ordenar (opcional, vem depois)</li>
<li><code>LIMIT</code> → quantas linhas devolver (opcional, vem por último)</li>
</ol>
<p>A ordem escrita nem sempre é a ordem executada. O banco primeiro monta o conjunto (FROM), filtra (WHERE), seleciona colunas (SELECT), ordena (ORDER BY), e limita (LIMIT).</p>`,
        example: `-- Trazer TODAS as colunas de TODAS as linhas
SELECT * FROM tarefas;

-- Escolher apenas colunas específicas (mais eficiente!)
SELECT id, titulo FROM tarefas WHERE feito = FALSE;

-- Usar alias para renomear colunas na saída
SELECT id AS codigo, titulo AS nome_da_tarefa
FROM tarefas
WHERE feito = FALSE
ORDER BY id ASC
LIMIT 10;

-- Filtros com texto: LIKE permite curingas (%)
SELECT titulo FROM tarefas WHERE titulo LIKE '%SQL%';`,
        py: `from sqlalchemy import select

# SELECT * FROM tarefas
stmt = select(Tarefa)
result = session.execute(stmt).scalars().all()

# SELECT id, titulo FROM tarefas WHERE feito = FALSE
stmt = select(Tarefa.id, Tarefa.titulo).where(Tarefa.feito == False)
result = session.execute(stmt).all()  # retorna lista de tuplas

# Com ORDER BY e LIMIT
stmt = (select(Tarefa)
    .where(Tarefa.feito == False)
    .order_by(Tarefa.id)
    .limit(10))
result = session.execute(stmt).scalars().all()`,
        attention: `Evite usar <code>SELECT *</code> em produção. Sempre liste as colunas que realmente precisa. Isso reduz tráfego de rede e deixa o código explícito sobre o que o programa consome.`,
        mini_practice: `Escreva mentalmente: como você traria apenas títulos das tarefas pendentes, ordenadas alfabeticamente? Dica: use <code>WHERE</code> + <code>ORDER BY</code>.`,
        quiz: {
          q: 'Qual cláusula controla QUANTAS linhas são retornadas?',
          opts: ['WHERE', 'LIMIT', 'ORDER BY', 'FETCH FIRST'],
          answer: 1,
          why: 'LIMIT define um teto máximo de resultados. Não é padrão ANSI universal, mas funciona em SQLite, PostgreSQL e MySQL.'
        }
      },
      {
        id: 'l22', title: 'Encontrando um registro único', tag: 'DESAFIO', time: '10 min', xp: 80, type: 'lesson',
        intro: `Nem toda consulta devolve uma lista de dezenas de itens. Às vezes você só quer UMA coisa: os detalhes da tarefa número 42, ou o perfil do usuário logado.

Buscar um único registro exige dois cuidados: encontrar exatamente o que pede e lidar com o caso em que ele não existe — e o banco oferece ferramentas para ambos os cenários.`,
        explanation: `<p><strong>Buscando por chave primária</strong></p>
<p>A forma mais direta de achar um registro único é pela sua chave primária (ID). Como IDs são únicos, a query resulta em zero ou uma linha — nunca mais que uma.</p>
<p>O grande desafio prático é tratar o caso <em>zero linhas</em>. Se alguém tentar abrir a tarefa 999 que nunca foi criada, seu código precisa decidir como reagir: mostrar mensagem amigável, redirecionar, ou lançar erro adequado.</p>`,
        example: `-- Método 1: SELECT + verificar se veio algo
SELECT id, titulo, feito FROM tarefas WHERE id = 42;
-- Se o resultado está vazio → tarefa não existe

-- Método 2: Contar quantos existem
SELECT COUNT(*) FROM tarefas WHERE id = 42;
-- Retorna 0 ou 1

-- Verificar existência antes de pegar detalhes extras
SELECT EXISTS(SELECT 1 FROM tarefas WHERE id = 42);
-- Retorna TRUE ou FALSE`,
        py: `from sqlalchemy import select

# Método 1: scalar_one_or_none()
stmt = select(Tarefa).where(Tarefa.id == 42)
tarefa = session.scalar(stmt)  # retorna objeto ou None

# Método 2: get() — mais direto por PK
tarefa = session.get(Tarefa, 42)  # retorna objeto ou None

# Tratamento seguro
if tarefa is None:
    print("Tarefa não encontrada!")
else:
    print(tarefa.titulo)
    print(f"Status: {'feito' if tarefa.feito else 'pendente'}")`,
        attention: `O método <code>session.get(Modelo, id)</code> é mais rápido que <code>select().where()</code> quando você busca pela chave primária, porque o SQLAlchemy vai direto ao índice primário sem montar condições complexas.`,
        mini_practice: `Se <code>session.get(Tarefa, 999)</code> retorna <code>None</code>, qual é a forma segura de acessar o atributo <code>titulo</code> sem causar erro de <code>AttributeError</code>?`,
        quiz: {
          q: 'O que <code>session.get(Tarefa, 999)</code> retorna se a tarefa não existe?',
          opts: ['Uma lista vazia []', 'None', 'Um erro Exception', 'Zero'],
          answer: 1,
          why: '<code>get()</code> segue o padrão "null object": retorna None quando não encontra, evitando exceções desnecessárias. Você trata o None com um simples "if x is None".'
        }
      }
    ]
  },

  // ---- MÓDULO 3: Forjando o ORM ----
  {
    id: 'm3', icon: '◈', color: 'orange',
    title: 'Forjando o ORM', subtitle: 'SQLAlchemy sem mistério',
    desc: 'Conecte classes Python às tabelas do banco e mantenha seu código organizado.',
    lessons: [
      {
        id: 'l31', title: 'Model e domínio são diferentes', tag: 'ARQUITETURA', time: '12 min', xp: 90, type: 'lesson',
        intro: `Muitos iniciantes confundem duas camadas importantes: quem cuida de guardar no banco e quem cuida das regras de negócio. No mundo real, essas responsabilidades devem ficar separadas.

O <strong>Model</strong> (ORM) traduz entre tabela e objeto Python. O <strong>Domínio</strong> (controller/service) contém as regras de negócio: validações, cálculos, tomada de decisão. Misturar esses papéis gera código frágil e difícil de manter.`,
        explanation: `<p><strong>Separating concerns</strong></p>
<p>A regra de ouro: <em>o Model sabe como persistir, o Domínio sabe como validar</em>.</p>
<ul>
<li><strong>Model (TarefaModel)</strong>: mapeia a tabela, define tipos de colunas, relacionamento com outras tabelas. Não conhece telas, não valida regras de negócio, não decide fluxo.</li>
<li><strong>Domínio (Tarefa)</strong>: recebe um Modelo, aplica regras ("só concluir se pendente"), dispara eventos, comunica com outros serviços.</li>
</ul>
<p>Essa separação significa que você pode trocar o banco (SQLite → PostgreSQL) sem alterar uma única linha de regra de negócio. Ou testar regras de negócio sem conectar ao banco (mockando o Model).</p>`,
        example: `# Camada Model (model.py)
class TarefaModel(Base):
    __tablename__ = "tarefas"
    id = Column(Integer, primary_key=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(String, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

# Camada Domínio (service.py)
class TarefaService:
    """Regras de negócio — não toca no banco diretamente."""

    def __init__(self, repo):
        self.repo = repo  # repositório que usa o Model

    def criar(self, titulo, descricao=None):
        if not titulo or not titulo.strip():
            raise ValueError("Título é obrigatório.")
        if len(titulo) > 200:
            raise ValueError("Título muito longo (máx. 200 caracteres).")
        modelo = TarefaModel(titulo=titulo.strip(), descricao=descricao)
        self.repo.adicionar(modelo)
        return modelo

    def concluir(self, id_tarefa):
        t = self.repo.buscar(id_tarefa)
        if t is None:
            raise ValueError(f"Tarefa {id_tarefa} não existe.")
        if t.feito:
            raise ValueError("Já concluída.")
        t.feito = True
        return t`,
        py: `# service.py — pura lógica Python, sem dependência de SQL
class TarefaService:
    def concluir(self, id_tarefa):
        t = self.repo.buscar(id_tarefa)
        if t is None:
            raise ValueError(f"Tarefa {id_tarefa} inexistente")
        if t.feito:
            raise ValueError("Tarefa já concluída")
        t.feito = True
        self.repo.salvar()
        return t

# controller.py — conecta UI com serviço
class TelaTarefas:
    def on_click_concluir(self, tarefa):
        try:
            self.servico.concluir(tarefa.id)
            self.atualizar_lista()
        except ValueError as e:
            self.mostrar_erro(str(e))`,
        attention: `Se o Service lança exceção com mensagem clara, o Controller pode capturar e exibir para o usuário. Essa cadeia (Service → Controller → UI) mantém cada camada focada em sua responsabilidade.`,
        mini_practice: `Quantas camadas distintas compõem o ciclo: clique no botão "concluir" até a mensagem de erro aparecer? Liste-as em ordem.`,
        quiz: {
          q: 'Qual camada deve conter a regra "uma tarefa só pode ser concluída uma vez"?',
          opts: ['A camada de interface (HTML/JS)', 'O Model (TarefaModel)', 'O Serviço/Controller de regras', 'O CSS'],
          answer: 2,
          why: 'Regras de negócio vivem no domínio (service/controller). O Model apenas armazena; a interface apenas exibe. A regra é lógica de decisão, portanto pertence ao serviço.'
        }
      },
      {
        id: 'l32', title: 'JOIN: conectando histórias', tag: 'CONEXÕES', time: '12 min', xp: 100, type: 'lesson',
        intro: `Dados em tabelas separadas são úteis, mas frequentemente precisamos enxergá-los juntos. JOIN é o comando que "costura" linhas de tabelas relacionadas numa única consulta.

É como olhar uma foto familiar onde todos aparecem na mesma imagem, em vez de ver pastas separadas com retratos individuais.`,
        explanation: `<p><strong>Tipos de JOIN</strong></p>
<ul>
<li><code>INNER JOIN</code>: só traz linhas onde há correspondência em AMBAS as tabelas. Exclui tarefas sem comentários.</li>
<li><code>LEFT JOIN</code>: traz TODAS as linhas da esquerda (tarefas), mesmo que não tenham correspondência na direita (comentários). Usa <code>NULL</code> onde falta dado.</li>
<li><code>CROSS JOIN</code>: produto cartesiano — raramente útil, combina cada linha de A com cada linha de B.</li>
</ul>
<p>No seu caso, <code>LEFT JOIN</code> é quase sempre a escolha certa: você quer ver TODAS as tarefas, inclusive as que ainda não receberam comentários.</p>`,
        example: `-- LEFT JOIN: tarefas + seus comentários (incluindo tarefas sem comentários)
SELECT
  t.id,
  t.titulo,
  t.feito,
  c.conteudo
FROM tarefas t
LEFT JOIN comentarios_tarefa c ON c.tarefa_id = t.id
ORDER BY t.id;

-- INNER JOIN: só tarefas que têm AO MENOS UM comentário
SELECT
  t.id,
  t.titulo,
  COUNT(c.id) AS total_comentarios
FROM tarefas t
INNER JOIN comentarios_tarefa c ON c.tarefa_id = t.id
GROUP BY t.id, t.titulo;`,
        py: `from sqlalchemy import select

# LEFT JOIN equivalente
stmt = (
    select(Tarefa.id, Tarefa.titulo, Tarefa.feito, Comentario.conteudo)
    .outerjoin(Comentario, Tarefa.id == Comentario.tarefa_id)  # LEFT OUTER JOIN
    .order_by(Tarefa.id)
)

# INNER JOIN equivalente  
stmt = (
    select(Tarefa.id, Tarefa.titulo, func.count(Comentario.id).label('total'))
    .join(Comentario, Tarefa.id == Comentario.tarefa_id)  # INNER JOIN
    .group_by(Tarefa.id, Tarefa.titulo)
)`,
        attention: `O LEFT JOIN é crucial: sem ele, você perderia visualização de tarefas sem comentários. No dashboard principal, todo mundo precisa ver todas as tarefas, independentemente de comentários.`,
        mini_practice: `Se quiser listar tarefas QUE NÃO têm nenhum comentário, que tipo de JOIN usaria e como filtraria?`,
        quiz: {
          q: 'O que o LEFT JOIN garante que nunca acontece?',
          opts: ['Retornar linhas duplicadas', 'Excluir tarefas sem comentários', 'Criar novas tabelas', 'Ordenar os resultados'],
          answer: 1,
          why: 'O LEFT JOIN preserva TODAS as linhas da tabela da esquerda (tarefas). Mesmo sem correspondência na direita (comentários), a linha aparece com NULLs nas colunas da tabela direita.'
        }
      }
    ]
  },

  // ---- MÓDULO 4: Transações ----
  {
    id: 'm4', icon: '↻', color: 'green',
    title: 'Transações', subtitle: 'Grave com segurança',
    desc: 'INSERT, UPDATE, DELETE e o poder de commit e rollback.',
    lessons: [
      {
        id: 'l41', title: 'Commit ou rollback?', tag: 'MÃO NA MASSA', time: '12 min', xp: 100, type: 'lesson',
        intro: `Adicionar dados ao banco parece simples: <code>INSERT</code> → <code>commit</code> → pronto. Mas o mundo real é traiçoeiro — conexões caem, discos enchem, concorrencia cria conflito. Por isso existe a <strong>transação</strong>: uma caixa de proteção que confirma SOMENTE se tudo der certo.

Transações seguem o princípio ACID: Atomicidade (tudo ou nada), Consistência (regras respeitadas), Isolamento (operação não interfere em outras), Durabilidade (confirmado = salvo para sempre).`,
        explanation: `<p><strong>O ciclo de vida de uma transação</strong></p>
<ol>
<li><code>session.add(objeto)</code> — o objeto fica "sujo" em memória</li>
<li><code>session.commit()</code> — envia mudanças para o banco</li>
<li>Se ocorrer erro → <code>session.rollback()</code> desfaz tudo</li>
<li>Se der certo → mudanças são confirmadas permanentemente</li>
</ol>
<p>O <code>rollback</code> é o botão "desfazer" do banco. Ele restaura o estado anterior antes da operação falha. É especialmente valioso quando operações encadeadas falham no meio — sem rollback, você ficaria com metade dos dados salvos.</p>`,
        example: `-- INSERT simples
INSERT INTO tarefas (titulo, feito)
VALUES ('Nova tarefa importante', FALSE);

-- UPDATE condicional
UPDATE tarefas SET feito = TRUE WHERE id = 1 AND feito = FALSE;
-- Só muda se ainda estiver pendente

-- DELETE com verificações implícitas
DELETE FROM comentarios_tarefa WHERE tarefa_id = 1;
DELETE FROM tarefas WHERE id = 1;

-- Tudo numa transação: COMMIT ou ROLLBACK
BEGIN TRANSACTION;
INSERT INTO tarefas (titulo, feito) VALUES ('Tarefa A', FALSE);
UPDATE tarefas SET feito = TRUE WHERE id = (SELECT MAX(id) FROM tarefas);
COMMIT;`,
        py: `# Operações atômicas: tudo ou nada
nova_tarefa = Tarefa(titulo='Estudar SQLAlchemy')
session.add(nova_tarefa)
session.flush()  # força gerar o ID sem confirmar

try:
    # Adiciona comentário na mesma transação
    comentario = Comentario(
        tarefa_id=nova_tarefa.id,
        conteudo='Boa escolha!'
    )
    session.add(comentario)
    session.commit()
    print(f"Tarefa {nova_tarefa.id} criada com comentário")

except Exception as e:
    session.rollback()  # desfaz tudo
    print(f"Operação falhou: {e}")`,
        attention: `<code>session.flush()</code> envia mudanças para o banco E gera IDs temporários, mas NÃO confirma. Use antes de precisar saber o ID gerado antes do commit final.`,
        mini_practice: `Descreva passo a passo o que acontece entre chamar <code>session.add()</code> e <code>session.commit()</code>. O dado já está no disco nesse meio tempo?`,
        quiz: {
          q: 'Quando o <code>rollback()</code> é chamado após um erro, o que acontece?',
          opts: ['Os dados já salvos anteriormente somem', 'Todas as mudanças da transação atual são desfeitas', 'O banco inteiro é apagado', 'Nada — o rollback não funciona'],
          answer: 1,
          why: 'Rollback desfaz SOMENTE as operações da transação corrente (desde o último commit ou desde begin). Dados confirmados em transações anteriores permanecem intactos.'
        }
      },
      {
        id: 'l42', title: 'A regra de concluir', tag: 'REGRA DE NEGÓCIO', time: '10 min', xp: 110, type: 'lesson',
        intro: `Conectar uma tarefa como "feita" parece trivial — basta mudar um campo. Mas regras de negócio raramente são triviais: talvez a tarefa precise ter sido criada há pelo menos 24 horas, talvez só o dono possa concluir, talvez haja dependências.

O botão "concluir" da interface é apenas a porta de entrada. A verdadeira lógica mora na regra de negócio, verificando cada condição antes de permitir a mudança.`,
        explanation: `<p><strong>Guard clauses: validação antes da ação</strong></p>
<p>A técnica de <em>guard clause</em> consiste em verificar todas as pré-condições no início da função e sair cedo (raise) se alguma falhar. Isso evita aninhamento excessivo de if/else e deixa o caminho feliz (quando tudo dá certo) visível e limpo.</p>
<p>No caso de concluir uma tarefa, as validações típicas são:</p>
<ul>
<li>Registro existe?</li>
<li>Já está concluída?</li>
<li>Usuário atual tem permissão?</li>
<li>Data mínima respeitada?</li>
</ul>
<p>Cada veridação é uma "guarda". Se passa por todas, executa. Se falha qualquer uma, informa o motivo e para.</p>`,
        example: `-- UPDATE com CHECK via trigger (nível banco)
-- Alguns bancos aceitam CHECK constraints
ALTER TABLE tarefas ADD CONSTRAINT chk_feito_only_once
CHECK (TRUE);  -- placeholder; logica real em application layer

-- Query: marcar como feito (apenas se pendente)
UPDATE tarefas
SET feito = TRUE, concluido_em = CURRENT_TIMESTAMP
WHERE id = 1
  AND feito = FALSE;  -- safe update: only affects pending tasks

-- Verificar quantas linhas foram afetadas
SELECT affected_rows();  -- 0 se já estava concluída`,
        py: `class TarefaServico:
    def concluir(self, id_tarefa):
        # Guard clause 1: existe?
        tarefa = session.get(Tarefa, id_tarefa)
        if tarefa is None:
            raise ValueError("Tarefa não encontrada")

        # Guard clause 2: já concluída?
        if tarefa.feito:
            raise ValueError("Esta tarefa já está concluída")

        # Executar a ação
        tarefa.feito = True
        tarefa.concluido_em = datetime.utcnow()
        session.commit()
        return tarefa

# Uso seguro na UI
def handle_botao_concluir(event):
    try:
        servico.concluir(task_id)
        atualizar_interface()
        mostrar_feedback("✅ Concluída!", "success")
    except ValueError as e:
        mostrar_feedback(f"⚠️ {e}", "warning")`,
        attention: `Nunca confie na interface para validar. Um hacker ou um script podem enviar requisições direto ao API pulando a tela. Sempre valide novamente no servidor/regra de negócio.`,
        mini_practice: `Quais seriam as guard clauses necessárias para um recurso "excluir tarefa permanente"? Liste pelo menos 3.`,
        quiz: {
          q: 'Por que colocar a verificação "já concluída?" no Service e não apenas no HTML?',
          opts: ['Para economizar processamento', 'Para impedir chamadas diretas ao banco bypassando a tela', 'Não há diferença, pode colocar em qualquer lugar', 'O HTML não suporta condições'],
          answer: 1,
          why: 'Validação na interface é superficial — qualquer pessoa pode interceptar requisições. A regra de negócio (backend/service) é a última linha de defesa e deve sempre validar independentemente da fonte.'
        }
      }
    ]
  },

  // ---- MÓDULO 5: Mini-projeto ----
  {
    id: 'm5', icon: '✦', color: 'pink',
    title: 'Mini-projeto', subtitle: 'Construa o TaskQuest',
    desc: 'Junte tudo: tarefas, comentários, filtros e uma arquitetura limpa.',
    lessons: [
      {
        id: 'l51', title: 'Desafio final: TaskQuest', tag: 'PROJETO FINAL', time: '25 min', xp: 500, type: 'project',
        intro: `Chegou a hora de juntar tudo o que aprendeu. O desafio TaskQuest consiste em construir uma pequena aplicação completa de gerenciamento de tarefas usando o conhecimento acumulado: models, relations, queries, joins, transactions e validation.

Este é o momento de mostrar que consegue pensar como arquiteto de software — separando responsabilidades, prevendo erros e construindo algo funcional.`,
        explanation: `<p><strong>Checklist do mini-projeto</strong></p>
<ul>
<li><strong>Setup</strong>: criar engine SQLite, declarative base, definir modelos</li>
<li><strong>CRUD</strong>: criar, listar, atualizar e deletar tarefas</li>
<li><strong>Comentários</strong>: associar comentários às tarefas</li>
<li><strong>Filtros</strong>: pendentes, concluídas, todas</li>
<li><strong>Validação</strong>: regras de negócio com guard clauses</li>
<li><strong>Erros</strong>: tratamento com mensagens claras</li>
</ul>
<p>Organize em arquivos separados: <code>model.py</code>, <code>service.py</code>, <code>main.py</code>. Mantenha cada arquivo com responsabilidade única.</p>`,
        example: `# structure.py
# main.py
"""TaskQuest — Aplicação completa de gerenciamento de tarefas."""

from model import Base, Tarefa, Comentario, engine
from service import TarefaServico
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

# Setup
engine = create_engine('sqlite:///taskquest.db', echo=False)
Base.metadata.create_all(engine)
servico = TarefaServico()

def menu_principal():
    while True:
        print("\\n=== TaskQuest ===")
        print("1. Listar tarefas")
        print("2. Criar tarefa")
        print("3. Concluir tarefa")
        print("4. Adicionar comentário")
        print("5. Sair")
        opcao = input("Escolha: ")
        
        if opcao == '1':
            _listar()
        elif opcao == '2':
            _criar()
        elif opcao == '3':
            _concluir()
        elif opcao == '4':
            _comentar()
        elif opcao == '5':
            print("Até logo! 👋")
            break`,
        py: `# model.py — Persistência
class Tarefa(Base):
    __tablename__ = "tarefas"
    id = Column(Integer, primary_key=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(String, nullable=True)
    feito = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    concluido_em = Column(DateTime, nullable=True)
    
    comentarios = relationship("Comentario", back_populates="tarefa",
                               cascade="all, delete-orphan")

class Comentario(Base):
    __tablename__ = "comentarios_tarefa"
    id = Column(Integer, primary_key=True)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"))
    conteudo = Column(String, nullable=False)
    
    tarefa = relationship("Tarefa", back_populates="comentarios")`,
        attention: `O cascate <code>"all, delete-orphan"</code> garante que ao remover uma tarefa, todos os comentários associados sejam removidos automaticamente. Isso mantém a consistência sem código extra.`,
        mini_practice: `Esboce a assinatura da classe TarefaServico: quais métodos públicos ela precisa ter? Pense nas ações que o usuário pode executar.`,
        quiz: {
          q: 'Qual é o primeiro passo para iniciar um mini-projeto?',
          opts: ['Criar a interface gráfica', 'Listar as tarefas existentes', 'Apagar os models antigos', 'Configurar um servidor web'],
          answer: 1,
          why: 'Começar listando mostra que a comunicação com o banco funciona e dá feedback imediato ao usuário. Depois evoluir para criar, editar, deletar, comentar — ordem natural de construção incremental.'
        }
      }
    ]
  },

  // ---- MÓDULO 6: CREATE ----
  {
    id: 'm6', icon: '➕', color: 'blue',
    title: 'Operação: CREATE', subtitle: 'Dando vida aos dados',
    desc: 'Aprenda a inserir novos registros de forma segura e eficiente.',
    lessons: [
      {
        id: 'l61', title: 'INSERT básico', tag: 'SQL ESSENCIAL', time: '10 min', xp: 70, type: 'lesson',
        intro: `Todo sistema começa com dados. A operação de criação (INSERT) adiciona novas linhas a uma tabela. Parece simples, mas existem armadilhas sutis que pegam até desenvolvedores experientes.

Dominar o INSERT corretamente desde o início evita corrupção de dados, violação de integridade e headaches futuros de manutenção.`,
        explanation: `<p><strong>Formas de INSERT</strong></p>
<p>O INSERT básico insere UMA linha. Mas também é possível inserir MÚLTIPLAS linhas de uma vez (bulk insert), o que é muito mais eficiente para carregar dados massivos.</p>
<p>Pontos-chave:</p>
<ul>
<li>Colunas <code>NOT NULL</code> SEMPRE precisam de valor.</li>
<li>Colunas com <code>DEFAULT</code> podem ser omitidas.</li>
<li>Colunas <code>PRIMARY KEY AUTOINCREMENT</code> podem ser omitidas (geradas automaticamente).</li>
<li>Chaves estrangeiras devem referenciar registros que JÁ existem.</li>
</ul>`,
        example: `-- Insere UMA linha
INSERT INTO tarefas (titulo, feito, descricao)
VALUES ('Aprender SQLAlchemy', FALSE, 'Fundamentos do ORM');

-- Insere MÚLTiplas linhas de uma vez (bulk)
INSERT INTO tarefas (titulo, feito) VALUES
  ('Estudar Python', TRUE),
  ('Praticar SQL', FALSE),
  ('Ler documentação', FALSE);

-- Inserindo sem especificar colunas (risco: depende da ordem!)
INSERT INTO tarefas VALUES (NULL, 'Risçado!', FALSE, NULL);`,
        py: `from sqlalchemy import insert

# Method 1: Using ORM object (recommended)
tarefa = Tarefa(
    titulo='Aprender SQLAlchemy',
    descricao='Fundamentos do ORM'
)
session.add(tarefa)
session.commit()
print(f'Criada com ID: {tarefa.id}')  # ID disponível após flush/commit

# Method 2: Core insert for bulk operations
stmt = insert(Tarefa).values([
    {'titulo': 'Python basics', 'feito': True},
    {'titulo': 'SQL practice', 'feito': False},
])
session.execute(stmt)
session.commit()

# Method 3: Returning the inserted ID efficiently
new_tarefa = Tarefa(titulo='Teste', feito=False)
session.add(new_tarefa)
session.flush()  # gera ID sem confirmar
print(f'ID gerado: {new_tarefa.id}')`,
        attention: `Use <code>session.flush()</code> quando precisar do ID gerado ANTES do commit final. Isso é comum quando você precisa vincular o novo registro a outro (ex: criar tarefa + comentário na mesma operação). Nunca deixe flush fora de um bloco try/except.`,
        mini_practice: `Se a tabela tarefas tem colunas [id AUTO_INCREMENT, titulo NOT NULL, descricao TEXT, feito BOOLEAN DEFAULT false], qual é a forma MAIS econômica de INSERT possível?`,
        quiz: {
          q: 'O que acontece se tentar INSERT numa coluna marcada como NOT NULL sem fornecer valor?',
          opts: ['O banco coloca NULL automaticamente', 'O banco gera um erro de constraint violation', 'O banco ignora e continua', 'A coluna se torna NULLABLE'],
          answer: 1,
          why: 'NOT NULL é uma constraint de integridade. Tentar violá-la gera um erro imediatamente — o registro nunca entra na tabela. O banco protege seus dados contra estados inválidos.'
        }
      },
      {
        id: 'l62', title: 'Criando com Relacionamentos', tag: 'AVANÇADO', time: '12 min', xp: 80, type: 'lesson',
        intro: `Criar um registro sozinho é fácil. Criar registros que se referem uns aos outros exige atenção à ordem correta e à integridade referencial.

Quando TabelaB aponta para TabelaA via foreign key, a tabela A deve existir PRIMERO — senão o banco nega a criação do registro em B, pois referenciar algo inexistente quebraria a consistência.`,
        explanation: `<p><strong>Ordem correta de criação em cascade</strong></p>
<p>Para criar um comentário numa tarefa, você precisa:</p>
<ol>
<li>Garantir que a tarefa existe (tem um ID válido)</li>
<li>Inserir o comentário com o tarefa_id correto</li>
<li>Não fazer o contrário — tentar criar comentário antes da tarefa causaria erro de foreign key</li>
</ol>
<p>O SQLAlchemy ORM facilita isso automaticamente: se você trabalha com objetos Python relacionando-se, o framework cuida da ordem de inserts. Mas entender o que está acontecendo "por baixo do capô" evita surpresas.</p>`,
        example: `-- Passo 1: garantir tarefa existe
SELECT id FROM tarefas WHERE titulo = 'Projeto SQL';

-- Passo 2: inserir comentário ligado à tarefa
INSERT INTO comentarios_tarefa (tarefa_id, conteudo)
VALUES (1, 'Lembrar de revisar a documentação antes de entregar');

-- Insert múltiplos comentários na mesma tarefa
INSERT INTO comentarios_tarefa (tarefa_id, conteudo) VALUES
  (1, 'Primeiro comentário'),
  (1, 'Segundo comentário importante'),
  (2, 'Comentário diferente');`,
        py: `# ORM approach: relationships handled automatically
with Session(engine) as session:
    # Step 1: find or create task
    tarefa = session.get(Tarefa, 1)
    if tarefa is None:
        tarefa = Tarefa(titulo='Projeto SQL')
        session.add(tarefa)
        session.flush()  # generate ID
    
    # Step 2: add comments linked to it
    comentarios = [
        Comentario(conteudo='Primeiro comentário'),
        Comentario(conteudo='Segundo comentário'),
    ]
    for c in comentarios:
        c.tarefa = tarefa  # sets tarefa_id automatically
        session.add(c)
    
    session.commit()
    print(f'{len(comentarios)} comentários adicionados à tarefa {tarefa.id}')`,
        attention: `O <code>cascade="all, delete-orphan"</code> no relacionamento ORM faz com que ao deletar uma tarefa, todos os comentários sejam excluídos automaticamente. Configure isso para evitar comentários órfãos no banco.`,
        mini_practice: `Você precisa criar 1 tarefa + 3 comentários + 2 tags (outra tabela). Em que ordem deve criar? Por quê?`,
        quiz: {
          q: 'Por que o tarefa_id é obrigatório ao criar um comentário?',
          opts: ['Para dar nome ao comentário', 'Para ligar o comentário à tarefa específica', 'Para criar a tarefa automaticamente', 'Não é necessário, pode ser NULL'],
          answer: 1,
          why: 'O tarefa_id é a foreign key que estabelece o vínculo. Sem ele, o comentário seria um texto solto sem contexto — sem saber a qual tarefa pertence, perde todo o valor.'
        }
      }
    ]
  },

  // ---- MÓDULO 7: UPDATE ----
  {
    id: 'm7', icon: '📝', color: 'yellow',
    title: 'Operação: UPDATE', subtitle: 'Evoluindo informações',
    desc: 'Modifique dados existentes sem perder a integridade do sistema.',
    lessons: [
      {
        id: 'l71', title: 'UPDATE e o perigo do WHERE', tag: 'ATENÇÃO', time: '10 min', xp: 70, type: 'lesson',
        intro: `O UPDATE pode modificar milhares de linhas em milissegundos. Essa potência é também seu maior risco: um UPDATE sem WHERE apropriado altera TODOS os registros da tabela — e isso geralmente é o pesadelo de qualquer desenvolvedor.

Antes de executar qualquer UPDATE, execute mentalmente (ou fisicamente) o equivalente SELECT para ver quais linhas seriam afetadas.`,
        explanation: `<p><strong>Anti-padrão: UPDATE sem WHERE</strong></p>
<p>É humanamente comum esquecer o WHERE. Para prevenir:</p>
<ul>
<li><strong>Regra prática #1</strong>: sempre escreva o SELECT correspondente primeiro.</li>
<li><strong>Regra prática #2</strong>: execute o SELECT e confirme que as linhas retornadas são EXATAMENTE as que quer atualizar.</li>
<li><strong>Regra prática #3</strong>: converta SELECT em UPDATE.</li>
<li><strong>Regra prática #4</strong>: em produção, use <code>WHERE</code> restritivo e teste em ambiente de staging primeiro.</li>
</ul>
<p>O SELECT é seu melhor amigo antes de qualquer modificação em massa.`,
        example: `-- PASSO 1: ver quais linhas serão afetadas
SELECT id, titulo, feito FROM tarefas WHERE feito = FALSE;

-- PASSO 2: confirmar que estão corretas → converter em UPDATE
UPDATE tarefas SET feito = TRUE
WHERE id IN (1, 3, 5);  -- apenas estas IDs

-- UPDATE com múltiplas colunas
UPDATE tarefas
SET feito = TRUE, concluido_em = CURRENT_TIMESTAMP
WHERE id = 2;

-- UPDATE condicional: só atualizar se valor atual for diferente
UPDATE tarefas SET titulo = 'Novo Título'
WHERE id = 1 AND titulo != 'Novo Título';`,
        py: `# UPDATE via ORM: individual
tarefa = session.get(Tarefa, 1)
if tarefa:
    titulo_antigo = tarefa.titulo
    tarefa.titulo = 'Título Atualizado'
    tarefa.updated_at = datetime.utcnow()
    session.commit()
    print(f'Título alterado de "{titulo_antigo}" para "{tarefa.titulo}"')

# UPDATE bulk via core
from sqlalchemy import update
stmt = (update(Tarefa)
    .where(Tarefa.feito == False)
    .values(feito=True, concluido_em=datetime.utcnow())
    .execution_options(synchronize_session='fetch'))
result = session.execute(stmt)
session.commit()
print(f'{result.rowcount} tarefas atualizadas')

# Bulk update com WHERE específico
stmt = (update(Tarefa)
    .where(Tarefa.id.in_([1, 3, 5]))
    .values(feito=True))`,
        attention: `Nunca execute um UPDATE diretamente no banco de produção sem antes: (1) fazer backup, (2) testar o equivalente SELECT, (3) confirmar as linhas afetadas. Um esquecimento de WHERE pode ser catastrófico.`,
        mini_practice: `Que comando SELECT você escreveria ANTES de executar <code>UPDATE tarefas SET feito = TRUE</code> para garantir que só as linhas corretas serão tocadas?`,
        quiz: {
          q: 'O que acontece em um UPDATE sem cláusula WHERE?',
          opts: ['Nenhuma linha é afetada', 'Apenas a primeira linha muda', 'TODAS as linhas da tabela são alteradas', 'O banco deleta a tabela'],
          answer: 2,
          why: 'Sem WHERE não há filtro — a operação se aplica a cada registro da tabela. Se a tabela tem 10.000 linhas, 10.000 delas serão modificadas. Esse é o erro mais temido em administração de banco de dados.'
        }
      },
      {
        id: 'l72', title: 'Atualizações Parciais e Condições', tag: 'DICA', time: '10 min', xp: 80, type: 'lesson',
        intro: `Muitas vezes queremos mudar apenas UM campo — como marcar uma tarefa como feita — sem alterar nenhuma outra informação. As atualizações parciais são o coração de CRUD e exigem precisão cirúrgica.

Além de mudar o valor, é comum querer registrar O QUANDO a mudança ocorreu, criando um histórico auditável.`,
        explanation: `<p><strong>Padrões de atualização parcial</strong></p>
<p>O ORM moderno (SQLAlchemy) monitora mudanças nos atributos de objetos. Quando você altera <code>tarefa.titulo = "Novo"</code> e chama <code>commit()</code>, o SQLAlchemy gera um UPDATE que modifica APENAS essa coluna — não reconstrói toda a linha.</p>
<p>Isso é eficiente: menos bytes trafegados, menos bloqueio de linha, menos overhead. Mas exige que você trabalhe com objetos instanciados, não com updates brutos em SQL puro.`,
        example: `-- Atualizar um único campo
UPDATE tarefas SET titulo = 'Tarefa Renomeada' WHERE id = 1;

-- Atualizar timestamp da alteração junto
UPDATE tarefas
SET titulo = 'Tarefa Renomeada',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Condicional: só atualizar se ainda pendente
UPDATE tarefas
SET feito = TRUE, concluido_em = CURRENT_TIMESTAMP
WHERE id = 5
  AND feito = FALSE
  AND titulo IS NOT NULL;`,
        py: `# Partial update: ORM handles dirty tracking
tarefa = session.get(Tarefa, 5)
if tarefa and not tarefa.feito:
    antigo_status = 'pendente' if not tarefa.feito else 'concluída'
    tarefa.feito = True
    tarefa.concluido_em = datetime.utcnow()
    session.commit()
    print(f'Tarefa concluída (antes: {antigo_status})')

# Bulk partial update
from sqlalchemy import update
stmt = update(Tarefa).where(
    Tarefa.tarefa_id == 5,
    Tarefa.feito == False
).values(
    feito=True,
    concluido_em=datetime.utcnow()
)
session.execute(stmt)
session.commit()`,
        attention: `Seus apps profissionais gravam <code>updated_at</code> (timestamp da última modificação) em cada table. Isso permite auditoria, debug e análise de padrões — sem custo significativo.`,
        mini_practice: `Você quer adicionar um campo <code>updated_at</code> a uma tabela existente. Quais etapas são necessárias além de ALTER TABLE?`,
        quiz: {
          q: 'Como o SQLAlchemy sabe quais campos alterar em um UPDATE?',
          opts: ['Lista todas as colunas manualmente', 'Monitora atributos marcados como "sujo" (dirty)', 'Envia o objeto inteiro e o banco compara', 'Não faz UPDATE, apenas substitui a linha'],
          answer: 1,
          why: 'O SQLAlchemy trackea alterações nos atributos de objetos ORM. Quando você muda um atributo, o objeto fica "sujo" (dirty). No commit, só as colunas sujas vão pro UPDATE — eficiência máxima.'
        }
      }
    ]
  },

  // ---- MÓDULO 8: DELETE ----
  {
    id: 'm8', icon: '🗑️', color: 'red',
    title: 'Operação: DELETE', subtitle: 'Limpando a casa',
    desc: 'Remova dados desnecessários e entenda o impacto nas relações.',
    lessons: [
      {
        id: 'l81', title: 'DELETE seguro', tag: 'SQL ESSENCIAL', time: '10 min', xp: 70, type: 'lesson',
        intro: `Excluir dados é irreversível. Diferente de <code>SELECT</code> (ler) ou <code>UPDATE</code> (modificar), <code>DELETE</code> remove registros permanentemente do banco. Após confirmado, não há "Ctrl+Z" nativo.

Por isso, DELETE deve sempre passar pelos mesmos filtros rigorosos de um UPDATE: verificar IDs específicos, garantir ausência de dependências, e preferir soft deletes quando possível.`,
        explanation: `<p><strong>Hard vs Soft Delete</strong></p>
<p><strong>Hard delete</strong> (DELETE tradicional): Remove completamente do banco. Irreversível. Usar com extrema cautela.</p>
<p><strong>Soft delete</strong> (prática recomendada): Ao invés de apagar, marca o registro como "inativo" (ex: <code>feito = TRUE</code> com flag adicional <code>excluido = TRUE</code>). O registro permanece no banco mas não aparece nas consultas normais. Permite recuperação se necessário.</p>
<p>Soft delete é amplamente adotado porque:<br>
• Preserva histórico e integrações<br>
• Permite auditoria (quem apagou, quando)<br>
• Evita problemas de integridade com FKs<br>
• Garante recuperação em até 30 dias</p>`,
        example: `-- Hard delete: IRREVERSÍVEL — use com cuidado
DELETE FROM comentarios_tarefa WHERE tarefa_id = 5;
DELETE FROM tarefas WHERE id = 5;

-- Hard delete com proteção (verificar dependências antes)
DELETE FROM tarefas
WHERE id = 5
  AND (SELECT COUNT(*) FROM comentarios_tarefa WHERE tarefa_id = 5) = 0;

-- Soft delete (RECOMENDADO): marca como inativa
UPDATE tarefas SET feito = TRUE, excluida_em = CURRENT_TIMESTAMP
WHERE id = 5;

-- Consultar apenas ativas
SELECT * FROM tarefas WHERE excluida_em IS NULL;`,
        py: `# Hard delete
tarefa = session.get(Tarefa, 5)
if tarefa:
    session.delete(tarefa)
    session.commit()  # PERMANENTE
    print('Tarefa removida permanentemente')

# Soft delete (recommended pattern)
class Tarefa(Base):
    __tablename__ = 'tarefas'
    id = Column(Integer, primary_key=True)
    titulo = Column(String)
    excluida = Column(Boolean, default=False)
    excluida_em = Column(DateTime, nullable=True)

    @property
    def ativa(self):
        return not self.excluida

    def软_deletar(self):
        if self.excluida:
            raise ValueError('Já excluída')
        self.excluida = True
        self.excluida_em = datetime.utcnow()
        session.commit()

# Filter active tasks only
active_tasks = session.query(Tarefa).filter(
    Tarefa.excluida == False
).all()`,
        attention: `Considere implementar "lixeira" (trash/recycle bin): tarefas "excluídas" ficam visíveis durante 30 dias em uma vista especial, permitindo restauração. Isso protege contra deleção acidental.`,
        mini_practice: `Quais informações um log de auditoria deveria registrar sobre uma operação de DELETE? Liste ao menos 4 campos.`,
        quiz: {
          q: 'Por que soft delete é preferido em aplicações modernas?',
          opts: ['Economiza espaço em disco', 'Preserva histórico, permite reversão e evita quebra de integridade', 'É obrigatório pelo SQL standard', 'Elimina a necessidade de backups'],
          answer: 1,
          why: 'Soft delete mantém os dados no banco com marcador de exclusão. Isso preserva relacionamentos com FKs, permite auditoria, possibilita reversão e evita perda acidental irreversível. Hard delete deve ser último recurso.'
        }
      },
      {
        id: 'l82', title: 'Cascade Delete e Integridade', tag: 'SEGURANÇA', time: '12 min', xp: 90, type: 'lesson',
        intro: `Quando você deleta uma tarefa que tem 15 comentários, o que acontece com esses comentários? Eles desaparecem magicamente? Geram erro? Ficam órfãos no banco?

A resposta depende de como você configurou o <strong>cascade delete</strong> e as constraints de integridade referencial. Entender isso previne bugs devastadores e inconsistências silenciosas.`,
        explanation: `<p><strong>Políticas de onDelete</strong></p>
<p>O banco permite definir o que acontece com filhos quando o pai é excluído:</p>
<ul>
<li><code>CASCADE</code> → filhos são apagados junto (padrão do ORM por cascata)</li>
<li><code>SET NULL</code> → filhos permanecem mas FK vira NULL (se permitido)</li>
<li><code>RESTRICT</code> → impede exclusão se houver filhos dependentes</li>
<li><code>NO ACTION</code> → similar ao RESTRICT (erro na tentativa)</li>
</ul>
<p>O choice ideal depende do caso: comentários de tarefa normalmente usam CASCADE (sem tarefa, comentário é inútil). Mas comentários de usuários (onde usuário é pai) provavelmente usam RESTRICT (não quer apagar histórico de comentários só porque o usuário saiu).</p>`,
        example: `-- Configuração de restrições ao criar tabela
CREATE TABLE comentarios_tarefa (
  id INTEGER PRIMARY KEY,
  tarefa_id INTEGER NOT NULL,
  conteudo TEXT NOT NULL,
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id)
    ON DELETE CASCADE      -- apaga comentários junto com tarefa
    ON UPDATE CASCADE      -- atualiza FK se id da tarefa mudar
);

-- Verificar se pode excluir (sem CASCADE, contar dependências)
SELECT COUNT(*) as comentarios 
FROM comentarios_tarefa 
WHERE tarefa_id = 5;

-- Se 0 comentários → deletar seguro
DELETE FROM tarefas WHERE id = 5;`,
        py: `# Cascade via relationship config
class Tarefa(Base):
    __tablename__ = "tarefas"
    id = Column(Integer, primary_key=True)
    # Cascade delete: filhos excluídos automaticamente
    comentarios = relationship(
        "Comentario",
        back_populates="tarefa",
        cascade="all, delete-orphan"  # <-- CHAVE AQUI
    )

# Testar antes de deletar
tarefa = session.get(Tarefa, 5)
if tarefa and not tarefa.comentarios:
    # Sem comentários → delete seguro
    session.delete(tarefa)
    session.commit()
elif tarefa:
    # Com comentários → soft delete preferencial
    tarefa.excluida = True
    tarefa.excluida_em = datetime.utcnow()
    session.commit()`,
        attention: `Configure cascade apenas quando fizer sentido conceitual (comentários de tarefa, logs de sessão). NÃO configure cascade para relacionamentos críticos (ex: transações financeiras, dados de usuários) — prefira validação manual antes de deletar.`,
        mini_practice: `Num sistema de blog com Post → Comment, se um post é apagado, deveria os comentários serem apagados também (CASCADE)? Justifique.`,
        quiz: {
          q: 'O que faz o cascade "delete-orphan" no SQLAlchemy?',
          opts: ['Deleta todos os registros do banco', 'Ao deletar o pai, também deleta os filhos vinculados', 'Impede exclusão de qualquer registro', 'Move dados para uma tabela de backup'],
          answer: 1,
          why: '"delete-orphan" é um cascata que garante: ao deletar o pai, todos os filhos são excluídos automaticamente. Mantém a integridade relacional sem código manual. É o comportamento esperado na maioria dos casos pai-filho.'
        }
      }
    ]
  }
];

// Badges — conquistas do jogador
export const badges = [
  {id:'first', name:'Primeiro Passo', icon:'🎯', desc:'Complete sua primeira lição'},
  {id:'streak', name:'Em Chama', icon:'🔥', desc:'Mantenha 3 dias seguidos'},
  {id:'join', name:'Conector', icon:'🔗', desc:'Termine todos os JOINs'},
  {id:'finish', name:'Graduado SQL', icon:'🏆', desc:'Complete todo o curso'},
  {id:'creator', name:'Criador', icon:'✨', desc:'Insira seu primeiro registro'},
  {id:'editor', name:'Editor', icon:'✏️', desc:'Atualize um registro'},
  {id:'cleaner', name:'Faxineiro', icon:'🧹', desc:'Delete um registro'},
  {id:'explorer', name:'Explorador', icon:'🧭', desc:'Visite todos os módulos'}
];
