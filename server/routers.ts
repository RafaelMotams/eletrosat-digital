import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  atribuirPorCidade,
  atribuirTecnicoEscola,
  concluirOrdemServico,
  createEscola,
  createOrdemServico,
  createTecnico,
  deleteTecnico,
  deleteEscolasPorCidade,
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
} from "./db";
import { notifyOwner } from "./_core/notification";

// Middleware para verificar se é admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  }
  return next({ ctx });
});

// === TÉCNICOS ROUTER ===
const tecnicosRouter = router({
  list: adminProcedure.query(async () => {
    return listTecnicos();
  }),

  getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getTecnicoById(input.id);
  }),

  create: adminProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        telefone: z.string().optional(),
        email: z.string().email(),
        senha: z.string().min(6),
        cidadeResponsavel: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const senhaHash = await bcrypt.hash(input.senha, 10);
      await createTecnico({
        nome: input.nome,
        telefone: input.telefone,
        email: input.email,
        senhaHash,
        cidadeResponsavel: input.cidadeResponsavel,
        ativo: true,
      });
      return { success: true };
    }),

  update: adminProcedure
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
    .mutation(async ({ input }) => {
      const { id, senha, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (senha) {
        data.senhaHash = await bcrypt.hash(senha, 10);
      }
      await updateTecnico(id, data as Parameters<typeof updateTecnico>[1]);
      return { success: true };
    }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteTecnico(input.id);
    return { success: true };
  }),
});

// === ESCOLAS ROUTER ===
const escolasRouter = router({
  list: protectedProcedure
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
      // Técnico só vê suas próprias escolas
      if (ctx.user.role !== "admin") {
        // Buscar técnico pelo email do usuário logado
        const tecnico = await getTecnicoByEmail(ctx.user.email ?? "");
        if (!tecnico) return [];
        return listEscolas({ tecnicoId: tecnico.id });
      }
      return listEscolas(input);
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getEscolaById(input.id);
  }),
  getByInep: adminProcedure.input(z.object({ inep: z.string() })).query(async ({ input }) => {
    return getEscolaByInep(input.inep);
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        endereco: z.string().optional(),
        municipio: z.string().optional(),
        tipoConexao: z.string().optional(),
        velocidadeOfertada: z.string().optional(),
        qtdAp: z.number().optional(),
        status: z.enum(["pendente", "em_andamento", "concluido"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEscola(id, data);
      return { success: true };
    }),

  importar: adminProcedure
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
    .mutation(async ({ input }) => {
      let importadas = 0;
      for (const escola of input.escolas) {
        await createEscola({
          inep: escola.inep,
          uf: escola.uf,
          municipio: escola.municipio,
          nome: escola.nome,
          endereco: escola.endereco,
          latitude: escola.latitude ? (escola.latitude as unknown as string) : undefined,
          longitude: escola.longitude ? (escola.longitude as unknown as string) : undefined,
          qtdAp: escola.qtdAp ?? 1,
          telefone: escola.telefone,
          velocidadeMinima: escola.velocidadeMinima ? String(escola.velocidadeMinima) : undefined,
          velocidadeOfertada: escola.velocidadeOfertada ? String(escola.velocidadeOfertada) : undefined,
          tipoConexao: escola.tipoConexao ?? "Fibra",
          status: "pendente",
        });
        importadas++;
      }
      return { success: true, importadas };
    }),

  listMunicipios: adminProcedure.query(async () => {
    return listMunicipios();
  }),

  deletarPorCidade: adminProcedure
    .input(z.object({ municipio: z.string() }))
    .mutation(async ({ input }) => {
      const total = await deleteEscolasPorCidade(input.municipio);
      return { success: true, total };
    }),
});

