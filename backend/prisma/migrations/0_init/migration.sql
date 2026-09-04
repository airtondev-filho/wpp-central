-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SUPERVISOR', 'AGENTE', 'VISUALIZACAO') NOT NULL DEFAULT 'AGENTE',
    `numero` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `online` BOOLEAN NOT NULL DEFAULT false,
    `ultimoAcesso` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pontos` INTEGER NOT NULL DEFAULT 0,
    `molduraEquipada` VARCHAR(191) NULL,
    `tituloEquipado` VARCHAR(191) NULL,
    `bannerEquipado` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grupo` (
    `jid` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `arquivado` BOOLEAN NOT NULL DEFAULT false,
    `slaNormal` INTEGER NULL,
    `slaAlto` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`jid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Atendimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grupoJid` VARCHAR(191) NOT NULL,
    `status` ENUM('ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'FINALIZADO') NOT NULL DEFAULT 'ABERTO',
    `prioridade` ENUM('NORMAL', 'ALTO', 'CRITICO') NOT NULL DEFAULT 'NORMAL',
    `agenteId` INTEGER NULL,
    `ultimaMsg` TEXT NULL,
    `ultimoRemetente` VARCHAR(191) NULL,
    `ultimoTimestamp` BIGINT NOT NULL DEFAULT 0,
    `ehMinha` BOOLEAN NOT NULL DEFAULT false,
    `ultimoAgenteNome` VARCHAR(191) NULL,
    `redirecionadoEm` DATETIME(3) NULL,
    `redirecionadoPendente` BOOLEAN NOT NULL DEFAULT false,
    `redirecionadoPorId` INTEGER NULL,
    `aberturaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `primeiraRespostaEm` DATETIME(3) NULL,
    `finalizadoEm` DATETIME(3) NULL,
    `finalizadoPor` VARCHAR(191) NULL,
    `totalMensagens` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mensagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `atendId` INTEGER NOT NULL,
    `remetente` VARCHAR(191) NOT NULL,
    `texto` TEXT NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'text',
    `ehAgente` BOOLEAN NOT NULL DEFAULT false,
    `agenteId` INTEGER NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoAtendimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `atendId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `de` VARCHAR(191) NULL,
    `para` VARCHAR(191) NULL,
    `descricao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Config` (
    `chave` VARCHAR(191) NOT NULL,
    `valor` TEXT NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Intencao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `frases` JSON NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Intencao_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegraAutomacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `gatilho` VARCHAR(191) NOT NULL,
    `intencaoId` INTEGER NULL,
    `confiancaMin` DOUBLE NOT NULL DEFAULT 0.85,
    `acao` VARCHAR(191) NOT NULL,
    `acaoValor` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quadro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `cor` VARCHAR(191) NOT NULL DEFAULT '#25d366',
    `criadorId` INTEGER NOT NULL,
    `favorito` BOOLEAN NOT NULL DEFAULT false,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `arquivado` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuadroMembro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quadroId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `QuadroMembro_quadroId_userId_key`(`quadroId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lista` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quadroId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `posicao` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tarefa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listaId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `prioridade` ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'MEDIA',
    `responsavelId` INTEGER NULL,
    `criadorId` INTEGER NOT NULL,
    `prazo` DATETIME(3) NULL,
    `concluidoEm` DATETIME(3) NULL,
    `posicao` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `cor` VARCHAR(191) NOT NULL DEFAULT '#25d366',

    UNIQUE INDEX `Tag_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TarefaChecklistItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarefaId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `concluido` BOOLEAN NOT NULL DEFAULT false,
    `posicao` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TarefaComentario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarefaId` INTEGER NOT NULL,
    `autorId` INTEGER NOT NULL,
    `texto` TEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editadoEm` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TarefaAnexo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarefaId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `tamanho` INTEGER NOT NULL,
    `enviadoPorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TarefaAtividade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarefaId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `autorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Treinamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `instrutorId` INTEGER NOT NULL,
    `grupoJid` VARCHAR(191) NULL,
    `data` DATETIME(3) NULL,
    `duracaoMin` INTEGER NULL,
    `status` ENUM('PLANEJADO', 'AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO') NOT NULL DEFAULT 'PLANEJADO',
    `conteudo` TEXT NULL,
    `observacoes` TEXT NULL,
    `materiais` JSON NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `googleEventId` VARCHAR(191) NULL,
    `googleMeetLink` VARCHAR(191) NULL,
    `transcricao` TEXT NULL,
    `avaliacaoIA` TEXT NULL,
    `avaliacaoIAGeradaEm` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreinamentoParticipante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `treinamentoId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO') NOT NULL DEFAULT 'NAO_INICIADO',
    `concluidoEm` DATETIME(3) NULL,

    UNIQUE INDEX `TreinamentoParticipante_treinamentoId_userId_key`(`treinamentoId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Requisicao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA') NOT NULL DEFAULT 'ABERTA',
    `prioridade` ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'NORMAL',
    `prazo` DATETIME(3) NULL,
    `avisoIntervaloMinutos` INTEGER NULL,
    `ultimoAvisoEm` DATETIME(3) NULL,
    `grupoJid` VARCHAR(191) NOT NULL,
    `criadorId` INTEGER NOT NULL,
    `responsavelId` INTEGER NULL,
    `clickupTaskId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluidoEm` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequisicaoAnexo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requisicaoId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `tamanho` INTEGER NOT NULL,
    `enviadoPorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `corpo` TEXT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atendId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserBadge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `badgeSlug` VARCHAR(191) NOT NULL,
    `desbloqueadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserBadge_userId_badgeSlug_key`(`userId`, `badgeSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMissao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `missaoSlug` VARCHAR(191) NOT NULL,
    `desbloqueadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserMissao_userId_missaoSlug_key`(`userId`, `missaoSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserBau` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `missaoSlug` VARCHAR(191) NOT NULL,
    `ganhoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `abertoEm` DATETIME(3) NULL,

    UNIQUE INDEX `UserBau_userId_missaoSlug_key`(`userId`, `missaoSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PontosHistorico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `atendimentoId` INTEGER NULL,
    `requisicaoId` INTEGER NULL,
    `treinamentoId` INTEGER NULL,
    `pontos` INTEGER NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PontosHistorico_userId_atendimentoId_motivo_key`(`userId`, `atendimentoId`, `motivo`),
    UNIQUE INDEX `PontosHistorico_userId_requisicaoId_motivo_key`(`userId`, `requisicaoId`, `motivo`),
    UNIQUE INDEX `PontosHistorico_userId_treinamentoId_motivo_key`(`userId`, `treinamentoId`, `motivo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TagToTarefa` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TagToTarefa_AB_unique`(`A`, `B`),
    INDEX `_TagToTarefa_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_RequisicaoToTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_RequisicaoToTag_AB_unique`(`A`, `B`),
    INDEX `_RequisicaoToTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_grupoJid_fkey` FOREIGN KEY (`grupoJid`) REFERENCES `Grupo`(`jid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_agenteId_fkey` FOREIGN KEY (`agenteId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_redirecionadoPorId_fkey` FOREIGN KEY (`redirecionadoPorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensagem` ADD CONSTRAINT `Mensagem_atendId_fkey` FOREIGN KEY (`atendId`) REFERENCES `Atendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensagem` ADD CONSTRAINT `Mensagem_agenteId_fkey` FOREIGN KEY (`agenteId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoAtendimento` ADD CONSTRAINT `HistoricoAtendimento_atendId_fkey` FOREIGN KEY (`atendId`) REFERENCES `Atendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegraAutomacao` ADD CONSTRAINT `RegraAutomacao_intencaoId_fkey` FOREIGN KEY (`intencaoId`) REFERENCES `Intencao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quadro` ADD CONSTRAINT `Quadro_criadorId_fkey` FOREIGN KEY (`criadorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadroMembro` ADD CONSTRAINT `QuadroMembro_quadroId_fkey` FOREIGN KEY (`quadroId`) REFERENCES `Quadro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuadroMembro` ADD CONSTRAINT `QuadroMembro_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lista` ADD CONSTRAINT `Lista_quadroId_fkey` FOREIGN KEY (`quadroId`) REFERENCES `Quadro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tarefa` ADD CONSTRAINT `Tarefa_listaId_fkey` FOREIGN KEY (`listaId`) REFERENCES `Lista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tarefa` ADD CONSTRAINT `Tarefa_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tarefa` ADD CONSTRAINT `Tarefa_criadorId_fkey` FOREIGN KEY (`criadorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaChecklistItem` ADD CONSTRAINT `TarefaChecklistItem_tarefaId_fkey` FOREIGN KEY (`tarefaId`) REFERENCES `Tarefa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaComentario` ADD CONSTRAINT `TarefaComentario_tarefaId_fkey` FOREIGN KEY (`tarefaId`) REFERENCES `Tarefa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaComentario` ADD CONSTRAINT `TarefaComentario_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaAnexo` ADD CONSTRAINT `TarefaAnexo_tarefaId_fkey` FOREIGN KEY (`tarefaId`) REFERENCES `Tarefa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaAnexo` ADD CONSTRAINT `TarefaAnexo_enviadoPorId_fkey` FOREIGN KEY (`enviadoPorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaAtividade` ADD CONSTRAINT `TarefaAtividade_tarefaId_fkey` FOREIGN KEY (`tarefaId`) REFERENCES `Tarefa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TarefaAtividade` ADD CONSTRAINT `TarefaAtividade_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treinamento` ADD CONSTRAINT `Treinamento_instrutorId_fkey` FOREIGN KEY (`instrutorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Treinamento` ADD CONSTRAINT `Treinamento_grupoJid_fkey` FOREIGN KEY (`grupoJid`) REFERENCES `Grupo`(`jid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoParticipante` ADD CONSTRAINT `TreinamentoParticipante_treinamentoId_fkey` FOREIGN KEY (`treinamentoId`) REFERENCES `Treinamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TreinamentoParticipante` ADD CONSTRAINT `TreinamentoParticipante_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisicao` ADD CONSTRAINT `Requisicao_grupoJid_fkey` FOREIGN KEY (`grupoJid`) REFERENCES `Grupo`(`jid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisicao` ADD CONSTRAINT `Requisicao_criadorId_fkey` FOREIGN KEY (`criadorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisicao` ADD CONSTRAINT `Requisicao_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisicaoAnexo` ADD CONSTRAINT `RequisicaoAnexo_requisicaoId_fkey` FOREIGN KEY (`requisicaoId`) REFERENCES `Requisicao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisicaoAnexo` ADD CONSTRAINT `RequisicaoAnexo_enviadoPorId_fkey` FOREIGN KEY (`enviadoPorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_atendId_fkey` FOREIGN KEY (`atendId`) REFERENCES `Atendimento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBadge` ADD CONSTRAINT `UserBadge_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMissao` ADD CONSTRAINT `UserMissao_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBau` ADD CONSTRAINT `UserBau_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PontosHistorico` ADD CONSTRAINT `PontosHistorico_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TagToTarefa` ADD CONSTRAINT `_TagToTarefa_A_fkey` FOREIGN KEY (`A`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TagToTarefa` ADD CONSTRAINT `_TagToTarefa_B_fkey` FOREIGN KEY (`B`) REFERENCES `Tarefa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RequisicaoToTag` ADD CONSTRAINT `_RequisicaoToTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `Requisicao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RequisicaoToTag` ADD CONSTRAINT `_RequisicaoToTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

