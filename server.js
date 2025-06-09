const express = require('express');
const fs = require('fs');
const path = require('path');
const m3uParser = require('iptv-playlist-parser');
const criarRotasApi = require('./api/routes');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const {
  categoriasFixas,
  categorizarCanais,
  agruparPorCategoria,
} = require('./categorizar');

const app = express();
const PORT = process.env.PORT || 3000;

const SENHAS_FILE = path.join(__dirname, 'data', 'senhas.json');

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let canais = [];

function lerJson(caminho) {
  return fs.existsSync(caminho)
    ? JSON.parse(fs.readFileSync(caminho, 'utf-8'))
    : {};
}

function salvarJson(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

function liberarSenhasExpiradas() {
  const senhas = lerJson(SENHAS_FILE);
  const agora = Date.now();
  let alterado = false;

  for (const senha in senhas) {
    const info = senhas[senha];
    if (
      info.emUso &&
      info.ultimoUso &&
      (agora - new Date(info.ultimoUso).getTime()) > 86400000
    ) {
      senhas[senha].emUso = false;
      senhas[senha].ultimoUso = null;
      alterado = true;
    }
  }

  if (alterado) salvarJson(SENHAS_FILE, senhas);
}

// CORRIGIDO: Middleware de autenticação com exceções bem definidas
app.use((req, res, next) => {
  liberarSenhasExpiradas();

  const senha = req.cookies?.acesso;
  const senhas = lerJson(SENHAS_FILE);

  const caminhosPermitidos = [
    '/login',
    '/logout',
    '/api/validar-senha',
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

  if (isPermitido) {
    return next();
  }

  if (!senha || !senhas[senha] || !senhas[senha].emUso) {
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
  const senhas = lerJson(SENHAS_FILE);

  if (!senhas[senha]) {
    return res.status(401).json({ sucesso: false, mensagem: 'Senha inválida' });
  }

  if (senhas[senha].emUso) {
    return res.status(403).json({ sucesso: false, mensagem: 'Usuário já conectado com essa senha' });
  }

  senhas[senha].emUso = true;
  senhas[senha].ultimoUso = new Date().toISOString();
  salvarJson(SENHAS_FILE, senhas);

  res.cookie('acesso', senha, {
    maxAge: 2592000000,
    httpOnly: true,
  });

  res.json({ sucesso: true });
});

app.post('/logout', (req, res) => {
  const senha = req.cookies?.acesso;
  const senhas = lerJson(SENHAS_FILE);

  if (senha && senhas[senha]) {
    senhas[senha].emUso = false;
    senhas[senha].ultimoUso = null;
    salvarJson(SENHAS_FILE, senhas);
  }

  res.clearCookie('acesso');
  res.json({ sucesso: true, mensagem: 'Logout efetuado com sucesso' });
});

app.get('/logout', (req, res) => {
  const senha = req.cookies?.acesso;
  const senhas = lerJson(SENHAS_FILE);

  if (senha && senhas[senha]) {
    senhas[senha].emUso = false;
    senhas[senha].ultimoUso = null;
    salvarJson(SENHAS_FILE, senhas);
  }

  res.clearCookie('acesso');
  res.redirect('/login');
});

function carregarLista() {
  return new Promise((resolve, reject) => {
    try {
      const arquivo = path.join(__dirname, 'data', 'iloveana_playlistm3u.txt');
      const dados = fs.readFileSync(arquivo, 'utf-8');
      const parsed = m3uParser.parse(dados);

      canais = parsed.items.map(item => ({
        name: item.name,
        url: item.url,
        logo: item.tvg.logo || '',
        group: item.group.title || 'Outros',
      }));

      canais = categorizarCanais(canais);

      console.log(`✅ Lista carregada com ${canais.length} itens.`);
      resolve();
    } catch (err) {
      console.error('❌ Erro ao carregar a lista:', err.message);
      reject(err);
    }
  });
}

app.use('/api', criarRotasApi(() => canais));

app.get('/', async (req, res) => {
  if (!canais.length) await carregarLista();

  const grupos = agruparPorCategoria(canais);

  res.render('index', {
    grupos,
    categorias: Object.keys(grupos).filter(c => c !== 'Outros'),
  });
});

app.get('/categoria/:nome', async (req, res) => {
  if (!canais.length) await carregarLista();

  const categoria = req.params.nome;
  const canaisFiltrados = canais.filter(
    c => c.categoria.toLowerCase() === categoria.toLowerCase()
  );

  res.render('categoria', {
    categoria,
    canais: canaisFiltrados,
  });
});

app.get('/serie/:nome', async (req, res) => {
  if (!canais.length) await carregarLista();

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
    response.data.pipe(res);
  } catch (error) {
    console.error('Erro no proxy:', error.message);
    res.status(500).send('Erro ao buscar o vídeo pelo proxy');
  }
});

carregarLista().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
});