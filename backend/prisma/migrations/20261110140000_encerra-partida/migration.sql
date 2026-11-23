-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('A_WINS', 'B_WINS', 'DRAW');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "result" "MatchResult";
