# Especificação de produto — QueryQuest

## 1. Visão

QueryQuest é uma trilha gamificada, em português do Brasil, para aprender SQL e SQLAlchemy a partir do domínio de tarefas e comentários. É uma experiência local-first: não há conta, backend, sincronização ou execução real de SQL dentro da SPA. O objetivo é tornar o raciocínio de persistência, consulta e regras de negócio compreensível e praticável.

## 2. Público e necessidades

**Público primário:** pessoa iniciante em SQL/SQLAlchemy, familiarizada ou parcialmente familiarizada com Python.

Ela precisa:

- entender a relação entre objeto Python, tabela, linha, chave primária e chave estrangeira;
- ver SQL e o equivalente em SQLAlchemy lado a lado;
- praticar pequenas decisões antes de enfrentar o mini-projeto;
- saber por que uma resposta está correta ou incorreta;
- retomar o ponto anterior sem perder progresso;
- operar tudo por teclado, tela pequena e leitor de tela;
- receber mensagens que ensinem, sem punição ou urgência artificial.

## 3. Proposta de experiência

A interface mantém a estética de terminal amigável: fundo escuro, cyan como ação/foco, purple para SQL, verde para sucesso/SQLAlchemy e laranja para atenção/XP. Neon é acento, nunca fundo de texto longo. A hierarquia visual deve responder em cada tela: **onde estou, o que aprendo agora, o que faço em seguida e quanto avancei**.

### 3.1 Dashboard

Exibir título, saudação curta, XP, nível, streak, barra de progresso e cards dos oito módulos atuais. O card mostra título, subtítulo, descrição, `concluídas/total`, percentual textual, estado e CTA. O primeiro módulo está aberto; os demais respeitam a sequência atual ou pré-requisitos explicitamente definidos. Exibir “Continuar” para a primeira lição não concluída.

### 3.2 Módulo

Exibir breadcrumb, título, descrição e lista de lições. Cada item mostra tag, título, duração, XP, estado “Não iniciada”, “Em andamento”, “Concluída” ou “Bloqueada” e ação textual. Módulo bloqueado explica qual módulo anterior falta; não deve parecer um item quebrado.

### 3.3 Lição

Estrutura obrigatória:

1. objetivo em uma frase;
2. contexto/pre-requisito;
3. explicação em parágrafos curtos;
4. exemplo SQL;
5. equivalente Python/SQLAlchemy;
6. “Atenção” com erro comum;
7. microprática ou pergunta de previsão;
8. quiz;
9. resumo de três pontos;
10. ação de conclusão e próxima lição.

As abas SQL/Python são controles reais, possuem estado selecionado e funcionam por Tab, Enter e setas. Código é texto, preserva indentação e pode rolar horizontalmente. A conclusão é idempotente: XP só é atribuído uma vez.

### 3.4 Quiz

O formato atual é uma questão por lição; mantê-lo no primeiro ciclo para evitar ampliar escopo. A pergunta, opções e feedback devem ter nomes acessíveis. Após resposta:

- mostrar “Sua resposta”, “Correta” ou “Quase lá” com texto e ícone;
- manter a explicação `why` visível;
- resposta correta libera conclusão;
- resposta incorreta não bloqueia: mostrar “Tentar novamente” e “Rever a explicação”;
- não atribuir XP pela tentativa incorreta;
- não apagar a seleção no refresh antes de salvá-la;
- concluir automaticamente só se o quiz for respondido corretamente, preservando o botão manual para lições sem quiz.

### 3.5 Feedback global

Toasts anunciam eventos curtos: resposta salva, lição concluída, XP recebido, erro de salvamento. Mensagens importantes também ficam na região da tela. Falha de storage deve dizer que o progresso pode não persistir, sem impedir a leitura. Reset exige confirmação clara e não pode apagar silenciosamente.

## 4. Fluxo completo

```text
Entrada
  ├─ primeiro acesso → Dashboard → continuar m1
  └─ retorno → carregar estado → Dashboard → continuar próxima lição
Dashboard
  ├─ card liberado → Módulo → Lição
  ├─ card bloqueado → explicação do pré-requisito
  └─ resetar → confirmação → estado inicial
Lição
  ├─ alternar SQL / Python
  ├─ quiz correto → feedback → concluir → próxima lição/módulo
  ├─ quiz incorreto → why → tentar novamente/rever
  └─ voltar → módulo → dashboard
URL/hash
  ├─ rota válida → tela correspondente
  └─ rota inválida → dashboard com aviso
```

Back/forward do navegador deve reproduzir as telas; refresh deve conservar rota e progresso. Toda navegação move foco para o título principal.

## 5. Conteúdo existente: reformulação

Os IDs atuais (`l11` a `l82`) devem ser preservados para não quebrar progresso.

