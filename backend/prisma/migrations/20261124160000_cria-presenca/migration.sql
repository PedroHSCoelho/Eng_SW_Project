-- Lista de presença das partidas (substitui a "lista do fut" do WhatsApp).
-- Confirmado ou espera não é gravado: sai da ordem de chegada e das vagas (maxPlayers).

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "maxPlayers" INTEGER;
-- Vagas: vazio = sem limite; senão de 2 a 100 (mesma regra do back-end).
ALTER TABLE "Match" ADD CONSTRAINT "Match_maxPlayers_check" CHECK ("maxPlayers" IS NULL OR ("maxPlayers" >= 2 AND "maxPlayers" <= 100));

-- CreateTable
CREATE TABLE "Attendance" (
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("matchId","playerId")
);

-- CreateIndex
CREATE INDEX "Attendance_playerId_idx" ON "Attendance"("playerId");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
