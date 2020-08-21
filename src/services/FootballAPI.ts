import Axios from "axios";
import { IApiErrorResponse, IApiStatus, IApiStatusResponse, IApiFixturesResponse, IFixture, IApiPredictionsResponse, IApiBookmakerOddsResponse, IBookmakerBet, IBetValues, IApiRoundsResponse } from "./types";

/** Football API URL */
const FOOTBALL_API_URL = "https://v2.api-football.com";
/** ID of Ligue 1 Championship. Could be retrieved by the API bu it'll cost 1 API call and it will be the same for 2020/2021 season */
const LIGUE_1_ID = 2664;
/** BWIN bookmaker ID */
const BOOKMAKER_ID = 6;

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
  async getCurrentRoundGames(): Promise<IFixture[]> {
    const roundResponse = await this.performsFootballApiCall<IApiRoundsResponse>(`/fixtures/rounds/${LIGUE_1_ID}/current`);
    const round = roundResponse.fixtures[0];
    const apiResponse = await this.performsFootballApiCall<IApiFixturesResponse>(`/fixtures/league/${LIGUE_1_ID}/${round}?timezone=Europe/Paris`);
    return apiResponse.fixtures;
  }

  /** Get pronostics for the given fixtures. Retrieve both Football API and bookmakers pronostics */
  async getAndAttachPronostics(games: IFixture[]): Promise<void> {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < games.length; i++) {
      // Retrieve pronostics and attach them
      const pronosticsResponse = await this.performsFootballApiCall<IApiPredictionsResponse>(`/predictions/${games[i].fixture_id}`);
      if (pronosticsResponse.predictions[0]) {
        games[i].pronostics = pronosticsResponse.predictions[0];
      }

      // Do the same for odds
      const bookiesResponse = await this.performsFootballApiCall<IApiBookmakerOddsResponse>(`/odds/fixture/${games[i].fixture_id}/bookmaker/${BOOKMAKER_ID}`);
      if (bookiesResponse.odds[0] && bookiesResponse.odds[0].bookmakers[0]) {
        games[i].odds = bookiesResponse.odds[0].bookmakers[0];
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
}
