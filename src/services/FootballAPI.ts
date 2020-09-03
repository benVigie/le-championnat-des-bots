import Axios from "axios";
import * as chalk from "chalk";
import { prompts } from "prompts";
// tslint:disable-next-line: max-line-length
import { IApiErrorResponse, IApiStatus, IApiStatusResponse, IApiFixturesResponse, IFixture, IApiPredictionsResponse, IApiBookmakerOddsResponse, IBookmakerBet, IBetValues, IApiRoundsResponse, IBookmaker, IApiStandingsResponse, ITeam, IStanding } from "./types";
import Tools from "./Tools";
import ScoutBot from "../ScoutBot";

/** Football API URL */
const FOOTBALL_API_URL = "https://v2.api-football.com";
/** ID of Ligue 1 Championship. Could be retrieved by the API bu it'll cost 1 API call and it will be the same for 2020/2021 season */
const LIGUE_1_ID = 2664;
/** Bokmakers list */
const BOOKMAKERS: IBookmaker[] = [
  { bookmaker_id: 1, bookmaker_name: "10bet" },
  { bookmaker_id: 6, bookmaker_name: "BWIN" },
  { bookmaker_id: 11, bookmaker_name: "1xbet" },
];

/** The FootballApi service manages calls to Football API rest API */
export default class FootballApi {
  private _apiToken: string;

  constructor(token: string) {
    this._apiToken = token;
  }

  /** Get request header. The Football API requires the token under X-RapidAPI-Key key */
  private get requestHeader(): any {
    return { "X-RapidAPI-Key": this._apiToken }
  }

  /** Perform a Football api request, and check the result */
  private async performsFootballApiCall<T>(endpoint: string): Promise<T> {
    const response = await Axios.get(`${FOOTBALL_API_URL}${endpoint}`, { headers: this.requestHeader })

    // Sanity checks
    if (response.status !== 200) {
      throw new Error(`Unexpected API response status (${response.status})`);
    }
    if (!response.data.api) {
      throw new Error(`Unexpected API response:\n${response.data.toString()}`);
    }
    if ((response.data.api as IApiErrorResponse).error) {
      throw new Error(`API response error:\n${(response.data.api as IApiErrorResponse).error}`);
    }
    return response.data.api
  }

  /** Get live API quota status */
  async getStatus(): Promise<IApiStatus> {
    const apiResponse = await this.performsFootballApiCall<IApiStatusResponse>("/status");
    return apiResponse.status;
  }

  /** Get the asked number of next games, ordered by date */
  async getNextGames(nbGames: number = 20): Promise<IFixture[]> {
    const apiResponse = await this.performsFootballApiCall<IApiFixturesResponse>(`/fixtures/league/${LIGUE_1_ID}/next/${nbGames}?timezone=Europe/Paris`);
    return apiResponse.fixtures;
  }

  /** Get all games for the current round */
  async getCurrentRoundGames(forceRound?: number): Promise<IFixture[]> {
    let round: string;
    if (forceRound) round = `Regular_Season_-_${forceRound}`;
    else {
      Tools.displayAction("Retrieving current round");
      const roundResponse = await this.performsFootballApiCall<IApiRoundsResponse>(`/fixtures/rounds/${LIGUE_1_ID}/current`);
      Tools.displayAction("Retrieving current round", true, !!roundResponse.fixtures.length);
      round = roundResponse.fixtures[0];

      if (ScoutBot.args.interactive) round = await this.confirmRound(round);
    }

    Tools.displayAction(`Retrieve round ${round} games`);
    const apiResponse = await this.performsFootballApiCall<IApiFixturesResponse>(`/fixtures/league/${LIGUE_1_ID}/${round}?timezone=Europe/Paris`);
    Tools.displayAction(`Retrieve round ${round} games`, true, !!apiResponse.fixtures.length);
    return apiResponse.fixtures;
  }

