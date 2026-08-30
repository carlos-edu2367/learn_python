# Direção UI/UX — CodeQuest

## 1. Intenção e princípios

**CodeQuest** é uma SPA de aprendizagem para quem está começando em Python, SQL e SQLAlchemy. A interface deve parecer um terminal amigável: escura, técnica e cheia de sinais de progresso, mas nunca intimidante.

1. **Clareza antes do estilo:** cada tela responde “onde estou?”, “o que aprendo agora?” e “qual é o próximo passo?”.
2. **Terminal sem barreira:** neon aparece em bordas, indicadores e ações; texto e código continuam com contraste alto e tamanho confortável.
3. **Aprender fazendo:** lições curtas alternam explicação, exemplo e ação; erros são pistas, não punições.
4. **Progresso visível, pressão baixa:** XP, streaks e badges celebram consistência. Nada essencial fica bloqueado por animação, som ou competição.
5. **Uma ação principal por vez:** o CTA da região tem destaque claro (“Continuar lição”, “Conferir resposta”, “Próxima questão”).

Tom: informal, direto e acolhedor. Usar “Você”, “Boa!”, “Quase lá” e “Vamos tentar de novo?”. Evitar jargão sem explicação e mensagens que culpem a pessoa.

## 2. Estrutura e navegação

- **Desktop (a partir de 1.024 px):** barra superior fixa de 64 px; navegação lateral fixa de 248 px; conteúdo central com largura máxima de 1.120 px e gutters de 32 px.
- **Tablet (768–1.023 px):** barra superior de 60 px; sidebar recolhe para rail de 72 px com ícones e tooltip; conteúdo com gutters de 24 px. Um controle explícito expande a navegação.
- **Mobile (até 767 px):** barra superior de 56 px; sidebar vira drawer; navegação primária fica em bottom bar de 64 px com 4 itens: Início, Trilha, Praticar e Perfil.
- Hash routing deve manter estado e colocar foco no título principal após navegação. Sempre mostrar breadcrumb ou contexto no título: `Trilha / SQL / SELECT`.

Áreas:

1. **Dashboard/Início:** saudação, “Continue de onde parou”, progresso da trilha, streak, XP para o próximo nível e badges recentes.
2. **Trilha:** mapa vertical de módulos; cada módulo exibe tema, duração, percentual e lições.
3. **Lição:** coluna de leitura ideal de 680–760 px e índice/progresso lateral no desktop. No mobile, índice vira “Nesta lição”. Rodapé com “Anterior” e “Fazer o quiz”.
4. **Quiz:** uma questão por vez, contador (`2 de 5`), progresso, enunciado, opções grandes e feedback após conferência.
5. **Conquistas/Perfil:** nível, XP, streak, histórico, badges conquistados e próximos objetivos.

## 3. Tokens visuais

### Cores

| Token | Valor | Uso |
|---|---|---|
| `bg-0` | `#080B12` | fundo global |
| `bg-1` | `#0E1420` | cards e sidebar |
| `bg-2` | `#151E2D` | campos, hover e código |
| `line` | `#26344A` | divisórias e bordas |
| `text-1` | `#F2F7FF` | títulos e conteúdo |
| `text-2` | `#B7C4D8` | texto secundário |
| `text-3` | `#8494AA` | metadados não essenciais |
| `cyan` | `#35D9FF` | foco, links, Python e CTA |
| `green` | `#35E39A` | sucesso, SQLAlchemy e concluído |
| `violet` | `#A98BFF` | SQL e destaque secundário |
| `amber` | `#FFC857` | streak, atenção e XP |
| `red` | `#FF6B7A` | erro e correção |

Texto normal deve atingir pelo menos 4,5:1; texto grande, 3:1; foco e componentes, 3:1. Nunca comunicar estado só por cor: combinar ícone, rótulo e texto. Gradientes neon ficam em áreas decorativas ou barras, nunca atrás de parágrafos. Glow sutil, halo máximo de 16 px.

### Tipografia e forma

- Interface: **Inter**, fallback sans-serif; títulos 700, corpo 400–500.
- Código: **JetBrains Mono**, fallback monoespaçado.
- Escala: display 32/40 px; H1 28/36; H2 22/30; H3 18/26; corpo 16/26; legenda 13/20. No mobile, reduzir títulos em 4 px, nunca o corpo abaixo de 16 px.
- Leitura com 65–80 caracteres por linha. Código pode rolar horizontalmente sem quebrar indentação.
- Espaçamento em base 4: 4, 8, 12, 16, 24, 32, 40, 48 px.
- Raio 8 px em controles, 12 px em cards e 16 px em modais; borda de 1 px.
- Alvo de toque mínimo 44 × 44 px e gap mínimo de 8 px.

