-- AlterTable
ALTER TABLE "Treinamento" ADD COLUMN "grupoJid" TEXT;

-- AddForeignKey
ALTER TABLE "Treinamento" ADD CONSTRAINT "Treinamento_grupoJid_fkey" FOREIGN KEY ("grupoJid") REFERENCES "Grupo"("jid") ON DELETE SET NULL ON UPDATE CASCADE;
