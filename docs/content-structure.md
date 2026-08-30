# Estrutura de conteúdo do QueryQuest

O conteúdo está em `content.js`, exportando `modules` e `badges`. A interface em `app.js` consome essa estrutura sem conhecer textos específicos.

## Como adicionar uma lição

Inclua um objeto em `modules[].lessons[]` com:

- `id`: identificador único;
- `title`, `tag`, `time`, `intro`;
- `code` e `py`: exemplos SQL e SQLAlchemy;
- `xp`: recompensa;
- `quiz`: `q`, `opts`, `answer` e `why`.

## Como adicionar um módulo

Adicione um objeto ao array `modules` com `id`, `icon`, `color`, `title`, `subtitle`, `desc` e `lessons`. O mapa desbloqueia os módulos em sequência quando todas as lições do módulo anterior estão concluídas.

## Persistência

O progresso é salvo no `localStorage` com a chave `queryquest-progress`. Não há backend, conta ou banco real. O botão “Reiniciar progresso” apaga o estado local.

## Base didática

A trilha parte de `Tarefa` e `ComentarioTarefa` no controller, do mapeamento de tarefas/comentários no model e das consultas `select`, `where`, `scalars` e `scalar_one_or_none` presentes em `main.py`.
