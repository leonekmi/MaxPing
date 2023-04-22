import type { MaxableTrainsErrorPayload } from "../types/sncf.js";

/**
 * Class used to flag MaxPlanner errors
 */
export class MaxPlannerError extends Error {
  code: string;

  constructor(response: MaxableTrainsErrorPayload) {
    super(response.message);
    this.code = response.errorCode;
  }
}
