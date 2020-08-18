/** All different kind of bets */
export enum BetTypes {
  MatchWinner = "Match Winner",
  ExactScore = "Exact Score",
  TotalHome = "Total - Home",
  TotalAway = "Total - Away",
  HomeTeamScore = "Home Team Score a Goal",
  AwayTeamScore = "Away Team Score a Goal",
  HomeAway = "Home/Away",
  BothTeamsScore = "Both Teams Score",
}

/** Football API status */
export interface IApiStatus {
  user: string,
  email: string,
  plan: string,
  requests: number,
  requests_limit_day: number,
}

/** Football API league */
export interface ILeague {
  name: string;
  country: string;
  logo: string;
  flag: string;
}

/** Football API team */
export interface ITeam {
  team_id: number;
  team_name: string;
  logo?: string;
}

interface ITeamStatTotal {
  home: number;
  away: number;
  total: number;
}
interface ITeamStatAverage {
  home: string;
  away: string;
  total: string;
}
interface ITeamsComparaison {
  home: string;
  away: string;
}

/** Football API team statistics */
export interface ITeamStats extends ITeam {
  last_5_matches: {
    forme: string;
    att: string;
    def: string;
    goals: number;
    goals_avg: number;
    goals_against: number;
    goals_against_avg: number;
  };
  all_last_matches: {
    matchs: {
      matchsPlayed: ITeamStatTotal;
      wins: ITeamStatTotal;
      draws: ITeamStatTotal;
      loses: ITeamStatTotal;
    };
    goals: {
      goalsFor: ITeamStatTotal;
      goalsAgainst: ITeamStatTotal;
    };
    goalsAvg: {
      goalsFor: ITeamStatAverage;
      goalsAgainst: ITeamStatAverage;
    }
  };
  last_h2h: {
    played: ITeamStatTotal;
    wins: ITeamStatTotal;
    draws: ITeamStatTotal;
    loses: ITeamStatTotal;
  }
}

/** Football API score */
export interface IScore {
  halftime: string;
  fulltime: string;
  extratime: string;
  penalty: string;
}

/** Football API fixture. Basically all game info/stats */
export interface IFixture {
  fixture_id: number;
  league_id: number;
  league: ILeague;
  event_date: string;
  event_timestamp: number;
  firstHalfStart: null;
  secondHalfStart: null;
  round: string;
  status: string;
  statusShort: string;
  elapsed: number;
  venue: string;
  homeTeam: ITeam;
  awayTeam: ITeam;
  goalsHomeTeam: number;
  goalsAwayTeam: number;
  score: IScore;
  pronostics?: IPrediction;
  odds?: IBookmaker;
}

/** Football API prediction. Based on their data */
export interface IPrediction {
  match_winner: string,
  under_over: string,
  goals_home: string,
  goals_away: string,
  advice: string,
  winning_percent: {
    home: string,
    draws: string,
    away: string
  },
  teams: {
    home: ITeamStats;
    away: ITeamStats;
  };
  comparison: {
    forme: ITeamsComparaison;
    att: ITeamsComparaison;
    def: ITeamsComparaison;
    fish_law: ITeamsComparaison;
    h2h: ITeamsComparaison;
    goals_h2h: ITeamsComparaison;
  }
}

export interface IBookmakerBet {
  label_id: number;
  label_name: string;
  values: IBetValues[];
}

/** Football API bookmaker odds */
export interface IBookmaker {
  bookmaker_id: number;
  bookmaker_name: string;
  bets: IBookmakerBet[];
}

interface IOdds {
  fixture: IFixture;
  bookmakers: IBookmaker[];
}

/** Bet value (name) and odd */
export interface IBetValues {
  value: string;
  odd: string;
}

/** Api error response interface */
export interface IApiResponse {
  results: number;
}

/** Api error response interface */
export interface IApiErrorResponse extends IApiResponse {
  error: string;
}


/** Api status response interface */
export interface IApiStatusResponse extends IApiResponse {
  status: IApiStatus;
}

/** Api fixtures response interface */
export interface IApiFixturesResponse extends IApiResponse {
  fixtures: IFixture[];
}

/** Api predictions response interface */
export interface IApiPredictionsResponse extends IApiResponse {
  predictions: IPrediction[];
}

/** Api bookmaker odds response interface */
export interface IApiBookmakerOddsResponse extends IApiResponse {
  odds: IOdds[];
}