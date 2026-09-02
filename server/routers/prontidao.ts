import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  escolas,
  estoqueSaldos,
  manutencoes,
  materiaisEstoque,
  ordensServico,
  tecnicos,
} from "../../drizzle/schema";
import {
  avaliarCoberturaRota,
  avaliarProntidaoVisitas,
  identificarMaterialAp,
  resumirProntidao,
  type CoberturaRota,
  type MotivoNaoInstalacaoProntidao,
  type ProntidaoVisita,
  type StatusEscolaProntidao,
  type VisitaAvaliavel,
} from "@shared/prontidaoVisita";
import { getDb } from "../db";
import { router, tecnicoProcedure, tenantAdminProcedure } from "../_core/trpc";

const CLASSIFICACOES = ["pronta", "atencao", "bloqueada"] as const;

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível",
    });
  }
  return db;
}

export interface FichaEscolaProntidao {
  escolaId: number;
  nome: string;
  inep: string | null;
  municipio: string | null;
  uf: string | null;
  status: StatusEscolaProntidao;
  latitude: string | number | null;
  longitude: string | number | null;
  endereco: string | null;
  telefone: string | null;
  telefoneWhatsApp: string | null;
  qtdAp: number | null;
  apAdicional: number | null;
  motivoNaoInstalacao: MotivoNaoInstalacaoProntidao | null;
  tecnicoId: number | null;
  tecnicoNome: string | null;
  tecnicoAtivo: boolean | null;
}

export interface FontesProntidao {
  fichas: FichaEscolaProntidao[];
  ordensAbertas: Array<{
    escolaId: number;
    status: "aberta" | "em_andamento";
    dataAbertura: Date | string;
  }>;
  manutencoesPendentes: Array<{ escolaId: number | null; total: number | string }>;
  /** Ausência de entrada significa estoque não rastreado para aquele técnico. */
  saldoApPorTecnico: Map<number, number>;
}

/**
 * Combina as fontes já isoladas por tenant no formato que o motor de prontidão
 * consome. Função pura: o router faz as consultas, esta parte só correlaciona.
 */
export function montarVisitasAvaliaveis(
  fontes: FontesProntidao
): VisitaAvaliavel[] {
  const estatisticasMunicipio = new Map<
    string,
    { total: number; naoInstaladas: number }
  >();
  for (const ficha of fontes.fichas) {
    const chave = (ficha.municipio ?? "").trim().toLowerCase();
    if (!chave) continue;
    const atual = estatisticasMunicipio.get(chave) ?? { total: 0, naoInstaladas: 0 };
    atual.total += 1;
    if (ficha.status === "nao_instalada") atual.naoInstaladas += 1;
    estatisticasMunicipio.set(chave, atual);
  }

  const ordemPorEscola = new Map<number, FontesProntidao["ordensAbertas"][number]>();
  for (const ordem of fontes.ordensAbertas) {
    const atual = ordemPorEscola.get(ordem.escolaId);
    // Mantém a ordem mais antiga: é ela que denuncia a visita sem desfecho.
    if (!atual || new Date(ordem.dataAbertura) < new Date(atual.dataAbertura)) {
      ordemPorEscola.set(ordem.escolaId, ordem);
    }
  }

  const manutencaoPorEscola = new Map<number, number>();
  for (const registro of fontes.manutencoesPendentes) {
    if (registro.escolaId === null) continue;
    manutencaoPorEscola.set(registro.escolaId, Number(registro.total ?? 0));
  }

  return fontes.fichas.map(ficha => {
    const ordem = ordemPorEscola.get(ficha.escolaId) ?? null;
    const estatistica = estatisticasMunicipio.get(
      (ficha.municipio ?? "").trim().toLowerCase()
    );
    const rastreado =
      ficha.tecnicoId !== null && fontes.saldoApPorTecnico.has(ficha.tecnicoId);

    return {
      escolaId: ficha.escolaId,
      nome: ficha.nome,
      inep: ficha.inep,
      municipio: ficha.municipio,
      uf: ficha.uf,
      status: ficha.status,
      latitude: ficha.latitude,
      longitude: ficha.longitude,
      endereco: ficha.endereco,
      telefone: ficha.telefone,
      telefoneWhatsApp: ficha.telefoneWhatsApp,
      qtdAp: ficha.qtdAp,
      apAdicional: ficha.apAdicional,
      tecnicoId: ficha.tecnicoId,
      tecnicoNome: ficha.tecnicoNome,
      tecnicoAtivo: ficha.tecnicoAtivo,
      motivoNaoInstalacao: ficha.motivoNaoInstalacao,
      osStatus: ordem?.status ?? null,
      osAbertaEm: ordem?.dataAbertura ?? null,
      apDisponivelTecnico: rastreado
        ? (fontes.saldoApPorTecnico.get(ficha.tecnicoId as number) as number)
        : null,
      manutencoesPendentes: manutencaoPorEscola.get(ficha.escolaId) ?? 0,
      taxaNaoInstalacaoMunicipio: estatistica
        ? estatistica.naoInstaladas / estatistica.total
        : null,
      escolasNoMunicipio: estatistica?.total ?? null,
    } satisfies VisitaAvaliavel;
  });
}

