import { Alert, PrismaClient, Train } from "@prisma/client";

export const prisma = new PrismaClient();

export type AlertWithTrains = Alert & {
  trains: Train[];
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
      trains: {
        orderBy: {
          departure: "asc",
        },
      },
    },
  });

export const getAlert = (id: number) =>
  prisma.alert.findUnique({
    where: { id },
    include: {
      trains: {
        orderBy: { departure: "asc" },
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
