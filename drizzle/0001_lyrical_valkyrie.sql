CREATE TABLE `atribuicoes_manual` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escolaId` int NOT NULL,
	`tecnicoId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atribuicoes_manual_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escolas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inep` varchar(20) NOT NULL,
	`uf` varchar(2),
	`municipio` varchar(255),
	`nome` varchar(255) NOT NULL,
	`endereco` text,
	`latitude` decimal(12,8),
	`longitude` decimal(12,8),
	`qtdAp` int DEFAULT 1,
	`telefone` varchar(20),
	`velocidadeMinima` int,
	`velocidadeOfertada` int,
	`tipoConexao` varchar(50) DEFAULT 'Fibra',
	`status` enum('pendente','em_andamento','concluido') NOT NULL DEFAULT 'pendente',
	`tecnicoId` int,
	`dataAtribuicao` timestamp,
	`dataConclusao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escolas_id` PRIMARY KEY(`id`),
	CONSTRAINT `escolas_inep_unique` UNIQUE(`inep`)
);
--> statement-breakpoint
CREATE TABLE `ordens_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escolaId` int NOT NULL,
	`tecnicoId` int NOT NULL,
	`status` enum('aberta','em_andamento','concluida') NOT NULL DEFAULT 'aberta',
	`qtdApInstalado` int,
	`observacao` text,
	`dataAbertura` timestamp NOT NULL DEFAULT (now()),
	`dataConclusao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ordens_servico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tecnicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`telefone` varchar(20),
	`email` varchar(320) NOT NULL,
	`senhaHash` varchar(255) NOT NULL,
	`cidadeResponsavel` varchar(255),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tecnicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `tecnicos_email_unique` UNIQUE(`email`)
);
