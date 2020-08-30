import * as chalk from "chalk";
import { prompts } from "prompts";
import ScoreCalculator from "./ScoreCalculator";
import LcdeApi from "../services/LcdeAPI";
import { ITeamAndGame, ILcdePlayer, LcdePosition, ILcdePlayersStats } from "../services/types";
import Tools from "../services/Tools";

/** Number of max players per team. Overrided to 2 for our league, can't find the info on LCDE */
const MAX_PLAYERS_PER_TEAM = 2;
const EXPECTED_PLAYERS_NUMBER = 15;

export interface IPlayerList {
  keepers: ILcdePlayer[];
  backs: ILcdePlayer[];
  midfields: ILcdePlayer[];
  forwards: ILcdePlayer[];
}

/** Game logic on players and their points */
export default class PlayerSorter {
  private _api: LcdeApi;
  private _scoreCalculator: ScoreCalculator;
  private _playerList: IPlayerList;

  constructor(api: LcdeApi) {
    this._api = api;
    this._scoreCalculator = new ScoreCalculator();
    this._playerList = { keepers: [], backs: [], midfields: [], forwards: [] };
  }

  /** Sort the given fixture array by bookmakers odds */
  async getBestPlayers(teams: ITeamAndGame[]): Promise<void> {
    if (!this._api.isLogged) await this._api.login();
    const round = await this._api.getCurrentRound();

    // Computes how many teams we want to use according players cap
    const maxTeam = Math.ceil(EXPECTED_PLAYERS_NUMBER / MAX_PLAYERS_PER_TEAM);

    // Retrieve players from the first 8 teams
    for (let i = 0; i < maxTeam; i++) {
      // Retrieve player list
      Tools.displayAction(`${i + 1}/${maxTeam} Retrieving ${teams[i].team_name} player list...`);
      const players = await this._api.getPlayersFromTeam<ILcdePlayer>(teams[i].team_name, round.journee.id);
      Tools.displayAction(`${i + 1}/${maxTeam} Retrieving ${teams[i].team_name} player list`, true, true);

      // Retrieve team statistics
      Tools.displayAction(`${i + 1}/${maxTeam} Retrieving ${teams[i].team_name} player stats...`);
      const teamStats = await this._api.getTeamPlayersStatistics(teams[i].team_name);
      Tools.displayAction(`${i + 1}/${maxTeam} Retrieving ${teams[i].team_name} player stats`, true, true);

      // Once we have players and statistics, format them and attach stats
      for (const player of players) {
        this.addPlayerInCategory(player, teams[i], teamStats);
      }
    }

    // Sort the player list by value
    this.sortPlayerListByValue();

    console.log("Best keepers");
    for (let i = 0; i < this._playerList.keepers.length; i++) {
      console.log(`${i + 1}) ${this._playerList.keepers[i].club} - ${this._playerList.keepers[i].nom} (Average: ${this._playerList.keepers[i].averagePoints}, value: ${this._playerList.keepers[i].valeur})`);
    }
  }

  /** Format player and add him in the right category according his position */
  private addPlayerInCategory(player: ILcdePlayer, team: ITeamAndGame, teamStats: ILcdePlayersStats[]): void {
    // Type valeur as number and attach team and game
    player.valeur = parseFloat(player.valeur.toString());
    player.teamAndGame = team;
    player.averagePoints = this.getPlayerAveragePoints(player, teamStats);

    if (player.position === LcdePosition.Keeper) this._playerList.keepers.push(player);
    if (player.position === LcdePosition.Back) this._playerList.backs.push(player);
    if (player.position === LcdePosition.Midfield) this._playerList.midfields.push(player);
    if (player.position === LcdePosition.Forward) this._playerList.forwards.push(player);
  }

  /** Format player and add him in the right category according his position */
  private sortPlayerListByValue(): void {
    this._playerList.keepers.sort((a, b) => b.valeur - a.valeur);
    this._playerList.backs.sort((a, b) => b.valeur - a.valeur);
    this._playerList.midfields.sort((a, b) => b.valeur - a.valeur);
    this._playerList.forwards.sort((a, b) => b.valeur - a.valeur);
  }

  /** Add average points to the players as retrieved by stats */
  private getPlayerAveragePoints(player: ILcdePlayer, teamStats: ILcdePlayersStats[]): number {
    let points = 0;
    for (const playerStats of teamStats) {
      if (playerStats.nomaffiche === player.nom) {
        for (const stat of playerStats.criteres) {
          if (stat.nom === "moyenne_points") {
            points = (stat.value === "") ? 0 : parseFloat(stat.value.toString());
          }
        }
      }
    }

    return points;
  }
}