/**
 * Só afirma o saldo de AP de um técnico que já recebeu material rastreado.
 * Ausência de registro significa estoque não acompanhado, não mochila vazia.
 */
export function somarSaldoApPorTecnico(
  catalogo: Array<{ id: number; codigo: string | null; nome: string | null; categoria: string | null }>,
  saldos: Array<{ materialId: number; holderId: number; quantidade: string | number }>
): Map<number, number> {
  const materiaisAp = new Set(
    catalogo.filter(identificarMaterialAp).map(material => material.id)
  );
  const saldoPorTecnico = new Map<number, number>();
  if (materiaisAp.size === 0) return saldoPorTecnico;

  for (const saldo of saldos) {
    if (!materiaisAp.has(saldo.materialId)) continue;
    const atual = saldoPorTecnico.get(saldo.holderId) ?? 0;
    saldoPorTecnico.set(saldo.holderId, atual + Number(saldo.quantidade ?? 0));
  }
  return saldoPorTecnico;
}

export function coberturaPorTecnico(
  avaliacoes: ProntidaoVisita[]
): CoberturaRota[] {
  const responsaveis = new Map<
    number,
    { nome: string; apDisponiveis: number | null }
  >();
  for (const avaliacao of avaliacoes) {
    if (avaliacao.tecnicoId === null) continue;
    if (avaliacao.classificacao === "nao_aplicavel") continue;
    responsaveis.set(avaliacao.tecnicoId, {
      nome: avaliacao.tecnicoNome ?? `Técnico #${avaliacao.tecnicoId}`,
      apDisponiveis: avaliacao.apDisponivelTecnico,
    });
  }

  return Array.from(responsaveis.entries())
    .map(([tecnicoId, dados]) =>
      avaliarCoberturaRota(tecnicoId, dados.nome, avaliacoes, dados.apDisponiveis)
    )
    .sort((a, b) => b.apFaltantes - a.apFaltantes);
}

