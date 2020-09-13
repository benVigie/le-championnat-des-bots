import { IFixture, MatchWinner, IPotentialScore, ILcdePlayer, ILcdePlayersStatCriteria, IBookmakerBet, IBetValues, BetTypes } from "../services/types";
import { PlayerStatCriteria } from "./types";
import { ODD_DIFFERENCE_TOO_SMALL } from "./GameSorter";
import Helper from "./Helper";

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
    invincibility: 6,
    tackle: 3
  },
  midfield: {
    goal: 15,
    tackle: 2,
    assist: 8
  },
  striker: {
    goal: 12,
    tackle: 2,
    assist: 6
  },
  cards: {
    yellow: -3,
    red: -5
  }
};

/** Goal ratio limit by which we think a goal should not appear  */
const GOAL_RATIO_INVINCIBILITY_LIMIT = 0.3;

/**
 * This service will compute expected min/max score a team or player can earn in a game
 * By score I mean championnat des etoiles score
 */
export default class ScoreCalculator {

  /** Compute min/max and average score this team can win */
  static computePotentialTeamScores(game: IFixture): void {
    if (!game.strategy || !game.strategy.expectedScores) return null;

    game.homeTeam.potentialScore = this.getScoreForGame(game.strategy.oddMatchWinner, game.strategy.goalRatio, true);
    game.awayTeam.potentialScore = this.getScoreForGame(game.strategy.oddMatchWinner, game.strategy.goalRatio, false);
  }

  /** Compute min/max and average score this keeper can win */
  static computePotentialKeeperScore(keeper: ILcdePlayer): void {
    if (!keeper.teamAndGame.game?.strategy?.expectedScores) return null;
    const strategy = keeper.teamAndGame.game.strategy;

    // Get usefull info
    const isHomeTeam = Helper.isHomeTeam(keeper);
    const goalRatio = Helper.getGoalRatio(keeper);
    const invincibility = (goalRatio <= GOAL_RATIO_INVINCIBILITY_LIMIT) ? RULES.keeper.invincibility : 0;

    // compute possible points
    const score = this.getScoreForGame(strategy.oddMatchWinner, strategy.goalRatio, isHomeTeam);
    // Add the invincibility bonus if the goal ratio is close to 0 and the odd confident enough
    if (invincibility && strategy.oddGap > ODD_DIFFERENCE_TOO_SMALL) {
      score.max += RULES.keeper.invincibility;
    }

    // Assign potential score
    score.average = (score.min + score.max) / 2;
    keeper.potentialScore = score;
  }

  /** Compute min/max and average score this back can win */
  static computePotentialBackScore(back: ILcdePlayer): void {
    if (!back.teamAndGame.game?.strategy?.expectedScores) return null;
    const strategy = back.teamAndGame.game.strategy;

    // Get usefull info
    const isHomeTeam = Helper.isHomeTeam(back);
    const goalRatio = Helper.getGoalRatio(back);
    const invincibility = (goalRatio <= GOAL_RATIO_INVINCIBILITY_LIMIT) ? RULES.back.invincibility : 0;

    // Compute possible points
    const score = this.getScoreForGame(strategy.oddMatchWinner, strategy.goalRatio, isHomeTeam);
    if (invincibility && strategy.oddGap > ODD_DIFFERENCE_TOO_SMALL) {
      score.max += RULES.back.invincibility;
    }

    const nbGames = Helper.readPlayerStat(back.stats, PlayerStatCriteria.NbGames);
    const nbGoals = Helper.readPlayerStat(back.stats, PlayerStatCriteria.GoalsScored);
    const nbTackles = Helper.readPlayerStat(back.stats, PlayerStatCriteria.Tackle);
    if (nbGoals) score.max += (nbGoals / nbGames) * RULES.back.goal;
    if (nbTackles) score.max += (nbTackles / nbGames) * RULES.back.tackle;

    // Assign potential score
    score.average = (score.min + score.max) / 2;
    back.potentialScore = score;
  }

  /** Compute min/max and average score this midfield can win */
  static computePotentialMidfieldScore(midfield: ILcdePlayer): void {
    if (!midfield.teamAndGame.game?.strategy?.expectedScores) return null;

    // Get usefull info
    const goalRatio = Helper.getGoalRatio(midfield);
    const nbGames = Helper.readPlayerStat(midfield.stats, PlayerStatCriteria.NbGames);
    const nbGoals = Helper.readPlayerStat(midfield.stats, PlayerStatCriteria.GoalsScored);
    const nbAssists = Helper.readPlayerStat(midfield.stats, PlayerStatCriteria.Assists);
    const nbTackles = Helper.readPlayerStat(midfield.stats, PlayerStatCriteria.Tackle);
    const nbYellow = Helper.readPlayerStat(midfield.stats, PlayerStatCriteria.YellowCard);
    const nbRed = Helper.readPlayerStat(midfield.stats, PlayerStatCriteria.RedCard);

    // Forwards are noted according to their individual actions, not the game score.
    const score: IPotentialScore = { min: nbGames, max: nbGames, average: 0 };

    if (nbGoals) score.max += (nbGoals / nbGames) * RULES.midfield.goal * goalRatio;
    if (nbAssists) score.max += (nbAssists / nbGames) * RULES.midfield.assist * goalRatio;
    if (nbTackles) score.max += (nbTackles / nbGames) * RULES.midfield.tackle;
    if (nbYellow) score.min += (nbYellow / nbGames) * RULES.cards.yellow;
    if (nbRed) score.min += (nbRed / nbGames) * RULES.cards.red;

    // Assign potential score
    score.average = (score.min + score.max) / 2;
    midfield.potentialScore = score;
  }

