import { Alert } from "@prisma/client";
import { formatISO } from "date-fns";
import got from "got";
import { prisma } from "./prisma.js";
import { MaxableTrainsResponsePayload } from "../types/sncf.js";
import { saveTrains } from "./influxdb.js";

const client = got.extend({
  headers: {
    "x-client-app": "MAX_JEUNE",
    "x-client-app-version": "1.31.1",
    "x-distribution-channel": "TRAINLINE",
    // "x-syg-correlation-id": "24c77428-858e-43b4-a90c-76cd35d16917",
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/109.0",
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
  const answer = await client.post<MaxableTrainsResponsePayload>(
    endpointGetTrains,
    {
      json: data,
      responseType: "json",
    }
  );
  if (answer.statusCode !== 200)
    return {
      freePlacesRatio: 0,
      updatedAt: Date.now(),
      expiresAt: Date.now(),
      proposals: [],
    };
  return answer.body;
}

export async function getAndCacheMaxableTrains(alert: Alert) {
  const { proposals = [] } = await getMaxableTrains(
    alert.origin,
    alert.destination,
    alert.date
  );
  const alertId =
    "id" in alert
      ? alert.id
      : (
          await prisma.alert.create({
            data: alert,
          })
        ).id;
  const { trains: trainsSnapshot } = await prisma.alert.findUniqueOrThrow({
    where: {
      id: alertId,
    },
    select: {
      trains: {
        select: {
          id: true,
        },
      },
    },
  });
  await prisma.alert.update({
    where: { id: alertId },
    data: {
      trains: {
        set: [],
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
          number_equipment_departure_arrival_originId_destinationId: {
            number: train.trainNumber,
            departure: new Date(train.departureDate),
            arrival: new Date(train.arrivalDate),
            equipment: train.trainEquipment,
            originId: train.origin.rrCode,
            destinationId: train.destination.rrCode,
          },
        },
        create: {
          number: train.trainNumber,
          departure: new Date(train.departureDate),
          arrival: new Date(train.arrivalDate),
          equipment: train.trainEquipment,
          freePlaces: train.freePlaces,
          destination: {
            connectOrCreate: {
              create: train.destination,
              where: {
                rrCode: train.destination.rrCode,
              },
            },
          },
          origin: {
            connectOrCreate: {
              create: train.origin,
              where: {
                rrCode: train.origin.rrCode,
              },
            },
          },
          alerts: { connect: [{ id: alertId }] },
        },
        update: {
          freePlaces: train.freePlaces,
          alerts: { connect: [{ id: alertId }] },
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
