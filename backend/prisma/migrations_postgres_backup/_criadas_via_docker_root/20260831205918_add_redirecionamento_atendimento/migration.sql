-- AlterTable
ALTER TABLE "Atendimento" ADD COLUMN     "redirecionadoEm" TIMESTAMP(3),
ADD COLUMN     "redirecionadoPendente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "redirecionadoPorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_redirecionadoPorId_fkey" FOREIGN KEY ("redirecionadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
