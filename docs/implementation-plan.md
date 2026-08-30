# Plano de implementação — QueryQuest

## 1. Objetivo e escopo

Evoluir o QueryQuest, uma SPA vanilla de aprendizagem de SQL e SQLAlchemy, sem backend e com progresso local, para que a pessoa consiga iniciar, estudar, praticar, corrigir erros e retomar a trilha com clareza. Esta etapa é planejamento: nenhum código de produção é alterado por este documento.

**Fora do escopo:** backend, contas, sincronização, banco real no navegador, service worker, build system, dependências externas adicionais e gamificação competitiva.

## 2. Evidências que orientam o plano

- `index.html` já fornece shell com sidebar, navegação de módulos, topbar, `#app` e toast.
- `app.js` concentra estado, renderização, handlers, XP, streak, badges e fluxo de lição/quiz.
- `content.js` possui oito módulos (`m1`–`m8`) e lições com `intro`, SQL, Python/SQLAlchemy e quiz.
- A implementação atual usa `localStorage` com a chave `queryquest-progress` e o estado `{ xp, done, answers, streak, last, badges }`.
- O módulo m5 (“Mini-projeto”) aparece antes de m6–m8 (CREATE, UPDATE, DELETE), embora seu checklist já peça essas operações.
- A interface atual usa renderização por `innerHTML`, módulos como `<div>` clicáveis e abas de código como `<span>`; os requisitos de teclado e semântica ainda não estão plenamente atendidos.
- `styles.css` está comprimido em uma linha; há regras responsivas, mas não há regra explícita para `prefers-reduced-motion`.
- `docs/architecture/frontend-learning-spa.md` descreve uma arquitetura futura com `src/`, JSON e serviços que não existem no repositório atual. `docs/uiux-direction.md` usa “CodeQuest” em parte do texto e descreve telas ainda não implementadas.
- `REVIEW.md` existente contém afirmações imprecisas: o preconnect está completo e o código atual usa `state.last`, não `state.lastKey`.

## 3. Ordem e dependências

1. **P0 — contrato e segurança do fluxo:** preservar o estado existente, criar funções puras de normalização/validação, tratar falhas de armazenamento e impedir rotas inválidas.
2. **P0 — acessibilidade estrutural:** landmarks, skip link, foco após navegação, botões semânticos, nomes acessíveis, tabs operáveis por teclado e mensagens live.
3. **P1 — navegação e retomada:** hash routing (`#/`, `#/modulo/:id`, `#/licao/:modulo/:licao`), back/forward, dashboard com “continuar” e fallback para rota válida.
4. **P1 — quiz e feedback:** resposta incorreta com tentativa novamente, explicação persistente, estado de seleção, feedback textual e conclusão idempotente.
5. **P1 — conteúdo e sequência didática:** reorganizar a ordem lógica para ensinar CREATE/UPDATE/DELETE antes do mini-projeto; revisar textos e quizzes; adicionar conteúdos de consulta e troubleshooting.
6. **P1 — design visual:** consolidar tokens, estados de foco/hover/disabled/sucesso/erro, responsividade mobile e reduced motion sem alterar a identidade terminal/neon.
7. **P2 — observabilidade local e qualidade:** validador de conteúdo, migração de estado versionada, testes sem dependências e roteiro de validação no navegador.

Dependência crítica: a mudança de IDs/ordem de conteúdo deve ocorrer antes da definição final de desbloqueio, mas os IDs existentes devem continuar válidos para não perder progresso.

## 4. Fases executáveis

### Fase 0 — Baseline e contrato

**Arquivos-alvo:** `app.js`, `content.js`, `index.html`, `styles.css`, docs.

- Inventariar IDs, quizzes, referências entre módulos e seletores usados pelo JS.
- Registrar o schema atual e criar versão explícita (`version: 1` preservando leitura legada).
- Definir regras: XP só uma vez por lição; resposta pode ser refeita; módulo desbloqueia quando o anterior está completo; m1 fica aberto.

**Aceite:** nenhum ID duplicado; todas as lições têm campos obrigatórios; o app inicia com storage vazio e com storage inválido.

### Fase 1 — Robustez e navegação

**Arquivos-alvo:** `app.js`, `index.html`.

