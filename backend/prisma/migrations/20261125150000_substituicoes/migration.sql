-- Substituições durante a partida: quem sai de campo continua na súmula (jogou), só fica marcado.
-- Só acrescenta uma coluna com valor padrão: o código antigo continua funcionando com o banco novo,
-- então esta migração pode rodar ANTES do deploy.
ALTER TABLE "MatchPlayer" ADD COLUMN "benched" BOOLEAN NOT NULL DEFAULT false;
