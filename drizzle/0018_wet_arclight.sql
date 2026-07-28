ALTER TABLE `manutencoes` MODIFY COLUMN `escolaId` int;--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaNome` varchar(255);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaInep` varchar(20);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaMunicipio` varchar(255);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaEndereco` text;--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaLatitude` decimal(10,8);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaLongitude` decimal(11,8);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `escolaNaoCadastradaWhatsapp` varchar(20);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `quilometragem` decimal(8,2) DEFAULT 0;