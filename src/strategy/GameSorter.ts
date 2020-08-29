import * as chalk from "chalk";
import { prompts } from "prompts";
import FootballApi from "../services/FootballAPI";
import { IFixture, IStrategyResult, IPrediction, IBookmaker, BetTypes, MatchWinner, IBetValueNumber, EndGameType, NO_PREDICTION_AVAILABLE, ITeam, ITeamAndGame } from "../services/types";
import ScoreCalculator from "./ScoreCalculator";

/** This const define the trust level on odds difference. If the difference between the 2 closer odds are more than this trigger, we think it's good enough to have a winner */
export const ODD_DIFFERENCE_TRUST_LEVEL = 1.4;
/** Odds difference too small to risk a bet */
export const ODD_DIFFERENCE_TOO_SMALL = 1;

/** Regroup all sort strategies for games and teams */
export default class GameSorter {
  private _api: FootballApi;
  private _scoreCalculator: ScoreCalculator;

  constructor(api: FootballApi) {
    this._api = api;
    this._scoreCalculator = new ScoreCalculator();
  }

  /** Sort the given fixture array by bookmakers odds */
  async sortGamesByOdds(fixtures: IFixture[], interactive: boolean): Promise<IFixture[]> {
    for (let game of fixtures) {
      if (!game.odds && interactive) {
        game = await this.askForUserOdds(game);
      }
      if (game.odds) {
        game.strategy = this.compareOddsAndPronostics(game.pronostics, game.odds);
        this._scoreCalculator.getPotentialTeamScores(game);
      }
      else console.error(chalk`{bgRed No odds for ${game.homeTeam.team_name} - ${game.awayTeam.team_name}. The strategy cannot be computed.}`);
    }

    // Sort teams by odds gap
    return fixtures.sort((a, b) => {
      if (!a.strategy) return 1;
      if (!b.strategy) return -1;
      return b.strategy?.oddGap - a.strategy?.oddGap
    });
  }

  /** Sort the given fixture array by expected team scores */
  sortTeamsByPoints(fixtures: IFixture[]): ITeamAndGame[] {
    const teams = this.getTeamsAndGame(fixtures);

    // Sort teams by odds gap
    return teams.sort((teamA, teamB) => {
      if (!teamA.potentialScore) return 1;
      if (!teamB.potentialScore) return -1;

      // Compares points average. If they are the same, compares odds gap
      if (teamA.potentialScore.average === teamB.potentialScore.average) {
        return teamB.game.strategy.oddGap - teamA.game.strategy.oddGap;
      }

      return teamB.potentialScore.average - teamA.potentialScore.average;
    });
  }

  /** Extract data from odds and pronostics and return a IStrategyResult */
  private compareOddsAndPronostics(predictions: IPrediction, odds: IBookmaker): IStrategyResult {
    // Retrieve bet match winner
    const bet = this._api.getBet(odds.bets, BetTypes.MatchWinner);
    if (bet.length === 0) return null;

    // Extract odds and sort from the smaller (aka most possible situation) to the greater (less possible situation)
    let compareOdds = bet.map(betOdd => {
      return { value: betOdd.value, odd: parseFloat(betOdd.odd) } as IBetValueNumber;
    });
    compareOdds = compareOdds.sort((a, b) => { return a.odd - b.odd });
    const oddGap = compareOdds[1].odd - compareOdds[0].odd;
    const oddMatchWinner = this.getMatchWinner(compareOdds, oddGap);

    return {
      oddGap,
      oddMatchWinner,
      confidence: this.getConfidence(predictions, oddMatchWinner, odds, oddGap),
      expectedScores: this.getBookmakerExpectedScores(odds),
    }
  }

  /** Retrieve the match winner according to odds comparaison */
  private getMatchWinner(odds: IBetValueNumber[], oddGap: number): MatchWinner {
    if (odds[0].value === EndGameType.Home) {
      if (oddGap >= ODD_DIFFERENCE_TRUST_LEVEL) return MatchWinner.Home;
      return MatchWinner.HomeOrDraw
    }
    if (odds[0].value === EndGameType.Away) {
      if (oddGap >= ODD_DIFFERENCE_TRUST_LEVEL) return MatchWinner.Away;
      return MatchWinner.AwayOrDraw;
    }
    return MatchWinner.Draw;
  }

  /** Retrieve the match winner according to odds comparaison */
  private getConfidence(predictions: IPrediction, oddWinner: MatchWinner, odds: IBookmaker, oddGap: number): number {
    // Gap score
    let confidenceScore = ((oddGap - 1) * 100) > 100 ? 100 : ((oddGap - 1) * 100);

    // Add points if pronostics and odds points to the same winner
    if (oddWinner === predictions.match_winner || predictions.advice === NO_PREDICTION_AVAILABLE) confidenceScore += 20;

    // Add points if goals odds are the same as match winner
    const scores = this.getBookmakerExpectedScores(odds);
    const [homeScore, awayScore] = scores[0].split(":");
    let scoreExpectedWinner = MatchWinner.Draw;
    if (homeScore > awayScore) scoreExpectedWinner = MatchWinner.Home;
    if (homeScore < awayScore) scoreExpectedWinner = MatchWinner.Away;

    if (oddWinner === scoreExpectedWinner) confidenceScore += 25;

    return Math.round(confidenceScore / 145 * 100);
  }

