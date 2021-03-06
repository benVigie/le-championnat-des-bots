import { ILcdePlayer } from "../services/types";

export interface IPlayerList {
  keepers: ILcdePlayer[];
  backs: ILcdePlayer[];
  midfields: ILcdePlayer[];
  strikers: ILcdePlayer[];
}

export enum PlayerStatCriteria {
  NbGames = "Nombre de matchs",
  GoalsTaken = "Buts encaissés",
  Caught = "Arrêts",
  GoalsScored = "Buts marqués",
  Assists = "Passes décisives",
  YellowCard = "Cartons jaunes",
  RedCard = "Cartons rouges",
  Tackle = "Tacles réussis",
  AveragePoints = "Moyenne des points",
}