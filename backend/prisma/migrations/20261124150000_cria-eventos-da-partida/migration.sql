-- Cartões (amarelo e vermelho) e defesas difíceis lançados na súmula ao vivo.
-- Gol e assistência continuam na tabela Goal (o placar é calculado a partir dela).

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('YELLOW_CARD', 'RED_CARD', 'DIFFICULT_SAVE');

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "type" "EventType" NOT NULL,
    "minute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id"),
    -- Última barreira (o Prisma não expressa CHECK): mesmo limite do minuto do gol.
    CONSTRAINT "MatchEvent_minute_check" CHECK ("minute" IS NULL OR ("minute" >= 0 AND "minute" <= 120))
);

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_idx" ON "MatchEvent"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_playerId_idx" ON "MatchEvent"("playerId");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
