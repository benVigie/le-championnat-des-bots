# Le championnat des bots ⭐️ 🤖 ⚽️

Le football, c'est cool. La ligue 1, un peu moins. Afin de briller dans les soirées mondaines avec mon équipe du [championnat des étoiles](https://www.lechampionnatdesetoiles.fr), j'ai créé ce bot pour qu'il récupère la liste des meilleurs joueurs chaque semaines sans me casser le cul à aller consulter la liste des blésses de Strasbourg ni connaitre le fin fond de la banquette de Dijon.

### Requirements

- [Git](http://git-scm.com/)
- [Node.js](http://nodejs.org/)
- Une cle API du site [Football API](https://www.api-football.com/) (le tiers gratuit fait très bien l'affaire 😉)
- Un compte [le championnat des étoiles](https://www.lechampionnatdesetoiles.fr). Ce serait quand même pratique.

### Installation

```bash
$ npm install
```

### Build

```bash
$ npm run build
```

### Start

Le bot va envoyer des requètes à [Football API](https://www.api-football.com/) afin de récupérer les matchs, les infos de championnat, les pronostiques (etc) ainsi que d'autres requètes au [championnat des étoiles](https://www.lechampionnatdesetoiles.fr) pour récupérer les joueurs et les informations de votre ligue. Pour lancer le bot, vous aurez donc besoin de 3 choses:

- Votre token [Football API](https://www.api-football.com/)
- Vos identifiants email/mdp du [championnat des étoiles](https://www.lechampionnatdesetoiles.fr)

```bash
$ npm run start -- -t [your Football API token] -m [your lcde email] -p [your lcde password]
```

#### Debug the app

To attach a node debugger and run the chrome debugger, simply run

```bash
$ npm run debug -- -t [your Football API token] -m [your lcde email] -p [your lcde password]
```
