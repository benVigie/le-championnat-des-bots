import Axios, { Method } from "axios";
// tslint:disable-next-line: max-line-length
import { ILcdeInfos, ILcdePlayer, ILcdePlayersApiResponse, ILcdePlayersStats, ILcdePlayersStatsApiResponse, ILcdeRoundApiResponse, ILcdeStandings, ILcdeTeamApiResponse, LcdePlayerActions, LcdePlayerActionsBuyData, LcdePlayerActionsMoveData } from "./types";

const GET = "GET";
const POST = "POST";
const DATA_LIMIT = 30;

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
  private _currentRound: ILcdeRoundApiResponse;

  constructor(email: string, password: string) {
    this._email = email;
    this._password = password;
  }

  /** To know if the user has been logegd and the api is ready */
  get isLogged(): boolean {
    return !!this._infos;
  }

  /** Get LCDE user infos  */
  get userInfo(): ILcdeInfos {
    return this._infos;
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

  /** Login the user and retrieve info.  */
  async getPlayersFromTeam<T>(teamName: string, journee: string | number): Promise<T[]> {
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
        "pageSize": DATA_LIMIT,
        "loadSelect": 0,
        "searchonly": 1
      }
    };
    const apiResponse = await this.performsLcdeApiCall<ILcdePlayersApiResponse>("/private/searchjoueurs?lg=fr", POST, data);
    return apiResponse.joueurs as unknown as T[];
  }

  /** Login the user and retrieve info.  */
  async getTeamPlayersStatistics(teamName: string): Promise<ILcdePlayersStats[]> {
    const data = {
      credentials: {
        critereRecherche: { club: TEAM_CODE[teamName], nom: "", position: "" },
        critereTri: "moyenne_points",
        loadSelect: 0,
        pageIndex: 0,
        pageSize: DATA_LIMIT
      }
    };

    const apiResponse = await this.performsLcdeApiCall<ILcdePlayersStatsApiResponse>("/private/stats?lg=fr", POST, data);
    return apiResponse.joueurs;
  }

  /** Get the current round */
  async getCurrentRound(): Promise<ILcdeRoundApiResponse> {
    if (!this._currentRound) {
      const round = await this.performsLcdeApiCall<ILcdeRoundApiResponse>("/private/journee?lg=fr", GET);
      this._currentRound = round;
    }
    return this._currentRound
  }

  /** Retrieve the gamer's current team */
  async getMyTeam(): Promise<ILcdeStandings> {
    const round = await this.getCurrentRound();
    const apiResponse = await this.performsLcdeApiCall<ILcdeTeamApiResponse>(`/private/feuillematch/${round.journee.id}/${this.userInfo.idjg}?lg=fr`, GET);
    return apiResponse.feuille;
  }

  /** Execute an action (Sell, buy, etc...) on the given player */
  async playerAction(player: ILcdePlayer, action: LcdePlayerActions, actionData?: LcdePlayerActionsBuyData | LcdePlayerActionsMoveData): Promise<ILcdeStandings> {
    if (action === LcdePlayerActions.Buy && !actionData) throw new Error("Missing LcdePlayerActionsBuyData parameter");
    if (action === LcdePlayerActions.Move && !actionData) throw new Error("Missing LcdePlayerActionsMoveData parameter");

    const round = await this.getCurrentRound();
    const data = {
      credentials: {
        action,
        idj: round.journee.id,
        idf: player.id,
        ...actionData,
      }
    };

    // Default endpoint, for buy/sell
    let endpoint = "actionsurjoueur";
    if (action === LcdePlayerActions.Move) endpoint = "deplacejoueur";
    if (action === LcdePlayerActions.SetCaptain) endpoint = "setrolejoueur";

    const apiResponse = await this.performsLcdeApiCall<ILcdeTeamApiResponse>(`/private/${endpoint}?lg=fr`, POST, data);
    return apiResponse.feuille;
  }

}
