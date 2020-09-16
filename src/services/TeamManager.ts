import { prompts } from "prompts";
import { IPlayerList } from "../strategy/types";
import LcdeApi from "./LcdeAPI";
import Tools from "./Tools";
import { ILcdePlayer, ILcdeStandings, LcdePlayerActions, LcdePosition } from "./types";

/** Team Manager service can perform actions on the LCDE player's team */
export default class TeamManager {
  private _api: LcdeApi;
  private _standings: ILcdeStandings;

  constructor(api: LcdeApi) {
    this._api = api;
  }

  /** Retrieve gamer's standings */
  get standings(): ILcdeStandings {
    return this._standings;
  }

  /** Retrieve the gamer's team from LCDE and replace players with our extended data players */
  async getTeam(playerList: IPlayerList): Promise<ILcdeStandings> {
    const standings = await this._api.getMyTeam();

    standings.postes.forEach((player, index, list) => {
      if (player.position === LcdePosition.Keeper) list[index] = this.searchPlayerInList(player, playerList.keepers);
      if (player.position === LcdePosition.Back) list[index] = this.searchPlayerInList(player, playerList.backs);
      if (player.position === LcdePosition.Midfield) list[index] = this.searchPlayerInList(player, playerList.midfields);
      if (player.position === LcdePosition.Striker) list[index] = this.searchPlayerInList(player, playerList.strikers);
    });

    this._standings = standings;
    return this._standings;
  }

  /** Search in gamer's team which player will likely lose their game and ask if he wants to remove them */
  async removeLosers(): Promise<void> {
    // First, find losers. They will have no points attached.
    const losers = [];
    for (const player of this.standings.postes) {
      if (player.id && !player.potentialScore) {
        losers.push({ title: `${player.nom} (${player.club})`, value: player });
      }
    }

    // If we have some, prompt the user if he wants to remove them
    if (losers.length) {
      const playersToRemove = await prompts.multiselect({
        type: 'multiselect',
        name: 'value',
        message: "Il semblerait que ces blaireaux vont prendre une piquette... Est ce qu'on les revend ?",
        choices: losers,
        hint: "",
      }) as unknown as ILcdePlayer[];

      // If so, confirm by security. Then proceed
      if (playersToRemove.length) {
        const names = playersToRemove.map(player => `, ${player.nom} (${player.club})`)
        const evaluate = await prompts.toggle({
          type: 'toggle',
          name: 'value',
          message: `Wow, ca c'est un coach qui a des couilles ! Valider la revente de${names} ?`,
          active: 'yes',
          inactive: 'no'
        }) as unknown as boolean;

        if (evaluate) {
          for (const player of playersToRemove) {
            Tools.displayAction(`Bye bye ${player.nom}`);
            await this._api.playerAction(player, LcdePlayerActions.Sell)
            Tools.displayAction(`Bye bye ${player.nom}`, true, true);
          }
        }
      }
    }
  }

  /** Search for the same player in the given data list. If not found, just return the given player */
  private searchPlayerInList(player: ILcdePlayer, list: ILcdePlayer[]): ILcdePlayer {
    for (const dataPlayer of list) {
      if (dataPlayer.id === player.id) return dataPlayer;
    }
    return player;
  }

}
