const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const { DATA_DIR } = require('./loadData');

const DATASET_URL = 'https://files.grouplens.org/datasets/movielens/ml-latest-small.zip';
const ZIP_PATH = path.join(DATA_DIR, 'ml-latest-small.zip');

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(destination);
          downloadFile(response.headers.location, destination).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destination);
          reject(new Error(`Falha ao baixar dataset. Status HTTP: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', error => {
        file.close();
        if (fs.existsSync(destination)) fs.unlinkSync(destination);
        reject(error);
      });
  });
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('Baixando MovieLens Latest Small...');
  await downloadFile(DATASET_URL, ZIP_PATH);

  console.log('Extraindo ratings.csv e movies.csv...');
  const zip = new AdmZip(ZIP_PATH);
  const entries = zip.getEntries();

  for (const wantedFile of ['ratings.csv', 'movies.csv']) {
    const entry = entries.find(item => item.entryName.endsWith(`/${wantedFile}`));
    if (!entry) throw new Error(`Arquivo ${wantedFile} não encontrado no ZIP.`);

    fs.writeFileSync(path.join(DATA_DIR, wantedFile), entry.getData());
  }

  fs.unlinkSync(ZIP_PATH);
  console.log('Dataset pronto em data/ratings.csv e data/movies.csv.');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
