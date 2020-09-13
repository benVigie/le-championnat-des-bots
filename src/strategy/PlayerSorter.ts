import ScoreCalculator from "./ScoreCalculator";
import LcdeApi from "../services/LcdeAPI";
import { ITeamAndGame, ILcdePlayer, LcdePosition, ILcdePlayersStats, ILcdePlayersStatCriteria } from "../services/types";
import Tools from "../services/Tools";
import { IPlayerList, PlayerStatCriteria } from "./types";
import { ODD_DIFFERENCE_TOO_SMALL } from "./GameSorter";
import Helper from "./Helper";

/** Number of max players per team. Overrided to 2 for our league, can't find the info on LCDE */
const MAX_PLAYERS_PER_TEAM = 2;
/** How many players we ideally want each week. Minimum 11. */
const EXPECTED_PLAYERS_NUMBER = 15;
/** How many teams we need to include to ahve our number of players, according team cap limit */
const MAX_TEAMS = Math.ceil(EXPECTED_PLAYERS_NUMBER / MAX_PLAYERS_PER_TEAM);

/** Game logic on players and their points */
export default class PlayerSorter {
  private _api: LcdeApi;
  private _playerList: IPlayerList;

  constructor(api: LcdeApi) {
    this._api = api;
    this._playerList = { keepers: [], backs: [], midfields: [], strikers: [] };
  }

  /** Retrieve the sorted player list */
  get playerList(): IPlayerList {
    return this._playerList;
  }

  /** Sort the given fixture array by bookmakers odds */
  async getBestPlayers(teams: ITeamAndGame[]): Promise<IPlayerList> {
    if (!this._api.isLogged) await this._api.login();
    const round = await this._api.getCurrentRound();

    // Retrieve all players from the first 8 teams and attach their stats
    for (let i = 0; i < MAX_TEAMS; i++) {
      // Retrieve player list
      Tools.displayAction(`${i + 1}/${MAX_TEAMS} Retrieving ${teams[i].team_name} player list`);
      const players = await this._api.getPlayersFromTeam<ILcdePlayer>(teams[i].team_name, round.journee.id);
      Tools.displayAction(`${i + 1}/${MAX_TEAMS} Retrieving ${teams[i].team_name} player list`, true, true);

      // Retrieve team statistics
      Tools.displayAction(`${i + 1}/${MAX_TEAMS} Retrieving ${teams[i].team_name} player stats`);
      const teamStats = await this._api.getTeamPlayersStatistics(teams[i].team_name);
      Tools.displayAction(`${i + 1}/${MAX_TEAMS} Retrieving ${teams[i].team_name} player stats`, true, true);

      // Once we have players and statistics, format them and attach stats
      for (const player of players) {
        this.attachStatsAndScoreToPlayer(player, teams[i], teamStats);
      }
    }

    // First, sort and limit the player lists by category
    this.sortAndLimitPlayerList();

    // Then, sort the player list by players's average score calculated by our algo
    this._playerList.keepers.sort(this.averageScoreSort);
    this._playerList.backs.sort(this.averageScoreSort);
    this._playerList.midfields.sort(this.averageScoreSort);
    this._playerList.strikers.sort(this.maxScoreSort);

    // Finally keep only the best players (to avoid having too much choices)
    this.keepBestPlayers();

    return this._playerList;
  }

  /** Format player and add him in the right category according his position */
  private attachStatsAndScoreToPlayer(player: ILcdePlayer, team: ITeamAndGame, teamStats: ILcdePlayersStats[]): void {
    // Type valeur as number and attach team and game
    player.valeur = parseFloat(player.valeur.toString());
    player.teamAndGame = team;
    player.stats = this.getPlayerStats(player, teamStats);
    if (player.stats) player.averagePoints = Helper.readPlayerStat(player.stats, PlayerStatCriteria.AveragePoints);

    // According to their position, compute score and push them in the right list
    switch (player.position) {
      case LcdePosition.Keeper:
        ScoreCalculator.computePotentialKeeperScore(player);
        this._playerList.keepers.push(player);
        break;
      case LcdePosition.Back:
        ScoreCalculator.computePotentialBackScore(player);
        this._playerList.backs.push(player);
        break;
      case LcdePosition.Midfield:
        ScoreCalculator.computePotentialMidfieldScore(player);
        this._playerList.midfields.push(player);
        break;
      case LcdePosition.Striker:
        ScoreCalculator.computePotentialStrikerScore(player);
        this._playerList.strikers.push(player);
    }
  }

  /** We don't need 75 keepers and 216 strikers. Limit the list of players according to some sorts */
  private sortAndLimitPlayerList(): void {
    // Limit keepers list by taking the first ones with better market value
    this._playerList.keepers.sort((a, b) => b.valeur - a.valeur);
    this._playerList.keepers = this._playerList.keepers.slice(0, MAX_TEAMS);
    // Do not limit back, midfields and strikers for now
  }

  /** Called when we sort our players categories. Just keep the best ones */
  private keepBestPlayers(): void {
    // Only keep keepers with a high winner odds.
    this._playerList.keepers.forEach((keeper, index, list) => {
      if (keeper.teamAndGame.game.strategy.oddGap < ODD_DIFFERENCE_TOO_SMALL) {
        list.splice(index, 1);
      }
    });

    // As we can have maximum 4 backs or midfieders, limit our results
    this._playerList.backs = this._playerList.backs.slice(0, 4 * MAX_TEAMS);
    this._playerList.midfields = this._playerList.midfields.slice(0, 4 * MAX_TEAMS);

    // Max 3 strikers
    this._playerList.strikers = this._playerList.strikers.slice(0, 3 * MAX_TEAMS);
  }

  /** Function used to sort players. Compare average score, but in case of same score, push the player with better game score */
  private averageScoreSort(a: ILcdePlayer, b: ILcdePlayer): number {
    if (a.potentialScore.average === b.potentialScore.average) {
      return b.averagePoints - a.averagePoints;
    }
    return b.potentialScore.average - a.potentialScore.average;
  }

  /** Function used to sort players by max points. In case of same score, push the player with better game score */
  private maxScoreSort(a: ILcdePlayer, b: ILcdePlayer): number {
    if (a.potentialScore.max === b.potentialScore.max) {
      return b.averagePoints - a.averagePoints;
    }
    return b.potentialScore.max - a.potentialScore.max;
  }

  /** Retrieve player stats from stats list */
  private getPlayerStats(player: ILcdePlayer, teamStats: ILcdePlayersStats[]): ILcdePlayersStatCriteria[] | undefined {
    for (const playerStats of teamStats) {
      if (playerStats.nomaffiche === player.nom) {
        return playerStats.criteres;
      }
    }
  }
}
