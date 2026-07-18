// Macro "Atualizar para pt-BR"
// Cole este código em uma Macro do tipo Script no Foundry e execute como Mestre.
//
// Fase 1: percorre todos os Atores do mundo e atualiza seus Itens incorporados
// (armas, magias, perícias, ancestralidade, classe, etc.) para a tradução
// pt-BR, sempre que houver correspondência EXATA com um item dos compêndios
// oficiais traduzidos por este módulo.
//
// Fase 2: percorre os Itens soltos no diretório de Itens do mundo (não
// vinculados a nenhuma ficha) e aplica a mesma lógica de tradução exata.
//
// Itens homebrew (sem correspondência nos compêndios) e correspondências
// ambíguas/aproximadas NÃO são alterados automaticamente. As ambíguas ficam
// de fora da contagem e podem ser revisadas manualmente pelo botão de
// tradução no cabeçalho da ficha do ator.

if (!game.user.isGM) {
  ui.notifications.warn("Apenas o Mestre pode executar esta macro.");
  return;
}

if (!game.babele) {
  ui.notifications.error("O módulo Babele não está ativo.");
  return;
}

const confirmed = await foundry.applications.api.DialogV2.confirm({
  window: {title: "Atualizar para pt-BR"},
  content: `
    <p>Isso vai atualizar para pt-BR os itens incorporados de <strong>todos os
    atores do mundo</strong> (personagens e NPCs), além dos <strong>itens
    soltos no diretório de Itens</strong>, sempre que houver correspondência
    exata com um item dos compêndios oficiais.</p>
    <p><strong>Itens homebrew ou sem correspondência exata não serão
    alterados.</strong></p>
    <p style="color:#c0392b"><strong>Esta ação não pode ser desfeita.</strong>
    Recomenda-se fazer um backup do mundo antes de continuar.</p>
  `,
  rejectClose: false,
  modal: true,
});

if (!confirmed) {
  return;
}

ui.notifications.info("Atualizando para pt-BR, aguarde...");

function lookupSourceFor(source) {
  const originalName = source?.flags?.babele?.originalName ?? source?.originalName;
  if (!originalName || source.name === originalName) {
    return source;
  }
  return {...source, name: originalName};
}

async function translateStandaloneItem(item) {
  const source = item.toObject();
  const lookupSource = lookupSourceFor(source);

  const pack = game.babele.translatedPackFor("Item", lookupSource);
  if (!pack) {
    return "untouched";
  }

  const translatedData = pack.translate(lookupSource, true);
  if (!translatedData || Object.keys(translatedData).length === 0) {
    return "untouched";
  }

  const translatedDocument = foundry.utils.mergeObject(source, translatedData, {inplace: false});
  if (JSON.stringify(source) === JSON.stringify(translatedDocument)) {
    return "untouched";
  }

  const update = foundry.utils.mergeObject(translatedData, {
    _id: item.id,
    originalName: lookupSource.name,
    hasTranslation: true,
    translated: true,
    flags: {
      babele: {
        hasTranslation: true,
        translated: true,
        originalName: lookupSource.name,
        lang: game.settings.get("core", "language"),
      },
    },
  });

  await item.update(update);
  return "updated";
}

// Fase 1 — itens incorporados nas fichas dos atores
let actorsUpdated = 0;
let sheetItemsUpdated = 0;
let sheetItemsNeedingReview = 0;
let sheetItemsUntouched = 0;

for (const actor of game.actors) {
  if (!actor.items?.size) {
    continue;
  }

  let proposal;
  try {
    proposal = await game.babele.proposeActorTranslation(actor);
  } catch (error) {
    console.error(`Babele pt-BR | Falha ao analisar o ator "${actor.name}":`, error);
    continue;
  }

  const applicable = proposal.entries.filter((entry) => entry.applicable() && !entry.reviewRequired());
  const needingReview = proposal.entries.filter((entry) => entry.applicable() && entry.reviewRequired());

  sheetItemsNeedingReview += needingReview.length;
  sheetItemsUntouched += proposal.entries.length - applicable.length - needingReview.length;

  if (applicable.length === 0) {
    continue;
  }

  await proposal.apply({entries: applicable});
  actorsUpdated += 1;
  sheetItemsUpdated += applicable.length;
}

// Fase 2 — itens soltos no diretório de Itens (não vinculados a nenhuma ficha)
let worldItemsUpdated = 0;
let worldItemsUntouched = 0;

for (const item of game.items) {
  let result;
  try {
    result = await translateStandaloneItem(item);
  } catch (error) {
    console.error(`Babele pt-BR | Falha ao traduzir o item solto "${item.name}":`, error);
    continue;
  }

  if (result === "updated") {
    worldItemsUpdated += 1;
  } else {
    worldItemsUntouched += 1;
  }
}

ui.notifications.info(
  `Atualização concluída: ${sheetItemsUpdated} itens traduzidos em ${actorsUpdated} atores, `
  + `${worldItemsUpdated} itens soltos traduzidos. `
  + `${sheetItemsNeedingReview} itens de fichas precisam de revisão manual. `
  + `${sheetItemsUntouched + worldItemsUntouched} itens não foram alterados (já traduzidos ou homebrew).`,
);

if (sheetItemsNeedingReview > 0) {
  ui.notifications.warn(
    `${sheetItemsNeedingReview} itens de fichas precisam de revisão manual. `
    + `Use o botão de tradução no cabeçalho da ficha de cada ator para revisar.`,
  );
}
