import { InfluxDB, Point, WriteApi } from "@influxdata/influxdb-client";
import { Train } from "@prisma/client";
import { differenceInSeconds } from "date-fns";
import { logger } from "../utils/logger.js";
import { prisma } from "./prisma.js";

let api: WriteApi;

export function initInflux() {
  if (
    !process.env.INFLUX_URL ||
    !process.env.INFLUX_TOKEN ||
    !process.env.INFLUX_ORG ||
    !process.env.INFLUX_BUCKET
  ) {
    logger.warn(
      "You should set InfluxDB env variables to enable train logging!"
    );
    return;
  }

  const client = new InfluxDB({
    url: process.env.INFLUX_URL,
    token: process.env.INFLUX_TOKEN,
  });

  api = client.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET);
}

function TrainToTrainPoint(train: Train) {
  return new Point("train")
    .tag("name", `${train.equipment}${train.number}`)
    .tag("departure", new Date(train.departure).toISOString())
    .tag("origin", train.origin)
    .tag("destination", train.destination)
    .intField("free_places", train.freePlaces)
    .intField(
      "time_before_leaving",
      differenceInSeconds(new Date(train.departure), new Date(), {
        roundingMethod: "floor",
      })
    )
    .timestamp(new Date());
}

export async function saveTrains(trainsIDs: number[] = []) {
  try {
    if (!api) {
      logger.debug("Influx not initialized");
      return;
    }

    const trains = await prisma.train.findMany({
      where: {
        departure: {
          gte: new Date(),
        },
        ...(trainsIDs.length > 0
          ? {
              id: {
                in: trainsIDs,
              },
            }
          : {}),
      },
    });
    api.writePoints(trains.map(TrainToTrainPoint));
    logger.debug("Pushing %d points to Influx", trains.length);
    await api.flush();
  } catch (err) {
    logger.warn({ err }, "InfluxDB push failed.");
  }
}
