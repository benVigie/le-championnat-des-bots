# Le championnat des bots ⭐️ 🤖 ⚽️

Le football, c'est cool. La ligue 1, un peu moins. Afin de briller dans les soirées mondaines avec mon équipe du [championnat des étoiles](https://www.lechampionnatdesetoiles.fr/#/game/equipe/me), j'ai créé ce bot pour qu'il récupère la liste des meilleurs joueurs chaque semaines sans me casser le cul à aller consulter la liste des blésses de Strasbourg ni connaitre le fin fond de la banquette de Dijon.

### Requirements

- [Git](http://git-scm.com/)
- [Node.js](http://nodejs.org/)
- Une cle API du site [Football API](https://www.api-football.com/) (le tiers gratuit fait très bien l'affaire 😉)

### Installation

```bash
$ npm install
```

### Build

```bash
$ npm run build
```

### Start

```bash
$ npm run start -- -t [your Football API token]
```

#### Debug the app

To attach a node debugger and run the chrome debugger, simply run

```bash
$ npm run debug -- -t [your Football API token]
```
