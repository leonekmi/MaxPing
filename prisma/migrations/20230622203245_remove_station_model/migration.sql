/*
 Warnings:
 
 - You are about to drop the `Station` table. If the table is not empty, all the data it contains will be lost.
 - You are about to drop the column `destinationId` on the `Train` table. All the data in the column will be lost.
 - You are about to drop the column `originId` on the `Train` table. All the data in the column will be lost.
 - Added the required column `destination` to the `Train` table without a default value. This is not possible if the table is not empty.
 - Added the required column `origin` to the `Train` table without a default value. This is not possible if the table is not empty.
 
 */
-- DropTable
PRAGMA foreign_keys = off;
DROP TABLE "Station";
PRAGMA foreign_keys = on;
-- RedefineTables
PRAGMA foreign_keys = OFF;
CREATE TABLE "new_Train" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "freePlaces" INTEGER NOT NULL,
  "number" TEXT NOT NULL,
  "equipment" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "departure" DATETIME NOT NULL,
  "arrival" DATETIME NOT NULL
);
INSERT INTO "new_Train" (
    "arrival",
    "departure",
    "equipment",
    "freePlaces",
    "id",
    "number",
    "origin",
    "destination"
  )
SELECT "arrival",
  "departure",
  "equipment",
  "freePlaces",
  "id",
  "number",
  "originId",
  "destinationId"
FROM "Train";
DROP TABLE "Train";
ALTER TABLE "new_Train"
  RENAME TO "Train";
CREATE UNIQUE INDEX "Train_number_equipment_departure_arrival_origin_destination_key" ON "Train"(
  "number",
  "equipment",
  "departure",
  "arrival",
  "origin",
  "destination"
);
PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;