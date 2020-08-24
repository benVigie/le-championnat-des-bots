import * as chalk from "chalk";
import FootballApi from "./FootballAPI";
import { IFixture, IStrategyResult, IPrediction, IBookmaker, BetTypes, MatchWinner, IBetValueNumber, EndGameType, NO_PREDICTION_AVAILABLE } from "./types";
import ScoreCalculator from "./ScoreCalculator";

/** This const define the trust level on odds difference. If the difference between the 2 closer odds are more than this trigger, we think it's good enough to have a winner */
export const ODD_DIFFERENCE_TRUST_LEVEL = 1.4;
/** Odds difference too small to risk a bet */
export const ODD_DIFFERENCE_TOO_SMALL = 1;

/** Regroup all strategy methods: sort, players, etc... */
export default class Strategy {
  private _api: FootballApi;
  private _scoreCalculator: ScoreCalculator;

  constructor(api: FootballApi) {
    this._api = api;
    this._scoreCalculator = new ScoreCalculator();
  }

  /** Sort the given fixture array by bookmakers odds */
  sortGamesByOdds(fixtures: IFixture[]): IFixture[] {
    for (const game of fixtures) {
      if (game.odds) {
        game.strategy = this.compareOddsAndPronostics(game.pronostics, game.odds);
        this._scoreCalculator.getPotentialTeamScores(game);
      }
      else console.error(chalk`{bgRed No odds for ${game.homeTeam.team_name} - ${game.awayTeam.team_name}. The strategy cannot be computed.}`);
    }

    // Sort teams by odds gap
    return fixtures.sort((a, b) => b.strategy?.oddGap - a.strategy?.oddGap);
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
      if (odds[1].value === EndGameType.Away) return MatchWinner.Home;
      if (odds[1].value === EndGameType.Draw && oddGap >= ODD_DIFFERENCE_TRUST_LEVEL) return MatchWinner.Home;
      if (odds[1].value === EndGameType.Draw && oddGap < ODD_DIFFERENCE_TRUST_LEVEL) return MatchWinner.HomeOrDraw;
    }
    if (odds[0].value === EndGameType.Away) {
      if (odds[1].value === EndGameType.Home) return MatchWinner.Away;
      if (odds[1].value === EndGameType.Draw && oddGap >= ODD_DIFFERENCE_TRUST_LEVEL) return MatchWinner.Away;
      if (odds[1].value === EndGameType.Draw && oddGap < ODD_DIFFERENCE_TRUST_LEVEL) return MatchWinner.AwayOrDraw;
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
}
