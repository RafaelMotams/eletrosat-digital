import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, listEscolas, listOrdensServico, listTecnicos } from "./db";
import {
  estoqueSaldos,
  estoqueSolicitacoes,
  materiaisEstoque,
  manutencoes,
} from "../drizzle/schema";
import {
  escanearImpedimentos,
  sanitizarRadarParaTenant,
  type RadarScanResult,
} from "@shared/radarImpedimentos";

/**
 * Carrega somente dados do tenant autenticado e devolve o Radar ranqueado.
 * IDs vindos do cliente nunca definem o escopo — só a sessão validada.
 */
export async function executarRadarImpedimentos(tenantId: number, agora = new Date()): Promise<RadarScanResult> {
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    throw new Error("tenantId inválido para o Radar de Impedimentos");
  }

  const db = await getDb().catch(() => null);
  const [escolas, ordens, tecnicosAtivos] = await Promise.all([
    listEscolas({ tenantId }),
    listOrdensServico({ tenantId }),
    listTecnicos(tenantId),
  ]);

  // listOrdensServico por padrão exclui nao_instalada e inclui concluídas — adequado ao radar.

  let manutencoesTenant: Array<{
    id: number;
    status: string;
    tecnicoId: number | null;
    escolaId: number | null;
    escolaNome: string | null;
    descricaoProblema: string | null;
    createdAt: Date;
  }> = [];

  let saldos: Array<{
    materialId: number;
    materialNome: string;
    estoqueMinimo: string | number;
    holderType: "almoxarifado" | "tecnico";
    holderId: number;
    quantidade: string | number;
  }> = [];

  let solicitacoes: Array<{
    id: number;
    tecnicoId: number;
    materialId: number;
    materialNome: string | null;
    status: string;
    quantidadeSolicitada: string | number;
    quantidadeAtendida: string | number | null;
    createdAt: Date;
  }> = [];

  if (db) {
    const manutRows = await db
      .select({
        id: manutencoes.id,
        status: manutencoes.status,
        tecnicoId: manutencoes.tecnicoId,
        escolaId: manutencoes.escolaId,
        escolaNome: manutencoes.escolaNaoCadastradaNome,
        descricaoProblema: manutencoes.descricaoProblema,
        createdAt: manutencoes.createdAt,
      })
      .from(manutencoes)
      .where(and(eq(manutencoes.tenantId, tenantId), ne(manutencoes.status, "concluida")));

    manutencoesTenant = manutRows.map((row) => ({
      id: row.id,
      status: row.status,
      tecnicoId: row.tecnicoId,
      escolaId: row.escolaId,
      escolaNome: row.escolaNome,
      descricaoProblema: row.descricaoProblema,
      createdAt: row.createdAt,
    }));

    const saldoRows = await db
      .select({
        materialId: materiaisEstoque.id,
        materialNome: materiaisEstoque.nome,
        estoqueMinimo: materiaisEstoque.estoqueMinimo,
        holderType: estoqueSaldos.holderType,
        holderId: estoqueSaldos.holderId,
        quantidade: estoqueSaldos.quantidade,
      })
      .from(estoqueSaldos)
      .innerJoin(
        materiaisEstoque,
        and(eq(materiaisEstoque.id, estoqueSaldos.materialId), eq(materiaisEstoque.tenantId, tenantId), eq(materiaisEstoque.ativo, true)),
      )
      .where(eq(estoqueSaldos.tenantId, tenantId));

    saldos = saldoRows.map((row) => ({
      materialId: row.materialId,
      materialNome: row.materialNome,
      estoqueMinimo: row.estoqueMinimo,
      holderType: row.holderType,
      holderId: row.holderId,
      quantidade: row.quantidade,
    }));

    const solRows = await db
      .select({
        id: estoqueSolicitacoes.id,
        tecnicoId: estoqueSolicitacoes.tecnicoId,
        materialId: estoqueSolicitacoes.materialId,
        materialNome: materiaisEstoque.nome,
        status: estoqueSolicitacoes.status,
        quantidadeSolicitada: estoqueSolicitacoes.quantidadeSolicitada,
        quantidadeAtendida: estoqueSolicitacoes.quantidadeAtendida,
        createdAt: estoqueSolicitacoes.createdAt,
      })
      .from(estoqueSolicitacoes)
      .leftJoin(
        materiaisEstoque,
        and(eq(materiaisEstoque.id, estoqueSolicitacoes.materialId), eq(materiaisEstoque.tenantId, tenantId)),
      )
      .where(
        and(
          eq(estoqueSolicitacoes.tenantId, tenantId),
          inArray(estoqueSolicitacoes.status, ["aberta", "em_analise"]),
        ),
      );

    solicitacoes = solRows.map((row) => ({
      id: row.id,
      tecnicoId: row.tecnicoId,
      materialId: row.materialId,
      materialNome: row.materialNome,
      status: row.status,
      quantidadeSolicitada: row.quantidadeSolicitada,
      quantidadeAtendida: row.quantidadeAtendida,
      createdAt: row.createdAt,
    }));
  }

  // Garante que nomes de técnicos na sobrecarga usam apenas o tenant atual
  // (listTecnicos já filtra; reforço explícito contra vazamento).
  const tecnicosValidos = tecnicosAtivos.filter((t) => t.tenantId === tenantId);

  const scan = escanearImpedimentos({
    agora,
    escolas: escolas
      .filter((e) => e.tenantId === tenantId)
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        inep: e.inep,
        status: e.status,
        ativo: e.ativo,
        tecnicoId: e.tecnicoId,
        qtdAp: e.qtdAp,
        latitude: e.latitude,
        longitude: e.longitude,
        telefone: e.telefone,
        telefoneWhatsApp: e.telefoneWhatsApp,
      })),
    ordens: ordens
      .filter((o) => o.tenantId === tenantId)
      .map((o) => ({
        id: o.id,
        escolaId: o.escolaId,
        tecnicoId: o.tecnicoId,
        status: o.status,
        qtdApInstalado: o.qtdApInstalado,
        dataAbertura: o.dataAbertura,
        dataConclusao: o.dataConclusao,
        fotoMapaCalorUrl: o.fotoMapaCalorUrl,
        fotoMapaCalorKey: o.fotoMapaCalorKey,
      })),
    manutencoes: manutencoesTenant,
    saldos,
    solicitacoes,
    tecnicos: tecnicosValidos.map((t) => ({ id: t.id, nome: t.nome, ativo: t.ativo })),
  });

  return sanitizarRadarParaTenant(scan);
}
