import { AppMode, IConfiguration } from "./Main";
import FootballApi from "./services/FootballAPI";
import Tools from "./services/Tools";
import { IFixture, BetTypes } from "./services/types";
import * as chalk from "chalk";
import { DateTime } from "luxon";
import Strategy from "./services/Stategy";
import ConsoleFormater from "./services/ConsoleFormater";

/** ScoutBot is the app orchestrator */
export default class ScoutBot {
  private static _config: IConfiguration;
  private static _mode: AppMode;
  private _api: FootballApi;
  private _nextGames: IFixture[];
  private _strategy: Strategy;

  constructor(mode: AppMode, config: IConfiguration, token: string) {
    ScoutBot._mode = mode;
    ScoutBot._config = config;
    this._api = new FootballApi(token);
    this._strategy = new Strategy(this._api);
  }

  /** Retrieve app mode, either dev or production */
  static get mode(): AppMode { return ScoutBot._mode; }

  /** Retrieve app config */
  static get configuration(): IConfiguration { return ScoutBot._config; }

  /** Start the scout bot */
  async startScouting(): Promise<void> {
    try {
      // DIsplay API usage and try to load today requests to save identical calls
      await this.displayApiStatus();
      this._nextGames = await this.loadFixtures();

      // If nothing was saved today, retrieved games
      if (!this._nextGames.length) {
        this._nextGames = await this._api.getCurrentRoundGames();

        // Retrieve and attach pronostics and save the day :p
        await this._api.getAndAttachPronostics(this._nextGames);
        await this.saveFixtures(this._nextGames);
      }

      // Display next games
      ConsoleFormater.displayNextGames(this._nextGames, this._api);

      // Display strategy
      const strategySorted = this._strategy.sortGamesByOdds(this._nextGames);
      ConsoleFormater.displayStrategy(strategySorted, this._api);
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

  /** Save daily games request to save api rates */
  private async saveFixtures(games: IFixture[]): Promise<void> {
    const now = DateTime.local();
    await Tools.writeFile(`./${now.toISODate()}.json`, JSON.stringify(games, null, 2));
  }

  /** Save daily games request to save api rates */
  private async loadFixtures(): Promise<IFixture[]> {
    const now = DateTime.local();

    try {
      const retrieved = await Tools.readFile<IFixture[]>(`./${now.toISODate()}.json`);
      console.log(chalk`{gray Daily fixtures loaded}`);
      return retrieved;
    }
    catch {
      console.log(chalk`{gray No daily fixtures saved, call API...}`);
    }
    return [];
  }
}
