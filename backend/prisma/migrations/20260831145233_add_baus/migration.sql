-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tituloEquipado" TEXT,
ADD COLUMN     "bannerEquipado" TEXT;

-- CreateTable
CREATE TABLE "UserBau" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "missaoSlug" TEXT NOT NULL,
    "ganhoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abertoEm" TIMESTAMP(3),

    CONSTRAINT "UserBau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBau_userId_missaoSlug_key" ON "UserBau"("userId", "missaoSlug");

-- AddForeignKey
ALTER TABLE "UserBau" ADD CONSTRAINT "UserBau_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
