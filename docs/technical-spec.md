# Especificação técnica — QueryQuest

## 1. Restrições técnicas

A implementação futura permanece em `index.html`, `styles.css`, `app.js` e `content.js`, com módulos ES nativos e sem dependências, bundler, backend, service worker ou banco real no navegador. `vercel.json` continua apenas como configuração de publicação estática. O conteúdo permanece embutido em `content.js` até uma migração deliberada.

## 2. Estado

### 2.1 Compatibilidade atual

O runtime atual persiste na chave `queryquest-progress`:

```js
{ xp: 0, done: [], answers: {}, streak: 1, last: "Sat Aug 30 2026", badges: [] }
```

A implementação deve ler esse formato e nunca cobrar migração destrutiva.

### 2.2 Schema alvo

```js
{
  version: 2,
  xp: 0,
  done: [],
  answers: {},
  attempts: {},
  streak: 1,
  last: "2026-08-30",
  badges: [],
  updatedAt: "2026-08-30T12:00:00.000Z"
}
```

`done` contém IDs de lição concluídos; `answers[id]` contém o último índice selecionado; `attempts[id]` contém contagem e histórico mínimo; `xp` é soma de recompensas atribuídas; `streak` é sequência de dias de atividade; `last` usa data local `YYYY-MM-DD`; badges contém IDs únicos.

`normalizeState(raw)` deve: aceitar apenas objeto; aplicar defaults; filtrar IDs desconhecidos; deduplicar `done`/`badges`; limitar respostas a inteiros; converter data legada com parser seguro; impedir XP negativo; retornar estado novo quando JSON é inválido.

`saveState()` usa `try/catch`. Em `QuotaExceededError` ou `SecurityError`, mantém estado em memória, informa que o progresso não foi salvo e não interrompe a leitura.

### 2.3 Streak

Usar `dateKey(date)`, com ano/mês/dia locais, não `toISOString()` para representar o dia do usuário. Calcular diferença entre chaves usando datas ao meio-dia local. Mesmo dia mantém valor; dia imediatamente anterior incrementa; intervalo maior reseta para 1. A primeira atividade parte de 1. O cálculo deve ser puro e testável.

## 3. Conteúdo e validação

Cada módulo exige `id`, `icon`, `color`, `title`, `subtitle`, `desc` e array não vazio `lessons`. Cada lição exige `id`, `title`, `tag`, `time`, `xp`, `type`, `intro`, `code`, `py`; quiz, quando presente, exige `q`, pelo menos duas opções, `answer` inteiro válido e `why` não vazio.

`validateContent(modules, badges)` deve detectar IDs duplicados de módulos/lições, lição vazia, XP não positivo, quiz inválido, badge duplicado e referências desconhecidas. Em produção, erro deve gerar fallback visível e seguro; em desenvolvimento, pode ser anunciado no console. O validador não deve alterar o conteúdo.

Textos de `content.js` são dados confiáveis do repositório, mas todo valor interpolado em HTML deve passar por `escapeHtml`. Código deve ser renderizado como texto dentro de `code`/`pre`, nunca como markup executável.

## 4. Roteamento

Usar hash routing sem biblioteca:

- `#/` ou hash ausente → dashboard;
- `#/modulo/:moduleId` → módulo;
- `#/licao/:moduleId/:lessonId` → lição.

`parseRoute(location.hash)` decodifica segmentos, rejeita valores vazios e retorna rota dashboard para formato desconhecido. `navigate(route)` altera `location.hash`; handlers não devem chamar `location.reload()`. Registrar um único listener `hashchange`; o renderizador atualiza breadcrumb, `document.title` contextual e foco do título.

Uma rota válida não deve liberar módulo bloqueado: mostrar o módulo com estado bloqueado ou retornar ao último ponto válido, sem expor lição por URL. Back/forward deve re-renderizar corretamente. O `vercel.json` não muda essa regra.

## 5. Renderização e eventos

Separar funções puras de cálculo (`getModuleProgress`, `isModuleUnlocked`, `level`, `progressToNext`, `dateKey`, `parseRoute`, `validateContent`) das funções de view. A UI pode continuar usando template strings, mas deve escapar valores e manter um único ponto de renderização.

Preferir delegação de eventos no `#app` para evitar listeners acumulados a cada render. Alternativamente, `bind()` deve remover/substituir handlers antes de anexar. Eventos devem identificar `data-action`, `data-module`, `data-lesson`, `data-index` e validar tudo antes de usar.

Após render: focar `h1`/título; em ação de quiz, preservar posição quando apropriado; após avanço, anunciar resultado na região live. O reset usa confirmação nativa clara ou diálogo implementado em HTML, sem apagar estado antes da confirmação.

## 6. Fluxo de quiz

Ao selecionar opção, salvar índice e tentativa antes de renderizar. Se correta, chamar `lessonDone` idempotente e mostrar explicação. Se incorreta, manter `answers[id]`, mostrar `why`, incrementar tentativa e oferecer ação `retry` que limpa apenas a seleção da pergunta; não apagar conclusão, XP ou outras respostas. O botão de conclusão fica desabilitado somente enquanto a pergunta exigida não foi respondida corretamente.

