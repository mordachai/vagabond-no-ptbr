# Vagabond: Brazilian Portuguese / Português do Brasil

## Vagabond: pt-BR Translation

Unofficial (pt-BR) translation of compendium content for the [Vagabond](https://foundryvtt.com/) system for Foundry VTT, via [Babele](https://github.com/riccisi/foundryvtt-babele).

### Using this on an already-running world

Installing this module translates compendium **browsing** immediately. But if your campaign already has Actors and Items imported from before you installed the module, that existing content keeps its original English text — Babele only translates on browse/import, not retroactively.

To bring existing content up to date, this repo ships a macro: [`macros/atualizar-para-ptbr.js`](macros/atualizar-para-ptbr.js). In Foundry, create a new Script macro, paste its contents, and run it as GM. It:

- Shows a confirmation dialog first — **this action cannot be undone**, back up your world before running it.
- Updates items embedded on every actor's sheet (weapons, spells, ancestry, class, perks, etc.), and every standalone Item sitting in the Items directory, whenever there's an **exact match** in the translated compendiums.
- Leaves homebrew items/actors and anything without an exact match completely untouched.
- Flags ambiguous matches for manual review instead of guessing — use the translate button in an actor sheet's header to resolve those one at a time.

### Requirements

- **Vagabond** system installed
- **Babele** module installed and active

### Installation

Use manifest below in Foundry (Add-on Modules → Install Module):

```text
https://github.com/mordachai/vagabond-no-ptbr/releases/latest/download/module.json
```

### Translated content

All system compendiums: ancestries, classes, skills/perks, spells, items (weapons, armor, equipment, alchemical, relics, starter packs), humanoids, and full bestiary (297 creatures).

### Credits

Translation by Gus ([@mordachai](https://github.com/mordachai)), with the help of Claude Sonnet 5 (Anthropic).

Suggestions and corrections welcome — open an [issue](https://github.com/mordachai/vagabond-no-ptbr/issues).

---

## Vagabond: Tradução pt-BR

Tradução não oficial (pt-BR) do conteúdo de compêndios do sistema [Vagabond](https://foundryvtt.com/) para Foundry VTT, via [Babele](https://github.com/riccisi/foundryvtt-babele).

### Usando isso em um mundo já em andamento

Instalar este módulo traduz a **navegação** pelos compêndios imediatamente. Mas se sua campanha já tem Atores e Itens importados de antes da instalação do módulo, esse conteúdo existente mantém o texto original em inglês — o Babele só traduz na navegação/importação, não retroativamente.

Para atualizar o conteúdo já existente, este repositório traz uma macro: [`macros/atualizar-para-ptbr.js`](macros/atualizar-para-ptbr.js). No Foundry, crie uma nova Macro do tipo Script, cole o conteúdo do arquivo e execute como Mestre. Ela:

- Mostra um diálogo de confirmação antes de rodar — **essa ação não pode ser desfeita**, faça um backup do mundo antes de executar.
- Atualiza os itens incorporados na ficha de cada ator (armas, magias, ancestralidade, classe, perícias/perks etc.), além de todo item solto no diretório de Itens, sempre que houver **correspondência exata** nos compêndios traduzidos.
- Não altera itens/atores homebrew nem nada sem correspondência exata.
- Marca correspondências ambíguas para revisão manual em vez de arriscar um chute — use o botão de tradução no cabeçalho da ficha do ator para resolver essas uma a uma.

### Requisitos

- Sistema **Vagabond** instalado
- Módulo **Babele** instalado e ativo

### Instalação

Use o manifest abaixo no Foundry (Add-on Modules → Install Module):

```text
https://github.com/mordachai/vagabond-no-ptbr/releases/latest/download/module.json
```

### Conteúdo traduzido

Todos os compêndios do sistema: ancestralidades, classes, perícias/perks, magias, itens (armas, armaduras, equipamentos, alquímicos, relíquias, pacotes iniciais), humanoides e bestiário completo (297 criaturas).

### Créditos

Tradução por Gus ([@mordachai](https://github.com/mordachai)), com auxílio do Claude Sonnet 5 (Anthropic).

Sugestões e correções são bem-vindas — abra uma [issue](https://github.com/mordachai/vagabond-no-ptbr/issues).