  /** Compute min/max and average score this striker can win */
  static computePotentialStrikerScore(striker: ILcdePlayer): void {
    if (!striker.teamAndGame.game?.strategy?.expectedScores) return null;

    // Get usefull info
    const goalRatio = Helper.getGoalRatio(striker);
    const nbGames = Helper.readPlayerStat(striker.stats, PlayerStatCriteria.NbGames);
    const nbGoals = Helper.readPlayerStat(striker.stats, PlayerStatCriteria.GoalsScored);
    const nbAssists = Helper.readPlayerStat(striker.stats, PlayerStatCriteria.Assists);
    const nbTackles = Helper.readPlayerStat(striker.stats, PlayerStatCriteria.Tackle);
    const nbYellow = Helper.readPlayerStat(striker.stats, PlayerStatCriteria.YellowCard);
    const nbRed = Helper.readPlayerStat(striker.stats, PlayerStatCriteria.RedCard);

    // Strikers are noted according to their individual actions, not the game score.
    const score: IPotentialScore = { min: nbGames, max: nbGames, average: 0 };

    if (nbGoals) score.max += (nbGoals / nbGames) * RULES.striker.goal * goalRatio;
    if (nbAssists) score.max += (nbAssists / nbGames) * RULES.striker.assist * goalRatio;
    if (nbTackles) score.max += (nbTackles / nbGames) * RULES.striker.tackle;
    if (nbYellow) score.min += (nbYellow / nbGames) * RULES.cards.yellow;
    if (nbRed) score.min += (nbRed / nbGames) * RULES.cards.red;

    // Assign potential score
    score.average = (score.min + score.max) / 2;
    striker.potentialScore = score;
  }

  /** Get default potential score according game result */
  private static getScoreForGame(matchWinner: MatchWinner, goalRatio: [number, number], isHomeTeam: boolean): IPotentialScore {
    const score: IPotentialScore = { min: 0, max: 0, average: 0 };

    switch (matchWinner) {
      case MatchWinner.Home:
        if (isHomeTeam) score.min = score.max = RULES.team.homeWin;
        else score.min = score.max = RULES.team.awayLoose;
        break;
      case MatchWinner.Away:
        if (isHomeTeam) score.min = score.max = RULES.team.homeLoose;
        else score.min = score.max = RULES.team.awayWin;
        break;
      case MatchWinner.HomeOrDraw:
        if (isHomeTeam) {
          score.min = RULES.team.homeDraw;
          score.max = RULES.team.homeWin;
        } else {
          score.min = RULES.team.awayLoose;
          score.max = RULES.team.awayDraw;
        }
        break;
      case MatchWinner.AwayOrDraw:
        if (isHomeTeam) {
          score.min = RULES.team.homeLoose;
          score.max = RULES.team.homeDraw;
        } else {
          score.min = RULES.team.awayDraw;
          score.max = RULES.team.awayWin;
        }
        break;
      default:
        if (isHomeTeam) score.min = score.max = RULES.team.homeDraw;
        else score.min = score.max = RULES.team.awayDraw;
    }

    // Adding goal ratio
    if (isHomeTeam) {
      score.min -= goalRatio[1] * RULES.team.pointPerGoalDifference;
      score.max += goalRatio[0] * RULES.team.pointPerGoalDifference;
    } else {
      score.min -= goalRatio[0] * RULES.team.pointPerGoalDifference;
      score.max += goalRatio[1] * RULES.team.pointPerGoalDifference;
    }
    score.average = (score.min + score.max) / 2;

    return score;
  }

  /** The goal ratio is computed according to odds scores. It's the sum of the most expected scores ponderated by their odds */
  static getGoalRatio(bookmakerBets: IBookmakerBet[]): [number, number] {
    let homeGoals = 0;
    let awayGoals = 0;
    let ponderation = 1;
    let totalGames = 0;

    // Retrieve the bookmakers exact scores
    const scoreList = Helper.getBet(bookmakerBets, BetTypes.ExactScore).sort((a, b) => { return parseFloat(a.odd) - parseFloat(b.odd) });
    if (!scoreList.length) return [0, 0];

    // Retrieve the max odds limit (aka the most valuable 1 rouded + 1) and its value to perform the ponderation
    const maxOdd = Math.ceil(parseFloat(scoreList[0].odd)) + 1;
    let latestOddValue = scoreList[0].odd;

    // Extract number of goals from each scores and add it to total goals
    for (const score of scoreList) {
      const odd = parseFloat(score.odd);

      // If the new odd is so far from the first one, no need to tka it in computation
      if (odd > maxOdd) break;

      // If the odds are different than the previous one, it means it's a less expected possibility. So decrease the ponderation
      if (score.odd !== latestOddValue) {
        latestOddValue = score.odd;
        ponderation -= 0.25;
      }

      // Add goals ponderated by their odds expectations
      const goals = score.value.split(":");
      homeGoals += parseInt(goals[0], 10) * ponderation;
      awayGoals += parseInt(goals[1], 10) * ponderation;
      totalGames += ponderation;
    }

    return [homeGoals / totalGames, awayGoals / totalGames];
  }
}
