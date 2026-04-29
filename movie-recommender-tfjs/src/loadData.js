const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RATINGS_PATH = path.join(DATA_DIR, 'ratings.csv');
const MOVIES_PATH = path.join(DATA_DIR, 'movies.csv');

function ensureDatasetFiles() {
  const missingFiles = [];

  if (!fs.existsSync(RATINGS_PATH)) missingFiles.push('data/ratings.csv');
  if (!fs.existsSync(MOVIES_PATH)) missingFiles.push('data/movies.csv');

  if (missingFiles.length > 0) {
    throw new Error(
      `Arquivos do dataset não encontrados: ${missingFiles.join(', ')}.\n` +
        'Execute "npm run download" ou baixe o MovieLens Latest Small manualmente.'
    );
  }
}

function readCsv(filePath, mapRow) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(mapRow(row)))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function loadRatings() {
  ensureDatasetFiles();

  return readCsv(RATINGS_PATH, row => ({
    userId: Number(row.userId),
    movieId: Number(row.movieId),
    rating: Number(row.rating),
    timestamp: Number(row.timestamp)
  }));
}

async function loadMovies() {
  ensureDatasetFiles();

  return readCsv(MOVIES_PATH, row => ({
    movieId: Number(row.movieId),
    title: row.title,
    genres: row.genres
  }));
}

async function loadDataset() {
  const [ratings, movies] = await Promise.all([loadRatings(), loadMovies()]);
  return { ratings, movies };
}

module.exports = {
  DATA_DIR,
  RATINGS_PATH,
  MOVIES_PATH,
  loadRatings,
  loadMovies,
  loadDataset
};