## 4. Componentes e estados

### Barra superior
Logo com prompt, seletor de trilha, XP/nível, streak com número e texto acessível e avatar/menu. Em telas estreitas, manter logo, progresso compacto e avatar. Menu fecha por Escape e tem nomes claros.

### Sidebar e trilha
Agrupar Python (cyan), SQL (violet) e SQLAlchemy (green). Cada lição usa ícone + texto e estados: não iniciada, em andamento, concluída ou bloqueada. Progresso em barra/anel sempre acompanhado de percentual textual. Bloqueio explica o pré-requisito e oferece link para ele.

### Cards de lição
Título, descrição em uma frase, duração (`~8 min`), dificuldade e XP. Estados: default; hover com elevação de 2 px; foco com outline; em andamento com barra; concluído com check e data; bloqueado com explicação; indisponível com “Em breve”. Card pode ser clicável, mas mantém CTA textual.

### Conteúdo de lição
Parágrafos curtos, hierarquia forte e callouts “Dica”, “Atenção” e “Na prática” com ícone e título textual. Blocos de código têm cabeçalho de linguagem, “Copiar”, numeração opcional e resultado esperado. Ao copiar, mostrar “Copiado” por 2 s e anunciar confirmação.

### Botões, campos e feedback
- Primário: fundo cyan e texto escuro, uma vez por região.
- Secundário: transparente com borda `line`; ghost para apoio; destrutivo apenas em confirmação.
- Estados obrigatórios: default, hover, pressed, focus-visible, disabled, loading e erro.
- Disabled mantém contraste legível e explica o motivo; não usar opacity abaixo de 0,55.
- Loading mostra spinner e rótulo (“Salvando…”), bloqueando apenas a ação corrente.
- Toast de sucesso dura 4 s; erro permanece até leitura/fechamento. Toast não substitui mensagem persistente.

### Gamificação
XP aparece como número e motivo (`+20 XP · lição concluída`); barra mostra “420 / 600 XP”. Streak mostra quantidade e “Voltar amanhã para manter”. Badge informa nome, condição, data e descrição; desbloqueio abre modal com foco no título, “Continuar” e dispensar.

## 5. Quiz e feedback pedagógico

1. Topo: título, `Questão 2 de 5`, percentual e tentativa atual. A barra tem equivalente textual.
2. Opções são cards com inputs/labels completos, área inteira clicável e ordem estável. Multi-resposta informa “Selecione todas as corretas”.
3. “Conferir resposta” fica desabilitado sem seleção. Enter não submete acidentalmente a partir de texto.
4. Depois de conferir, congelar escolhas e marcar com ícone + rótulo: “Sua resposta”, “Correta” ou “Não é a melhor opção”. Mostrar explicação e, quando útil, exemplo Python/SQL.
5. Correta: “Boa! Você entendeu…”, XP e “Próxima questão”. Perfeita: celebração discreta, sem confete obrigatório.
6. Incorreta: “Quase lá — revise este ponto”, raciocínio e “Tentar de novo” ou “Rever a lição”. Nunca apenas “errado”.
7. Fim aprovado: score, XP, resumo, badge se houver e “Continuar trilha”. Reprovado: score, temas para revisar, tentativa restante e caminho para retomar; nunca bloquear revisão.
8. Perda de estado: “Sua resposta não foi salva”, com opção de continuar; não apagar progresso silenciosamente.

## 6. Motion e transições

- 150 ms para hover/foco, 220 ms para expansão, 300 ms para drawer/modal, easing `ease-out`.
- Animar apenas opacity, transform e cor; evitar deslocamento de layout. Drawer desliza; modal faz fade e escala de 98% para 100%.
- XP anima até 600 ms após recompensa; badge tem brilho único de até 800 ms. Sem loops permanentes.
- Sucesso pode usar check; erro, pequeno deslocamento uma vez, nunca tremor contínuo.
- Com `prefers-reduced-motion`, remover parallax, pulsação, confete e deslocamentos; aplicar mudança instantânea e mensagem textual equivalente.
- Motion nunca atrasa CTA nem impede teclado.

## 7. Acessibilidade e inclusão

