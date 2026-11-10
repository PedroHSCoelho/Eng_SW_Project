-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ORGANIZER', 'PLAYER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "playerId" INTEGER,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'PLAYER';

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

