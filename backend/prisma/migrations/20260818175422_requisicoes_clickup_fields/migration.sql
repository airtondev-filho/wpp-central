-- CreateEnum
CREATE TYPE "PrioridadeRequisicao" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- AlterTable
ALTER TABLE "Requisicao" ADD COLUMN     "clickupTaskId" TEXT,
ADD COLUMN     "prazo" TIMESTAMP(3),
ADD COLUMN     "prioridade" "PrioridadeRequisicao" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "responsavelId" INTEGER;

-- CreateTable
CREATE TABLE "_RequisicaoToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RequisicaoToTag_AB_unique" ON "_RequisicaoToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_RequisicaoToTag_B_index" ON "_RequisicaoToTag"("B");

-- AddForeignKey
ALTER TABLE "Requisicao" ADD CONSTRAINT "Requisicao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequisicaoToTag" ADD CONSTRAINT "_RequisicaoToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Requisicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequisicaoToTag" ADD CONSTRAINT "_RequisicaoToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
