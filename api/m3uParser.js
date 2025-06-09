const fs = require('fs');
const path = require('path');
const m3uParser = require('iptv-playlist-parser');

function carregarPlaylistLocal() {
  try {
    const arquivo = path.join(__dirname, '..', 'data', 'iloveana_playlistm3u.txt');
    const dados = fs.readFileSync(arquivo, 'utf-8');
    const parsed = m3uParser.parse(dados);

    // Retorna array de canais com as propriedades básicas
    return parsed.items.map(item => ({
      name: item.name,
      url: item.url,
      logo: item.tvg.logo || '',
      group: item.group.title || 'Outros'
    }));
  } catch (error) {
    console.error('Erro ao carregar playlist local:', error.message);
    return [];
  }
}

module.exports = { carregarPlaylistLocal };