  /** Get pronostics for the given fixtures. Retrieve both Football API and bookmakers pronostics */
  async getAndAttachPronostics(games: IFixture[]): Promise<void> {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < games.length; i++) {
      // Retrieve pronostics and attach them
      Tools.displayAction(`Retrieving ${games[i].homeTeam.team_name} - ${games[i].awayTeam.team_name} predictions`);
      const pronosticsResponse = await this.performsFootballApiCall<IApiPredictionsResponse>(`/predictions/${games[i].fixture_id}`);
      Tools.displayAction(`Retrieving ${games[i].homeTeam.team_name} - ${games[i].awayTeam.team_name} predictions`, true, !!pronosticsResponse.predictions);
      if (pronosticsResponse.predictions[0]) {
        delete pronosticsResponse.predictions[0].h2h;
        games[i].pronostics = pronosticsResponse.predictions[0];
      }

      // Do the same for odds
      await this.getBookmakerOdds(games[i], 0);
    }
  }

  /** Get current league standings */
  async getAndAttachStandings(games: IFixture[]): Promise<void> {
    // Retrieve pronostics and attach them
    Tools.displayAction(`Retrieving league standings`);
    const standingsResponse = await this.performsFootballApiCall<IApiStandingsResponse>(`/leagueTable/${LIGUE_1_ID}`);
    if (standingsResponse.standings[0].length) {
      Tools.displayAction(`Retrieving league standings (last update ${standingsResponse.standings[0][0].lastUpdate})`, true, true);
      for (const game of games) {
        this.attachStandingToTeam(standingsResponse.standings[0], game.homeTeam);
        this.attachStandingToTeam(standingsResponse.standings[0], game.awayTeam);
      }
    }
    else Tools.displayAction(`Retrieving league standings`, true, false);
  }

  /** Retrieve bookmakers odds. If it fails, try the next bookie until we just have to stop :D */
  private async getBookmakerOdds(game: IFixture, bookmaker: number): Promise<void> {
    Tools.displayAction(`Retrieving ${game.homeTeam.team_name} - ${game.awayTeam.team_name} bookmakers (${BOOKMAKERS[bookmaker].bookmaker_name}) odds`);
    const bookiesResponse = await this.performsFootballApiCall<IApiBookmakerOddsResponse>(`/odds/fixture/${game.fixture_id}/bookmaker/${BOOKMAKERS[bookmaker].bookmaker_id}`);
    if (bookiesResponse.odds[0] && bookiesResponse.odds[0].bookmakers[0]) {
      game.odds = bookiesResponse.odds[0].bookmakers[0];
    }

    const retrieved = (game.odds !== undefined);
    Tools.displayAction(`Retrieving ${game.homeTeam.team_name} - ${game.awayTeam.team_name} bookmakers (${BOOKMAKERS[bookmaker].bookmaker_name}) odds`, true, retrieved);

    // If the current bookmaker is unavailable, try another one
    if (!retrieved) {
      if (++bookmaker < BOOKMAKERS.length) {
        return await this.getBookmakerOdds(game, bookmaker);
      }
      console.error(chalk`{bgRed No bookmaker's odds available.}`);
    }
  }

  /** get a list of standings and a team and match them */
  private attachStandingToTeam(standings: IStanding[], team: ITeam): void {
    for (const standing of standings) {
      if (team.team_id === standing.team_id) {
        team.standing = standing;
      }
    }
  }

  /** Retrieve the right bet values for the given odd list */
  getBet(list: IBookmakerBet[], oddType: string): IBetValues[] {
    for (const odd of list) {
      if (odd.label_name === oddType) return odd.values;
    }
    return [];
  }

  /** Confirm current league round with user before sending requests */
  private async confirmRound(round: string): Promise<string> {
    const split = round.split("_");
    const selectedRound = await prompts.number({
      type: "number",
      name: "value",
      message: "WHich round do you want to compute ?",
      initial: parseInt(split[split.length - 1], 10),
      style: "default",
      min: 1
    }) as unknown as number;
    return `Regular_Season_-_${selectedRound.toString()}`;
  }
}
