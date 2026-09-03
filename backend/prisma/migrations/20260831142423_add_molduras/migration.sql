-- AlterTable
ALTER TABLE "User" ADD COLUMN     "molduraEquipada" TEXT;

-- CreateTable
CREATE TABLE "UserMissao" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "missaoSlug" TEXT NOT NULL,
    "desbloqueadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMissao_userId_missaoSlug_key" ON "UserMissao"("userId", "missaoSlug");

-- AddForeignKey
ALTER TABLE "UserMissao" ADD CONSTRAINT "UserMissao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
