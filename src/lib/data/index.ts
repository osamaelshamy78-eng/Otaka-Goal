import { apiFootball } from "./api-football";
import { sample } from "./sample";

// Real data when an API-Football key is configured, sample data otherwise.
export const data = process.env.API_FOOTBALL_KEY ? apiFootball : sample;
