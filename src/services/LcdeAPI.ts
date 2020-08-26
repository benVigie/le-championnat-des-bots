import Axios, { Method } from "axios";
import * as chalk from "chalk";
// tslint:disable-next-line: max-line-length
import { IApiErrorResponse, IApiStatus, IApiStatusResponse, IApiFixturesResponse, IFixture, IApiPredictionsResponse, IApiBookmakerOddsResponse, IBookmakerBet, IBetValues, IApiRoundsResponse, IBookmaker, ILcdeInfos, ILcdePlayersApiResponse, ILcdePlayer } from "./types";
import ScoutBot from "../ScoutBot";
import Tools from "./Tools";

const GET = "GET";
const POST = "POST";

/** Team codes used by lcde */
const TEAM_CODE: any = {
  "Angers": 1,
  "Bordeaux": 2,
  "Stade Brestois 29": 3,
  "Dijon": 4,
  "Lens": 5,
  "Lille": 6,
  "Lorient": 7,
  "Lyon": 8,
  "Marseille": 9,
  "Metz": 10,
  "Monaco": 11,
  "Montpellier": 12,
  "Nantes": 13,
  "Nice": 14,
  "Nimes": 15,
  "Paris Saint Germain": 16,
  "Reims": 17,
  "Rennes": 18,
  "Saint Etienne": 19,
  "Strasbourg": 20,
}

/** LCDE API URL */
const LCDE_API_URL = "https://www.lechampionnatdesetoiles.fr/v1";


/** LcdeApi service manages calls to Le Championnat Des Etoiles rest API */
export default class LcdeApi {
  private _email: string;
  private _password: string;
  private _infos: ILcdeInfos;

  constructor(email: string, password: string) {
    this._email = email;
    this._password = password;
  }

  /** Get request header. LCDE deals with x-access-key and authorization */
  private get requestHeader(): any {
    const headers: any = {
      "x-access-key": "580@1@"
    };
    if (this._infos) headers.Authorization = `token ${this._infos.token}`;
    return headers;
  }

  /** Perform LCDE api request, and check the result */
  private async performsLcdeApiCall<T>(endpoint: string, method: Method, data?: any): Promise<T> {
    const response = await Axios.request({
      method,
      url: `${LCDE_API_URL}${endpoint}`,
      headers: this.requestHeader,
      data
    });

    // Sanity checks
    if (response.status !== 200) {
      throw new Error(`Unexpected API response status (${response.status})`);
    }
    return response.data;
  }

  /** Login the user and retrieve info */
  async login(): Promise<ILcdeInfos> {
    const data = {
      user: {
        "mail": this._email,
        "password": this._password,
        "fcmtoken": ""
      }
    };
    const apiResponse = await this.performsLcdeApiCall<any>("/public/login?lg=fr", POST, data);
    if (apiResponse.user) {
      this._infos = apiResponse.user as ILcdeInfos;
    }
    return this._infos;
  }

  /** Login the user and retrieve info */
  async getPlayersFromTeam(teamName: string, journee: string | number): Promise<ILcdePlayer[]> {
    const data = {
      filters: {
        "nom": "",
        "club": TEAM_CODE[teamName],
        "position": "",
        "budget_ok": false,
        "engage": false,
        "partant": false,
        "idj": journee,
        "pageIndex": 0,
        "pageSize": 30,
        "loadSelect": 0,
        "searchonly": 1
      }
    };
    const apiResponse = await this.performsLcdeApiCall<ILcdePlayersApiResponse>("/private/searchjoueurs?lg=fr", POST, data);
    return apiResponse.joueurs;
  }

}