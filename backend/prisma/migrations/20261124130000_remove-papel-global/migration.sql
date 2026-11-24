-- Grupos, parte 2 ("contract" do expand & contract): remove o que o papel por grupo substituiu.
-- A migração anterior já copiou User.role e User.playerId para a tabela Membership (grupo padrão).
-- ATENÇÃO: apaga colunas e os pedidos de organizador. Faça backup do banco antes do deploy.

ALTER TABLE "OrganizerRequest" DROP CONSTRAINT "OrganizerRequest_decidedById_fkey";
ALTER TABLE "OrganizerRequest" DROP CONSTRAINT "OrganizerRequest_userId_fkey";
DROP TABLE "OrganizerRequest";
DROP TYPE "RequestStatus";

ALTER TABLE "User" DROP CONSTRAINT "User_playerId_fkey";
DROP INDEX "User_playerId_key";
ALTER TABLE "User" DROP COLUMN "playerId",
DROP COLUMN "role";
DROP TYPE "Role";