| Módulo | Reformulação obrigatória |
|---|---|
| m1 Pensando em dados | Explicar memória versus persistência, tabela/linha/coluna e chave primária com um desenho textual; em relações, diferenciar chave primária de estrangeira. |
| m2 Consultas SQL | Separar SELECT, FROM e WHERE; mostrar resultado esperado; explicar `scalar_one_or_none()` e o caso sem resultado. |
| m6 CREATE | Ensinar `INSERT`, campos obrigatórios e parâmetros seguros; comparar objeto criado, `session.add` e `commit`. |
| m7 UPDATE | Destacar o perigo de UPDATE sem WHERE; prever quantas linhas mudam; explicar alteração de atributo e commit. |
| m8 DELETE | Destacar o perigo de DELETE sem WHERE, dependências e decisão entre apagar dependentes/cascade. |
| m3 ORM/JOIN | Ensinar model versus domínio depois da base CRUD; explicar cardinalidade e por que LEFT JOIN preserva tarefa sem comentário. |
| m4 Transações | Diferenciar `add`, `commit`, `refresh`, `rollback`; inserir cenário de falha e recuperação. |
| m5 Mini-projeto | Virar avaliação aplicada: requisitos, schema mínimo, queries, regras e tratamento de inexistência; substituir pergunta trivial por decisão de implementação. |

A ordem pedagógica recomendada é `m1 → m2 → m6 → m7 → m8 → m3 → m4 → m5`. Se o array permanecer em ordem histórica, o desbloqueio deve usar pré-requisitos para produzir a mesma sequência.

## 6. Conteúdo novo prioritário

### N1 — Ordenação e paginação

`ORDER BY`, `ASC/DESC`, `LIMIT` e por que paginação exige ordenação estável. Microatividade: listar tarefas pendentes mais recentes.

### N2 — Resumos do banco

`COUNT`, `GROUP BY`, `HAVING` e diferença entre filtrar linhas antes (`WHERE`) e grupos depois (`HAVING`). Equivalente SQLAlchemy com `func.count`.

### N3 — Parâmetros e segurança

Separar dado de comando; nunca concatenar input em SQL; usar parâmetros/expressões SQLAlchemy. Incluir exemplo seguro e exemplo conceitualmente perigoso, sem executar payload.

### N4 — Troubleshooting

Ler erros de sintaxe, registro inexistente, chave estrangeira, duplicidade e transação pendente. Cada erro termina com hipótese, verificação e correção.

### N5 — Transferência

Reaplicar SELECT/JOIN/agrupamento a `alunos`, `disciplinas` e `notas`, para evitar decorar apenas `tarefas`.

## 7. Didática e editorial

Cada lição deve usar a sequência **entender → prever → ver → fazer → comprovar → transferir**. Termos técnicos são definidos na primeira ocorrência. Exemplos mostram entrada e resultado esperado. Quizzes perguntam aplicação, não apenas memorização. Erros comuns aparecem antes da prática destrutiva. Duração estimada continua no conteúdo e XP recompensa conclusão, não velocidade.

Critérios editoriais:

- frases curtas e voz ativa;
- 2–4 parágrafos por conceito;
- um conceito novo por bloco;
- código comentado sem comentários que substituam a explicação;
- `why` explica o raciocínio de todas as alternativas relevantes;
- linguagem acolhedora: “Quase lá — compare o filtro com o requisito”.

## 8. Design frontend

- reutilizar `index.html` como shell e `styles.css` como fonte dos tokens;
- manter cards de módulo, lista de lições, blocos de código e quiz;
- acrescentar estados visuais e textuais de foco, hover, pressed, disabled, bloqueado, erro, sucesso e salvo;
- manter corpo em pelo menos 16px e alvo de toque mínimo de 44×44px;
- sidebar vira drawer no mobile com botão nomeado, fechamento por Escape e foco devolvido;
- código rola apenas dentro do bloco; a página não deve criar overflow horizontal acidental;
- respeitar `prefers-reduced-motion`.

## 9. Acessibilidade

Usar um H1 por tela, `header`, `nav`, `main`, `aside`, `article` e `footer` semânticos, skip link e região live. O título principal deve ser focável (`tabindex=-1`) após troca de rota. Botões devem ter nome explícito; ícones decorativos usam alternativa vazia. Tabs usam `role=tablist`, `role=tab`, `role=tabpanel` e `aria-selected`. Quizzes usam `fieldset`/`legend` quando apropriado ou grupo nomeado. Estados não podem depender apenas de cor.

Validar teclado completo, zoom 200%, largura 320px, contraste de texto/controle, leitor de tela e reduced motion.

## 10. Métricas locais de sucesso

Sem telemetria externa. Medir por inspeção/teste: conseguir completar uma lição; recuperar após resposta errada; recarregar sem perder estado; chegar ao mini-projeto com pré-requisitos ensinados; navegar por URL; compreender o próximo passo sem tooltip ou cor.

## 11. Fora do escopo

Não adicionar login, servidor, sincronização, export/import nesta fase, execução SQL real, editor persistente, service worker, anúncios, ranking ou biblioteca de UI.

## 12. Aceite de produto

- A pessoa iniciante identifica objetivo, duração, recompensa e próximo passo.
- A ordem não cobra CRUD antes de ensiná-lo.
- Cada lição explica SQL e sua ponte SQLAlchemy.
- Toda resposta incorreta oferece raciocínio e nova tentativa.
- O progresso é local e transparente.
- Reset, rota inválida e storage indisponível têm recuperação compreensível.
- Mobile, teclado e reduced motion são caminhos equivalentes, não versões degradadas.
