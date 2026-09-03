-- DropForeignKey
ALTER TABLE "TarefaAnexo" DROP CONSTRAINT "TarefaAnexo_tarefaId_fkey";

-- DropForeignKey
ALTER TABLE "TarefaAtividade" DROP CONSTRAINT "TarefaAtividade_tarefaId_fkey";

-- DropForeignKey
ALTER TABLE "TarefaChecklistItem" DROP CONSTRAINT "TarefaChecklistItem_tarefaId_fkey";

-- DropForeignKey
ALTER TABLE "TarefaComentario" DROP CONSTRAINT "TarefaComentario_tarefaId_fkey";

-- AddForeignKey
ALTER TABLE "TarefaChecklistItem" ADD CONSTRAINT "TarefaChecklistItem_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaComentario" ADD CONSTRAINT "TarefaComentario_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaAnexo" ADD CONSTRAINT "TarefaAnexo_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaAtividade" ADD CONSTRAINT "TarefaAtividade_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
