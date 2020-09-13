import { ILcdePlayersStatCriteria, IBookmakerBet, IBetValues, BetTypes, ILcdePlayer, LcdePosition } from "../services/types";
import { PlayerStatCriteria } from "./types";

/**
 * This helper contains usefull methods which can be helpfull in different classes
 */
export default class Helper {

  /** To know if the given player will play at home or not */
  static isHomeTeam(player: ILcdePlayer): boolean {
    return player.teamAndGame.team_id === player.teamAndGame.game.homeTeam.team_id;
  }

  /** Return the goal ratio for this player's position. For keeper and back, the goal ratio is the goal against, for midfield and stiker it's the goals scrored */
  static getGoalRatio(player: ILcdePlayer): number {
    const isHomeTeam = this.isHomeTeam(player);
    if (player.position === LcdePosition.Keeper || player.position === LcdePosition.Back) {
      return (isHomeTeam) ? player.teamAndGame.game.strategy.goalRatio[1] : player.teamAndGame.game.strategy.goalRatio[0];
    }
    return (isHomeTeam) ? player.teamAndGame.game.strategy.goalRatio[0] : player.teamAndGame.game.strategy.goalRatio[1];
  }

  /** Retrieve the right bet values for the given odd list */
  static getBet(list: IBookmakerBet[], oddType: BetTypes): IBetValues[] {
    for (const odd of list) {
      if (odd.label_name === oddType) return odd.values;
    }
    return [];
  }

  /** Read the wanted criteria from stats array */
  static readPlayerStat(stats: ILcdePlayersStatCriteria[], criteria: PlayerStatCriteria): number {
    if (!stats || !stats.length) return 0;

    for (const statistic of stats) {
      if (statistic.message === criteria) {
        return (statistic.value === "") ? 0 : parseFloat(statistic.value.toString());
      }
    }
  }
}
