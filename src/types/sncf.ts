export interface Station {
  label: string;
  /**
   * 5-letter (Résarail :tm:) code
   */
  rrCode: string;
}

export interface IMaxableTrain {
  freePlaces: number;
  origin: Station;
  destination: Station;
  departureDate: string;
  trainNumber: string;
  trainEquipment: string;
  arrivalDate: string;
}

export interface MaxableTrainsResponsePayload {
  /**
   * Unix timestamp
   */
  updatedAt: number;

  /**
   * Unix timestamp
   */
  expiresAt: number;

  /**
   * From 0 to 1, 2 decimal digits
   */
  freePlacesRatio: number;

  proposals: IMaxableTrain[];
}

export enum MaxErrors {
  NO_AVAIL = "SYG_40415",
  NO_OD = "SYG_40416",
  RATE_EXCEEDED = "SYG_50000",
}

export interface MaxableTrainsErrorPayload {
  errorCode: MaxErrors;
  message: string;
}
