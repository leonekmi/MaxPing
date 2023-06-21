import stations from "../static/stations.json" assert { type: "json" };
import { logger } from "../utils/logger.js";
import { prisma } from "./prisma.js";

export const availableStationsCodes = stations.stations.map(
  (s) => s.codeStation
);

export function getStations(query: string) {
  const q = query.trim().toLowerCase();
  return stations.stations
    .filter((s) => {
      return s.station.toLowerCase().indexOf(q) !== -1;
    })
    .slice(0, 50); // Telegram allows only 50 results
}

export function getStationLabel(rrCode?: string) {
  return (
    stations.stations.find((s) => s.codeStation === rrCode)?.station ?? rrCode
  );
}

export function upsertStations() {
  logger.info("Upserting stations in database");
  return prisma.$transaction(
    stations.stations.map((station) =>
      prisma.station.upsert({
        create: {
          label: station.station,
          rrCode: station.codeStation,
        },
        update: {
          label: station.station,
        },
        where: {
          rrCode: station.codeStation,
        },
      })
    )
  );
}