Classes de cor devem vir acompanhadas de texto/ícone. O resultado precisa estar em `aria-live="polite"`; erro de storage em `role="alert"` ou equivalente curto. `parseInt` deve receber radix 10 e o índice deve ser validado contra `quiz.opts`.

## 7. Acessibilidade técnica

`index.html` deve conter skip link, `main` com nome, `nav` nomeado, `#app` como região de conteúdo e `#toast` live. O menu mobile alterna `aria-expanded`, controla sidebar e fecha por Escape. Botões têm texto ou `aria-label` preciso.

Tabs de código:

```html
<div role="tablist" aria-label="Formato do exemplo">
  <button role="tab" aria-selected="true" aria-controls="code-sql">SQL</button>
  <button role="tab" aria-selected="false" aria-controls="code-python">Python / SQLAlchemy</button>
</div>
<pre id="code-sql" role="tabpanel" tabindex="0">...</pre>
```

Adicionar navegação por setas sem remover Tab. O painel não selecionado usa `hidden`, não somente `display:none` inline. Links e botões devem ter foco `:focus-visible` de alto contraste e área de toque mínima de 44px.

## 8. CSS e design

Manter tokens atuais (`--bg`, `--panel`, `--line`, `--text`, `--muted`, `--cyan`, `--purple`, `--orange`, `--green`, `--pink`). Documentar uso por estado, não substituir a paleta por outra. Reformatar CSS para manutenção sem adicionar framework.

Requisitos: `max-width` de leitura; grid que colapsa em até 680px; sidebar drawer funcional; código com `overflow-x:auto`; texto mínimo 16px fora de metadados; foco visível; disabled legível; contraste mínimo WCAG AA como meta. Adicionar:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
```

## 9. Testes e comandos

Sem runner obrigatório, funções puras devem poder ser testadas em um navegador ou em um runner futuro sem dependência de DOM. Cobertura mínima futura:

- estado vazio, legado, JSON inválido e storage indisponível;
- `dateKey` em mudança de dia/fuso e streak em mesmo dia, dia seguinte e intervalo;
- XP, nível, percentual, conclusão idempotente e badges;
- conteúdo válido, IDs duplicados e quiz fora do intervalo;
- parser de rota, rota inválida e módulo bloqueado;
- retry correto/incorreto e preservação do progresso;
- escape de HTML.

Roteiro local:

```bat
python -m http.server 8000
```

Abrir `http://localhost:8000/`. Testar no console do navegador ausência de exceções, todas as rotas, refresh, back/forward, storage inválido (via DevTools), viewport 320px, teclado e reduced motion. Se Node estiver disponível: `node --check app.js` e `node --check content.js`.

## 10. Segurança e limites

Não usar `eval`, não executar código dos exemplos, não inserir conteúdo de quiz sem escape e não tratar localStorage como fonte confiável para certificado. Como não existe backend, a pessoa pode editar XP/badges; isso é aceitável para progresso casual e deve ser documentado. Não prometer sincronização ou persistência além do navegador.

## 11. Migração incremental

1. Ler o formato atual.
2. Normalizar para v2 em memória.
3. Salvar v2 apenas após operação bem-sucedida.
4. Se a gravação falhar, continuar em memória e alertar.
5. Nunca remover chaves antigas antes de confirmar que o novo estado foi escrito.

## 12. Critérios técnicos de aceite

- A SPA inicia mesmo com localStorage inválido ou indisponível.
- Estado existente mantém XP, lições, respostas e badges válidos.
- Uma lição não gera XP duas vezes.
- Rotas hash são reproduzíveis por URL, refresh e histórico.
- Renderização de texto/código não cria HTML interpretável vindo do conteúdo.
- Quiz incorreto permite nova tentativa sem perder explicação.
- Controles essenciais são semânticos, nomeados e operáveis por teclado.
- O layout não tem overflow horizontal indevido em 320px.
- Conteúdo inválido é detectado antes de quebrar o fluxo.
- Nenhuma dependência nova é introduzida.

## 13. Arquivos-alvo por responsabilidade

| Arquivo | Responsabilidade futura |
|---|---|
| `index.html` | Shell semântico, skip link, menu, live regions e montagem. |
| `app.js` | Store local, router hash, regras puras, views e eventos. |
| `content.js` | Catálogo editorial, lições, quizzes e badges. |
| `styles.css` | Tokens, layout, estados, responsividade e reduced motion. |
| `docs/content-structure.md` | Contrato editorial efetivo. |
| `docs/uiux-direction.md` | Direção visual alinhada ao shell existente. |
| `vercel.json` | Publicação estática; sem mudança de arquitetura. |

## 14. Decisões não implementadas nesta etapa

Este documento especifica, mas não implementa, router, migração v2, retry, escape, validador, novas lições ou alterações visuais. A implementação deve seguir as fases de `docs/implementation-plan.md` e atualizar `REVIEW.md` com evidência real.
