-- Foto do jogador. Só ACRESCENTA uma tabela nova: nenhuma coluna ou tabela existente muda,
-- então o código antigo continua funcionando com o banco novo e a migração pode (e deve)
-- rodar ANTES de o código novo chegar à Vercel.

-- CreateTable
CREATE TABLE "PlayerPhoto" (
    "playerId" INTEGER NOT NULL,
    "mimeType" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPhoto_pkey" PRIMARY KEY ("playerId")
);

-- AddForeignKey
ALTER TABLE "PlayerPhoto" ADD CONSTRAINT "PlayerPhoto_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
