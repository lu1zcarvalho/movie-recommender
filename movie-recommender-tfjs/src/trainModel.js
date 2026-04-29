const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');
const { loadDataset } = require('./loadData');

const MODEL_DIR = path.join(__dirname, '..', 'model');
const METADATA_PATH = path.join(MODEL_DIR, 'metadata.json');
const MODEL_JSON_PATH = path.join(MODEL_DIR, 'model.json');
const WEIGHTS_PATH = path.join(MODEL_DIR, 'weights.bin');

function normalize(value, maxValue) {
  return value / maxValue;
}

function createModel() {
  const model = tf.sequential();

  // Entrada: [userId normalizado, movieId normalizado].
  model.add(tf.layers.dense({ inputShape: [2], units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

async function saveModelToDisk(model) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });

  // @tensorflow/tfjs puro nao possui file:// no Node. Este handler grava os artefatos manualmente.
  await model.save(
    tf.io.withSaveHandler(async modelArtifacts => {
      fs.writeFileSync(
        MODEL_JSON_PATH,
        JSON.stringify(
          {
            format: modelArtifacts.format,
            generatedBy: modelArtifacts.generatedBy,
            convertedBy: modelArtifacts.convertedBy,
            modelTopology: modelArtifacts.modelTopology,
            weightSpecs: modelArtifacts.weightSpecs
          },
          null,
          2
        )
      );

      fs.writeFileSync(WEIGHTS_PATH, Buffer.from(modelArtifacts.weightData));

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
          weightDataBytes: modelArtifacts.weightData.byteLength
        }
      };
    })
  );
}

async function train() {
  const { ratings, movies } = await loadDataset();

  const maxUserId = Math.max(...ratings.map(rating => rating.userId));
  const maxMovieId = Math.max(...movies.map(movie => movie.movieId));

  const inputs = ratings.map(rating => [
    normalize(rating.userId, maxUserId),
    normalize(rating.movieId, maxMovieId)
  ]);
  const labels = ratings.map(rating => [rating.rating]);

  const xs = tf.tensor2d(inputs);
  const ys = tf.tensor2d(labels);
  const model = createModel();

  console.log(`Treinando com ${ratings.length} avaliacoes e ${movies.length} filmes...`);

  await model.fit(xs, ys, {
    epochs: 8,
    batchSize: 512,
    validationSplit: 0.1,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const loss = logs.loss.toFixed(4);
        const valLoss = logs.val_loss.toFixed(4);
        const mae = logs.mae.toFixed(4);
        console.log(`Epoca ${epoch + 1}: loss=${loss}, val_loss=${valLoss}, mae=${mae}`);
      }
    }
  });

  await saveModelToDisk(model);

  fs.writeFileSync(
    METADATA_PATH,
    JSON.stringify(
      {
        modelType: 'normalized_user_movie_dense',
        maxUserId,
        maxMovieId,
        ratingsCount: ratings.length,
        moviesCount: movies.length,
        trainedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  xs.dispose();
  ys.dispose();
  model.dispose();

  console.log(`Modelo salvo em ${MODEL_DIR}`);
}

if (require.main === module) {
  train().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  MODEL_DIR,
  METADATA_PATH,
  MODEL_JSON_PATH,
  WEIGHTS_PATH,
  createModel,
  saveModelToDisk,
  train
};