- Criar `loadState`, `normalizeState` e `saveState` com `try/catch`.
- Usar datas locais estáveis em formato `YYYY-MM-DD`; manter migração de `last` legado.
- Introduzir router de hash e `hashchange`, sem depender de servidor ou biblioteca.
- Substituir caminhos inválidos por dashboard ou módulo válido.
- Atualizar breadcrumb e foco do título após renderização.
- Usar delegação de eventos ou limpeza controlada para não acumular listeners.

**Aceite:** refresh mantém a tela; back/forward funciona; rota inválida não quebra; storage corrompido inicia estado limpo e mostra aviso não bloqueante; concluir duas vezes não dá XP duplicado.

### Fase 2 — Acessibilidade e fluxo de aprendizagem

**Arquivos-alvo:** `index.html`, `app.js`, `styles.css`.

- Adicionar skip link, `main` nomeado, região `aria-live`, título focável e menu mobile funcional.
- Renderizar módulos como botões/links reais; estados bloqueado e concluído com texto, não apenas cor/ícone.
- Transformar tabs em `role=tablist`/`role=tab`/`role=tabpanel`, com `aria-selected` e teclado.
- Preservar resposta errada, permitir “Tentar novamente”, rever a explicação e concluir só após acerto quando houver quiz.
- Mostrar próximo passo e lição anterior/próxima quando existirem.

**Aceite:** fluxo completo por teclado; foco visível; leitor de tela recebe contexto, resultado do quiz e salvamento; nenhum CTA fica inacessível no mobile.

### Fase 3 — Conteúdo e didática

**Arquivos-alvo:** `content.js`, `docs/content-structure.md`, `docs/product-spec.md`.

- Manter IDs atuais e reordenar módulos exibidos: fundamentos → SELECT → CREATE → UPDATE → DELETE → ORM/JOIN → transações → mini-projeto, ou formalizar pré-requisitos equivalentes.
- Reescrever cada lição com objetivo, pré-requisito, explicação curta, exemplo comentado, erro comum, microprática, quiz e resumo.
- Adicionar, em ordem de prioridade, `ORDER BY/LIMIT`, agregações (`COUNT`, `GROUP BY`), parâmetros seguros, troubleshooting e revisão integrada.
- Substituir o quiz trivial do mini-projeto por cenário de decisão.

**Aceite:** uma pessoa iniciante consegue explicar o resultado esperado antes do código; cada operação destrutiva explicita `WHERE`; não há conteúdo que exija conceito ainda não ensinado.

### Fase 4 — Design e acabamento

**Arquivos-alvo:** `styles.css`, `index.html`, `app.js`.

- Manter paleta verde/cyan/purple e tipografias atuais, mas tornar tokens e regras legíveis.
- Garantir contraste, áreas de toque de pelo menos 44px, estados `focus-visible`, `disabled`, erro e sucesso.
- Ajustar sidebar/drawer mobile, cards, blocos de código com rolagem horizontal e CTA sem sobreposição.
- Implementar `prefers-reduced-motion`; animações nunca carregam significado sozinhas.

**Aceite:** 320px, 768px e desktop sem overflow indevido; zoom 200% preserva leitura; código pode rolar horizontalmente; reduced motion elimina movimento não essencial.

### Fase 5 — Qualidade e validação

**Arquivos-alvo:** docs e, se adotado posteriormente, `tests/` sem dependências.

- Adicionar validador de conteúdo executável no modo de desenvolvimento ou função exportável sem alterar o runtime de produção.
- Cobrir estado, streak, XP, desbloqueio, badges, quiz e roteamento com testes puros quando houver runner disponível.
- Validar em servidor local e navegador.

**Aceite:** os comandos abaixo passam e o checklist manual não encontra erro de console ou rota.

## 5. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Perda do progresso existente | Não renomear IDs; migrar `last` e normalizar arrays/maps. |
| Conteúdo fora de ordem | Definir pré-requisitos no catálogo e revisar dependências antes de publicar. |
| XSS por interpolação | Escapar textos dinâmicos; tratar código como texto, nunca como HTML. |
| Falha de `localStorage` | Estado em memória + aviso de salvamento local indisponível. |
| Regressão mobile | Testar 320/375/768px e teclado em cada fase. |
| Documentação divergir do código | Atualizar docs no mesmo commit da mudança e validar referências. |
| Escopo crescer para PWA/backend | Registrar como fora do escopo; não adicionar service worker, conta ou API. |

