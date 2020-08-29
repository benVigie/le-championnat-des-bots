import { IFixture, MatchWinner, IPotentialScore } from "../services/types";

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
  }
};

/**
 * This service will compute expected min/max score a team or player can earn in a game
 * By score I mean championnat des etoiles score
 */
export default class ScoreCalculator {

  /** Get min/max score this team should win */
  getPotentialTeamScores(game: IFixture): void {
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
}
