/*
 Warnings:
 
 - You are about to drop the `_AlertToTrain` table. If the table is not empty, all the data it contains will be lost.
 - You are about to drop the column `destination` on the `Alert` table. All the data in the column will be lost.
 - You are about to drop the column `origin` on the `Alert` table. All the data in the column will be lost.
 - You are about to drop the column `destinationId` on the `Train` table. All the data in the column will be lost.
 - You are about to drop the column `originId` on the `Train` table. All the data in the column will be lost.
 - Added the required column `itineraryId` to the `Alert` table without a default value. This is not possible if the table is not empty.
 - Added the required column `itineraryId` to the `Train` table without a default value. This is not possible if the table is not empty.
 
 */
-- DropIndex
DROP INDEX "_AlertToTrain_B_index";
-- DropIndex
DROP INDEX "_AlertToTrain_AB_unique";
-- DropTable
PRAGMA foreign_keys = off;
DROP TABLE "_AlertToTrain";
PRAGMA foreign_keys = on;
-- CreateTable
CREATE TABLE "Itinerary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    CONSTRAINT "Itinerary_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Station" ("rrCode") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Itinerary_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Station" ("rrCode") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
-- CreateTable
CREATE TABLE "_ItineraryToSettings" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ItineraryToSettings_A_fkey" FOREIGN KEY ("A") REFERENCES "Itinerary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItineraryToSettings_B_fkey" FOREIGN KEY ("B") REFERENCES "Settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- CreateTable
CREATE TABLE "_SettingsToStation" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SettingsToStation_A_fkey" FOREIGN KEY ("A") REFERENCES "Settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SettingsToStation_B_fkey" FOREIGN KEY ("B") REFERENCES "Station" ("rrCode") ON DELETE CASCADE ON UPDATE CASCADE
);
-- InsertStations
INSERT INTO "Station" ("rrCode", "label")
SELECT originId,
    originId
FROM Train
UNION
SELECT destinationId,
    destinationId
FROM Train
UNION
SELECT origin,
    origin
FROM Alert
UNION
SELECT destination,
    destination
FROM Alert
WHERE true ON CONFLICT("rrCode") DO NOTHING;
-- CreateNewItinerariesBasedOnExistingTrains
INSERT INTO "Itinerary" ("originId", "destinationId")
SELECT originId,
    destinationId
FROM (
        SELECT originId,
            destinationId
        FROM Train
        UNION
        SELECT origin,
            destination
        FROM Alert
    )
GROUP BY originId,
    destinationId;
-- RedefineTables
PRAGMA foreign_keys = OFF;
CREATE TABLE "new_Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "itineraryId" INTEGER NOT NULL,
    CONSTRAINT "Alert_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("date", "id", "uid", "itineraryId")
SELECT "date",
    "id",
    "uid",
    (
        SELECT id
        FROM "Itinerary"
        WHERE "Itinerary"."destinationId" = "Alert"."destination"
            AND "Itinerary"."originId" = "Alert"."origin"
    )
FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert"
    RENAME TO "Alert";
CREATE TABLE "new_Train" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "freePlaces" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "itineraryId" INTEGER NOT NULL,
    "departure" DATETIME NOT NULL,
    "arrival" DATETIME NOT NULL,
    CONSTRAINT "Train_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- RefineTrainTableContent
INSERT INTO "new_Train" (
        "arrival",
        "departure",
        "equipment",
        "freePlaces",
        "id",
        "number",
        "itineraryId"
    )
SELECT "arrival",
    "departure",
    "equipment",
    "freePlaces",
    "id",
    "number",
    (
        SELECT id
        FROM "Itinerary"
        WHERE "Itinerary"."destinationId" = "Train"."destinationId"
            AND "Itinerary"."originId" = "Train"."originId"
    )
FROM "Train";
DROP TABLE "Train";
ALTER TABLE "new_Train"
    RENAME TO "Train";
CREATE UNIQUE INDEX "Train_number_equipment_departure_arrival_itineraryId_key" ON "Train"(
    "number",
    "equipment",
    "departure",
    "arrival",
    "itineraryId"
);
PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_originId_destinationId_key" ON "Itinerary"("originId", "destinationId");
-- CreateIndex
CREATE UNIQUE INDEX "_ItineraryToSettings_AB_unique" ON "_ItineraryToSettings"("A", "B");
-- CreateIndex
CREATE INDEX "_ItineraryToSettings_B_index" ON "_ItineraryToSettings"("B");
-- CreateIndex
CREATE UNIQUE INDEX "_SettingsToStation_AB_unique" ON "_SettingsToStation"("A", "B");
-- CreateIndex
CREATE INDEX "_SettingsToStation_B_index" ON "_SettingsToStation"("B");