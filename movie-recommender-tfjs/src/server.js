const path = require('path');
const express = require('express');
const { getDataset, recommendMovies } = require('./recommender');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/movies', async (req, res, next) => {
  try {
    const { movies } = await getDataset();
    res.json(movies);
  } catch (error) {
    next(error);
  }
});

app.get('/recommend/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Informe um userId numérico e positivo.' });
    }

    const recommendations = await recommendMovies(userId, 10);
    res.json({ userId, recommendations });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: error.message || 'Erro interno no servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
