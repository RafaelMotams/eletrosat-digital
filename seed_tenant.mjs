if (process.env.NODE_ENV === "production") throw new Error("seed_tenant.mjs é proibido em produção.");
throw new Error("Seed legado desativado: use provisionamento revisado com credenciais fornecidas no ambiente e banco isolado.");
