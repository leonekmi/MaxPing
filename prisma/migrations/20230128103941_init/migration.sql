-- CreateTable
CREATE TABLE "Station" (
    "rrCode" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Train" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "freePlaces" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "departure" DATETIME NOT NULL,
    "arrival" DATETIME NOT NULL,
    CONSTRAINT "Train_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Station" ("rrCode") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Train_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Station" ("rrCode") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_AlertToTrain" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AlertToTrain_A_fkey" FOREIGN KEY ("A") REFERENCES "Alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AlertToTrain_B_fkey" FOREIGN KEY ("B") REFERENCES "Train" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Train_number_equipment_departure_arrival_originId_destinationId_key" ON "Train"("number", "equipment", "departure", "arrival", "originId", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "_AlertToTrain_AB_unique" ON "_AlertToTrain"("A", "B");

-- CreateIndex
CREATE INDEX "_AlertToTrain_B_index" ON "_AlertToTrain"("B");
