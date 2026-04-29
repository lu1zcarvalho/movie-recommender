const fs = require('fs');
const tf = require('@tensorflow/tfjs');
const { loadDataset } = require('./loadData');
const { METADATA_PATH, MODEL_JSON_PATH, WEIGHTS_PATH } = require('./trainModel');

let cachedModel = null;
let cachedMetadata = null;
let cachedDataset = null;

function clampRating(value) {
  return Math.max(0.5, Math.min(5, value));
}

function splitGenres(genres) {
  if (!genres || genres === '(no genres listed)') return [];
  return genres.split('|');
}

async function loadModel() {
  if (!fs.existsSync(METADATA_PATH) || !fs.existsSync(MODEL_JSON_PATH) || !fs.existsSync(WEIGHTS_PATH)) {
    throw new Error('Modelo nao treinado. Execute "npm run train" antes de iniciar a API.');
  }

  if (!cachedModel) {
    const modelJson = JSON.parse(fs.readFileSync(MODEL_JSON_PATH, 'utf8'));
    const weightsBuffer = fs.readFileSync(WEIGHTS_PATH);
    const weightData = weightsBuffer.buffer.slice(
      weightsBuffer.byteOffset,
      weightsBuffer.byteOffset + weightsBuffer.byteLength
    );

    cachedModel = await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: modelJson.modelTopology,
        weightSpecs: modelJson.weightSpecs,
        weightData
      })
    );
    cachedMetadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  }

  return { model: cachedModel, metadata: cachedMetadata };
}

async function getDataset() {
  if (!cachedDataset) {
    cachedDataset = await loadDataset();
  }

  return cachedDataset;
}

function buildGenrePreferences(userId, ratings, movieById) {
  const genreStats = new Map();
  const userRatings = ratings.filter(rating => rating.userId === userId);

  for (const rating of userRatings) {
    const movie = movieById.get(rating.movieId);
    if (!movie) continue;

    for (const genre of splitGenres(movie.genres)) {
      const current = genreStats.get(genre) || { total: 0, count: 0 };
      current.total += rating.rating - 3;
      current.count += 1;
      genreStats.set(genre, current);
    }
  }

  const preferences = new Map();
  for (const [genre, stats] of genreStats.entries()) {
    preferences.set(genre, stats.total / stats.count);
  }

  return preferences;
}

function genreBonus(movie, preferences) {
  const genres = splitGenres(movie.genres);
  if (genres.length === 0) return 0;

  const total = genres.reduce((sum, genre) => sum + (preferences.get(genre) || 0), 0);
  return total / genres.length;
}

async function predictRating(userId, movieId) {
  const { model, metadata } = await loadModel();

  const input = tf.tensor2d([[userId / metadata.maxUserId, movieId / metadata.maxMovieId]]);
  const prediction = model.predict(input);
  const value = (await prediction.data())[0];

  input.dispose();
  prediction.dispose();

  return clampRating(value);
}

async function recommendMovies(userId, limit = 10) {
  const { model, metadata } = await loadModel();
  const { ratings, movies } = await getDataset();

  const userRatings = ratings.filter(rating => rating.userId === userId);
  if (userRatings.length === 0) {
    throw new Error(`Usuario ${userId} nao existe no dataset. Use um userId entre 1 e 610.`);
  }

  const movieById = new Map(movies.map(movie => [movie.movieId, movie]));
  const preferences = buildGenrePreferences(userId, ratings, movieById);

  // Para tornar a lista util, removemos filmes que o usuario ja avaliou.
  const watchedMovieIds = new Set(userRatings.map(rating => rating.movieId));
  const candidateMovies = movies.filter(movie => !watchedMovieIds.has(movie.movieId));

  const inputs = candidateMovies.map(movie => [
    userId / metadata.maxUserId,
    movie.movieId / metadata.maxMovieId
  ]);

  const inputTensor = tf.tensor2d(inputs);
  const predictionTensor = model.predict(inputTensor);
  const predictedRatings = Array.from(await predictionTensor.data());

  inputTensor.dispose();
  predictionTensor.dispose();

  return candidateMovies
    .map((movie, index) => {
      const modelRating = clampRating(predictedRatings[index]);
      const personalizedScore = clampRating(modelRating + genreBonus(movie, preferences) * 0.35);

      return {
        movieId: movie.movieId,
        title: movie.title,
        genres: movie.genres,
        predictedRating: Number(modelRating.toFixed(2)),
        recommendationScore: Number(personalizedScore.toFixed(2))
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

module.exports = {
  getDataset,
  predictRating,
  recommendMovies
};
