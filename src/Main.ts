import ScoutBot from "./ScoutBot";
import Tools from "./services/Tools";
import * as chalk from "chalk";
import yargs = require("yargs");

export const CONFIG_PATH = "./src/config.json";

// App mode. Either "dev" or "production"
export enum AppMode {
  Dev = "dev",
  Production = "production",
}

/** Define application configuration */
export interface IConfiguration {
  env: AppMode | string;
  footballApiToken: string;
  lcdeEmail: string;
  lcdePassword: string;
  debugTrace?: boolean;
  proxy?: string;
  interactive?: boolean;
  round?: number;
}

/** Yarg app arguments */
export interface IYargsArgs extends IConfiguration {
  $0: string;
  configFile: string;
}

/** Bot entry point. Parse arguments, load config and start the bot */
export class Main {
  static appArgs: IYargsArgs;

  /** Start the application */
  static async start(): Promise<any> {
    try {
      console.log(chalk`⚽ Starting scout bot in {yellow.bold ${Main.getAppMode()}} mode`);

      // Load config
      const appConfig = await this.loadConfiguration();

      // Load and start scout bot !
      const scoutBot = new ScoutBot(appConfig);
      scoutBot.startScouting();
    }
    catch (error) {
      console.error(chalk`{red \nMain.start() error: ${error.message}\n}`);
    }
  }

  /** Get app configuration. Load conf file, and override with args if any. */
  static async loadConfiguration(): Promise<IConfiguration> {
    // First, load configuration file
    console.log(chalk`   Loading configuration from {cyan ${Main.appArgs.configFile}}...\n`);
    const config = await Tools.readFile<IConfiguration>(Main.appArgs.configFile);

    // Override with app args
    const overrided = { ...config, ...Main.appArgs };
    overrided.env = this.getAppMode();

    // Throw error on needed info missing
    if (!overrided.footballApiToken) throw new Error("You should provide your Football API token to perform API requests.\n");
    if (!overrided.lcdeEmail) throw new Error("You should provide your LCDE email to perform API requests.\n");
    if (!overrided.lcdePassword) throw new Error("You should provide your LCDE password to perform API requests.\n");

    return overrided;
  }

  /** Get the Bot mode. Argument > env var, default "dev" */
  static getAppMode(): AppMode {
    if (Main.appArgs.env === AppMode.Production) return AppMode.Production;
    if (process.env.ENVIRONEMENT && process.env.ENVIRONEMENT.toLowerCase() === AppMode.Production) {
      return AppMode.Production;
    }
    return AppMode.Dev;
  }

  /** Stop application */
  static stop(): void {
    process.exit(0);
  }
}


// Parse bot command arguments with yargs
Main.appArgs = yargs.options({
  env: { type: "string", alias: "e", choices: [AppMode.Dev, AppMode.Production], description: `The bot app mode. Can be either "dev" or "prod". If not specified, the env is the node"s one.` },
  configFile: { type: "string", alias: "c", description: "Path to the config file to load. Default config.json", default: "config.json" },
  footballApiToken: { type: "string", alias: "t", description: "Football API token" },
  lcdeEmail: { type: "string", alias: "m", description: "Le Championat Des Etoiles user email" },
  lcdePassword: { type: "string", alias: "p", description: "Le Championat Des Etoiles user password" },
  interactive: { type: "boolean", alias: "i", description: "Allows you to interact with the bot for some commands / suggestions" },
  round: { type: "number", alias: "r", description: "Specify a league round to retrieve data. By default we'll get the current round from the API" },
}).argv;

// Do not start the app if we're testing with mocha !
if (!Main.appArgs.$0.includes("mocha")) {
  Main.start();
}
