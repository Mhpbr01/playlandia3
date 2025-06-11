// bot.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SENHAS_FILE = path.join(DATA_DIR, 'senhas.json');

function lerSenhas() {
  try {
    const dados = fs.readFileSync(SENHAS_FILE, 'utf-8');
    return JSON.parse(dados);
  } catch {
    return {};
  }
}

function salvarSenhas(dados) {
  try {
    fs.writeFileSync(SENHAS_FILE, JSON.stringify(dados, null, 2));
    return true;
  } catch {
    return false;
  }
}

function iniciarBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      '🤖 Olá! Use /add senha 7 para criar senha com 7 dias de validade\nUse /remove senha para remover\nUse /list para listar senhas\nUse /teste para gerar uma senha de teste válida por 4 horas'
    );
  });

  // Comando para adicionar senha com dias de validade (ex: /add senha123 7)
  bot.onText(/\/add (\S+) (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const novaSenha = match[1];
    const diasValidade = parseInt(match[2], 10);

    if (!novaSenha || !diasValidade || diasValidade <= 0) {
      return bot.sendMessage(chatId, 'Formato inválido. Use: /add senha 7');
    }

    let senhas = lerSenhas();
    if (senhas[novaSenha]) {
      return bot.sendMessage(chatId, 'Essa senha já existe.');
    }

    const validade = new Date();
    validade.setDate(validade.getDate() + diasValidade);

    senhas[novaSenha] = {
      emUso: false,
      ultimoUso: null,
      validade: validade.toISOString(),
    };

    if (salvarSenhas(senhas)) {
      bot.sendMessage(chatId, `✅ Senha "${novaSenha}" criada com validade até ${validade.toLocaleDateString()}`);
    } else {
      bot.sendMessage(chatId, '❌ Erro ao salvar a senha.');
    }
  });

  // Comando para remover senha (/remove senha123)
  bot.onText(/\/remove (\S+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const senhaRemover = match[1];

    let senhas = lerSenhas();

    if (!senhas[senhaRemover]) {
      return bot.sendMessage(chatId, 'Senha não encontrada.');
    }

    delete senhas[senhaRemover];

    if (salvarSenhas(senhas)) {
      bot.sendMessage(chatId, `✅ Senha "${senhaRemover}" removida.`);
    } else {
      bot.sendMessage(chatId, '❌ Erro ao remover a senha.');
    }
  });

  // Comando para listar senhas (/list)
  bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const senhas = lerSenhas();

    if (Object.keys(senhas).length === 0) {
      return bot.sendMessage(chatId, 'Nenhuma senha cadastrada.');
    }

    let texto = 'Senhas cadastradas:\n';
    for (const [senha, info] of Object.entries(senhas)) {
      texto += `• ${senha} - emUso: ${info.emUso ? 'Sim' : 'Não'} - Validade: ${info.validade ? new Date(info.validade).toLocaleDateString() : 'Indefinida'}\n`;
    }

    bot.sendMessage(chatId, texto);
  });

  // Comando /teste: cria senha de teste válida por 4 horas
  bot.onText(/^\/teste$/, (msg) => {
    const chatId = msg.chat.id;
    const senhaTeste = 'teste-' + Math.random().toString(36).substring(2, 8);
    const validade = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 horas

    const senhas = lerSenhas();
    senhas[senhaTeste] = {
      emUso: false,
      ultimoUso: null,
      validade
    };

    salvarSenhas(senhas);
    bot.sendMessage(chatId, `✅ Senha de teste criada:\n\n🔑 *${senhaTeste}*\n🕐 Válida por 4 horas\n📅 Expira: ${validade.replace('T', ' ').split('.')[0]}`, {
      parse_mode: 'Markdown'
    });
  });

  console.log('🤖 Bot Telegram iniciado');
  return bot;
}

module.exports = { iniciarBot };