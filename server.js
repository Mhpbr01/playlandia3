const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const compression = require('compression'); // gzip compression

const criarRotasApi = require('./api/routes');
const {
  categoriasFixas,
  categorizarCanais,
  agruparPorCategoria,
} = require('./categorizar');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const SENHAS_FILE = path.join(DATA_DIR, 'senhas.json');
const ARQUIVOS_JSON = {
  'Canais': 'canais.json',
  'Filmes e Séries': 'filmesSeries.json',
  'Doramas e Novelas': 'doramas.json',
  'Animes': 'animes.json',
};

// Middleware gzip para compressão HTTP, reduz consumo de banda e acelera resposta
app.use(compression());

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d', // cache por 7 dias no navegador
  setHeaders: (res, filePath) => {
    // Força cache apenas para arquivos estáticos, evita HTML
    if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let canais = [];
// Cache para senhas com TTL
let cacheSenhas = null;
let cacheSenhasTimestamp = 0;
const CACHE_SENHAS_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Cache dos JSONs carregados + timestamps para reload automático
const cacheJsonFiles = {};
const cacheJsonTimestamps = {};

// Função para carregar JSON com cache e reload automático se arquivo for modificado
function lerJsonComCache(caminho) {
  try {
    const stats = fs.statSync(caminho);
    const mtime = stats.mtimeMs;

    if (
      !cacheJsonFiles[caminho] ||
      !cacheJsonTimestamps[caminho] ||
      cacheJsonTimestamps[caminho] < mtime
    ) {
      // Arquivo novo/modificado -> recarregar
      const dataRaw = fs.readFileSync(caminho, 'utf-8');
      cacheJsonFiles[caminho] = JSON.parse(dataRaw);
      cacheJsonTimestamps[caminho] = mtime;
      //console.log(`🔄 Cache recarregado: ${path.basename(caminho)}`);
    }

    return cacheJsonFiles[caminho];
  } catch (err) {
    console.error(`❌ Erro ao ler ${caminho}:`, err.message);
    return [];
  }
}

// Função para salvar JSON em arquivo e atualizar cache local
function salvarJsonComCache(caminho, dados) {
  try {
    fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
    cacheJsonFiles[caminho] = dados;
    cacheJsonTimestamps[caminho] = Date.now();
  } catch (err) {
    console.error(`❌ Erro ao salvar ${caminho}:`, err.message);
  }
}

// Função para liberar senhas expiradas, com cache de senhas em memória para evitar leituras repetidas
function liberarSenhasExpiradas() {
  const agora = Date.now();

  // Recarrega cache se TTL expirou
  if (!cacheSenhas || Date.now() - cacheSenhasTimestamp > CACHE_SENHAS_TTL_MS) {
    cacheSenhas = lerJsonComCache(SENHAS_FILE);
    cacheSenhasTimestamp = Date.now();
  }

  let alterado = false;

  for (const senha in cacheSenhas) {
    const info = cacheSenhas[senha];
    if (
      info.emUso &&
      info.ultimoUso &&
      (agora - new Date(info.ultimoUso).getTime()) > 86400000
    ) {
      cacheSenhas[senha].emUso = false;
      cacheSenhas[senha].ultimoUso = null;
      alterado = true;
    }
  }

  if (alterado) {
    salvarJsonComCache(SENHAS_FILE, cacheSenhas);
  }
}

// Middleware para autenticação com cache e sem leituras repetidas
app.use((req, res, next) => {
  liberarSenhasExpiradas();

  // Evita ler senhas JSON toda vez
  const senha = req.cookies?.acesso;

  // Permite acesso a rotas públicas
  const caminhosPermitidos = [
    '/login', '/logout', '/api/validar-senha'
  ];

  const isPermitido =
    caminhosPermitidos.includes(req.path) ||
    req.path.startsWith('/public') ||
    req.path.startsWith('/api/') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.jpg') ||
    req.path.endsWith('.ico');

  if (isPermitido) return next();

  if (
    !senha ||
    !cacheSenhas ||
    !cacheSenhas[senha] ||
    !cacheSenhas[senha].emUso
  ) {
    return res.redirect('/login');
  }

  next();
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'senha.html'));
});

