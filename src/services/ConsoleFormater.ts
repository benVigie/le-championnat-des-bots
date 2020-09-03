import * as chalk from "chalk";
import { DateTime } from "luxon";
import { IFixture, BetTypes, NO_PREDICTION_AVAILABLE, ITeam, ITeamAndGame, IBetValues } from "./types";
import FootballApi from "./FootballAPI";
import { ODD_DIFFERENCE_TRUST_LEVEL, ODD_DIFFERENCE_TOO_SMALL } from "../strategy/GameSorter";
import { IPlayerList } from "../strategy/PlayerSorter";

/** ConsoleFormater will handle console display for games ans strategies */
export default class ConsoleFormater {

  /** Display next games with all infos in console */
  static displayNextGames(fixtures: IFixture[], api: FootballApi): void {
    let currentRound = "";

    for (const fixture of fixtures) {
      if (fixture.round !== currentRound) {
        currentRound = fixture.round;
        console.log(chalk`{bold.yellow \n\n${currentRound}}\n`);
      }

      const dateTime = DateTime.fromISO(fixture.event_date, { locale: "fr" });
      console.log(chalk`${dateTime.toFormat("EEEE dd MMMM, à HH:mm")}`);
      console.log(chalk`{bold.cyan ${fixture.homeTeam.team_name}\t${fixture.awayTeam.team_name}}`);

      // Display pronostics if we have them
      if (fixture.pronostics) {
        console.log(chalk`\n{bold.green ${fixture.pronostics.advice}}`);
        console.log(chalk`{green ${fixture.pronostics.winning_percent.home}\t${fixture.pronostics.winning_percent.draws}\t${fixture.pronostics.winning_percent.away}}`);

        this.displayPronostic("Forme", [fixture.pronostics.comparison.forme.home, fixture.pronostics.comparison.forme.away]);
        this.displayPronostic("Attaque", [fixture.pronostics.comparison.att.home, fixture.pronostics.comparison.att.away]);
        this.displayPronostic("Defense", [fixture.pronostics.comparison.def.home, fixture.pronostics.comparison.def.away]);
        this.displayPronostic("H2H", [fixture.pronostics.comparison.h2h.home, fixture.pronostics.comparison.h2h.away]);
        this.displayPronostic("Buts H2H", [fixture.pronostics.comparison.goals_h2h.home, fixture.pronostics.comparison.goals_h2h.away]);
      }

      // Display bookmakers odds if we have them
      if (fixture.odds) {
        console.log(chalk`\n{bold.green ${fixture.odds.bookmaker_name} odds:}`);
        let bet = api.getBet(fixture.odds.bets, BetTypes.MatchWinner)
        if (bet.length) this.displayPronostic(BetTypes.MatchWinner, [`${bet[0]?.value}: ${bet[0]?.odd}`, `${bet[1]?.value}: ${bet[1]?.odd}`, `${bet[2]?.value}: ${bet[2]?.odd}`]);

        bet = api.getBet(fixture.odds.bets, BetTypes.ExactScore)
        bet = bet.sort((a, b) => { return parseFloat(a.odd) - parseFloat(b.odd) });
        if (bet.length) this.displayPronostic(BetTypes.ExactScore, [`${bet[0]?.value}: ${bet[0]?.odd}`, `${bet[1]?.value}: ${bet[1]?.odd}`, `${bet[2]?.value}: ${bet[2]?.odd}`, `${bet[3]?.value}: ${bet[3]?.odd}`]);
      }

      console.log(chalk`{gray \n---\n}`);
    }
  }

