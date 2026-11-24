-- Grupos (como grupos de WhatsApp): jogadores e partidas passam a pertencer a um grupo, e o papel
-- de organizador passa a ser POR grupo (tabela Membership).
-- Migração no padrão "expand & contract", parte 1 (expandir + preencher). Os dados que já existem
-- vão para um grupo padrão. O que fica obsoleto (User.role, User.playerId, OrganizerRequest) só é
-- removido na migração seguinte, depois que o código parar de usar.
-- O Prisma roda cada migração numa transação: ou tudo acontece, ou nada.

-- 1. Expandir: tabelas novas e colunas novas ainda OPCIONAIS (as linhas antigas não têm grupo).
CREATE TYPE "GroupRole" AS ENUM ('ORGANIZER', 'MEMBER');

CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "inviteCode" VARCHAR(12) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "playerId" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("groupId","userId")
);

ALTER TABLE "Player" ADD COLUMN "groupId" INTEGER;
ALTER TABLE "Match" ADD COLUMN "groupId" INTEGER;

-- 2. Preencher: um grupo padrão recebe tudo o que já existe.
-- O código de convite aqui é provisório (8 caracteres hexadecimais); o organizador pode gerar outro na tela.
INSERT INTO "Group" ("name", "inviteCode")
VALUES ('Pelada da turma', upper(substr(md5(random()::text), 1, 8)));

UPDATE "Player" SET "groupId" = (SELECT min("id") FROM "Group");
UPDATE "Match" SET "groupId" = (SELECT min("id") FROM "Group");

-- Cada conta vira participante do grupo padrão, com o papel e o jogador que já tinha.
INSERT INTO "Membership" ("groupId", "userId", "role", "playerId", "joinedAt")
SELECT (SELECT min("id") FROM "Group"),
       u."id",
       CASE WHEN u."role" = 'ORGANIZER' THEN 'ORGANIZER'::"GroupRole" ELSE 'MEMBER'::"GroupRole" END,
       u."playerId",
       u."createdAt"
FROM "User" u;

-- 3. Agora que toda linha tem grupo, a coluna vira obrigatória.
ALTER TABLE "Player" ALTER COLUMN "groupId" SET NOT NULL;
ALTER TABLE "Match" ALTER COLUMN "groupId" SET NOT NULL;

-- Apelido deixa de ser único no sistema todo e passa a ser único dentro do grupo.
DROP INDEX "Player_nicknameKey_key";
CREATE UNIQUE INDEX "Player_groupId_nicknameKey_key" ON "Player"("groupId", "nicknameKey");

CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
CREATE UNIQUE INDEX "Membership_playerId_key" ON "Membership"("playerId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Player" ADD CONSTRAINT "Player_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