app.post('/api/validar-senha', (req, res) => {
  liberarSenhasExpiradas();

  const { senha } = req.body;

  // Recarrega cache senhas para evitar usar dados muito antigos
  cacheSenhas = lerJsonComCache(SENHAS_FILE);
  cacheSenhasTimestamp = Date.now();

  if (!cacheSenhas[senha]) {
    return res.status(401).json({ sucesso: false, mensagem: 'Senha inválida' });
  }

  if (cacheSenhas[senha].emUso) {
    return res.status(403).json({ sucesso: false, mensagem: 'Usuário já conectado com essa senha' });
  }

  cacheSenhas[senha].emUso = true;
  cacheSenhas[senha].ultimoUso = new Date().toISOString();

  salvarJsonComCache(SENHAS_FILE, cacheSenhas);

  res.cookie('acesso', senha, {
    maxAge: 2592000000, // 30 dias
    httpOnly: true,
  });

  res.json({ sucesso: true });
});

function logoutUsuario(req, res, redirect = false) {
  const senha = req.cookies?.acesso;

  if (senha && cacheSenhas && cacheSenhas[senha]) {
    cacheSenhas[senha].emUso = false;
    cacheSenhas[senha].ultimoUso = null;
    salvarJsonComCache(SENHAS_FILE, cacheSenhas);
  }

  res.clearCookie('acesso');

  if (redirect) {
    res.redirect('/login');
  } else {
    res.json({ sucesso: true, mensagem: 'Logout efetuado com sucesso' });
  }
}

app.post('/logout', (req, res) => logoutUsuario(req, res, false));
app.get('/logout', (req, res) => logoutUsuario(req, res, true));

function carregarDadosJson() {
  canais = [];

  for (const [categoria, nomeArquivo] of Object.entries(ARQUIVOS_JSON)) {
    const caminho = path.join(DATA_DIR, nomeArquivo);
    const dados = lerJsonComCache(caminho);

    if (Array.isArray(dados)) {
      const categorizados = categorizarCanais(dados).map(c => ({
        ...c,
        categoria,
      }));
      canais.push(...categorizados);
      console.log(`✅ ${categoria} carregados: ${dados.length} itens`);
    } else {
      console.warn(`⚠️ Arquivo inválido ou vazio: ${nomeArquivo}`);
    }
  }
}

// Carrega dados JSON uma única vez (cache já gerencia atualizações do arquivo)
carregarDadosJson();

// Rota API usa função para obter dados atualizados do cache
app.use('/api', criarRotasApi(() => canais));

app.get('/', (req, res) => {
  const grupos = agruparPorCategoria(canais);
  res.render('index', {
    grupos,
    categorias: Object.keys(grupos).filter(c => c !== 'Outros'),
  });
});

app.get('/categoria/:nome', (req, res) => {
  const categoria = req.params.nome.toLowerCase();
  const canaisFiltrados = canais.filter(
    c => c.categoria?.toLowerCase() === categoria
  );

  res.render('categoria', {
    categoria: req.params.nome,
    canais: canaisFiltrados,
  });
});

app.get('/serie/:nome', (req, res) => {
  const nomeSerie = req.params.nome.toLowerCase();
  const episodios = canais.filter(c =>
    c.name.toLowerCase().includes(nomeSerie)
  );

  const temporadas = {};
  episodios.forEach(ep => {
    const tempMatch =
      ep.name.match(/T(?:emp)?[ ._-]?(\d+)/i) || ep.name.match(/S(\d+)/i);
    const numTemp = tempMatch ? parseInt(tempMatch[1]) : 1;

    if (!temporadas[numTemp]) temporadas[numTemp] = [];
    temporadas[numTemp].push(ep);
  });

  res.render('serie', {
    serie: req.params.nome,
    temporadas,
  });
});

// Proxy já usa stream (ótimo)
app.get('/proxy', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('URL não fornecida');

  try {
    const response = await axios.get(videoUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; XTVUltra/1.0.0) AppleWebKit/537.36 (KHTML, like Gecko) IPTV',
        Referer: videoUrl,
        Origin: 'http://localhost',
      },
    });

    res.setHeader(
      'Content-Type',
      response.headers['content-type'] || 'application/octet-stream'
    );
    response.setHeader('Cache-Control', 'public, max-age=3600'); // cache browser 1h
    response.setHeader('Content-Encoding', 'identity'); // evita duplicação de gzip se proxy já comprimido

    response.data.pipe(res);
  } catch (error) {
    console.error('Erro no proxy:', error.message);
    res.status(500).send('Erro ao buscar o vídeo pelo proxy');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});