async function carregarVisitas(tenantId: number): Promise<VisitaAvaliavel[]> {
  const db = await requireDb();

  const fichas = await db
    .select({
      escolaId: escolas.id,
      nome: escolas.nome,
      inep: escolas.inep,
      municipio: escolas.municipio,
      uf: escolas.uf,
      status: escolas.status,
      latitude: escolas.latitude,
      longitude: escolas.longitude,
      endereco: escolas.endereco,
      telefone: escolas.telefone,
      telefoneWhatsApp: escolas.telefoneWhatsApp,
      qtdAp: escolas.qtdAp,
      apAdicional: escolas.apAdicional,
      motivoNaoInstalacao: escolas.motivoNaoInstalacao,
      tecnicoId: escolas.tecnicoId,
      tecnicoNome: tecnicos.nome,
      tecnicoAtivo: tecnicos.ativo,
    })
    .from(escolas)
    .leftJoin(
      tecnicos,
      and(eq(tecnicos.id, escolas.tecnicoId), eq(tecnicos.tenantId, tenantId))
    )
    .where(and(eq(escolas.tenantId, tenantId), eq(escolas.ativo, true)));

  const ordensAbertas = await db
    .select({
      escolaId: ordensServico.escolaId,
      status: ordensServico.status,
      dataAbertura: ordensServico.dataAbertura,
    })
    .from(ordensServico)
    .where(
      and(
        eq(ordensServico.tenantId, tenantId),
        inArray(ordensServico.status, ["aberta", "em_andamento"])
      )
    );

  const manutencoesPendentes = await db
    .select({ escolaId: manutencoes.escolaId, total: sql<number>`count(*)` })
    .from(manutencoes)
    .where(
      and(
        eq(manutencoes.tenantId, tenantId),
        inArray(manutencoes.status, ["pendente", "em_andamento"])
      )
    )
    .groupBy(manutencoes.escolaId);

  const catalogo = await db
    .select({
      id: materiaisEstoque.id,
      codigo: materiaisEstoque.codigo,
      nome: materiaisEstoque.nome,
      categoria: materiaisEstoque.categoria,
    })
    .from(materiaisEstoque)
    .where(
      and(eq(materiaisEstoque.tenantId, tenantId), eq(materiaisEstoque.ativo, true))
    );

  const saldos = await db
    .select({
      materialId: estoqueSaldos.materialId,
      holderId: estoqueSaldos.holderId,
      quantidade: estoqueSaldos.quantidade,
    })
    .from(estoqueSaldos)
    .where(
      and(
        eq(estoqueSaldos.tenantId, tenantId),
        eq(estoqueSaldos.holderType, "tecnico")
      )
    );

  return montarVisitasAvaliaveis({
    fichas: fichas as FichaEscolaProntidao[],
    ordensAbertas: ordensAbertas as FontesProntidao["ordensAbertas"],
    manutencoesPendentes,
    saldoApPorTecnico: somarSaldoApPorTecnico(catalogo, saldos),
  });
}

const filtrosPainel = z
  .object({
    municipio: z.string().trim().max(255).optional(),
    tecnicoId: z.number().int().positive().optional(),
    classificacao: z.enum(CLASSIFICACOES).optional(),
    busca: z.string().trim().max(120).optional(),
    limite: z.number().int().min(1).max(500).default(200),
  })
  .optional();

export const prontidaoRouter = router({
  painel: tenantAdminProcedure.input(filtrosPainel).query(async ({ ctx, input }) => {
    const avaliadas = avaliarProntidaoVisitas(await carregarVisitas(ctx.tenantId));
    const planejaveis = avaliadas.filter(
      avaliacao => avaliacao.classificacao !== "nao_aplicavel"
    );

    const busca = input?.busca?.toLowerCase() ?? "";
    const municipio = input?.municipio?.toLowerCase() ?? "";
    const filtradas = planejaveis.filter(avaliacao => {
      if (input?.classificacao && avaliacao.classificacao !== input.classificacao) {
        return false;
      }
      if (input?.tecnicoId && avaliacao.tecnicoId !== input.tecnicoId) return false;
      if (municipio && (avaliacao.municipio ?? "").toLowerCase() !== municipio) {
        return false;
      }
      if (
        busca &&
        !`${avaliacao.nome} ${avaliacao.inep ?? ""}`.toLowerCase().includes(busca)
      ) {
        return false;
      }
      return true;
    });

    return {
      geradoEm: new Date(),
      total: filtradas.length,
      itens: filtradas.slice(0, input?.limite ?? 200),
      resumo: resumirProntidao(filtradas),
      cobertura: coberturaPorTecnico(filtradas),
      municipios: Array.from(
        new Set(
          planejaveis
            .map(avaliacao => avaliacao.municipio)
            .filter((valor): valor is string => Boolean(valor))
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  }),

  minhasVisitas: tecnicoProcedure.query(async ({ ctx }) => {
    const { tenantId, tecnicoId } = ctx.tecnicoSession;
    const avaliadas = avaliarProntidaoVisitas(await carregarVisitas(tenantId)).filter(
      avaliacao =>
        avaliacao.tecnicoId === tecnicoId &&
        avaliacao.classificacao !== "nao_aplicavel"
    );

    const [cobertura] = coberturaPorTecnico(avaliadas);
    return {
      geradoEm: new Date(),
      itens: avaliadas,
      resumo: resumirProntidao(avaliadas),
      cobertura: cobertura ?? null,
    };
  }),
});
