ALTER TABLE `estoque_movimentacoes` ADD `solicitacaoId` int;--> statement-breakpoint
ALTER TABLE `estoque_solicitacoes` ADD `quantidadeAtendida` decimal(12,3) DEFAULT '0.000' NOT NULL;