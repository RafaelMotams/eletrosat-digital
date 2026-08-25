ALTER TABLE `tenant_admins` ADD `emailVerificadoEm` timestamp;--> statement-breakpoint
ALTER TABLE `tenant_admins` ADD `emailVerificacaoHash` varchar(128);--> statement-breakpoint
ALTER TABLE `tenant_admins` ADD `emailVerificacaoExpiraEm` timestamp;