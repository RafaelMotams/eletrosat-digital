import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { exportarRelatorioExcel } from "../exportRelatorio";
import { exportarNotaFiscal, validarPlanilhaEmpresa, uploadMiddleware } from "../exportNotaFiscal";
import { relatoriodiarioHandler } from "../scheduled/relatorio-diario";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Configurar trust proxy ANTES do rate limiter para identificar IPs corretamente
  app.set("trust proxy", 1);

  // ── Rate limiting: protege contra abuso e DDoS ──────────────────────────────
  // Limite geral: 300 req/min por IP (suficiente para 15 técnicos simultâneos)
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Aguarde um momento e tente novamente." },
    skip: (req) => {
      return req.path.startsWith("/assets/") || req.path.startsWith("/manus-storage/");
    },
  });

  // Limite para upload de fotos: 60 uploads/min por IP
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de upload atingido. Aguarde um momento." },
  });

  // Limite para login: 10 tentativas/5min por IP (anti-brute-force)
  const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Aguarde 5 minutos." },
  });

  // Aplicar rate limiting geral em todas as rotas /api
  app.use("/api", generalLimiter);

  // Rate limiting específico para uploads e login
  app.use("/api/trpc/tecnicoAuth.uploadOsFoto", uploadLimiter);
  app.use("/api/trpc/tecnicoAuth.uploadFotoMapaCalor", uploadLimiter);
  app.use("/api/trpc/tecnicoAuth.login", loginLimiter);
  app.use("/api/trpc/tenantAdmin.login", loginLimiter);
  app.use("/api/trpc/superadmin.login", loginLimiter);

  // ── Security headers ────────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'none';");
    res.removeHeader("X-Powered-By");
    next();
  });

  // ── Body parser: 15MB por request (foto base64 10MB ≈ 13.3MB) ───────────────
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Exportação de relatório Excel
  app.get("/api/relatorio/excel", exportarRelatorioExcel);

  // Job agendado: relatório diário de progresso (08:00 BRT = 11:00 UTC)
  app.post("/api/scheduled/relatorio-diario", relatoriodiarioHandler);

  // Nota Fiscal — faturamento da empresa
  app.get("/api/nota-fiscal/excel", exportarNotaFiscal);
  app.post("/api/nota-fiscal/validar", uploadMiddleware.single("planilha"), validarPlanilhaEmpresa);

  // ── tRPC API ─────────────────────────────────────────────────────────────────
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

  // ── Error handler global (deve ser o ÚLTIMO middleware) ──────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Express] Erro não tratado:", err.message);
    res.status(500).json({ error: "Erro interno do servidor. Tente novamente em instantes." });
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
