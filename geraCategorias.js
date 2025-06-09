const fs = require('fs');
const parser = require('iptv-playlist-parser');

// Lê o arquivo M3U
const playlist = fs.readFileSync('data/iloveana_playlistm3u.txt', 'utf8');
const parsed = parser.parse(playlist);

// Categorias definidas
const categorias = {
  FilmesSeries: [ /* todos os títulos da seção 'Filmes e Séries' aqui */ ],
  Doramas: [ /* todos os títulos da seção 'Doramas e Novelas' aqui */ ],
  Animes: [ /* todos os títulos da seção 'Animes' aqui */ ],
  Canais: [ /* todos os títulos da seção 'Canais' aqui, com ⚽ ESPORTES incluído */ ]
};

// Exemplo de preenchimento de um deles
categorias.FilmesSeries = [
  "⭐ AÇÃO", "⭐ COMÉDIA", "⭐ COMÉDIA ROMÂNTICA", "⭐ TERROR", "⭐ AVENTURA", "⭐ DRAMA",
  "⭐ SUSPENSE", "⭐ ROMANCE", "⭐ HISTORIA", "⭐ GUERRA", "⭐ CLÁSSICOS", "⭐ LANÇAMENTOS",
  "⭐ OSCAR 2025", "⭐ EM CARTAZ NOS CINEMAS", "⭐ TELECINE", "⭐ FICÇÃO CIENTIFICA",
  "⭐ MARVEL", "⭐ FAROESTE", "⭐ FILMES & SERIES", "⭐ 4K", "⭐ CINE SKY", "⭐ NETFLIX",
  "⭐ AMAZON PRIME", "⭐ DISCOVERY", "⭐ DISCOVERY +", "⭐ DISNEY+", "⭐ HBO MAX",
  "⭐ STAR+", "⭐ FICCÃO & FANTASIA", "⭐ PARAMOUNT+", "⭐ APPLE TV+", "⭐ HULU",
  "⭐ TV SHOW", "⭐ LIONSGATE+", "⭐ VIA PLAY", "⭐ CW", "⭐ LOOKE", "⭐ BBC ONE",
  "⭐ PLAYPLUS", "⭐ RUN TIME", "⭐ ABC", "⭐ MINI-SÉRIES", "⭐ YOUTUBE PREMIUM",
  "⭐ REALITY", "⭐ SUCESSOS DA TELEVISÃO", "⭐ SUSPENSE/ MISTÉRIO", "⭐ AMAZON PRIME VIDEO",
  "⭐ DIVERSOS", "⭐ DESTAQUES DA SEMANA", "⭐ LEGENDADOS", "⭐ NACIONAL", "⭐ RELIGIOSOS"
];

categorias.Doramas = [
  "⭐ DORAMAS", "⭐ NOVELAS TURCAS", "⭐ NOVELAS NACIONAIS", "⭐ DRAMABOX",
  "⭐ NOVELAS", "⏰ DORAMAS 24H", "⏰ TURCAS 24H", "⭐ CANAIS NOVELAS"
];

categorias.Animes = [
  "⭐ ANIMES", "⭐ ANIMAÇÃO/ INFANTIL", "⭐ INFANTIL", "⏰ ANIMES 24H"
];

categorias.Canais = [
  "⚽ SPORTV", "⚽ ESPN", "⚽ PREMIERE FC", "⚽ ELEVEN-DAZN", "⚽ MAX-TNT SPORTS",
  "⚽ ESPORTES", // novo grupo detectado
  "⭐ GLOBO CAPITAIS", "⭐ GLOBO SUDESTE", "⭐ GLOBO NORDESTE", "⭐ GLOBO SUL",
  "⭐ GLOBO NORTE", "⭐ GLOBO CENTRO-OESTE", "⭐ BAND", "⭐ RECORD", "⭐ SBT",
  "⭐ SBT+", "⭐ NOTICIAS", "⭐ PORTUGAL NOTICIAS", "⭐ AGRO NEGOCIOS", "⭐ VARIEDADES",
  "⭐ PESCA ESPORTIVA", "✊ COMBATE UFC", "⏰ SHOWS 24H", "⏰ SERIADOS 24H",
  "⏰ NOVELAS 24H"
];

// Saídas
const saidas = {
  todos: [],
  filmesSeries: [],
  doramas: [],
  animes: [],
  canais: []
};

// Processa cada item
parsed.items.forEach(item => {
  const entry = {
    name: item.name,
    url: item.url,
    logo: item.tvg.logo || '',
    group: item.group?.title || ''
  };

  saidas.todos.push(entry);

  if (categorias.FilmesSeries.includes(entry.group)) saidas.filmesSeries.push(entry);
  if (categorias.Doramas.includes(entry.group)) saidas.doramas.push(entry);
  if (categorias.Animes.includes(entry.group)) saidas.animes.push(entry);
  if (categorias.Canais.includes(entry.group)) saidas.canais.push(entry);
});

// Salva os arquivos JSON
fs.writeFileSync('todos.json', JSON.stringify(saidas.todos, null, 2));
fs.writeFileSync('filmesSeries.json', JSON.stringify(saidas.filmesSeries, null, 2));
fs.writeFileSync('doramas.json', JSON.stringify(saidas.doramas, null, 2));
fs.writeFileSync('animes.json', JSON.stringify(saidas.animes, null, 2));
fs.writeFileSync('canais.json', JSON.stringify(saidas.canais, null, 2));

console.log('Arquivos gerados com sucesso!');