# movie-recommender-tfjs

Projeto de estudos para criar um sistema simples de recomendação de filmes usando Node.js, Express e TensorFlow.js.

O dataset usado é o **MovieLens Latest Small**, da GroupLens. Ele contém aproximadamente 100.000 avaliações feitas por cerca de 600 usuários, sendo uma boa base para aprender os fundamentos de sistemas de recomendação.

## O que é um sistema de recomendação?

Um sistema de recomendação tenta estimar quais itens uma pessoa provavelmente vai gostar. No caso deste projeto, o sistema aprende a partir de avaliações históricas de filmes e tenta prever qual nota um usuário daria para filmes que ele ainda não avaliou.

Exemplos comuns de recomendação aparecem em plataformas de streaming, lojas online, redes sociais e aplicativos de música.

## Como o modelo funciona?

Este projeto usa uma rede neural simples com TensorFlow.js e um ranking personalizado por preferências de gênero.

A entrada do modelo possui dois valores:

- `userId` normalizado
- `movieId` normalizado

A saída é:

- nota prevista para aquele par usuário-filme

Durante o treino, o modelo lê `ratings.csv` e aprende relações aproximadas entre usuários, filmes e avaliações. Depois, para recomendar filmes a um usuário, o sistema:

1. Carrega todos os filmes de `movies.csv`.
2. Remove os filmes que o usuário já avaliou.
3. Prevê uma nota base para cada filme restante.
4. Calcula quais gêneros esse usuário costuma avaliar melhor.
5. Combina a nota prevista com um bônus de gênero personalizado.
6. Ordena os filmes pela maior pontuação final.
7. Retorna os 10 melhores.

Esta abordagem é propositalmente simples. Ela não tem a qualidade de um recomendador de produção, mas é ótima para entender o fluxo completo: dataset, treino, predição, API e interface.

## Estrutura

```text
movie-recommender-tfjs/
├── data/
│   ├── ratings.csv
│   └── movies.csv
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── downloadData.js
│   ├── loadData.js
│   ├── trainModel.js
│   ├── recommender.js
│   └── server.js
├── package.json
└── README.md
```

## Requisitos

- Node.js instalado
- npm instalado

## Como instalar

Entre na pasta do projeto:

```bash
cd movie-recommender-tfjs
```

Instale as dependências:

```bash
npm install
```

## Como baixar o dataset

Opção automática:

```bash
npm run download
```

Esse comando baixa o MovieLens Latest Small da GroupLens e extrai `ratings.csv` e `movies.csv` para a pasta `data/`.

Opção manual:

1. Acesse https://grouplens.org/datasets/movielens/latest/
2. Baixe o arquivo `ml-latest-small.zip`.
3. Extraia o ZIP.
4. Copie `ratings.csv` e `movies.csv` para a pasta `data/` deste projeto.

No final, os arquivos devem existir nestes caminhos:

```text
data/ratings.csv
data/movies.csv
```

## Como treinar

Depois de instalar as dependências e baixar o dataset, execute:

```bash
npm run train
```

O treino cria a pasta `model/` com os arquivos do modelo TensorFlow.js e um arquivo `metadata.json` com informações usadas na normalização.

## Como rodar o projeto

Após treinar o modelo:

```bash
npm start
```

Abra no navegador:

```text
http://localhost:3000
```

Digite um `userId`, por exemplo `1`, e clique em **Recommend**.

## Rotas da API

### GET /health

Verifica se o servidor está no ar.

Exemplo:

```bash
curl http://localhost:3000/health
```

### GET /movies

Retorna a lista de filmes carregada de `movies.csv`.

Exemplo:

```bash
curl http://localhost:3000/movies
```

### GET /recommend/:userId

Retorna 10 recomendações para o usuário informado.

Exemplo:

```bash
curl http://localhost:3000/recommend/1
```

## Limitações

- O modelo neural usa apenas `userId` e `movieId`; os gêneros entram apenas no ranking final.
- IDs normalizados não capturam relações complexas entre usuários e filmes.
- O modelo não usa embeddings, que costumam ser melhores para recomendação.
- O treino é pequeno e voltado para aprendizado, não para máxima precisão.
- Recomendações para usuários fora do dataset podem ser pouco confiáveis.
- O sistema não recalcula recomendações em tempo real com novas avaliações.

## Melhorias futuras

- Usar embeddings para usuários e filmes.
- Separar treino, validação e teste de forma mais rigorosa.
- Medir métricas como RMSE e MAE em um conjunto de teste.
- Usar gêneros dos filmes como features adicionais.
- Criar uma rota para prever a nota de um usuário para um filme específico.
- Salvar recomendações pré-calculadas para acelerar respostas.
- Criar filtros por gênero ou ano.
- Melhorar a interface com estados de erro e carregamento mais ricos.

## Fonte do dataset

MovieLens Latest Small, GroupLens:

https://grouplens.org/datasets/movielens/latest/
