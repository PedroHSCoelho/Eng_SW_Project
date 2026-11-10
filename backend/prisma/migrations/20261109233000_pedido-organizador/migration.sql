-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OrganizerRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" VARCHAR(200) NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" INTEGER,

    CONSTRAINT "OrganizerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerRequest_userId_idx" ON "OrganizerRequest"("userId");

-- CreateIndex
CREATE INDEX "OrganizerRequest_status_idx" ON "OrganizerRequest"("status");

-- AddForeignKey
ALTER TABLE "OrganizerRequest" ADD CONSTRAINT "OrganizerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerRequest" ADD CONSTRAINT "OrganizerRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

