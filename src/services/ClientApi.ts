import Axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import ScoutBot from "../ScoutBot";
const HttpsProxyAgent = require("https-proxy-agent");

/** The FootballApi service manages calls to Football API rest API */
export default class ClientApi {
  private static _axiosInstance: AxiosInstance;

  /** The app configurated axios instance */
  get axios(): AxiosInstance {
    if (!ClientApi._axiosInstance) {
      if (ScoutBot.configuration?.proxy) {
        const axiosDefaultConfig: AxiosRequestConfig = {
          proxy: false,
          httpsAgent: new HttpsProxyAgent(ScoutBot.configuration.proxy),
        };
        ClientApi._axiosInstance = Axios.create(axiosDefaultConfig);
      }
      else ClientApi._axiosInstance = Axios.create();
    }


    return ClientApi._axiosInstance;
  }
}
