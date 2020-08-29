import * as chalk from "chalk";
import { DateTime } from "luxon";
import { IFixture, BetTypes, NO_PREDICTION_AVAILABLE, ITeam, ITeamAndGame } from "./types";
import FootballApi from "./FootballAPI";
import { ODD_DIFFERENCE_TRUST_LEVEL, ODD_DIFFERENCE_TOO_SMALL } from "../strategy/GameSorter";

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
    for (const fixture of fixtures) {

      if (fixture.strategy) {
        // tslint:disable-next-line: max-line-length
        if (fixture.strategy.oddGap >= ODD_DIFFERENCE_TRUST_LEVEL) console.log(chalk`{bold.green ${position++}) ✔️ ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}}`);
        else if (fixture.strategy.oddGap < ODD_DIFFERENCE_TOO_SMALL) console.log(chalk`{yellow ${position++}) ⚡️} {red ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}}`);
        else console.log(chalk`{green ${position++}) ♣️ ${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name}}`);

        const bet = api.getBet(fixture.odds.bets, BetTypes.MatchWinner)

        console.log(chalk`\n{bold.blue ${fixture.odds.bookmaker_name} odds:}`);
        // tslint:disable-next-line: max-line-length
        console.log(chalk`{green Result: {bold ${fixture.strategy.oddMatchWinner}}\t${bet[0]?.value}: ${bet[0]?.odd} - ${bet[1]?.value}: ${bet[1]?.odd} - ${bet[2]?.value}: ${bet[2]?.odd}}\t{cyan Gap:} {cyan.bold ${fixture.strategy.oddGap.toFixed(2)}}`);
        console.log(chalk`{gray Expected scores: {bold ${fixture.strategy.expectedScores.join("  /  ")}}}`);
        console.log(chalk`Confidence: {magenta.bold ${fixture.strategy.confidence}%}`);
        console.log(chalk`${fixture.homeTeam.team_name} potential game scores: {magenta.bold ${fixture.homeTeam.potentialScore.min} / ${fixture.homeTeam.potentialScore.max}}`);
        console.log(chalk`${fixture.awayTeam.team_name} potential game scores: {magenta.bold ${fixture.awayTeam.potentialScore.min} / ${fixture.awayTeam.potentialScore.max}}`);
      }
      else console.log(chalk`${fixture.homeTeam.team_name} vs ${fixture.awayTeam.team_name} {yellow.bold (unsorted - no strategy)}`);

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
        let line = "";
        if (position <= 6) line = chalk`{bold.green ${position++}) ${team.team_name}}`;
        else if (team.potentialScore.average < 5) line = chalk`{red ${position++}) ${team.team_name}}`;
        else line = chalk`{green ${position++}) ${team.team_name}}`;
        console.log(chalk`${line}\t{yellow (${team.potentialScore.min}/${team.potentialScore.max})  {bold ${team.potentialScore.average}}}   {gray ${team.game.strategy.oddGap.toFixed(2)}}`);
      }
      else console.log(chalk`{gray ?) ${team.team_name}}`);
    }
    console.log(chalk`{gray \n---\n}`);
  }

  /** Helper for pronostic display */
  private static displayPronostic(title: string, values: string[]): void {
    if (values[0] !== "0%" && values[1] !== "0%") {
      console.log(chalk`{bold.blue ${title}:} {yellow ${values.join(" / ")}}`);
    }
  }
}
