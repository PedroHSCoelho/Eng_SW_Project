-- Formato Pelada: de 3 a 6 times na mesma partida e vários jogos na noite ("quem ganha fica").
-- O jogo único (SINGLE_GAME) continua como antes: times A e B, sem jogos (gameId vazio).

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('SINGLE_GAME', 'PELADA');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('HOME_WINS', 'AWAY_WINS', 'DRAW');

-- AlterEnum


ALTER TYPE "Team" ADD VALUE 'C';
ALTER TYPE "Team" ADD VALUE 'D';
ALTER TYPE "Team" ADD VALUE 'E';
ALTER TYPE "Team" ADD VALUE 'F';

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "gameId" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "format" "MatchFormat" NOT NULL DEFAULT 'SINGLE_GAME',
ADD COLUMN     "teamCount" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "gameId" INTEGER;

-- CreateTable
CREATE TABLE "MatchGame" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "homeTeam" "Team" NOT NULL,
    "awayTeam" "Team" NOT NULL,
    "result" "GameResult",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "MatchGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchGame_matchId_number_key" ON "MatchGame"("matchId", "number");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "MatchGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "MatchGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGame" ADD CONSTRAINT "MatchGame_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Índices dos jogos nos gols e lances (a súmula filtra por jogo).
CREATE INDEX "Goal_gameId_idx" ON "Goal"("gameId");
CREATE INDEX "MatchEvent_gameId_idx" ON "MatchEvent"("gameId");

-- Últimas barreiras (o Prisma não expressa CHECK nem índice parcial), mesmas regras do back-end:
-- jogo único tem 2 times; pelada, de 3 a 6.
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamCount_check" CHECK (
  ("format" = 'SINGLE_GAME' AND "teamCount" = 2) OR ("format" = 'PELADA' AND "teamCount" BETWEEN 3 AND 6)
);
-- Um time não joga contra ele mesmo.
ALTER TABLE "MatchGame" ADD CONSTRAINT "MatchGame_teams_check" CHECK ("homeTeam" <> "awayTeam");
-- No máximo um jogo aberto por partida (o segundo "começar jogo" ao mesmo tempo falha aqui).
CREATE UNIQUE INDEX "MatchGame_one_open_per_match" ON "MatchGame"("matchId") WHERE "finishedAt" IS NULL;
