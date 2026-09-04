-- CreateEnum
CREATE TYPE "StatusTreinamento" AS ENUM ('PLANEJADO', 'AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusParticipante" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "Treinamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "instrutorId" INTEGER NOT NULL,
    "data" TIMESTAMP(3),
    "duracaoMin" INTEGER,
    "status" "StatusTreinamento" NOT NULL DEFAULT 'PLANEJADO',
    "conteudo" TEXT,
    "observacoes" TEXT,
    "materiais" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treinamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinamentoParticipante" (
    "id" SERIAL NOT NULL,
    "treinamentoId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "StatusParticipante" NOT NULL DEFAULT 'NAO_INICIADO',
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "TreinamentoParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreinamentoParticipante_treinamentoId_userId_key" ON "TreinamentoParticipante"("treinamentoId", "userId");

-- AddForeignKey
ALTER TABLE "Treinamento" ADD CONSTRAINT "Treinamento_instrutorId_fkey" FOREIGN KEY ("instrutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinamentoParticipante" ADD CONSTRAINT "TreinamentoParticipante_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "Treinamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinamentoParticipante" ADD CONSTRAINT "TreinamentoParticipante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
