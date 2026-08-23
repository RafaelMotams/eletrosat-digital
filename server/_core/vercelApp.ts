import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { createContext } from "./context";
import { appRouter } from "../routers";
import { exportarRelatorioExcel } from "../exportRelatorio";
import { exportarNotaFiscal, validarPlanilhaEmpresa, uploadMiddleware } from "../exportNotaFiscal";
import { relatoriodiarioHandler } from "../scheduled/relatorio-diario";

/**
 * Express app sem server.listen().
 * A Vercel gerencia o servidor HTTP e executa este app como Function.
 */
export function createVercelApp() {
  const app = express();

  app.set("trust proxy", 1);

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Aguarde um momento e tente novamente." },
    skip: req => req.path.startsWith("/assets/") || req.path.startsWith("/manus-storage/"),
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de upload atingido. Aguarde um momento." },
  });

  const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Aguarde 5 minutos." },
  });

  app.use("/api", generalLimiter);
  app.use("/api/trpc/tecnicoAuth.uploadOsFoto", uploadLimiter);
  app.use("/api/trpc/tecnicoAuth.uploadFotoMapaCalor", uploadLimiter);
  app.use("/api/trpc/tecnicoAuth.login", loginLimiter);
  app.use("/api/trpc/tenantAdmin.login", loginLimiter);
  app.use("/api/trpc/superadmin.login", loginLimiter);

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'none';"
    );
    res.removeHeader("X-Powered-By");
    next();
  });

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/relatorio/excel", exportarRelatorioExcel);
  app.post("/api/scheduled/relatorio-diario", relatoriodiarioHandler);
  app.get("/api/nota-fiscal/excel", exportarNotaFiscal);
  app.post("/api/nota-fiscal/validar", uploadMiddleware.single("planilha"), validarPlanilhaEmpresa);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] Erro interno em ${path}:`, error.message);
        }
      },
    })
  );

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Express] Erro não tratado:", err.message);
    res.status(500).json({ error: "Erro interno do servidor. Tente novamente em instantes." });
  });

  return app;
}

export const vercelApp = createVercelApp();
