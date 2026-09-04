-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pontos" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "badgeSlug" TEXT NOT NULL,
    "desbloqueadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PontosHistorico" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "atendimentoId" INTEGER,
    "pontos" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PontosHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeSlug_key" ON "UserBadge"("userId", "badgeSlug");

-- CreateIndex
CREATE UNIQUE INDEX "PontosHistorico_userId_atendimentoId_motivo_key" ON "PontosHistorico"("userId", "atendimentoId", "motivo");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PontosHistorico" ADD CONSTRAINT "PontosHistorico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
