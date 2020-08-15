import ScoutBot from "./ScoutBot";
import Tools from "./services/Tools";
import * as chalk from "chalk";
import yargs = require('yargs');

export const CONFIG_PATH = "./src/config.json";

// App mode. Either 'dev' or 'production'
export enum AppMode {
  Dev = "dev",
  Production = "production"
}

/** Describe application configuration */
export interface IConfiguration {
  debugTrace: boolean,
}

/** Structure of app config file. There is 2 configs, one for each environement */
export interface IConfigurationFile {
  dev: IConfiguration,
  production: IConfiguration,
}

/** Yarg app arguments */
interface IYargsArgs {
  $0: string;
  env: string;
};

/** Bot entry point. Parse arguments, load config and start the bot */
export class Main {
  static appArgs: IYargsArgs;

  /** Start the application */
  static async start(): Promise<any> {
    try {
      console.log(chalk`Starting scout bot in {yellow.bold ${Main.getAppMode()}} mode\n`);

      // Load config
      const config = await Tools.readFile<IConfigurationFile>(CONFIG_PATH);
      const appConfig = config[Main.getAppMode()];

      // Load and start scout bot !
      const scoutBot = new ScoutBot(Main.getAppMode(), appConfig);
      scoutBot.startScouting();
    }
    catch (error) {
      console.error(chalk`{red \nMain.start() error: ${error.message}\n}`);
    }
  }

  /** Get the Bot mode. Argument > env var, default 'dev' */
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
  env: { type: 'string', alias: 'e', choices: [AppMode.Dev, AppMode.Production], description: "The bot app mode. Can be either 'dev' or 'prod'. If not specified, the env is the node's one." },
}).argv;

// Do not start the app if we're testing with mocha !
if (!Main.appArgs.$0.includes("mocha")) {
  Main.start();
}
