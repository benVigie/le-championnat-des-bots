import { IFixture, MatchWinner, IPotentialScore, ILcdePlayer, ILcdePlayersStatCriteria } from "../services/types";
import { PlayerStatCriteria } from "./types";

/** Le championnat des etoiles scores rules */
const RULES = {
  team: {
    homeWin: 8,
    homeDraw: 2,
    homeLoose: -2,
    awayWin: 12,
    awayDraw: 6,
    awayLoose: 2,
    pointPerGoalDifference: 2
  },
  keeper: {
    goal: 25,
    goalConceed: -3,
    catch: 2,
    invincibility: 12
  },
  back: {
    goal: 18,
    invincibility: 6
  },
  halfback: {
    goal: 15
  },
  forward: {
    goal: 12
  },
  cards: {
    yellow: -3,
    red: -5
  }
};

/**
 * This service will compute expected min/max score a team or player can earn in a game
 * By score I mean championnat des etoiles score
 */
export default class ScoreCalculator {

  /** Compute min/max and average score this team can win */
  static computePotentialTeamScores(game: IFixture): void {
    if (!game.strategy || !game.strategy.expectedScores) return null;

    const homeScore: IPotentialScore = { min: 0, max: 0, average: 0 };
    const awayScore: IPotentialScore = { min: 0, max: 0, average: 0 };

    const goals = game.strategy.expectedScores[0].split(":");
    const homeGoals = parseInt(goals[0], 10);
    const awayGoals = parseInt(goals[1], 10);

    switch (game.strategy.oddMatchWinner) {
      case MatchWinner.Home:
        homeScore.min += RULES.team.homeWin;
        homeScore.max += RULES.team.homeWin + ((homeGoals - awayGoals) * RULES.team.pointPerGoalDifference);
        awayScore.min += RULES.team.awayLoose + ((homeGoals - awayGoals) * -RULES.team.pointPerGoalDifference);
        awayScore.max += RULES.team.awayLoose;
        break
      case MatchWinner.HomeOrDraw:
        homeScore.min += RULES.team.homeDraw;
        homeScore.max += RULES.team.homeWin + ((homeGoals - awayGoals) * RULES.team.pointPerGoalDifference);
        awayScore.min += RULES.team.awayLoose + ((homeGoals - awayGoals) * -RULES.team.pointPerGoalDifference);
        awayScore.max += RULES.team.awayDraw;
        break
      case MatchWinner.Away:
        homeScore.min += RULES.team.homeLoose + ((awayGoals - homeGoals) * -RULES.team.pointPerGoalDifference);
        homeScore.max += RULES.team.homeLoose;
        awayScore.min += RULES.team.awayWin;
        awayScore.max += RULES.team.awayWin + ((awayGoals - homeGoals) * RULES.team.pointPerGoalDifference);
        break
      case MatchWinner.AwayOrDraw:
        homeScore.min += RULES.team.homeLoose + ((awayGoals - homeGoals) * -RULES.team.pointPerGoalDifference);
        homeScore.max += RULES.team.homeDraw;
        awayScore.min += RULES.team.awayDraw;
        awayScore.max += RULES.team.awayWin + ((awayGoals - homeGoals) * RULES.team.pointPerGoalDifference);
        break
      default:
        homeScore.min += RULES.team.homeDraw;
        homeScore.max += RULES.team.homeDraw;
        awayScore.min += RULES.team.awayDraw;
        awayScore.max += RULES.team.awayDraw;
    }

    // Computes average and attach scores
    homeScore.average = (homeScore.min + homeScore.max) / 2;
    awayScore.average = (awayScore.min + awayScore.max) / 2;
    game.homeTeam.potentialScore = homeScore;
    game.awayTeam.potentialScore = awayScore;
  }

  /** Compute min/max and average score this team can win */
  static computePotentialKeeperScore(keeper: ILcdePlayer): void {
    if (!keeper.teamAndGame.game?.strategy?.expectedScores) return null;

    // By default, the keeper will have the same amount of points as his team
    const score: IPotentialScore = { ...keeper.teamAndGame.potentialScore };

    const isHomeTeam = keeper.teamAndGame.team_id === keeper.teamAndGame.game.homeTeam.team_id;
    const goalTaken = this.getPossibleGoalsFromGames([keeper.teamAndGame.game.strategy.expectedScores[0], keeper.teamAndGame.game.strategy.expectedScores[1]], isHomeTeam);
    const invincibility = (keeper.teamAndGame.game.strategy.oddMatchWinner === MatchWinner.Home && isHomeTeam) || (keeper.teamAndGame.game.strategy.oddMatchWinner === MatchWinner.Away && !isHomeTeam);

    if (keeper.stats) {
      const nbGames = this.readPlayerStat(keeper.stats, PlayerStatCriteria.NbGames);
      const yellow = this.readPlayerStat(keeper.stats, PlayerStatCriteria.YellowCard) / nbGames;
      const red = this.readPlayerStat(keeper.stats, PlayerStatCriteria.RedCard) / nbGames;
      const taken = this.readPlayerStat(keeper.stats, PlayerStatCriteria.GoalsTaken) / nbGames;
      const stops = this.readPlayerStat(keeper.stats, PlayerStatCriteria.Caught) / nbGames;


      score.min += (goalTaken / 2 * RULES.keeper.goalConceed) + (taken * RULES.keeper.goalConceed) + (yellow * RULES.cards.yellow) + (red * RULES.cards.red);
      score.max += (stops * RULES.keeper.catch);
      score.max += (invincibility) ? RULES.keeper.invincibility : 0;
      score.max += (!isHomeTeam) ? RULES.team.awayWin - RULES.team.homeWin : 0;
      score.average = (score.min + score.max) / 2;
    }

    // Assign potential score
    keeper.potentialScore = score;
  }

  /** Extract the number of goals this team can take according to given odds scores */
  private static getPossibleGoalsFromGames(scores: string[], isHomeTeam: boolean): number {
    let totalGoals = 0;

    // Extract number of goals from each scores and add it to total goals
    for (const score of scores) {
      if (score) {
        const goals = score.split(":");
        totalGoals += (isHomeTeam) ? parseInt(goals[1], 10) : parseInt(goals[0], 10);
      }
    }

    return totalGoals;
  }

  /** Read the wanted criteria from stats array */
  static readPlayerStat(stats: ILcdePlayersStatCriteria[], criteria: PlayerStatCriteria): number {
    for (const stat of stats) {
      if (stat.message === criteria) {
        return (stat.value === "") ? 0 : parseFloat(stat.value.toString());
      }
    }
  }
}