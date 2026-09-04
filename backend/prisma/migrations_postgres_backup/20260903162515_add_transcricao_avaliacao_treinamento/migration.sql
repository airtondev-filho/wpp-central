-- AlterTable
ALTER TABLE "Treinamento" ADD COLUMN     "transcricao" TEXT,
ADD COLUMN     "avaliacaoIA" TEXT,
ADD COLUMN     "avaliacaoIAGeradaEm" TIMESTAMP(3);
