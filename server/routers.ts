import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, tenantAdminProcedure } from "./_core/trpc";
import { superadminRouter } from "./routers/superadmin";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  deleteAllOrdensServico,
  resetEscolasStatusAposExcluirOS,
  atribuirPorCidade,
  atribuirTecnicoEscola,
  concluirOrdemServico,
  iniciarOrdemServico,
  registrarNaoInstalada,
  createEscola,
  createOrdemServico,
  createTecnico,
  deleteTecnico,
  deleteEscolasPorCidade,
  deleteAllEscolasByTenant,
  getDashboardStats,
  getEscolaById,
  getEscolaByInep,
  getOrdemById,
  getProdutividadePorTecnico,
  getOsDetalhadas,
  getRelatorioTecnico,
  getTecnicoByEmail,
  getTecnicoById,
  listEscolas,
  listMunicipios,
  listOrdensServico,
  listTecnicos,
  setAtribuicaoManual,
  updateEscola,
  updateTecnico,
  insertOsFoto,
  listOsFotos,
  listOsFotosByEscola,
  countOsFotosByCategoria,
  getValoresApTecnico,
  setValoresApTecnico,
  getValoresApAllTecnicos,
  getOsNaoInstaladas,
  deleteOrdemServico,
  listAllOsFotosComDados,
} from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { uploadFotosOSParaDrive } from "./googleDrive";
import { getDb } from "./db";
import { ordensServico } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Middleware para verificar se é admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  }
  return next({ ctx });
});

// === TÉCNICOS ROUTER ===
const tecnicosRouter = router({
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    return listTecnicos((ctx as any).tenantId);
  }),

  getById: tenantAdminProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const tecnico = await getTecnicoById(input.id);
    if (!tecnico) return undefined;
    const tenantId = (ctx as any).tenantId;
    if (tenantId !== undefined && tecnico.tenantId !== tenantId) return undefined;
    return tecnico;
  }),

  create: tenantAdminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        telefone: z.string().optional(),
        email: z.string().email(),
        senha: z.string().min(6),
        cidadeResponsavel: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const senhaHash = await bcrypt.hash(input.senha, 10);
      await createTecnico({
        nome: input.nome,
        telefone: input.telefone,
        email: input.email,
        senhaHash,
        cidadeResponsavel: input.cidadeResponsavel,
        ativo: true,
        tenantId: (ctx as any).tenantId,
      });
      return { success: true };
    }),

  update: tenantAdminProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        telefone: z.string().optional(),
        email: z.string().email().optional(),
        senha: z.string().min(6).optional(),
        cidadeResponsavel: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = (ctx as any).tenantId;
      if (tenantId !== undefined) {
        const tecnico = await getTecnicoById(input.id);
        if (!tecnico || tecnico.tenantId !== tenantId) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { id, senha, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (senha) {
        data.senhaHash = await bcrypt.hash(senha, 10);
      }
      await updateTecnico(id, data as Parameters<typeof updateTecnico>[1]);
      return { success: true };
    }),

  delete: tenantAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const tenantId = (ctx as any).tenantId;
    if (tenantId !== undefined) {
      const tecnico = await getTecnicoById(input.id);
      if (!tecnico || tecnico.tenantId !== tenantId) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    await deleteTecnico(input.id);
    return { success: true };
  }),
  // Buscar tabela de valores por AP de um técnico
  getValoresAp: tenantAdminProcedure
    .input(z.object({ tecnicoId: z.number() }))
    .query(async ({ input }) => {
      return getValoresApTecnico(input.tecnicoId);
    }),
  // Salvar tabela de valores por AP de um técnico
  setValoresAp: tenantAdminProcedure
    .input(
      z.object({
        tecnicoId: z.number(),
        valores: z.array(z.object({ qtdAp: z.number().min(1).max(18), valor: z.number().min(0) })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = (ctx as any).tenantId;
      await setValoresApTecnico(input.tecnicoId, tenantId, input.valores);
      return { success: true };
    }),
});

