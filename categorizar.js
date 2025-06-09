const fs = require('fs');
const path = require('path');

// Carrega o arquivo categorias.json
const categoriasJsonPath = path.join(__dirname, 'data', 'categorias.json');
const categoriasData = JSON.parse(fs.readFileSync(categoriasJsonPath, 'utf-8'));

// Extrai os nomes principais das categorias (filmes, series, doramas, canais)
const categoriasFixas = Object.keys(categoriasData).filter(key => key !== 'todos');

// Junta todos os nomes de grupos com suas respectivas categorias
const mapaCategorias = {};

for (const categoria of categoriasFixas) {
  const grupos = categoriasData[categoria];
  grupos.forEach(grupo => {
    mapaCategorias[grupo.toLowerCase()] = categoria;
  });
}

// Função para categorizar canais com base no campo "group"
function categorizarCanais(canais) {
  return canais.map(canal => {
    const grupo = canal.group ? canal.group.toLowerCase() : '';
    const categoria = mapaCategorias[grupo] || 'Outros';
    return { ...canal, categoria };
  });
}

// Agrupa os canais por categoria
function agruparPorCategoria(canais) {
  const grupos = {};
  categoriasFixas.forEach(cat => (grupos[cat] = []));
  grupos['Outros'] = [];

  canais.forEach(canal => {
    if (categoriasFixas.includes(canal.categoria)) {
      grupos[canal.categoria].push(canal);
    } else {
      grupos['Outros'].push(canal);
    }
  });

  return grupos;
}

module.exports = { categoriasFixas, categorizarCanais, agruparPorCategoria };