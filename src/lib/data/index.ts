import { apiFootball, PlanLimitError } from "./api-football";
import { sample } from "./sample";

// Real data when an API-Football key is configured, sample data otherwise.
export { PlanLimitError };
export const data = process.env.API_FOOTBALL_KEY ? apiFootball : sample;
