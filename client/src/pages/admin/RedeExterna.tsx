import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { extractImagesFromZip } from "@/lib/zipImages";
import { trpc, trpcUploadClient } from "@/lib/trpc";
import {
  AlertTriangle, Building2, Cable, CheckCircle2, Cloud, CloudDownload,
  ExternalLink, FileArchive, FolderOpen, Image as ImageIcon, Loader2,
  Router, Search, ShieldCheck, Unlink, Upload, WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const STATUS = {
  nao_informada: { label: "Não informada", color: "text-slate-500 bg-slate-100" },
  com_rede: { label: "Com rede externa", color: "text-emerald-700 bg-emerald-50" },
  sem_rede: { label: "Sem rede externa", color: "text-rose-700 bg-rose-50" },
  em_validacao: { label: "Em validação", color: "text-amber-700 bg-amber-50" },
} as const;

const CATEGORIAS = [
  ["roteador_modem", "Roteador/Modem"], ["fachada", "Fachada"], ["antena", "Antena/Rádio"],
  ["cto_caixa", "CTO/Caixa"], ["entrada_cabo", "Entrada do cabo"],
  ["teste_conexao", "Teste"], ["travessia", "Travessia"], ["outro", "Outro"],
] as const;

const ACCEPTED_IMAGES = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif,.dng,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/heif,image/avif";
const MANUAL_LIMIT = 9 * 1024 * 1024;

function mimeForFile(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
    bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", heic: "image/heic",
    heif: "image/heif", avif: "image/avif", dng: "image/dng",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

type UploadItem = { file: File; path: string; origem: "pasta" | "zip" | "manual" };

export default function AdminRedeExterna() {
  const folderInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | keyof typeof STATUS>("todos");
  const [driveFolder, setDriveFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ atual: 0, total: 0, vinculadas: 0, revisao: 0, duplicadas: 0, erros: 0 });
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [reviewSchool, setReviewSchool] = useState<Record<number, string>>({});
  const [reviewCategory, setReviewCategory] = useState<Record<number, string>>({});

  const { data: resumo, refetch: refetchResumo } = trpc.redeExterna.resumo.useQuery();
  const { data: escolas = [], isLoading: loadingEscolas, refetch: refetchEscolas } = trpc.redeExterna.listarEscolas.useQuery({
    busca: busca || undefined,
    status: filtroStatus === "todos" ? undefined : filtroStatus,
  });
  const { data: pendencias = [], refetch: refetchPendencias } = trpc.redeExterna.listarPendencias.useQuery();
  const { data: schoolCatalog = [] } = trpc.escolas.list.useQuery({});

  useEffect(() => {
    if (resumo?.config?.driveFolderId && !driveFolder) setDriveFolder(resumo.config.driveFolderId);
  }, [resumo?.config?.driveFolderId, driveFolder]);

  const allSchools = useMemo(() => [...schoolCatalog].sort((a, b) => a.nome.localeCompare(b.nome)), [schoolCatalog]);
  async function refreshAll() {
    await Promise.all([refetchResumo(), refetchEscolas(), refetchPendencias()]);
  }

  const saveDrive = trpc.redeExterna.salvarConfigDrive.useMutation({
    onSuccess: data => {
      setDriveFolder(data.folderId);
      toast.success("Pasta do Google Drive salva");
      refetchResumo();
    },
    onError: error => toast.error(error.message),
  });
  const verifyDrive = trpc.redeExterna.verificarDrive.useMutation({
    onSuccess: data => toast.success(`${data.totalFotos} foto(s) encontradas na árvore do Drive`),
    onError: error => toast.error(error.message),
  });
  const syncDrive = trpc.redeExterna.sincronizarDrive.useMutation({
    onSuccess: async data => {
      toast.success(`${data.processados} processadas: ${data.vinculadas} vinculadas e ${data.revisao} para revisão${data.restantes ? `. Restam ${data.restantes}.` : "."}`);
      await refreshAll();
    },
    onError: error => toast.error(error.message),
  });
  const updateStatus = trpc.redeExterna.atualizarStatus.useMutation({
    onSuccess: () => refreshAll(),
    onError: error => toast.error(error.message),
  });
  const linkPhoto = trpc.redeExterna.vincularFoto.useMutation({
    onSuccess: () => { toast.success("Foto vinculada à escola"); refreshAll(); },
    onError: error => toast.error(error.message),
  });
  const ignorePhoto = trpc.redeExterna.ignorarFoto.useMutation({
    onSuccess: () => refreshAll(),
    onError: error => toast.error(error.message),
  });
  const classifyPhoto = trpc.redeExterna.classificarFoto.useMutation({
    onSuccess: () => refreshAll(),
    onError: error => toast.error(error.message),
  });

  async function uploadItems(items: UploadItem[]) {
    if (!items.length || uploading) return;
    setUploading(true);
    const progress = { atual: 0, total: items.length, vinculadas: 0, revisao: 0, duplicadas: 0, erros: 0 };
    const errors: string[] = [];
    setUploadProgress({ ...progress });
    setUploadErrors([]);

    for (const item of items) {
      try {
        if (item.file.size > MANUAL_LIMIT) throw new Error("máximo de 9 MB no envio manual; use o Google Drive para arquivos maiores");
        const result = await trpcUploadClient.redeExterna.importarFoto.mutate({
          imageBase64: await fileToBase64(item.file),
          mimeType: mimeForFile(item.file),
          nome: item.file.name,
          caminho: item.path,
          origem: item.origem,
        });
        if (result.duplicada) progress.duplicadas++;
        else if (result.match.escola) progress.vinculadas++;
        else progress.revisao++;
      } catch (error) {
        progress.erros++;
        if (errors.length < 20) errors.push(`${item.path}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
        console.error("[rede-externa upload]", item.path, error);
      }
      progress.atual++;
      setUploadProgress({ ...progress });
    }
    setUploading(false);
    setUploadErrors(errors);
    toast.success(`Importação concluída: ${progress.vinculadas} vinculadas, ${progress.revisao} em revisão, ${progress.duplicadas} repetidas e ${progress.erros} erros.`);
    await refreshAll();
  }

  function handleFolder(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (selected.length > 5000) {
      toast.error("A pasta deve ter no máximo 5.000 arquivos por importação");
      return;
    }
    const items = selected.map(file => ({
      file,
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      origem: "pasta" as const,
    }));
    void uploadItems(items);
  }

  async function handleZip(files: FileList | null) {
    const zip = files?.[0];
    if (!zip) return;
    try {
      const extracted = await extractImagesFromZip(zip);
      const items = extracted.map(item => ({
        file: new File([item.blob], item.name, { type: item.blob.type }),
        path: `${zip.name}/${item.path}`,
        origem: "zip" as const,
      }));
      await uploadItems(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ZIP inválido");
    } finally {
      if (zipInput.current) zipInput.current.value = "";
    }
  }

  const progressPercent = uploadProgress.total ? Math.round(uploadProgress.atual / uploadProgress.total * 100) : 0;

  return (
    <AdminLayoutAuto title="Rede Externa">
      <div className="space-y-6">
        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-blue-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700">
                <ShieldCheck className="h-4 w-4" /> Central de evidências
              </div>
              <h2 className="text-xl font-black text-slate-900">Fotos da rede que entrega internet à escola</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">O sistema reconhece INEP/nome nas pastas, destaca o roteador para o técnico e manda associações duvidosas para revisão.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => folderInput.current?.click()} disabled={uploading}><FolderOpen className="mr-2 h-4 w-4" />Importar pasta</Button>
              <Button variant="outline" onClick={() => zipInput.current?.click()} disabled={uploading}><FileArchive className="mr-2 h-4 w-4" />Importar ZIP</Button>
              <Button onClick={() => photoInput.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />Fotos avulsas</Button>
            </div>
          </div>
          <input ref={folderInput} type="file" className="hidden" multiple accept={ACCEPTED_IMAGES}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={event => handleFolder(event.target.files)} />
          <input ref={zipInput} type="file" className="hidden" accept=".zip,application/zip" onChange={event => void handleZip(event.target.files)} />
          <input ref={photoInput} type="file" className="hidden" multiple accept={ACCEPTED_IMAGES}
            onChange={event => uploadItems(Array.from(event.target.files ?? []).map(file => ({ file, path: file.name, origem: "manual" })))} />
          {uploadProgress.total > 0 && (
            <div className="mt-4 rounded-xl border bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600"><span>{uploading ? "Importando e identificando…" : "Última importação"}</span><span>{uploadProgress.atual}/{uploadProgress.total}</span></div>
              <Progress value={progressPercent} className="h-2" />
              <p className="mt-2 text-xs text-slate-500">{uploadProgress.vinculadas} vinculadas · {uploadProgress.revisao} revisão · {uploadProgress.duplicadas} repetidas · {uploadProgress.erros} erros</p>
              {uploadErrors.length > 0 && <details className="mt-2 text-xs text-rose-700"><summary className="cursor-pointer font-bold">Ver arquivos com erro</summary><ul className="mt-1 space-y-1 break-all">{uploadErrors.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></details>}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">Para identificação mais segura, use uma pasta por escola no formato <b>INEP - Nome da Escola</b> e nomes como <b>roteador</b>, <b>fachada</b>, <b>entrada</b>, <b>teste</b> ou <b>travessia</b>. Antes do envio, oculte senhas, chaves e dados pessoais desnecessários.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Building2} label="Escolas com rede" value={resumo?.comRede ?? 0} color="emerald" />
          <SummaryCard icon={WifiOff} label="Sem rede" value={resumo?.semRede ?? 0} color="rose" />
          <SummaryCard icon={ImageIcon} label="Fotos vinculadas" value={resumo?.totalFotos ?? 0} color="blue" />
          <SummaryCard icon={AlertTriangle} label="Revisão necessária" value={resumo?.pendencias ?? 0} color="amber" />
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-blue-600" />Sincronização com Google Drive</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row">
              <Input value={driveFolder} onChange={event => setDriveFolder(event.target.value)} placeholder="Cole o link ou ID da pasta principal" />
              <Button variant="outline" onClick={() => saveDrive.mutate({ pasta: driveFolder })} disabled={saveDrive.isPending || !driveFolder.trim()}>Salvar pasta</Button>
              <Button variant="outline" onClick={() => verifyDrive.mutate()} disabled={verifyDrive.isPending || !resumo?.config?.driveFolderId}><Search className="mr-2 h-4 w-4" />Verificar</Button>
              <Button onClick={() => syncDrive.mutate({ limite: 30 })} disabled={syncDrive.isPending || !resumo?.config?.driveFolderId}>
                {syncDrive.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}Sincronizar lote
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>Credencial do servidor: <b>{resumo?.driveConfiguradoNoServidor ? "configurada" : "pendente"}</b></span>
              {resumo?.contaServicoDrive && <span>Compartilhe a pasta com: <b className="select-all">{resumo.contaServicoDrive}</b> (leitor)</span>}
              <span>Última sincronização: <b>{resumo?.config?.ultimaSincronizacao ? new Date(resumo.config.ultimaSincronizacao).toLocaleString("pt-BR") : "nunca"}</b></span>
              <span>Leitura recursiva; o Drive não é alterado.</span>
            </div>
          </CardContent>
        </Card>

        {pendencias.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader><CardTitle className="flex items-center gap-2 text-amber-800"><AlertTriangle className="h-5 w-5" />Fotos aguardando identificação ({pendencias.length})</CardTitle></CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {pendencias.map(photo => (
                <div key={photo.id} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <PhotoPreview url={photo.url} title={photo.originalNome} className="h-24 w-24" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-sm font-bold text-slate-800" title={photo.caminhoOrigem ?? photo.originalNome}>{photo.originalNome}</p>
                    <select className="h-9 w-full rounded-md border bg-white px-2 text-xs" value={reviewSchool[photo.id] ?? ""} onChange={e => setReviewSchool(prev => ({ ...prev, [photo.id]: e.target.value }))}>
                      <option value="">Escolha a escola…</option>
                      {allSchools.map(school => <option key={school.id} value={school.id}>{school.inep} · {school.nome}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select className="h-9 min-w-0 flex-1 rounded-md border bg-white px-2 text-xs" value={reviewCategory[photo.id] ?? photo.categoria} onChange={e => setReviewCategory(prev => ({ ...prev, [photo.id]: e.target.value }))}>
                        {CATEGORIAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <Button size="sm" disabled={!reviewSchool[photo.id] || linkPhoto.isPending} onClick={() => linkPhoto.mutate({ fotoId: photo.id, escolaId: Number(reviewSchool[photo.id]), categoria: (reviewCategory[photo.id] ?? photo.categoria) as typeof CATEGORIAS[number][0] })}><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => ignorePhoto.mutate({ fotoId: photo.id })}><Unlink className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2"><Cable className="h-5 w-5 text-cyan-600" />Escolas e rede externa</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Nome, INEP ou município" /></div>
                <Select value={filtroStatus} onValueChange={value => setFiltroStatus(value as typeof filtroStatus)}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os estados</SelectItem>{Object.entries(STATUS).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEscolas ? <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-cyan-600" /></div> : (
              <div className="grid gap-3 xl:grid-cols-2">
                {escolas.map(school => {
                  const status = STATUS[school.redeExternaStatus];
                  return (
                    <div key={school.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row">
                      <PhotoPreview url={school.fotoRoteador?.url} title={`Roteador — ${school.nome}`} className="h-32 w-full sm:w-40" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="font-bold text-slate-900">{school.nome}</p><p className="text-xs text-slate-500">INEP {school.inep} · {school.municipio}/{school.uf}</p></div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${status.color}`}>{status.label}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Select value={school.redeExternaStatus} onValueChange={value => updateStatus.mutate({ escolaId: school.id, status: value as keyof typeof STATUS, tipo: school.redeExternaTipo })}>
                            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <span className="text-xs text-slate-500">{school.totalFotosRedeExterna} foto(s)</span>
                          {school.fotoRoteador?.url && <a href={school.fotoRoteador.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-semibold text-blue-600">Abrir foto <ExternalLink className="ml-1 h-3 w-3" /></a>}
                        </div>
                        {school.fotosRedeExterna.length > 0 && (
                          <details className="mt-3 rounded-lg border bg-slate-50 p-2">
                            <summary className="cursor-pointer text-xs font-bold text-slate-600">Organizar/classificar fotos</summary>
                            <div className="mt-2 space-y-2">
                              {school.fotosRedeExterna.map(photo => (
                                <div key={photo.id} className="flex items-center gap-2">
                                  <a href={photo.url} target="_blank" rel="noreferrer"><PhotoPreview url={photo.url} title={photo.titulo ?? photo.originalNome} className="h-11 w-12" /></a>
                                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600" title={photo.originalNome}>{photo.originalNome}</span>
                                  <select className="h-8 w-32 rounded-md border bg-white px-1 text-[10px]" value={photo.categoria} disabled={classifyPhoto.isPending} onChange={event => classifyPhoto.mutate({ fotoId: photo.id, categoria: event.target.value as typeof CATEGORIAS[number][0] })}>
                                    {CATEGORIAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!escolas.length && <p className="col-span-2 py-10 text-center text-sm text-slate-500">Nenhuma escola encontrada.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayoutAuto>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof Router; label: string; value: number; color: "emerald" | "rose" | "blue" | "amber" }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700" };
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-3 ${colors[color]}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-black text-slate-900">{value}</p><p className="text-xs font-medium text-slate-500">{label}</p></div></CardContent></Card>;
}

function PhotoPreview({ url, title, className }: { url?: string | null; title: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400`}><Router className="h-7 w-7" /></div>;
  return <img src={url} alt={title} loading="lazy" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-lg object-cover`} />;
}
