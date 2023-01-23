-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" BIGINT NOT NULL,
    "origin" TEXT NOT NULL,
    "destnation" TEXT NOT NULL,
    "date" DATETIME NOT NULL
);
