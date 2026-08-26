CREATE TABLE `estoque_solicitacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`tecnicoId` int NOT NULL,
	`materialId` int NOT NULL,
	`quantidadeSolicitada` decimal(12,3) NOT NULL,
	`observacao` text,
	`status` enum('aberta','em_analise','atendida','cancelada') NOT NULL DEFAULT 'aberta',
	`resposta` text,
	`atendidaPorAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estoque_solicitacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `estoque_solicitacao_tenant_status_idx` ON `estoque_solicitacoes` (`tenantId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `estoque_solicitacao_tecnico_status_idx` ON `estoque_solicitacoes` (`tenantId`,`tecnicoId`,`status`);--> statement-breakpoint
CREATE INDEX `estoque_solicitacao_material_idx` ON `estoque_solicitacoes` (`tenantId`,`materialId`);