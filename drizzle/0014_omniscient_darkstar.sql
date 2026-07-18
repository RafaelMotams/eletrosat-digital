CREATE TABLE `manutencao_fotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`manutencaoId` int NOT NULL,
	`tipo` enum('defeito','conclusao') NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`clientId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manutencao_fotos_id` PRIMARY KEY(`id`),
	CONSTRAINT `manutencao_fotos_client_id_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `manutencoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL DEFAULT 1,
	`escolaId` int NOT NULL,
	`tecnicoId` int,
	`status` enum('pendente','em_andamento','concluida') NOT NULL DEFAULT 'pendente',
	`descricaoProblema` text NOT NULL,
	`observacaoConclusao` text,
	`fotoDefeitoUrls` text,
	`fotoDefeitoKeys` text,
	`fotoConclusaoUrls` text,
	`fotoConclusaoKeys` text,
	`dataAtribuicao` timestamp,
	`dataConclusao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manutencoes_id` PRIMARY KEY(`id`)
);
