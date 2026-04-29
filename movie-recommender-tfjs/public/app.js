const form = document.querySelector('#recommendation-form');
const userIdInput = document.querySelector('#userId');
const statusElement = document.querySelector('#status');
const recommendationsElement = document.querySelector('#recommendations');

function renderRecommendations(recommendations) {
  recommendationsElement.innerHTML = '';

  for (const movie of recommendations) {
    const item = document.createElement('li');
    item.className = 'recommendation';
    const score = movie.recommendationScore || movie.predictedRating;

    item.innerHTML = `
      <div>
        <p class="title">${movie.title}</p>
        <p class="genres">${movie.genres}</p>
      </div>
      <span class="rating">${score}</span>
    `;

    recommendationsElement.appendChild(item);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  const userId = userIdInput.value;
  const button = form.querySelector('button');

  button.disabled = true;
  statusElement.textContent = 'Buscando recomendações...';
  recommendationsElement.innerHTML = '';

  try {
    const response = await fetch(`/recommend/${userId}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Não foi possível recomendar filmes.');
    }

    renderRecommendations(payload.recommendations);
    statusElement.textContent = `Top 10 recomendações para o usuário ${payload.userId}.`;
  } catch (error) {
    statusElement.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
