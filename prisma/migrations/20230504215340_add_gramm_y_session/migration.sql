-- CreateTable
CREATE TABLE "GrammYSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammYSession_key_key" ON "GrammYSession"("key");