  /** Retrieve the match winner according to odds comparaison */
  private getBookmakerExpectedScores(odds: IBookmaker): string[] {
    let bet = this._api.getBet(odds.bets, BetTypes.ExactScore)
    bet = bet.sort((a, b) => { return parseFloat(a.odd) - parseFloat(b.odd) });
    if (bet.length) return [`${bet[0].value}: ${bet[0].odd}`, `${bet[1].value}: ${bet[1].odd}`, `${bet[2].value}: ${bet[2].odd}`, `${bet[3].value}: ${bet[3].odd}`];
    return [];
  }

  /** Retrieve teams list from fixture */
  private getTeamsAndGame(games: IFixture[]): ITeamAndGame[] {
    const teams: ITeamAndGame[] = [];

    for (const game of games) {
      teams.push({ ...game.homeTeam, game });
      teams.push({ ...game.awayTeam, game });
    }
    return teams;
  }

  /** If we can't retrieve pronostics for a game, ask the user if he wants these theams in the evaluation */
  private async askForUserOdds(fixture: IFixture): Promise<IFixture> {
    // Ask if the user wants to evaluate the game
    const evaluate = await prompts.toggle({
      type: 'toggle',
      name: 'value',
      message: `${fixture.homeTeam.team_name} - ${fixture.awayTeam.team_name} has no bookmaker odds. Do you want to evaluate them manually ?`,
      initial: true,
      active: 'yes',
      inactive: 'no'
    }) as unknown as boolean;

    if (evaluate) {
      const userOdds = await prompts.select({
        type: 'select',
        name: 'value',
        message: "So, what's your guess ?",
        choices: [
          { title: `${fixture.homeTeam.team_name} win 100% sure !`, description: 'Will be evaluate as a home win 1-0', value: MatchWinner.Home },
          { title: `${fixture.homeTeam.team_name} win, but it's a Ligue 1 game dude...`, description: 'Will be evaluate as a home win or draw', value: MatchWinner.HomeOrDraw },
          { title: `${fixture.awayTeam.team_name} easy win, go boys !`, description: 'Will be evaluate as an away win 0-1', value: MatchWinner.Away },
          { title: `${fixture.awayTeam.team_name} win, but I'm not so sure...`, description: 'Will be evaluate as an away win or draw', value: MatchWinner.AwayOrDraw },
        ],
        initial: 0
      }) as unknown as string;

      fixture.odds = { bookmaker_name: "User guess", bookmaker_id: 0, bets: [] };
      switch (userOdds) {
        case MatchWinner.Home:
          fixture.odds.bets.push({ label_id: 1, label_name: BetTypes.MatchWinner, values: [{ value: "Home", odd: "0" }, { value: "Draw", odd: ODD_DIFFERENCE_TRUST_LEVEL.toString() }, { value: "Away", odd: "5" }] });
          fixture.odds.bets.push({ label_id: 10, label_name: BetTypes.ExactScore, values: [{ value: "1:0", odd: "0" }, { value: "1:0", odd: "1" }, { value: "1:0", odd: "2" }, { value: "1:0", odd: "3" }] });
          break;
        case MatchWinner.HomeOrDraw:
          fixture.odds.bets.push({ label_id: 1, label_name: BetTypes.MatchWinner, values: [{ value: "Home", odd: "0" }, { value: "Draw", odd: (ODD_DIFFERENCE_TOO_SMALL + 0.1).toString() }, { value: "Away", odd: "5" }] });
          fixture.odds.bets.push({ label_id: 10, label_name: BetTypes.ExactScore, values: [{ value: "0:0", odd: "0" }, { value: "0:0", odd: "1" }, { value: "0:0", odd: "2" }, { value: "0:0", odd: "3" }] });
          break;
        case MatchWinner.Away:
          fixture.odds.bets.push({ label_id: 1, label_name: BetTypes.MatchWinner, values: [{ value: "Away", odd: "0" }, { value: "Draw", odd: ODD_DIFFERENCE_TRUST_LEVEL.toString() }, { value: "Home", odd: "5" }] });
          fixture.odds.bets.push({ label_id: 10, label_name: BetTypes.ExactScore, values: [{ value: "0:1", odd: "0" }, { value: "0:1", odd: "1" }, { value: "0:1", odd: "2" }, { value: "0:1", odd: "3" }] });
          break;
        case MatchWinner.AwayOrDraw:
          fixture.odds.bets.push({ label_id: 1, label_name: BetTypes.MatchWinner, values: [{ value: "Away", odd: "0" }, { value: "Draw", odd: (ODD_DIFFERENCE_TOO_SMALL + 0.1).toString() }, { value: "Home", odd: "5" }] });
          fixture.odds.bets.push({ label_id: 10, label_name: BetTypes.ExactScore, values: [{ value: "0:0", odd: "0" }, { value: "0:0", odd: "1" }, { value: "0:0", odd: "2" }, { value: "0:0", odd: "3" }] });
          break;
      }
    }
    return fixture;
  }

}
