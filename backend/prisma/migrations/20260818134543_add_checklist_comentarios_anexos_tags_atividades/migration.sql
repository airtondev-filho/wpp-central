-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#25d366',

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaChecklistItem" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "posicao" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TarefaChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaComentario" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEm" TIMESTAMP(3),

    CONSTRAINT "TarefaComentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaAnexo" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "enviadoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaAnexo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaAtividade" (
    "id" SERIAL NOT NULL,
    "tarefaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TagToTarefa" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_nome_key" ON "Tag"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "_TagToTarefa_AB_unique" ON "_TagToTarefa"("A", "B");

-- CreateIndex
CREATE INDEX "_TagToTarefa_B_index" ON "_TagToTarefa"("B");

-- AddForeignKey
ALTER TABLE "TarefaChecklistItem" ADD CONSTRAINT "TarefaChecklistItem_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaComentario" ADD CONSTRAINT "TarefaComentario_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaComentario" ADD CONSTRAINT "TarefaComentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaAnexo" ADD CONSTRAINT "TarefaAnexo_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaAnexo" ADD CONSTRAINT "TarefaAnexo_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaAtividade" ADD CONSTRAINT "TarefaAtividade_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaAtividade" ADD CONSTRAINT "TarefaAtividade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTarefa" ADD CONSTRAINT "_TagToTarefa_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTarefa" ADD CONSTRAINT "_TagToTarefa_B_fkey" FOREIGN KEY ("B") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
