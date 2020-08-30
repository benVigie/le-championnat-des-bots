import { AppMode, IConfiguration, IYargsArgs } from "./Main";
import FootballApi from "./services/FootballAPI";
import Tools from "./services/Tools";
import { IFixture } from "./services/types";
import * as chalk from "chalk";
import { DateTime } from "luxon";
import GameSorter from "./strategy/GameSorter";
import ConsoleFormater from "./services/ConsoleFormater";
import LcdeApi from "./services/LcdeAPI";
import PlayerSorter from "./strategy/PlayerSorter";

/** ScoutBot is the app orchestrator */
export default class ScoutBot {
  private static _config: IConfiguration;
  private static _mode: AppMode;
  private _api: FootballApi;
  private _lcdeApi: LcdeApi;
  private _nextGames: IFixture[];
  private _gameSorter: GameSorter;
  private _playerSorter: PlayerSorter;
  private _isInteractive: boolean;

  constructor(mode: AppMode, config: IConfiguration, args: IYargsArgs) {
    ScoutBot._mode = mode;
    ScoutBot._config = config;
    this._api = new FootballApi(args.token);
    this._lcdeApi = new LcdeApi(args.email, args.password);
    this._gameSorter = new GameSorter(this._api);
    this._playerSorter = new PlayerSorter(this._lcdeApi);
    this._isInteractive = args.interactive;
  }

  /** Retrieve app mode, either dev or production */
  static get mode(): AppMode { return ScoutBot._mode; }

  /** Retrieve app config */
  static get configuration(): IConfiguration { return ScoutBot._config; }

  /** Start the scout bot */
  async startScouting(): Promise<void> {
    try {
      // Display API usage and try to load today requests to save identical calls
      await this.displayApiStatus();
      this._nextGames = await this.loadFixtures();

      // If nothing was saved today, retrieved games
      if (!this._nextGames.length) {
        this._nextGames = await this._api.getCurrentRoundGames();

        // Retrieve and attach pronostics and save the day :p
        await this._api.getAndAttachPronostics(this._nextGames);
        await this.saveFixtures(this._nextGames);
      }

      // Display strategy sort
      const strategySorted = await this._gameSorter.sortGamesByOdds(this._nextGames, this._isInteractive);
      ConsoleFormater.displayStrategy(strategySorted, this._api);

      // And now sort by points and display teams by potential scores
      const teams = this._gameSorter.sortTeamsByPoints(strategySorted);
      ConsoleFormater.displayTeamsByScore(teams);

      // Retrieve players list from the best teams
      const playerList = await this._playerSorter.getBestPlayers(teams);
      ConsoleFormater.displayBestKeepers(playerList);
    }
    catch (error) {
      if (!Tools.dumpAxiosError(error)) {
        console.error(chalk`{red Scout bot error: ${error.toString()}}`);
        throw error;
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
    await Tools.writeFile(`./data/${now.toISODate()}.json`, JSON.stringify(games, null, 2));
  }

  /** Save daily games request to save api rates */
  private async loadFixtures(): Promise<IFixture[]> {
    const now = DateTime.local();

    try {
      const retrieved = await Tools.readFile<IFixture[]>(`./data/${now.toISODate()}.json`);
      console.log(chalk`{gray Daily fixtures loaded}`);
      return retrieved;
    }
    catch {
      console.log(chalk`{gray No daily fixtures saved, call API...}`);
    }
    return [];
  }
}