// === ATRIBUIÇÕES ROUTER ===
const atribuicoesRouter = router({
  porEscola: adminProcedure
    .input(z.object({ escolaId: z.number(), tecnicoId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      await setAtribuicaoManual(input.escolaId, input.tecnicoId!);
      return { success: true };
    }),

  porCidade: adminProcedure
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
  list: protectedProcedure
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
      if (ctx.user.role !== "admin") {
        const tecnico = await getTecnicoByEmail(ctx.user.email ?? "");
        if (!tecnico) return [];
        return listOrdensServico({ tecnicoId: tecnico.id });
      }
      return listOrdensServico(input);
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getOrdemById(input.id);
  }),

  criar: adminProcedure
    .input(z.object({ escolaId: z.number(), tecnicoId: z.number() }))
    .mutation(async ({ input }) => {
      await createOrdemServico({
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        status: "aberta",
        dataAbertura: new Date(),
      });
      // Atualizar status da escola
      await updateEscola(input.escolaId, { status: "em_andamento" });
      return { success: true };
    }),

  criarEConcluir: protectedProcedure
    .input(
      z.object({
        escolaId: z.number(),
        tecnicoId: z.number(),
        qtdApInstalado: z.number().min(0),
        observacao: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Criar OS
      await createOrdemServico({
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        status: "aberta",
        dataAbertura: new Date(),
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
});

// === DASHBOARD ROUTER ===
const dashboardRouter = router({
  stats: publicProcedure.query(async () => {
    return getDashboardStats();
  }),

  produtividade: publicProcedure.query(async () => {
    return getProdutividadePorTecnico();
  }),
});
// === RELATÓRIOS ROUTER ===
const relatoriosRouter = router({
  // Público para funcionar sem login OAuth no painel admin
  tecnico: publicProcedure
    .input(
      z.object({
        tecnicoId: z.number(),
        // Recebe strings ISO ou null para evitar problemas de serialização de Date
        dataInicio: z.string().nullable().optional(),
        dataFim: z.string().nullable().optional(),
      })
    )
    .query(async ({ input }) => {
      const inicio = input.dataInicio ? new Date(input.dataInicio) : null;
      const fim = input.dataFim ? new Date(input.dataFim) : null;
      return getRelatorioTecnico(input.tecnicoId, inicio, fim);
    }),

  ranking: publicProcedure.query(async () => {
    return getProdutividadePorTecnico();
  }),

  osDetalhadas: publicProcedure
    .input(
      z.object({
        tecnicoId: z.number().optional(), // 0 = todos os técnicos
        dataInicio: z.string().nullable().optional(),
        dataFim: z.string().nullable().optional(),
      })
    )
    .query(async ({ input }) => {
      const inicio = input.dataInicio ? new Date(input.dataInicio) : null;
      const fim = input.dataFim ? new Date(input.dataFim) : null;
      const tecnicoId = input.tecnicoId && input.tecnicoId > 0 ? input.tecnicoId : undefined;
      return getOsDetalhadas({ tecnicoId, dataInicio: inicio, dataFim: fim });
    }),
});

// === PLANILHA ROUTER ===
const planilhaRouter = router({
  listar: adminProcedure.query(async () => {
    return listEscolas();
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

  // Cria e conclui OS pelo técnico (sem OAuth)
  concluirEscola: publicProcedure
    .input(z.object({
      escolaId: z.number(),
      tecnicoId: z.number(),
      qtdApInstalado: z.number(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const escola = await getEscolaById(input.escolaId);
      if (!escola) throw new TRPCError({ code: "NOT_FOUND", message: "Escola não encontrada" });
      // Criar OS
      const os = await createOrdemServico({
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId,
        qtdApInstalado: input.qtdApInstalado,
        observacao: input.observacao ?? "",
        status: "concluida",
      });
      // Atualizar status da escola
      await updateEscola(input.escolaId, { status: "concluido", dataConclusao: new Date() });
      // Notificar admin
      const tecnico = await getTecnicoById(input.tecnicoId);
      await notifyOwner({
        title: `✅ OS Concluída: ${escola.nome}`,
        content: `Técnico: ${tecnico?.nome ?? "Desconhecido"}\nEscola: ${escola.nome ?? "-"}\nAPs Instalados: ${input.qtdApInstalado}\nObservação: ${input.observacao ?? "-"}`,
      });
      return os;
    }),
});

// === APP ROUTER ===
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
});

export type AppRouter = typeof appRouter;
