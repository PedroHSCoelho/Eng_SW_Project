-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "scorerId" INTEGER NOT NULL,
    "assistId" INTEGER,
    "team" "Team" NOT NULL,
    "ownGoal" BOOLEAN NOT NULL DEFAULT false,
    "minute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_matchId_idx" ON "Goal"("matchId");

-- CreateIndex
CREATE INDEX "Goal_scorerId_idx" ON "Goal"("scorerId");

-- CreateIndex
CREATE INDEX "Goal_assistId_idx" ON "Goal"("assistId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_assistId_fkey" FOREIGN KEY ("assistId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
