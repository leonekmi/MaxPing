import { formatISO } from "date-fns";
import got from "got";
import { AlertWithItinerary, prisma } from "./prisma.js";
import {
  IMaxableTrain,
  MaxableTrainsErrorPayload,
  MaxableTrainsResponsePayload,
  MaxErrors,
} from "../types/sncf.js";
import { saveTrains } from "./influxdb.js";
import { MaxPlannerError } from "../utils/errors.js";

const client = got.extend({
  headers: {
    "x-client-app": "MAX_JEUNE",
    "x-client-app-version": "1.42.1",
    "x-distribution-channel": "TRAINLINE",
    // "x-syg-correlation-id": "24c77428-858e-43b4-a90c-76cd35d16917",
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/114.0",
    Accept: "application/json",
  },
  throwHttpErrors: false,
});

const endpointGetTrains =
  "https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals";

export async function getMaxableTrains(
  origin: string,
  destination: string,
  dateTime: Date
): Promise<MaxableTrainsResponsePayload> {
  const data = {
    departureDateTime:
      formatISO(dateTime, {
        format: "basic",
        representation: "date",
      }) + "T00:00:00",
    destination,
    origin,
  };
  const answer = await client.post<
    MaxableTrainsResponsePayload | MaxableTrainsErrorPayload
  >(endpointGetTrains, {
    json: data,
    responseType: "json",
  });
  if (answer.statusCode !== 200) {
    if (
      "errorCode" in answer.body &&
      answer.body.errorCode === MaxErrors.NO_AVAIL // this is the code for "No travel found at the requested dates, try something different"
    )
      return {
        freePlacesRatio: 0,
        updatedAt: Date.now(),
        expiresAt: Date.now(),
        proposals: [],
      };
    if ("errorCode" in answer.body) throw new MaxPlannerError(answer.body);
    throw new Error(JSON.stringify(answer.body));
  }
  return answer.body as MaxableTrainsResponsePayload;
}

/**
 * Retrieve trains on Max backend and store it into the database
 * @param alert The alert, it can be an existing one or a new one (it will be created in Prisma automatically)
 * @returns A tuple with the trains and alert ID
 */
export async function getAndCacheMaxableTrains(
  alert: AlertWithItinerary
): Promise<IMaxableTrain[]> {
  const { proposals = [] } = await getMaxableTrains(
    alert.itinerary.originId,
    alert.itinerary.destinationId,
    alert.date
  );
  const {
    itinerary: { trains: trainsSnapshot },
  } = await prisma.alert.findUniqueOrThrow({
    where: {
      id: alert.id,
    },
    select: {
      itinerary: {
        select: {
          trains: true,
        },
      },
    },
  });
  const [, ...newTrainIDs] = await prisma.$transaction([
    prisma.train.updateMany({
      data: {
        freePlaces: 0,
      },
      where: {
        id: {
          in: trainsSnapshot.map((t) => t.id),
        },
      },
    }),
    ...proposals.map((train) =>
      prisma.train.upsert({
        where: {
          number_equipment_departure_arrival_itineraryId: {
            number: train.trainNumber,
            equipment: train.trainEquipment,
            departure: new Date(train.departureDate),
            arrival: new Date(train.arrivalDate),
            itineraryId: alert.itineraryId,
          },
        },
        create: {
          number: train.trainNumber,
          departure: new Date(train.departureDate),
          arrival: new Date(train.arrivalDate),
          equipment: train.trainEquipment,
          freePlaces: train.freePlaces,
          itineraryId: alert.itineraryId,
        },
        update: {
          freePlaces: train.freePlaces,
        },
        select: {
          id: true,
        },
      })
    ),
  ]);
  void setImmediate(saveTrains, [
    ...trainsSnapshot.map((t) => t.id),
    ...newTrainIDs.map((t) => t.id),
  ]);
  return proposals;
}
