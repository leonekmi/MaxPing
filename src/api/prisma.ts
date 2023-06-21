import { Alert, Itinerary, PrismaClient, Train } from "@prisma/client";

export const prisma = new PrismaClient();

export type AlertWithTrains = Alert & {
  itinerary: Itinerary & {
    trains: Train[];
  };
};

export type AlertWithItinerary = Alert & {
  itinerary: Itinerary;
};

export type TrainWithItinerary = Train & {
  itinerary: Itinerary;
};

export const countAlertsOfUser = (id: number) =>
  prisma.alert.count({
    where: { uid: id },
  });

export const getAlertsOfUser = (id: number, index?: number) =>
  prisma.alert.findMany({
    where: { uid: id },
    orderBy: { date: "asc" },
    skip: typeof index === "number" && index > 0 ? index : undefined,
    take: typeof index === "number" ? 1 : undefined,
    include: {
      itinerary: {
        include: {
          trains: {
            orderBy: { departure: "asc" },
            where: {
              freePlaces: {
                gt: 0,
              },
            },
          },
        },
      },
    },
  });

export const getAlert = (id: number) =>
  prisma.alert.findUnique({
    where: { id },
    include: {
      itinerary: {
        include: {
          trains: {
            orderBy: { departure: "asc" },
            where: {
              freePlaces: {
                gt: 0,
              },
            },
          },
        },
      },
    },
  });

export const getAlertIndex = async (
  uid: number,
  id: number
): Promise<[number, number]> => {
  const alerts = await prisma.alert.findMany({
    where: { uid },
    orderBy: { date: "asc" },
    select: {
      id: true,
    },
  });
  return [alerts.findIndex((alert) => alert.id === id), alerts.length];
};

export const dropAlert = (id: number) =>
  prisma.alert.delete({
    where: { id },
  });
