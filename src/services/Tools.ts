import { EventEmitter } from "events";
import * as Fs from "fs";
import * as chalk from "chalk";

/** Provide usefull tools */
export default class Tools {
  static eventEmitter = new EventEmitter();

  /** Read a file and return the deserialized text */
  static async readFile<T>(path: string): Promise<T> {
    try {
      const file = await Fs.promises.readFile(path, { encoding: "utf8" });
      return JSON.parse(file);
    }
    catch (error) {
      throw new Error(`Cannot read file "${path}: ${error}"`);
    }
  }

  /** Write in a file */
  static async writeFile(fileName: string, content: string): Promise<any> {
    try {
      await Fs.promises.writeFile(fileName, content);
    }
    catch (error) {
      throw new Error(`Cannot write file "${fileName}: ${error}"`);
    }
  }

  /** Test if the given error is an Axios error. If so, display usefull data to debug */
  static dumpAxiosError(error: any): void {
    if (error.config && error.config.url) {
      console.error(chalk`{red Request: ${error.config.method.toUpperCase()} - ${error.config.url}
Data: ${error.config.data}
Response code: ${error.response.status}
Response: ${JSON.stringify(error.response.data)}}
`);
    }
  }
}
