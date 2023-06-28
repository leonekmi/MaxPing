import { Alert } from "@prisma/client";
import { formatISO } from "date-fns";
import got from "got";
import { prisma } from "./prisma.js";
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
    "x-client-app-version": "1.45.3",
    "x-distribution-channel": "TRAINLINE",
    // "x-syg-correlation-id": "24c77428-858e-43b4-a90c-76cd35d16917",
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/112.0",
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
      answer.statusCode === 404 &&
      "errorCode" in answer.body &&
      answer.body.errorCode !== MaxErrors.NO_AVAIL // this is the code for "No travel found at the requested dates, try something different"
    )
      throw new MaxPlannerError(answer.body);
    return {
      freePlacesRatio: 0,
      updatedAt: Date.now(),
      expiresAt: Date.now(),
      proposals: [],
    };
  }
  return answer.body as MaxableTrainsResponsePayload;
}

/**
 * Retrieve trains on Max backend and store it into the database
 * @param alert The alert, it can be an existing one or a new one (it will be created in Prisma automatically)
 * @returns A tuple with the trains and alert ID
 */
export async function getAndStoreMaxableTrains(
  alert: Alert
): Promise<IMaxableTrain[]> {
  const { proposals = [] } = await getMaxableTrains(
    alert.origin,
    alert.destination,
    alert.date
  );
  const { trains: trainsSnapshot } = await prisma.alert.findUniqueOrThrow({
    where: {
      id: alert.id,
    },
    select: {
      trains: {
        select: {
          id: true,
        },
      },
    },
  });
  const [, , ...newTrainIDs] = await prisma.$transaction([
    prisma.alert.update({
      where: { id: alert.id },
      data: {
        trains: {
          set: [],
        },
      },
    }),
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
          number_equipment_departure_arrival_origin_destination: {
            number: train.trainNumber,
            departure: new Date(train.departureDate),
            arrival: new Date(train.arrivalDate),
            equipment: train.trainEquipment,
            origin: train.origin.rrCode,
            destination: train.destination.rrCode,
          },
        },
        create: {
          number: train.trainNumber,
          departure: new Date(train.departureDate),
          arrival: new Date(train.arrivalDate),
          equipment: train.trainEquipment,
          freePlaces: train.freePlaces,
          destination: train.destination.rrCode,
          origin: train.origin.rrCode,
          alerts: { connect: [{ id: alert.id }] },
        },
        update: {
          freePlaces: train.freePlaces,
          alerts: { connect: [{ id: alert.id }] },
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