  /** Display next games with all infos in console */
  static displayStrategy(fixtures: IFixture[], api: FootballApi): void {
    let position = 1;

    console.log(chalk`{bgBlue \n${fixtures[0].round.toUpperCase()} STRATEGY RANKING\n}`);
    for (const fixture of fixtures) {
      if (fixture.strategy) {
        // tslint:disable-next-line: max-line-length
        if (fixture.strategy.oddGap >= ODD_DIFFERENCE_TRUST_LEVEL) console.log(chalk`{bold.green ${position++}) ✔️ ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}}\t{gray ${fixture.fixture_id}}`);
        else if (fixture.strategy.oddGap < ODD_DIFFERENCE_TOO_SMALL) console.log(chalk`{yellow ${position++}) ⚡️} {red ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}}\t{gray ${fixture.fixture_id}}`);
        else console.log(chalk`{green ${position++}) ♣️ ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}}\t{gray ${fixture.fixture_id}}`);

        const bet = api.getBet(fixture.odds.bets, BetTypes.MatchWinner)

        console.log(chalk`\n{bold.blue ${fixture.odds.bookmaker_name} odds:}`);
        // tslint:disable-next-line: max-line-length
        console.log(chalk`{green Result: {bold ${fixture.strategy.oddMatchWinner}}\t${this.getOdd(bet, "Home")} - ${this.getOdd(bet, "Draw")} - ${this.getOdd(bet, "Away")}}\t{cyan Gap:} {cyan.bold ${fixture.strategy.oddGap.toFixed(2)}}`);
        console.log(chalk`{gray Expected scores: {bold ${fixture.strategy.expectedScores.join("  /  ")}}}`);
        console.log(chalk`Confidence: {magenta.bold ${fixture.strategy.confidence}%}`);
        console.log(chalk`${fixture.homeTeam.team_name} potential game scores: {magenta.bold ${fixture.homeTeam.potentialScore.min} / ${fixture.homeTeam.potentialScore.max}}`);
        console.log(chalk`${fixture.awayTeam.team_name} potential game scores: {magenta.bold ${fixture.awayTeam.potentialScore.min} / ${fixture.awayTeam.potentialScore.max}}`);
      }
      else console.log(chalk`${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name} {yellow.bold (unsorted - no strategy)}\t{gray ${fixture.fixture_id}}`);

      // Display pronostics if we have them
      if (fixture.pronostics) {
        console.log(chalk`\n{bold.blue Pronostics Foortball API:}`);
        if (fixture.pronostics.advice !== NO_PREDICTION_AVAILABLE) {
          console.log(chalk`{bold.green ${fixture.pronostics.advice}}`);
          console.log(chalk`{yellow ${fixture.pronostics.winning_percent.home}\t${fixture.pronostics.winning_percent.draws}\t${fixture.pronostics.winning_percent.away}}`);
        }

        this.displayPronostic("Forme", [fixture.pronostics.comparison.forme.home, fixture.pronostics.comparison.forme.away]);
        this.displayPronostic("Attaque", [fixture.pronostics.comparison.att.home, fixture.pronostics.comparison.att.away]);
        this.displayPronostic("Defense", [fixture.pronostics.comparison.def.home, fixture.pronostics.comparison.def.away]);
        if (fixture.strategy?.oddGap >= ODD_DIFFERENCE_TOO_SMALL) {
          this.displayPronostic("H2H", [fixture.pronostics.comparison.h2h.home, fixture.pronostics.comparison.h2h.away]);
          this.displayPronostic("Buts H2H", [fixture.pronostics.comparison.goals_h2h.home, fixture.pronostics.comparison.goals_h2h.away]);
        }
      }

      console.log(chalk`{gray \n---\n}`);
    }
  }

  /** Display next games with all infos in console */
  static displayTeamsByScore(teams: ITeamAndGame[]): void {
    let position = 1;

    console.log(chalk`{bold.gray Teams sorted by scores\n}`);

    for (const team of teams) {
      if (team.potentialScore) {

        if (team.potentialScore.average >= 5) {
          let line = "";
          line = (position <= 6) ? chalk`{bold.green ${position++}) ${team.team_name}} ` : chalk`{green ${position++}) ${team.team_name}} `;
          line += this.displayTeamForme(team.standing.forme);
          console.log(chalk`${line}\t{yellow (${team.potentialScore.min}/${team.potentialScore.max})  {bold ${team.potentialScore.average}}}   {gray ${team.game.strategy.oddGap.toFixed(2)}}`);

          // Display opponent infos
          const opponent = (team.game.homeTeam.team_id === team.team_id) ? team.game.awayTeam : team.game.homeTeam;
          console.log(chalk`   {gray vs ${opponent.team_name} ${this.displayTeamForme(opponent.standing.forme)}}`);
        }
      }
      else console.log(chalk`{gray ?) ${team.team_name}}`);
    }
    console.log(chalk`{gray \n---\n}`);
  }

  /** Display the best keepers from a given list of teams */
  static displayBestKeepers(playerList: IPlayerList): void {
    let position = 1;

    console.log(chalk`{bold.gray Best keepers\n}`);

    for (const keeper of playerList.keepers) {
      let line = "";
      if (position <= 2) line = chalk`{bold.green ${position++}) ${keeper.club} - ${keeper.nom}}`;
      else line = chalk`{green ${position++}) ${keeper.club} - ${keeper.nom}}`;

      line += chalk`\tExpected score: {yellow (${keeper.potentialScore.min}/${keeper.potentialScore.max}) {bold ${keeper.potentialScore.average}}}\tAverage score: {magenta ${keeper.averagePoints}}\tValue: ${keeper.valeur}`;
      console.log(line);
    }
    console.log(chalk`{gray \n---\n}`);
  }

  /** Helper for pronostic display */
  private static displayPronostic(title: string, values: string[]): void {
    if (values[0] !== "0%" && values[1] !== "0%") {
      console.log(chalk`{bold.blue ${title}:} {yellow ${values.join(" / ")}}`);
    }
  }

  /** Helper for pronostic display */
  private static getOdd(odds: IBetValues[], field: string): string {
    for (const odd of odds) {
      if (odd.value === field) return `${odd.value}: ${odd.odd}`;
    }
    return "";
  }

  /** Helper for pronostic display */
  private static displayTeamForme(forme: string): string {
    if (!forme) return "";

    let formeViewer = "";
    for (let i = forme.length - 1; i >= 0; i--) {
      if (forme[i] === 'W') formeViewer += chalk`{bold.green o}`;
      else if (forme[i] === 'D') formeViewer += chalk`{bold.gray o}`;
      else formeViewer += chalk`{bold.red o}`;
    }
    return formeViewer;
  }
}