## 6. Roteiro de validação local

```bat
git status --short
git diff --check
python -m http.server 8000
```

Abrir `http://localhost:8000/` no navegador e verificar: primeiro acesso; abrir m1; responder correta e incorreta; tentar novamente; concluir; recarregar; acessar `#/modulo/m2`; acessar `#/licao/m2/l21`; usar back/forward; resetar com confirmação; testar menu mobile; Tab/Enter/Escape; zoom 200%; viewport 320px; console sem exceções.

Para validações estáticas sem Node:

```bat
python -c "from pathlib import Path; import re; files=['index.html','app.js','content.js','styles.css','vercel.json']; print('refs ok' if all(Path(f).exists() for f in files) else 'missing')"
python -c "import re; from pathlib import Path; t=Path('content.js').read_text(encoding='utf-8'); print('quiz fields:', t.count('quiz:{'), 'modules:', t.count("{id:'m"))"
```

Se Node estiver instalado posteriormente: `node --check app.js && node --check content.js`.

## 7. Definition of Done

Código e conteúdo preservam a proposta local-first; todos os critérios de Fase 1–5 passam; documentação não descreve `src/`, JSON externo ou serviços inexistentes como estado atual; não há dependências novas nem arquivos temporários; `git diff --check` passa.

## 8. Pendências deliberadas

Export/import manual, modo offline por service worker, execução real de SQL no navegador, conta/sincronização e telemetria ficam fora desta entrega e só podem ser considerados em decisão posterior.

---

## 9. Checklist de implementação

- [ ] Estado legado lido e migrado sem perda.
- [ ] Router hash e foco pós-navegação.
- [ ] Quiz com retry e feedback acessível.
- [ ] Conteúdo reordenado e revisado.
- [ ] Novas lições aprovadas por checklist didático.
- [ ] CSS responsivo/reduced motion.
- [ ] Validador de conteúdo.
- [ ] Testes manuais em navegador.
- [ ] Git e referências verificados.

## 10. Critérios de aceite consolidados

1. Abrir a aplicação não depende de backend.
2. O progresso existente continua legível.
3. Toda ação importante tem feedback textual.
4. Toda tela tem contexto e próximo passo.
5. Nenhuma resposta errada bloqueia a aprendizagem.
6. O mini-projeto só exige conceitos previamente ensinados.
7. Código e explicação mostram SQL e SQLAlchemy equivalentes.
8. O projeto permanece executável como HTML/CSS/ES modules diretos.
9. A documentação permanece fiel ao comportamento efetivamente implementado.
10. Validação local reproduzível fica registrada neste plano.

## 11. Sequenciamento recomendado de conteúdo

A ordem de publicação recomendada é: `m1 Pensando em dados` → `m2 SELECT` → `m6 CREATE` → `m7 UPDATE` → `m8 DELETE` → `m3 ORM/JOIN` → `m4 Transações` → `m5 Mini-projeto`. Se alterar a ordem física for inconveniente, usar `prerequisites` explícitos mantendo os IDs. O mini-projeto deve referenciar apenas operações já explicadas e deve incluir critérios de sucesso observáveis.

## 12. Princípio de rollout

Publicar cada fase de forma pequena e reversível: primeiro estado/roteamento, depois acessibilidade, depois conteúdo, depois estilo. Após cada fase, limpar o progresso apenas no ambiente de teste, nunca no perfil real da pessoa.

## 13. Registro de decisões

- Vanilla ES modules continuam sendo a arquitetura oficial.
- `localStorage` continua sendo a persistência oficial.
- O shell atual é reaproveitado; não criar nova aplicação paralela.
- Conteúdo permanece em `content.js` até que o volume justifique uma migração planejada.
- A trilha deve ensinar antes de cobrar: pré-requisito pedagógico prevalece sobre a ordem histórica dos arquivos.
- Acessibilidade é requisito funcional, não acabamento.

## 14. Saída esperada da implementação futura

