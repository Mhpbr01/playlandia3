const express = require('express');
const { categorizarCanais, agruparPorCategoria, categoriasFixas } = require('./categories');
const { carregarPlaylistLocal } = require('./m3uParser'); // 🔁 ADICIONAR

function criarRotasApi() {
  const router = express.Router();

  router.get('/canais', (req, res) => {
    const canaisRaw = carregarPlaylistLocal(); // 🔁 USANDO AQUI
    const canais = categorizarCanais(canaisRaw);
    const grupos = agruparPorCategoria(canais);
    res.json({ grupos, categorias: categoriasFixas });
  });

  router.get('/canais/categoria/:nome', (req, res) => {
    const nome = req.params.nome.toLowerCase();
    const canaisRaw = carregarPlaylistLocal(); // 🔁 USANDO AQUI
    const canais = categorizarCanais(canaisRaw);
    const filtrados = canais.filter(c => c.categoria.toLowerCase() === nome);
    res.json(filtrados);
  });

  return router;
}

module.exports = criarRotasApi;