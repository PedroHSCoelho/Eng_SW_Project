-- Nota do admin, nomes dos times, "talvez" na lista, convidados e votação do craque.
-- Só ACRESCENTA (colunas que aceitam vazio ou têm padrão, e tabelas novas): o código antigo
-- continua funcionando com o banco novo, então a migração pode rodar ANTES do deploy.
-- A tabela "Rating" (avaliação pós-partida) fica: o código novo não usa mais, e ela só sai
-- numa limpeza futura, quando ninguém mais precisar desses dados.

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "maybe" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "teamNames" JSONB;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "skill" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MatchGuest" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "invitedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MvpVote" (
    "matchId" INTEGER NOT NULL,
    "voterId" INTEGER NOT NULL,
    "votedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MvpVote_pkey" PRIMARY KEY ("matchId","voterId")
);

-- CreateIndex
CREATE INDEX "MatchGuest_matchId_idx" ON "MatchGuest"("matchId");

-- CreateIndex
CREATE INDEX "MvpVote_votedId_idx" ON "MvpVote"("votedId");

-- AddForeignKey
ALTER TABLE "MatchGuest" ADD CONSTRAINT "MatchGuest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGuest" ADD CONSTRAINT "MatchGuest_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_votedId_fkey" FOREIGN KEY ("votedId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Última barreira (o Prisma não expressa CHECK):
-- nota de 0 a 5, só em passos de 0,5 (0; 0,5; 1; ... 5).
ALTER TABLE "Player" ADD CONSTRAINT "Player_skill_check"
  CHECK ("skill" IS NULL OR ("skill" >= 0 AND "skill" <= 5 AND "skill" * 2 = floor("skill" * 2)));

-- Ninguém vota em si mesmo para craque.
ALTER TABLE "MvpVote" ADD CONSTRAINT "MvpVote_not_self_check" CHECK ("voterId" <> "votedId");

-- Nome do convidado não fica em branco.
ALTER TABLE "MatchGuest" ADD CONSTRAINT "MatchGuest_name_check" CHECK (length(btrim("name")) >= 2);