- Usar HTML semântico (`header`, `nav`, `main`, `aside`, `footer`), um H1 por tela, headings em ordem e landmarks nomeados.
- Teclado completo: Tab/Shift+Tab, Enter/Space em controles, Escape em drawer/modal; foco não escapa do diálogo.
- `focus-visible`: outline de 3 px cyan, offset de 2 px; nunca remover sem substituto.
- Modal usa diálogo semântico, título associado, foco inicial e devolução de foco ao acionador.
- Quiz usa `fieldset`/`legend` e labels associados. Resultados/toasts são anunciados por `status`/`alert` sem leitura excessiva.
- Ícones decorativos têm alternativa vazia; os informativos têm nome. Emoji nunca é a única representação.
- Permitir alto contraste, zoom até 200% e reflow sem rolagem horizontal, exceto código. Não usar texto neon fino sobre quase preto.
- Respeitar fonte do sistema, orientação e tamanho. Som não inicia sozinho; pode ser desligado e tem equivalente visual/textual.
- Linguagem simples, exemplos inclusivos e erros que ensinam como corrigir.

## 8. Responsividade

### Desktop
Duas colunas na lição; quiz máximo de 760 px. Hover é enriquecimento, nunca requisito. Atalhos podem existir, mas não são obrigatórios.

### Tablet
Índice lateral colapsado; cards em uma coluna; grade de duas colunas só a partir de 840 px. Rail mostra tooltip após foco/hover; nunca depender só de ícone. Modais têm margem mínima de 24 px.

### Mobile
- Padding horizontal de 16 px; entre seções, 24–32 px.
- Bottom bar fixa respeita safe area e reserva espaço; CTA sticky não cobre texto.
- Cards viram lista; estatísticas quebram em blocos; tabela rola horizontalmente com indicação “deslize”.
- Código rola horizontalmente com botão copiar; fonte mínima 14 px.
- Opções do quiz têm mínimo 56 px de altura; CTA ocupa largura total; ao avançar, rolar ao topo e anunciar a nova questão.
- Drawer máximo de 88% da largura, com título, fechar e rolagem própria; não abrir só com gesto de passar.
- Toast fica acima da bottom bar e não cobre CTA.

## 9. Estados globais

- **Primeiro acesso:** explicar objetivo, duração e salvamento em três passos; permitir “Pular introdução”.
- **Vazio:** ilustração terminal simples, texto humano e “Começar Python”.
- **Carregando:** skeleton alinhado ao layout final, com rótulo para leitor de tela; evitar spinner isolado de tela inteira.
- **Erro:** mensagem clara, recarregar e rota alternativa; preservar progresso local.
- **Offline/salvamento:** informar quando está salvo localmente, pendente ou disponível para retry; não prometer sincronização inexistente.
- **Concluído:** mostrar sempre o próximo passo.

Critério de pronto: em cada tela, a pessoa identifica módulo, ação principal, progresso e como desfazer/tentar novamente sem depender de cor, som, hover ou animação.

## 10. Checklist de revisão

- [ ] Contraste testado para texto, controles e foco; estados não dependem só de cor.
- [ ] Controles têm nome, foco visível e alvo adequado.
- [ ] Tab, Enter, Space e Escape cobrem navegação, quiz, drawer e modal.
- [ ] Reduced motion, zoom de 200% e mobile estreito verificados.
- [ ] Loading, vazio, erro, bloqueado, concluído e disabled têm texto e próximo passo.
- [ ] XP, streak, badge e score têm equivalente textual e explicação.
- [ ] Glow, gradiente e decoração não comprometem leitura.
- [ ] Conteúdo PT-BR é acolhedor e não pressupõe conhecimento.

## 11. Código e ritmo das lições

Blocos usam `bg-2`, alto contraste e sintaxe que não depende apenas de matiz. Cabeçalho identifica `Python`, `SQL` ou `SQLAlchemy`; separar visualmente Entrada e Saída. Em mobile, preservar indentação e oferecer scroll horizontal com indicação. O botão “Copiar” mantém rótulo, anuncia “Copiado” e não impede seleção manual.

Uma lição segue quatro momentos: **entender** (objetivo e pré-requisito), **ver** (explicação e exemplo), **fazer** (miniatividade) e **comprovar** (quiz e resumo). Duração e XP aparecem no início sem urgência artificial. Textos longos viram blocos de 2–4 parágrafos; a dica aparece perto do erro. Cada seção termina com ação ou pergunta simples.

**Regra final:** neon celebra o aprendizado; nunca compete com o conteúdo.