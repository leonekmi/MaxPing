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

export interface MaxableTrainsErrorPayload {
  errorCode: string;
  message: string;
}
