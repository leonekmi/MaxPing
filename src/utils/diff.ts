import { Alert, Prisma } from "@prisma/client";
import { bot } from "../index.js";
import { dropAlert, prisma } from "../api/prisma.js";
import { getAndStoreMaxableTrains } from "../api/max_planner.js";
import { endOfYesterday } from "date-fns";
import { deletionAlert, trainAlert } from "./messages.js";
import { logger } from "./logger.js";
import { MaxPlannerError } from "./errors.js";
import { MaxErrors } from "../types/sncf.js";

export async function processAlert(alert: Alert) {
  const { trains: trainSnapshotBefore } = await prisma.alert.findUniqueOrThrow({
    where: { id: alert.id },
    select: { trains: { select: { id: true } } },
  });
  try {
    await getAndStoreMaxableTrains(alert);
  } catch (err) {
    if (err instanceof MaxPlannerError && err.code === MaxErrors.NO_OD) {
      logger.info({ alert }, "Deleting invalid alert");
      await dropAlert(alert.id);
      await bot.api.sendMessage(alert.uid, deletionAlert(alert), {
        parse_mode: "HTML",
      });
    }
    return;
  }
  const { trains: trainSnapshotAfter } = await prisma.alert.findUniqueOrThrow({
    where: { id: alert.id },
    select: { trains: true },
  });
  const newTrains = trainSnapshotAfter.filter(
    (newTrain) =>
      trainSnapshotBefore.findIndex(
        (oldTrain) => oldTrain.id === newTrain.id
      ) === -1
  );
  logger.info({ newTrains }, "Alert processed!");
  if (newTrains.length > 0) {
    await bot.api.sendMessage(alert.uid, trainAlert(newTrains, alert), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "❌ Supprimer cette alerte",
              callback_data: "delete-alert-" + alert.id,
            },
          ],
          [
            {
              text: "🔎 Voir tous les trains de l'alerte",
              callback_data: "show-alert-" + alert.id,
            },
          ],
        ],
      },
    });
  }
}

export async function processAlerts(where?: Prisma.AlertWhereInput) {
  const alerts = await prisma.alert.findMany({ where });
  for (const alert of alerts) {
    logger.info({ alert }, "Processing alert");
    await processAlert(alert);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export function pruneOldAlerts() {
  logger.info("Pruning old alerts");
  return prisma.alert.deleteMany({
    where: {
      date: {
        lt: endOfYesterday(),
      },
    },
  });
}

export async function alertLoop() {
  logger.info("Processing all alerts");
  try {
    await pruneOldAlerts();
    await processAlerts();
  } catch (error) {
    logger.error({ error }, "Cannot process alerts");
  }
}

export async function processUserAlerts(uid: number) {
  logger.info({ uid }, "Processing user alerts");
  await processAlerts({
    uid,
  });
}

let processLoopInterval: NodeJS.Timeout;

export function startProcessingLoop() {
  void alertLoop();
  processLoopInterval = setInterval(alertLoop, 1000 * 60 * 15); // every quarter of an hour
  processLoopInterval.unref();
}

export function stopProcessingLoop() {
  clearInterval(processLoopInterval);
}
