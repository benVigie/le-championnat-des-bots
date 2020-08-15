import { AppMode, IConfiguration } from "./Main";

/** ScoutBot is the app orchestrator */
export default class ScoutBot {
  private static _config: IConfiguration;
  private static _mode: AppMode;

  constructor(mode: AppMode, config: IConfiguration) {
    ScoutBot._mode = mode;
    ScoutBot._config = config;
  }

  /** Retrieve app mode, either dev or production */
  static get mode(): AppMode { return ScoutBot._mode; }

  /** Retrieve app config */
  static get configuration(): IConfiguration { return ScoutBot._config; }

  /** Start the scout bot */
  startScouting(): void {

  }
}
