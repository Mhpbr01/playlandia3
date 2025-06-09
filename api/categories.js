const categoriasFixas = ['Filmes', 'Séries', 'Doramas', 'Canais'];
const mapaCategorias = require('../data/categorias.json'); // ✅ usa seu mapeamento real

/**
 * Categoriza canais com base no group-title e categorias.json
 */
function categorizarCanais(canais) {
  return canais.map(canal => {
    const grupoOriginal = canal.group || '';
    let categoria = 'Outros';

    if (mapaCategorias.filmes.includes(grupoOriginal)) categoria = 'Filmes';
    else if (mapaCategorias.series.includes(grupoOriginal)) categoria = 'Séries';
    else if (mapaCategorias.doramas.includes(grupoOriginal)) categoria = 'Doramas';
    else if (mapaCategorias.canais.includes(grupoOriginal)) categoria = 'Canais';

    return { ...canal, categoria };
  });
}

/**
 * Agrupa canais por suas categorias
 */
function agruparPorCategoria(canais) {
  const grupos = {};
  categoriasFixas.forEach(cat => (grupos[cat] = []));
  grupos['Outros'] = [];

  canais.forEach(canal => {
    if (categoriasFixas.includes(canal.categoria)) grupos[canal.categoria].push(canal);
    else grupos['Outros'].push(canal);
  });

  return grupos;
}

module.exports = { categoriasFixas, categorizarCanais, agruparPorCategoria };