// === ESCOLAS ROUTER ===
const escolasRouter = router({
  list: tenantAdminProcedure
    .input(
      z
        .object({
          tecnicoId: z.number().optional(),
          status: z.string().optional(),
          municipio: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      // Técnico OAuth só vê suas próprias escolas
      if (ctx.user && ctx.user.role !== "admin") {
        const tecnico = await getTecnicoByEmail(ctx.user.email ?? "");
        if (!tecnico) return [];
        return listEscolas({ tecnicoId: tecnico.id });
      }
      // Admin OAuth ou tenant admin via JWT - filtrar por tenantId
      const tenantId = (ctx as any).tenantId;
      return listEscolas({ ...input, tenantId });
    }),

  getById: tenantAdminProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const escola = await getEscolaById(input.id);
    if (!escola) return undefined;
    const tenantId = (ctx as any).tenantId;
    if (tenantId !== undefined && escola.tenantId !== tenantId) return undefined;
    return escola;
  }),
  getByInep: tenantAdminProcedure.input(z.object({ inep: z.string() })).query(async ({ input }) => {
    return getEscolaByInep(input.inep);
  }),

  update: tenantAdminProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        inep: z.string().optional(),
        endereco: z.string().optional(),
        municipio: z.string().optional(),
        uf: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        telefone: z.string().optional(),
        telefoneWhatsApp: z.string().optional(),
        tipoConexao: z.string().optional(),
        velocidadeMinima: z.string().optional(),
        velocidadeOfertada: z.string().optional(),
        qtdAp: z.number().optional(),
        kitWifi: z.number().optional(),
        apAdicional: z.number().optional(),
        status: z.enum(["pendente", "em_andamento", "concluido", "nao_instalada"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = (ctx as any).tenantId;
      if (tenantId !== undefined) {
        const escola = await getEscolaById(input.id);
        if (!escola || escola.tenantId !== tenantId) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { id, ...data } = input;
      await updateEscola(id, data);
      return { success: true };
    }),

  importar: tenantAdminProcedure
    .input(
      z.object({
        escolas: z.array(
          z.object({
            inep: z.string(),
            uf: z.string().optional(),
            municipio: z.string().optional(),
            nome: z.string(),
            endereco: z.string().optional(),
            latitude: z.string().optional(),
            longitude: z.string().optional(),
            qtdAp: z.number().optional(),
            telefone: z.string().optional(),
            velocidadeMinima: z.number().optional(),
            velocidadeOfertada: z.number().optional(),
            tipoConexao: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let importadas = 0;
      let erros = 0;
      const tenantId = (ctx as any).tenantId;

      // Sanitiza latitude/longitude: rejeita strings não numéricas (ex: 'false', '')
      const sanitizeCoord = (v: string | undefined): string | undefined => {
        if (!v) return undefined;
        const n = parseFloat(v);
        if (isNaN(n)) return undefined;
        return String(n);
      };

      // Sanitiza telefone: rejeita '0' ou strings claramente inválidas
      const sanitizeTel = (v: string | undefined): string | undefined => {
        if (!v) return undefined;
        const s = v.trim();
        if (s === '0' || s === 'false' || s === 'null' || s.length < 3) return undefined;
        return s;
      };

      for (const escola of input.escolas) {
        try {
          await createEscola({
            inep: escola.inep,
            uf: escola.uf,
            municipio: escola.municipio,
            nome: escola.nome,
            endereco: escola.endereco,
            latitude: sanitizeCoord(escola.latitude),
            longitude: sanitizeCoord(escola.longitude),
            qtdAp: escola.qtdAp ?? 1,
            telefone: sanitizeTel(escola.telefone),
            velocidadeMinima: escola.velocidadeMinima ? String(escola.velocidadeMinima) : undefined,
            velocidadeOfertada: escola.velocidadeOfertada ? String(escola.velocidadeOfertada) : undefined,
            tipoConexao: escola.tipoConexao ?? "Fibra",
            status: "pendente",
            tenantId,
          });
          importadas++;
        } catch (err) {
          // Registra o erro mas continua importando as demais escolas
          console.error(`[importar] Erro ao importar escola INEP=${escola.inep}:`, (err as Error).message);
          erros++;
        }
      }
      return { success: true, importadas, erros };
    }),

  listMunicipios: tenantAdminProcedure.query(async ({ ctx }) => {
    return listMunicipios((ctx as any).tenantId);
  }),

  deletarPorCidade: tenantAdminProcedure
    .input(z.object({ municipio: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = (ctx as any).tenantId;
      const total = await deleteEscolasPorCidade(input.municipio, tenantId);
      return { success: true, total };
    }),
  deletarTodas: tenantAdminProcedure
    .mutation(async ({ ctx }) => {
      const tenantId = (ctx as any).tenantId;
      const total = await deleteAllEscolasByTenant(tenantId);
      return { success: true, total };
    }),
});

// === ATRIBUIÇÕES ROUTER ===
const atribuicoesRouter = router({
  porEscola: tenantAdminProcedure
    .input(z.object({ escolaId: z.number(), tecnicoId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      await setAtribuicaoManual(input.escolaId, input.tecnicoId!);
      return { success: true };
    }),

  porCidade: tenantAdminProcedure
    .input(z.object({ cidade: z.string(), tecnicoId: z.number() }))
    .mutation(async ({ input }) => {
      await atribuirPorCidade(input.cidade, input.tecnicoId);
      // Atualizar cidade do técnico
      await updateTecnico(input.tecnicoId, { cidadeResponsavel: input.cidade });
      return { success: true };
    }),
});

// === ORDENS DE SERVIÇO ROUTER ===
const ordensRouter = router({
  list: tenantAdminProcedure
    .input(
      z
        .object({
          tecnicoId: z.number().optional(),
          status: z.string().optional(),
          dataInicio: z.date().optional(),
          dataFim: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      // Técnico OAuth só vê suas próprias OS
      if (ctx.user && ctx.user.role !== "admin") {
        const tecnico = await getTecnicoByEmail(ctx.user.email ?? "");
        if (!tecnico) return [];
        return listOrdensServico({ tecnicoId: tecnico.id });
      }
      // Admin OAuth ou tenant admin via JWT - filtrar por tenantId
      const tenantId = (ctx as any).tenantId;
      return listOrdensServico({ ...input, tenantId });
    }),

  getById: tenantAdminProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const ordem = await getOrdemById(input.id);
    if (!ordem) return undefined;
    const tenantId = (ctx as any).tenantId;
    if (tenantId !== undefined && ordem.tenantId !== tenantId) return undefined;
    return ordem;
  }),

  criar: tenantAdminProcedure
    .input(z.object({ escolaId: z.number(), tecnicoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await createOrdemServico({
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        status: "aberta",
        dataAbertura: new Date(),
        tenantId: (ctx as any).tenantId,
      });
      // Atualizar status da escola
      await updateEscola(input.escolaId, { status: "em_andamento" });
      return { success: true };
    }),

  criarEConcluir: tenantAdminProcedure
    .input(
      z.object({
        escolaId: z.number(),
        tecnicoId: z.number(),
        qtdApInstalado: z.number().min(0),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Criar OS
      await createOrdemServico({
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        status: "aberta",
        dataAbertura: new Date(),
        tenantId: (ctx as any).tenantId,
      });
      // Buscar a OS recém-criada
      const ordens = await listOrdensServico({ tecnicoId: input.tecnicoId });
      const os = ordens.find(o => o.escolaId === input.escolaId && o.status !== "concluida");
      if (!os) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar OS" });
      // Concluir imediatamente
      await concluirOrdemServico(os.id, input.qtdApInstalado, input.observacao ?? "");
      // Notificar admin
      const escola = await getEscolaById(input.escolaId);
      const tecnico = await getTecnicoById(input.tecnicoId);
      await notifyOwner({
        title: `✅ OS Concluída: ${escola?.nome ?? "Escola"}`,
        content: `Técnico: ${tecnico?.nome ?? "Desconhecido"}\nEscola: ${escola?.nome ?? "-"}\nAPs Instalados: ${input.qtdApInstalado}\nObservação: ${input.observacao ?? "-"}`,
      });
      return { success: true };
    }),

  deletar: tenantAdminProcedure
    .input(z.object({ osId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteOrdemServico(input.osId);
      return { success: true };
    }),

  reenviarFotosDrive: tenantAdminProcedure
    .mutation(async ({ ctx }) => {
      const { uploadFotoParaDrive } = await import("./googleDrive");
      const todasFotos = await listAllOsFotosComDados();
      let sucesso = 0;
      let falhas = 0;
      const erros: string[] = [];

      for (const { foto, tecnicoNome, escolaNome, dataOS } of todasFotos) {
        try {
          let fotoUrl = foto.url;
          if (fotoUrl.startsWith("/manus-storage/")) {
            fotoUrl = `https://netvionis.manus.space${fotoUrl}`;
          }
          await uploadFotoParaDrive({
            tecnicoNome,
            escolaNome,
            fotoUrl,
            fotoIndex: foto.id,
            dataOS,
          });
          sucesso++;
        } catch (err) {
          falhas++;
          erros.push(`Foto ${foto.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        total: todasFotos.length,
        sucesso,
        falhas,
        erros: erros.slice(0, 10), // Retorna apenas os primeiros 10 erros
      };
    }),

  deletarTodas: tenantAdminProcedure
    .input(z.object({ confirmacao: z.literal("CONFIRMAR") }))
    .mutation(async ({ input, ctx }) => {
      const tenantId = (ctx as any).tenantId;
      // Excluir todas as OS do tenant
      const total = await deleteAllOrdensServico(tenantId);
      // Resetar status das escolas para "pendente" após excluir todas as OS
      await resetEscolasStatusAposExcluirOS(tenantId);
      return { success: true, total };
    }),
  concluir: protectedProcedure
    .input(
      z.object({
        osId: z.number(),
        qtdApInstalado: z.number().min(0),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const os = await getOrdemById(input.osId);
      if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada" });

      // Técnico só pode concluir suas próprias OS
      if (ctx.user.role !== "admin") {
        const tecnico = await getTecnicoByEmail(ctx.user.email ?? "");
        if (!tecnico || tecnico.id !== os.tecnicoId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para concluir esta OS" });
        }
      }

      await concluirOrdemServico(input.osId, input.qtdApInstalado, input.observacao ?? "");

      // Buscar dados para notificação
      const escola = await getEscolaById(os.escolaId);
      const tecnico = await getTecnicoById(os.tecnicoId);

      // Notificar admin
      await notifyOwner({
        title: `✅ OS Concluída: ${escola?.nome ?? "Escola"}`,
        content: `Técnico: ${tecnico?.nome ?? "Desconhecido"}\nEscola: ${escola?.nome ?? "-"}\nAPs Instalados: ${input.qtdApInstalado}\nObservação: ${input.observacao ?? "-"}`,
      });
      return { success: true };
    }),
  // Admin: iniciar uma OS existente (muda status de aberta para em_andamento)
  iniciar: tenantAdminProcedure
    .input(z.object({ osId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const os = await getOrdemById(input.osId);
      if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada" });
      const tenantId = (ctx as any).tenantId;
      if (tenantId !== undefined && os.tenantId !== tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      await iniciarOrdemServico(os.id);
      return { success: true };
    }),

  // Admin: registrar escola como não instalada
  naoInstalada: tenantAdminProcedure
    .input(z.object({
      osId: z.number(),
      motivo: z.enum(["escola_desativada", "em_reforma", "mudanca_endereco"]),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const os = await getOrdemById(input.osId);
      if (!os) throw new TRPCError({ code: "NOT_FOUND", message: "OS não encontrada" });
      const tenantId = (ctx as any).tenantId;
      if (tenantId !== undefined && os.tenantId !== tenantId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      await registrarNaoInstalada(os.escolaId, os.tecnicoId, input.motivo, input.observacao);
      return { success: true };
    }),

  // Busca fotos de uma OS pelo admin (publicProcedure para funcionar com qualquer autenticação)
  getOsFotos: publicProcedure
    .input(z.object({ osId: z.number() }))
    .query(async ({ input }) => {
      return listOsFotos(input.osId);
    }),
  // Busca fotos de uma escola (todas as OS) pelo admin
  getOsFotosByEscola: publicProcedure
    .input(z.object({ escolaId: z.number() }))
    .query(async ({ input }) => {
      return listOsFotosByEscola(input.escolaId);
    }),
});
// === DASHBOARD ROUTER ====
const dashboardRouter = router({
  stats: tenantAdminProcedure.query(async ({ ctx }) => {
    return getDashboardStats((ctx as any).tenantId);
  }),

  produtividade: tenantAdminProcedure.query(async ({ ctx }) => {
    return getProdutividadePorTecnico((ctx as any).tenantId);
  }),
});
// === RELATÓRIOS ROUTER ===
const relatoriosRouter = router({
  // Usa tenantAdminProcedure para filtrar por tenant
  tecnico: tenantAdminProcedure
    .input(
      z.object({
        tecnicoId: z.number(),
        // Recebe strings ISO ou null para evitar problemas de serialização de Date
        dataInicio: z.string().nullable().optional(),
        dataFim: z.string().nullable().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const inicio = input.dataInicio ? new Date(input.dataInicio) : null;
      const fim = input.dataFim ? new Date(input.dataFim) : null;
      return getRelatorioTecnico(input.tecnicoId, inicio, fim, (ctx as any).tenantId);
    }),

  ranking: tenantAdminProcedure.query(async ({ ctx }) => {
    return getProdutividadePorTecnico((ctx as any).tenantId);
  }),

  osDetalhadas: tenantAdminProcedure
    .input(
      z.object({
        tecnicoId: z.number().optional(), // 0 = todos os técnicos (legado)
        tecnicoIds: z.array(z.number()).optional(), // múltiplos técnicos
        dataInicio: z.string().nullable().optional(),
        dataFim: z.string().nullable().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const inicio = input.dataInicio ? new Date(input.dataInicio) : null;
      const fim = input.dataFim ? new Date(input.dataFim) : null;
      const tenantId = (ctx as any).tenantId;
      // Suporte a múltiplos técnicos
      const tecnicoIds = input.tecnicoIds && input.tecnicoIds.length > 0 ? input.tecnicoIds : undefined;
      const tecnicoId = !tecnicoIds && input.tecnicoId && input.tecnicoId > 0 ? input.tecnicoId : undefined;
      const rows = await getOsDetalhadas({ tecnicoId, tecnicoIds, dataInicio: inicio, dataFim: fim, tenantId });
      // Buscar tabela de valores por AP de todos os técnicos do tenant
      const valoresMap = await getValoresApAllTecnicos(tenantId);
      // Calcular valor por OS com base nos APs instalados e valor cadastrado do técnico
      return rows.map(os => {
        const tecValores = valoresMap[os.tecnicoId ?? 0] ?? {};
        const qtd = os.qtdApInstalado ?? 0;
        const valorCalculado = tecValores[qtd] ?? null;
        return { ...os, valorCalculado };
      });
    }),

  osNaoInstaladas: tenantAdminProcedure
    .input(
      z.object({
        tecnicoIds: z.array(z.number()).optional(),
        dataInicio: z.string().nullable().optional(),
        dataFim: z.string().nullable().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const inicio = input.dataInicio ? new Date(input.dataInicio) : null;
      const fim = input.dataFim ? new Date(input.dataFim) : null;
      const tenantId = (ctx as any).tenantId;
      // Se múltiplos técnicos, busca para cada um e agrega
      if (input.tecnicoIds && input.tecnicoIds.length > 0) {
        const results = await Promise.all(
          input.tecnicoIds.map(tid => getOsNaoInstaladas({ tenantId, tecnicoId: tid, dataInicio: inicio, dataFim: fim }))
        );
        return results.flat();
      }
      return getOsNaoInstaladas({ tenantId, dataInicio: inicio, dataFim: fim });
    }),
});

// === PLANILHA ROUTER ===
const planilhaRouter = router({
  listar: tenantAdminProcedure.query(async ({ ctx }) => {
    return listEscolas({ tenantId: (ctx as any).tenantId });
  }),
});

// === AUTH DO TÉCNICO (login por email/senha) ===
const tecnicoAuthRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), senha: z.string() }))
    .mutation(async ({ input }) => {
      const tecnico = await getTecnicoByEmail(input.email);
      if (!tecnico) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
      }
      const valid = await bcrypt.compare(input.senha, tecnico.senhaHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
      }
      return {
        id: tecnico.id,
        nome: tecnico.nome,
        email: tecnico.email,
        telefone: tecnico.telefone,
        cidadeResponsavel: tecnico.cidadeResponsavel,
      };
    }),

  me: publicProcedure
    .input(z.object({ tecnicoId: z.number() }))
    .query(async ({ input }) => {
      return getTecnicoById(input.tecnicoId);
    }),
  // Busca escolas atribuídas ao técnico pelo ID (não depende de OAuth)
  minhasEscolas: publicProcedure
    .input(z.object({ tecnicoId: z.number() }))
    .query(async ({ input }) => {
      return listEscolas({ tecnicoId: input.tecnicoId });
    }),
  // Busca OS do técnico pelo ID
  minhasOrdens: publicProcedure
    .input(z.object({ tecnicoId: z.number() }))
    .query(async ({ input }) => {
      return listOrdensServico({ tecnicoId: input.tecnicoId });
    }),
  // Busca telefone da escola pelo INEP usando IA e salva no banco
  buscarTelefone: publicProcedure
    .input(z.object({ escolaId: z.number(), inep: z.string(), nome: z.string(), municipio: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");

      // Primeiro verifica se já tem telefone salvo
      const escola = await getEscolaById(input.escolaId);
      if (escola?.telefoneWhatsApp || escola?.telefone) {
        return {
          telefone: escola.telefoneWhatsApp || escola.telefone,
          salvo: false,
        };
      }

      // Usa LLM com busca web para encontrar o telefone
      const prompt = `Você é um assistente especializado em encontrar informações de escolas públicas brasileiras.

Preciso do número de telefone da seguinte escola:
- INEP: ${input.inep}
- Nome: ${input.nome}
- Município: ${input.municipio || "Bahia"}

Busque no site do INEP (https://inepdata.inep.gov.br), no Censo Escolar, ou em qualquer fonte confiável o telefone desta escola.

Responda APENAS com o número de telefone no formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
Se não encontrar, responda: NAO_ENCONTRADO
Não inclua nenhum outro texto, apenas o número ou NAO_ENCONTRADO.`;

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um assistente que busca informações de escolas públicas brasileiras. Responda apenas com o número de telefone encontrado ou NAO_ENCONTRADO." },
            { role: "user", content: prompt },
          ],
          max_tokens: 100,
        });

        const content = result.choices[0]?.message?.content;
        const telefoneRaw = typeof content === "string" ? content.trim() : "";

        if (!telefoneRaw || telefoneRaw === "NAO_ENCONTRADO" || telefoneRaw.includes("NAO_ENCONTRADO")) {
          return { telefone: null, salvo: false };
        }

        // Extrai apenas dígitos e valida
        const digits = telefoneRaw.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 11) {
          return { telefone: null, salvo: false };
        }

        // Salva no banco
        await updateEscola(input.escolaId, { telefone: telefoneRaw, telefoneWhatsApp: telefoneRaw });

        return { telefone: telefoneRaw, salvo: true };
      } catch (e) {
        console.error("[buscarTelefone] Erro ao buscar telefone:", e);
        return { telefone: null, salvo: false };
      }
    }),

  // Inicia a OS (muda status de aberta para em_andamento)
  iniciarOS: publicProcedure
    .input(z.object({
      escolaId: z.number(),
      tecnicoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const escola = await getEscolaById(input.escolaId);
      if (!escola) throw new TRPCError({ code: "NOT_FOUND", message: "Escola não encontrada" });
      // Busca OS existente primeiro (evita race condition)
      const ordens = await listOrdensServico({ tecnicoId: input.tecnicoId });
      const osExistente = ordens.find(o => o.escolaId === input.escolaId);
      if (osExistente) {
        // Já existe — garante que está em andamento
        if (osExistente.status === "aberta") {
          await iniciarOrdemServico(osExistente.id);
        }
        // CORRIGIDO: sempre atualiza o status da escola, mesmo quando a OS já existia
        // (bug: escola ficava como 'pendente' na Home mesmo após iniciar)
        if (escola.status !== "em_andamento" && escola.status !== "concluido" && escola.status !== "nao_instalada") {
          await updateEscola(input.escolaId, { status: "em_andamento" });
        }
        return { osId: osExistente.id };
      }
      // Cria nova OS com upsert (onDuplicateKeyUpdate)
      const result = await createOrdemServico({
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        status: "em_andamento",
      });
      const insertId = (result as any).insertId;
      // Se insertId = 0, houve race condition — busca a OS criada pelo outro request
      if (!insertId) {
        const ordensApos = await listOrdensServico({ tecnicoId: input.tecnicoId });
        const osCriada = ordensApos.find(o => o.escolaId === input.escolaId);
        if (!osCriada) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar OS" });
        // Garante que a escola também fica em_andamento no caso de race condition
        await updateEscola(input.escolaId, { status: "em_andamento" });
        return { osId: osCriada.id };
      }
      await updateEscola(input.escolaId, { status: "em_andamento" });
      return { osId: insertId };
    }),

  // Registra escola como não instalada com motivo
  naoInstalada: publicProcedure
    .input(z.object({
      escolaId: z.number(),
      tecnicoId: z.number(),
      motivo: z.enum(["escola_desativada", "em_reforma", "mudanca_endereco"]),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const escola = await getEscolaById(input.escolaId);
      if (!escola) throw new TRPCError({ code: "NOT_FOUND", message: "Escola não encontrada" });
      const result = await registrarNaoInstalada(input.escolaId, input.tecnicoId, input.motivo, input.observacao);
      const tecnico = await getTecnicoById(input.tecnicoId);
      const motivoLabel: Record<string, string> = {
        escola_desativada: "Escola desativada",
        em_reforma: "Em reforma",
        mudanca_endereco: "Mudança de endereço",
      };
      await notifyOwner({
        title: `⚠️ Não Instalada: ${escola.nome}`,
        content: `Técnico: ${tecnico?.nome ?? "Desconhecido"}\nEscola: ${escola.nome}\nMotivo: ${motivoLabel[input.motivo]}\nObservação: ${input.observacao ?? "-"}`,
      });
      return result;
    }),

  // Cria e conclui OS pelo técnico com foto do mapa de calor (sem OAuth)
  concluirEscola: publicProcedure
    .input(z.object({
      escolaId: z.number(),
      tecnicoId: z.number(),
      qtdApInstalado: z.number(),
      observacao: z.string().optional(),
      fotoMapaCalorUrl: z.string().optional(),
      fotoMapaCalorKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const escola = await getEscolaById(input.escolaId);
      if (!escola) throw new TRPCError({ code: "NOT_FOUND", message: "Escola não encontrada" });

      // ── THREAD-SAFE: busca OS existente e conclui atomicamente ───────────────────────
      // Busca APENAS as OS desta escola+técnico (não todas do técnico)
      // para evitar race condition com 15 técnicos simultâneos
      const ordensExistentes = await listOrdensServico({ tecnicoId: input.tecnicoId });
      // Prioridade: em_andamento/aberta → concluida (evita duplicatas offline)
      const osEmAndamento = ordensExistentes.find(
        o => o.escolaId === input.escolaId && (o.status === "em_andamento" || o.status === "aberta")
      );
      const osJaConcluida = ordensExistentes.find(
        o => o.escolaId === input.escolaId && o.status === "concluida"
      );
      const osExistente = osEmAndamento ?? osJaConcluida;
      let osId: number;
      if (osExistente) {
        // Atualizar a OS existente para concluída (ou manter se já concluída)
        // Idempotente: se já está concluída, apenas retorna o osId
        if (osExistente.status !== "concluida") {
          await concluirOrdemServico(osExistente.id, input.qtdApInstalado, input.observacao ?? "");
        }
        osId = osExistente.id;
      } else {
        // Criar nova OS já concluída (fallback — escola sem OS prévia)
        // Usa INSERT para garantir que apenas uma OS é criada mesmo com requests simultâneos
        try {
          const os = await createOrdemServico({
            escolaId: input.escolaId,
            tecnicoId: input.tecnicoId,
            qtdApInstalado: input.qtdApInstalado,
            observacao: input.observacao ?? "",
            status: "concluida",
            fotoMapaCalorUrl: input.fotoMapaCalorUrl,
            fotoMapaCalorKey: input.fotoMapaCalorKey,
          });
          osId = (os as any).insertId;
        } catch (insertErr) {
          // Em caso de race condition (dois inserts simultâneos), busca a OS criada pelo outro request
          const ordensAposInsert = await listOrdensServico({ tecnicoId: input.tecnicoId });
          const osCriada = ordensAposInsert.find(
            o => o.escolaId === input.escolaId
          );
          if (osCriada) {
            osId = osCriada.id;
          } else {
            throw insertErr; // re-throw se não encontrou
          }
        }
      }
      // Atualiza escola como concluída (idempotente)
      await updateEscola(input.escolaId, { status: "concluido", dataConclusao: new Date() });
      // Notifica o dono apenas se a OS foi recém concluída (não em retry)
      if (!osJaConcluida) {
        const tecnico = await getTecnicoById(input.tecnicoId);
        await notifyOwner({
          title: `✅ OS Concluída: ${escola.nome}`,
          content: `Técnico: ${tecnico?.nome ?? "Desconhecido"}\nEscola: ${escola.nome ?? "-"}\nAPs Instalados: ${input.qtdApInstalado}\nObservação: ${input.observacao ?? "-"}`,
        });

        // Upload síncrono das fotos para o Google Drive
        try {
          const fotos = await listOsFotos(osId);
          // Passa as URLs relativas diretamente — googleDrive.ts resolve via storageGetSignedUrl
          const fotoUrls = fotos
            .filter(f => f.url)
            .map(f => f.url);
          if (input.fotoMapaCalorUrl) {
            fotoUrls.unshift(input.fotoMapaCalorUrl);
          }
          if (fotoUrls.length > 0) {
            const dataOS = new Date().toISOString().split("T")[0];
            const result = await uploadFotosOSParaDrive({
              tecnicoNome: tecnico?.nome ?? "Tecnico",
              escolaNome: escola.nome ?? `Escola-${input.escolaId}`,
              fotos: fotoUrls,
              dataOS,
            });
            console.log(`[Drive] OS ${osId}: ${result.sucesso}/${result.total} fotos enviadas para o Drive`);
          }
        } catch (driveErr) {
          // Não bloqueia a conclusão da OS se o Drive falhar
          console.error(`[Drive] Erro ao enviar fotos da OS ${osId}:`, driveErr);
        }
      }
      return { osId };
    }),

  // Upload de foto do mapa de calor para uma OS
  uploadFotoMapaCalor: publicProcedure
    .input(z.object({
      osId: z.number().optional(),
      escolaId: z.number(),
      tecnicoId: z.number(),
      // base64 da imagem
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.imageBase64, "base64");
      const key = `mapa-calor/escola-${input.escolaId}-tecnico-${input.tecnicoId}-${Date.now()}.jpg`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      // Se tiver osId, atualiza a OS existente
      if (input.osId) {
        const db = await getDb();
        if (db) {
          await db.update(ordensServico).set({ fotoMapaCalorUrl: url, fotoMapaCalorKey: key }).where(eq(ordensServico.id, input.osId));
        }
      }
      return { url, key };
    }),

  // Upload de foto por categoria (mapa_calor, fotos_ap, etiqueta_serial_ap, etiqueta_controladora, etiqueta_nobreak, etiqueta_switch)
  uploadOsFoto: publicProcedure
    .input(z.object({
      osId: z.number(),
      escolaId: z.number(),
      tecnicoId: z.number(),
      categoria: z.enum(["mapa_calor", "fotos_ap", "etiqueta_controladora", "etiqueta_nobreak", "etiqueta_switch"]),
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      // clientId: ID único gerado pelo app offline para garantir idempotência
      clientId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Validar tamanho da imagem (base64 de 10MB = ~13.3MB de string)
      const maxBase64Size = 14 * 1024 * 1024; // 14MB em caracteres
      if (input.imageBase64.length > maxBase64Size) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "Foto muito grande. Máximo permitido: 10MB por foto.",
        });
      }
      const buffer = Buffer.from(input.imageBase64, "base64");
      const key = `os-fotos/${input.categoria}/os-${input.osId}-${Date.now()}.jpg`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await insertOsFoto({
        osId: input.osId,
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        categoria: input.categoria,
        url,
        fileKey: key,
        clientId: input.clientId,
      });
      return { url, key };
    }),

  // Busca fotos de uma OS por ID
  getOsFotos: publicProcedure
    .input(z.object({ osId: z.number() }))
    .query(async ({ input }) => {
      return listOsFotos(input.osId);
    }),

  // Busca fotos de uma escola (todas as OS)
  getOsFotosByEscola: publicProcedure
    .input(z.object({ escolaId: z.number() }))
    .query(async ({ input }) => {
       return listOsFotosByEscola(input.escolaId);
    }),
  // Verifica se todas as categorias obrigatórias têm foto
  verificarFotosObrigatorias: publicProcedure
    .input(z.object({ osId: z.number() }))
    .query(async ({ input }) => {
      const counts = await countOsFotosByCategoria(input.osId);
      const categorias = ["mapa_calor", "fotos_ap", "etiqueta_controladora", "etiqueta_nobreak", "etiqueta_switch"] as const;
      const resultado: Record<string, boolean> = {};
      for (const cat of categorias) {
        resultado[cat] = (counts[cat] ?? 0) > 0;
      }
      const todasPreenchidas = categorias.every(c => resultado[c]);
      return { resultado, todasPreenchidas };
    }),
});

// === APP ROUTER ===

const tenantAdminSelfRouter = router({
  alterarSenha: tenantAdminProcedure
    .input(z.object({ senhaAtual: z.string(), novaSenha: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const { tenantSession } = ctx as any;
      if (!tenantSession) throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
      const { updateTenantAdminPassword, getTenantAdminByEmail } = await import("./db-tenant");
      // Verificar senha atual
      const admin = await getTenantAdminByEmail(tenantSession.email);
      if (!admin) throw new TRPCError({ code: "NOT_FOUND", message: "Admin não encontrado" });
      const valid = await bcrypt.compare(input.senhaAtual, admin.senhaHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });
      // Atualizar senha
      await updateTenantAdminPassword(admin.id, input.novaSenha);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tecnicos: tecnicosRouter,
  escolas: escolasRouter,
  atribuicoes: atribuicoesRouter,
  ordens: ordensRouter,
  dashboard: dashboardRouter,
  relatorios: relatoriosRouter,
  tecnicoAuth: tecnicoAuthRouter,
  planilha: planilhaRouter,
  superadmin: superadminRouter,
  tenantAdmin: tenantAdminSelfRouter,
});

export type AppRouter = typeof appRouter;
