function agruparSeriesPorBaseName(canais) {
  const agrupadas = {};

  canais.forEach(canal => {
    const nomeBase = canal.baseName;

    if (!agrupadas[nomeBase]) {
      agrupadas[nomeBase] = {
        titulo: nomeBase,
        logo: canal.logo,
        grupo: canal.group,
        episodios: []
      };
    }

    agrupadas[nomeBase].episodios.push({
      titulo: canal.name,
      url: canal.url
    });
  });

  // Retorna como array ordenado por nome da série
  return Object.values(agrupadas).sort((a, b) => a.titulo.localeCompare(b.titulo));
}

module.exports = { agruparSeriesPorBaseName };