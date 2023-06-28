import { pino } from "pino";

export const logger = pino({
  level: "trace",
  transport: {
    targets: [
      {
        target: "pino/file",
        options: {
          destination: "logs/maxping.log",
          mkdir: true,
        },
        level: "info",
      },
      {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
        level: "debug",
      },
    ],
  },
});
