-- AlterTable
ALTER TABLE "PontosHistorico" ADD COLUMN     "requisicaoId" INTEGER,
ADD COLUMN     "treinamentoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "PontosHistorico_userId_requisicaoId_motivo_key" ON "PontosHistorico"("userId", "requisicaoId", "motivo");

-- CreateIndex
CREATE UNIQUE INDEX "PontosHistorico_userId_treinamentoId_motivo_key" ON "PontosHistorico"("userId", "treinamentoId", "motivo");
