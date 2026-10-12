# Ferramentas de atualização da tradução

Pipeline para atualizar a tradução quando o inglês do sistema muda, traduzindo **só o que mudou**.
Node 18+, sem dependências. Rode a partir da raiz do módulo; os arquivos de trabalho ficam em `tools/_run/` (ignorado pelo git).

**Baseline atual:** a v2.0.0 foi gerada a partir do sistema no commit `af866ddf` (Vagabond 6.4.x, 2026-10-11).
Na próxima atualização, use esse commit como `<baseline>`.

## Passo a passo

```bash
SYS=D:/boilerplate-13/build/vagabond      # repositório do sistema
R=tools/_run

# 0. Inglês da época da última tradução
mkdir -p $R/old && git -C $SYS archive <baseline> packs/_source | tar -x -C $R/old

# 1. Diff: inglês antigo × inglês atual × pt-BR atual  → tabela por pack
node tools/diff.mjs $R/old/packs/_source $SYS/packs/_source translations $R/work

# 2. Tarefas: só as unidades que precisam de tradução
node tools/build.mjs tasks $R/work $R/tasks translations

# 3. Tradução (agentes) — cada um lê tools/AGENT_INSTRUCTIONS.md,
#    um arquivo de $R/tasks e escreve o mesmo nome em $R/out.
#    Arquivos grandes podem ser divididos em <pack>.part1.json, .part2.json…
# 3b. Validação
node tools/validate.mjs $R/tasks $R/out

# 4. Merge → arquivos completos
node tools/build.mjs merge $R/work $R/out translations $R/merged

# 5a. Renomeações de termos (edite RULES em sweep.mjs)
node tools/sweep.mjs $R/work $R/merged
cp $R/merged/*.json translations/

# 5b. Consistência com o glossário: relatório, depois correção
node tools/termcheck.mjs $R/work translations 3
node tools/fix-terms.mjs $R/work translations          # dry run
node tools/fix-terms.mjs $R/work translations --write
```

## O que cada etapa decide

- **diff.mjs** compara por `_id`: *inalterada* (mantém pt), *alterada* (envia EN antigo + EN novo + pt atual, o agente só ajusta a diferença), *nova*, *removida* (sai do JSON), *renomeada* (chave muda para o novo nome). Arrays (`traits`, `levelFeatures`, `actions`, `abilities`) são comparados por elemento; se o tamanho mudou, os elementos são pareados pelo nome e os iguais são reaproveitados.
- **Chaves**: nome em inglês; `_id` quando o nome se repete no pack (o Babele aceita os dois).
- **Campos** seguem `translations/mappings.json`. Campo novo no sistema = adicionar no mapping **e** em `ITEM_SCALARS`/`ACTOR_SCALARS`/`ARRAYS` de `diff.mjs`.
- **Modelos**: Sonnet para prosa de regras (classes, perks, spells, bestiário); Haiku para nomes, equipamento e listas.
- Termos novos que os agentes relatam (`NEW TERM:`) vão para `dictionary.json`.
