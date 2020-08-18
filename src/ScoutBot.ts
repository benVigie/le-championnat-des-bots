import { AppMode, IConfiguration } from "./Main";
import FootballApi from "./services/FootballAPI";
import Tools from "./services/Tools";
import { IFixture, BetTypes } from "./services/types";
import * as chalk from "chalk";
import { DateTime } from "luxon";

/** ScoutBot is the app orchestrator */
export default class ScoutBot {
  private static _config: IConfiguration;
  private static _mode: AppMode;
  private _api: FootballApi;
  private _nextGames: IFixture[];

  constructor(mode: AppMode, config: IConfiguration, token: string) {
    ScoutBot._mode = mode;
    ScoutBot._config = config;
    this._api = new FootballApi(token);
  }

  /** Retrieve app mode, either dev or production */
  static get mode(): AppMode { return ScoutBot._mode; }

  /** Retrieve app config */
  static get configuration(): IConfiguration { return ScoutBot._config; }

  /** Start the scout bot */
  async startScouting(): Promise<void> {
    try {
      await this.displayApiStatus();
      this._nextGames = await this._api.getNextGames(10);

      // Retrieve and attach pronostics
      await this._api.getAndAttachPronostics(this._nextGames);

      this.displayNextGames();
    }
    catch (error) {
      if (!Tools.dumpAxiosError(error)) {
        console.error(chalk`{red Scout bot error: ${error.toString()}}`);
      }
    }
  }

  /** Print daily usage of the API */
  private async displayApiStatus(): Promise<void> {
    const status = await this._api.getStatus();
    console.log(chalk`{gray Daily requests: {bold ${status.requests}/${status.requests_limit_day}}}`);
  }

  /** Display next games with all infos in console */
  private async displayNextGames(): Promise<void> {
    let currentRound = "";
    const nextGames: IFixture[] = [];

    for (const fixture of this._nextGames) {
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
        let bet = this._api.getBet(fixture.odds.bets, BetTypes.MatchWinner)
        if (bet.length) this.displayPronostic(BetTypes.MatchWinner, [`${bet[0].value}: ${bet[0].odd}`, `${bet[1].value}: ${bet[1].odd}`, `${bet[2].value}: ${bet[2].odd}`]);

        bet = this._api.getBet(fixture.odds.bets, BetTypes.ExactScore)
        bet = bet.sort((a, b) => { return parseFloat(a.odd) - parseFloat(b.odd) });
        if (bet.length) this.displayPronostic(BetTypes.ExactScore, [`${bet[0].value}: ${bet[0].odd}`, `${bet[1].value}: ${bet[1].odd}`, `${bet[2].value}: ${bet[2].odd}`, `${bet[3].value}: ${bet[3].odd}`]);
      }

      console.log(chalk`{gray \n---\n}`);
    }
  }

  /** Helper for pronostic display */
  private displayPronostic(title: string, values: string[]): void {
    console.log(chalk`{bold.blue ${title}:}`);
    console.log(chalk`{yellow ${values.join("  -  ")}}`);
  }
}
