-- AlterTable
ALTER TABLE "Notificacao" ADD COLUMN     "atendId" INTEGER;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_atendId_fkey" FOREIGN KEY ("atendId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