Ao final da implementação, o usuário deve poder entrar, continuar a próxima lição, ler uma explicação curta, alternar SQL/SQLAlchemy, responder, receber uma justificativa, tentar novamente se necessário, concluir uma única vez, ver XP/streak atualizados e retornar ao mesmo ponto por URL ou recarregamento.

## 15. Validação de documentação

Pesquisar referências a `CodeQuest`, `HashRouter` não implementado, `catalog.json`, `src/` e funcionalidades de perfil/badges que não existam. Cada ocorrência deve ser marcada como “planejado” ou substituída por descrição do estado atual.

## 16. Não-regressão

A implementação futura não deve remover o favicon, a separação `content.js`/`app.js`, o tema terminal, a dupla representação SQL/Python, os oito módulos existentes ou a chave de storage sem migração.

## 17. Responsáveis por revisão

Produto valida sequência, linguagem e critérios de aprendizagem; engenharia valida estado, rotas, renderização e storage; revisão manual valida teclado, viewport, contraste, console e recuperação de erro.

## 18. Critério para encerrar fase

Uma fase só é considerada pronta quando seu aceite funcional, seu aceite de acessibilidade e sua validação de não-regressão forem registrados; “parece funcionar” não substitui o roteiro de validação.

## 19. Próxima ação concreta

Implementar a Fase 0 e Fase 1 em uma alteração isolada, antes de reescrever conteúdo. Isso reduz o risco de perder progresso e dá uma base confiável para validar as demais melhorias.

## 20. Nota sobre o estado desta entrega

Este arquivo é um plano. Nenhuma das fases acima deve ser interpretada como já implementada apenas por estar descrita aqui.

## 21. Referências do repositório

- `index.html`: shell e pontos de montagem.
- `app.js`: runtime atual.
- `content.js`: catálogo embutido.
- `styles.css`: tokens e layout atual.
- `docs/content-structure.md`: contrato de conteúdo existente.
- `docs/uiux-direction.md`: direção visual a alinhar.
- `vercel.json`: publicação estática com rewrite para `index.html`.

## 22. Controle de mudança

Qualquer mudança que introduza backend, dependência, build, service worker, sincronização ou execução SQL real exige revisão de escopo e atualização deste plano antes de implementação.

## 23. Resultado mensurável

A melhoria será considerada completa quando: todas as rotas essenciais forem reproduzíveis; nenhum bug P0/P1 confirmado permanecer; o conteúdo tiver dependências coerentes; a experiência for operável por teclado; e os documentos passarem por revisão cruzada.

## 24. Encerramento

O foco é transformar uma boa demonstração visual em uma trilha confiável: preservar o que já funciona, corrigir o que quebra, ensinar na ordem certa e tornar cada estado compreensível.

## 25. Aprovação

Antes de implementar a Fase 3, revisar a nova ordem e os textos com uma pessoa que conheça SQLAlchemy. Antes de publicar, executar o roteiro de navegador e registrar o resultado no `REVIEW.md`.

## 26. Escopo de testes de aceitação

Testar estado vazio, estado legado, JSON inválido, storage bloqueado, módulo bloqueado, módulo liberado, quiz correto, quiz incorreto, retry, conclusão repetida, rota inválida, refresh, back/forward, menu mobile e reduced motion.

## 27. Compatibilidade

A solução deve funcionar em navegador moderno com suporte a ES modules, `localStorage`, `hashchange`, `requestAnimationFrame` apenas se necessário e elementos HTML nativos. Não depender de APIs proprietárias.

## 28. Política de erros

Erros de conteúdo devem degradar para mensagem clara e rota segura; erros de persistência não podem impedir leitura; erros de quiz não podem apagar resposta nem XP; erros de navegação não podem produzir tela vazia.

## 29. Qualidade editorial

Cada novo texto deve evitar frases longas, explicar termos na primeira ocorrência, mostrar o resultado esperado, explicitar o risco de copiar o exemplo sem entender e incluir uma pergunta de transferência para outro cenário.

## 30. Final

Este plano cobre design, conteúdo novo, reformulação didática, fluxo completo e correção de erros, mantendo o QueryQuest pequeno, local, direto e executável sem infraestrutura adicional.
