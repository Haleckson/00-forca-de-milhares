console.log("O teste funciona")
// scripts/init.js
Hooks.once("ready", async () => {
  if (!game.user.isGM) return;

  const MODULE_ID = "00-forca-de-milhares";

  // Mapeamento packName -> { type, folderName }
  const folderMap = {
    "atores-adversarios": { type: "Actor", folderName: "00 - Força de Milhares / Atores" },
    "atores-npcs": { type: "Actor", folderName: "00 - Força de Milhares / Atores" },
    "atores-npcs-jornais": { type: "JournalEntry", folderName: "00 - Força de Milhares / Notas" },
    "atores-npcs-macros": { type: "Macro", folderName: "00 - Força de Milhares / Atores" },
    "itens-arsenal": { type: "Item", folderName: "00 - Força de Milhares / Itens" },
    "itens-consumiveis": { type: "Item", folderName: "00 - Força de Milhares / Itens" },
    "itens-diversos": { type: "Item", folderName: "00 - Força de Milhares / Itens" },
    "itens-loot-da-campanha": { type: "Item", folderName: "00 - Força de Milhares / Itens" },
    "magias-feiticos": { type: "Item", folderName: "00 - Força de Milhares / Magias" },
    "magias-efeitos-de-feiticos": { type: "Item", folderName: "00 - Força de Milhares / Magias" },
    "feats-talentos-e-acoes": { type: "Item", folderName: "00 - Força de Milhares / Talentos e Ações" },
    "feats-talentos-homebrew": { type: "Item", folderName: "00 - Força de Milhares / Talentos e Ações" },
    "mapas-cenas": { type: "Scene", folderName: "00 - Força de Milhares / Mapas" },
    "mapas-notas": { type: "JournalEntry", folderName: "00 - Força de Milhares / Mapas" },
    "mapas-macros": { type: "Macro", folderName: "00 - Força de Milhares / Mapas" },
    "notas-diversas": { type: "JournalEntry", folderName: "00 - Força de Milhares / Notas" },
    "musicas-sons": { type: "Playlist", folderName: "00 - Força de Milhares / Músicas e Sons" }
  };

  // Cria/retorna pasta por tipo e nome
  async function ensureFolder(type, name) {
    const existing = game.folders.find(f => f.type === type && f.name === name);
    if (existing) return existing;
    return Folder.create({ name, type });
  }

  // Cria todas as pastas necessárias e guarda por nome
  const created = {};
  for (const key of Object.keys(folderMap)) {
    const { type, folderName } = folderMap[key];
    if (!created[folderName]) created[folderName] = await ensureFolder(type, folderName);
  }

  // Checa existência por nome dentro da pasta (evita duplicatas)
  function existsInFolder(type, folderId, name) {
    if (type === "Actor") return game.actors.some(a => a.name === name && a.folder?.id === folderId);
    if (type === "Item") return game.items.some(i => i.name === name && i.folder?.id === folderId);
    if (type === "Scene") return game.scenes.some(s => s.name === name && s.folder?.id === folderId);
    if (type === "JournalEntry") return game.journal.some(j => j.name === name && j.folder?.id === folderId);
    if (type === "Playlist") return game.playlists.some(p => p.name === name && p.folder?.id === folderId);
    if (type === "Macro") return game.macros.some(m => m.name === name && m.folder?.id === folderId);
    return false;
  }

  // Percorre os compêndios do jogo e importa apenas os do módulo atual
  for (const pack of game.packs) {
    if (!pack.metadata) continue;
    // pack.metadata.package ou pack.metadata.packageId pode variar; checamos package e name
    const belongsToModule = pack.metadata.package === MODULE_ID || pack.metadata.package === undefined && pack.metadata.name && pack.metadata.name.startsWith(MODULE_ID);
    // Também aceitamos packs cujo metadata.name esteja no folderMap
    if (!folderMap[pack.metadata.name]) continue;

    const map = folderMap[pack.metadata.name];
    const folder = created[map.folderName];
    if (!folder) continue;

    const docs = await pack.getDocuments();
    docs.sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));

    for (const doc of docs) {
      if (existsInFolder(map.type, folder.id, doc.name)) continue;

      const createData = duplicate(doc.toObject());
      delete createData._id;
      createData.folder = folder.id;

      try {
        if (map.type === "Item") await Item.create(createData);
        else if (map.type === "Actor") await Actor.create(createData);
        else if (map.type === "Scene") await Scene.create(createData);
        else if (map.type === "JournalEntry") await JournalEntry.create(createData);
        else if (map.type === "Playlist") await Playlist.create(createData);
        else if (map.type === "Macro") await Macro.create(createData);
      } catch (err) {
        console.error("Erro ao importar", pack.metadata.name, doc.name, err);
      }
    }
  }

  ui.notifications.info("Importação de compêndios concluída.");
});
