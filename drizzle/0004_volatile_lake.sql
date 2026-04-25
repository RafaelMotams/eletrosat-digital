ALTER TABLE `escolas` MODIFY COLUMN `status` enum('pendente','em_andamento','concluido','nao_instalada') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `ordens_servico` MODIFY COLUMN `status` enum('aberta','em_andamento','concluida','nao_instalada') NOT NULL DEFAULT 'aberta';--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `motivoNaoInstalacao` enum('escola_desativada','em_reforma','mudanca_endereco');--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `fotoMapaCalorUrl` text;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `fotoMapaCalorKey` varchar(500);