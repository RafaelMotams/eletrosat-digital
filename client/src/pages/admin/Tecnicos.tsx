import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Pencil, Trash2, Phone, Mail, MapPin, Users, Eye, EyeOff, Shield } from "lucide-react";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.30 0.10 240), oklch(0.50 0.18 162))",
  "linear-gradient(135deg, oklch(0.38 0.18 290), oklch(0.50 0.20 290))",
  "linear-gradient(135deg, oklch(0.42 0.16 200), oklch(0.54 0.18 200))",
  "linear-gradient(135deg, oklch(0.55 0.16 75),  oklch(0.68 0.18 75))",
  "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))",
];

type TecnicoForm = {
  nome: string; telefone: string; email: string; senha: string; cidadeResponsavel: string;
};

export default function AdminTecnicos() {
  const utils = trpc.useUtils();
  const { data: tecnicos, isLoading } = trpc.tecnicos.list.useQuery();
  const createMut = trpc.tecnicos.create.useMutation({
    onSuccess: () => { toast.success("Técnico criado com sucesso!"); utils.tecnicos.list.invalidate(); setOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.tecnicos.update.useMutation({
    onSuccess: () => { toast.success("Técnico atualizado!"); utils.tecnicos.list.invalidate(); setOpen(false); setEditId(null); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.tecnicos.delete.useMutation({
    onSuccess: () => { toast.success("Técnico removido!"); utils.tecnicos.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<TecnicoForm>({ nome: "", telefone: "", email: "", senha: "", cidadeResponsavel: "" });

  function resetForm() { setForm({ nome: "", telefone: "", email: "", senha: "", cidadeResponsavel: "" }); setShowPass(false); }
  function openCreate() { resetForm(); setEditId(null); setOpen(true); }
  function openEdit(t: NonNullable<typeof tecnicos>[0]) {
    setForm({ nome: t.nome, telefone: t.telefone ?? "", email: t.email, senha: "", cidadeResponsavel: t.cidadeResponsavel ?? "" });
    setEditId(t.id); setOpen(true);
  }
  function handleSubmit() {
    if (!form.nome || !form.email) { toast.error("Nome e email são obrigatórios"); return; }
    if (editId) {
      updateMut.mutate({ id: editId, nome: form.nome, telefone: form.telefone || undefined, email: form.email, senha: form.senha || undefined, cidadeResponsavel: form.cidadeResponsavel || undefined });
    } else {
      if (!form.senha || form.senha.length < 6) { toast.error("Senha deve ter mínimo 6 caracteres"); return; }
      createMut.mutate({ nome: form.nome, telefone: form.telefone || undefined, email: form.email, senha: form.senha, cidadeResponsavel: form.cidadeResponsavel || undefined });
    }
  }

  const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <AdminLayoutAuto title="Técnicos">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.94 0.04 290)" }}>
            <Users className="w-5 h-5" style={{ color: "oklch(0.38 0.18 290)" }} />
          </div>
          <div>
            <p className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {tecnicos?.length ?? 0} técnico{(tecnicos?.length ?? 0) !== 1 ? 's' : ''} cadastrado{(tecnicos?.length ?? 0) !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">Gerencie a equipe de instaladores</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 shadow-sm" style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.36 0.14 240))", color: "white", border: "none" }}>
          <Plus className="w-4 h-4" /> Novo Técnico
        </Button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : !tecnicos || tecnicos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.94 0.015 240)" }}>
            <Users className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Nenhum técnico cadastrado</p>
            <p className="text-sm text-muted-foreground">Adicione técnicos para começar a atribuir escolas</p>
          </div>
          <Button onClick={openCreate} className="gap-2 mt-2">
            <Plus className="w-4 h-4" /> Adicionar Técnico
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicos.map((t, idx) => (
            <div key={t.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 animate-fade-in-up group"
              style={{ animationDelay: `${idx * 0.05}s` }}>
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-base shadow-sm"
                    style={{ background: AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length] }}>
                    {getInitials(t.nome)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground leading-tight" style={{ fontFamily: "var(--font-display)" }}>{t.nome}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3" style={{ color: "oklch(0.50 0.18 162)" }} />
                      <span className="text-xs font-medium" style={{ color: "oklch(0.50 0.18 162)" }}>Técnico</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                    onClick={() => { if (confirm(`Remover ${t.nome}?`)) deleteMut.mutate({ id: t.id }); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.94 0.04 240)" }}>
                    <Mail className="w-3 h-3" style={{ color: "oklch(0.30 0.10 240)" }} />
                  </div>
                  <span className="text-muted-foreground truncate">{t.email}</span>
                </div>
                {t.telefone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.93 0.07 162)" }}>
                      <Phone className="w-3 h-3" style={{ color: "oklch(0.40 0.18 162)" }} />
                    </div>
                    <span className="text-muted-foreground">{t.telefone}</span>
                  </div>
                )}
                {t.cidadeResponsavel && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.96 0.05 75)" }}>
                      <MapPin className="w-3 h-3" style={{ color: "oklch(0.55 0.16 75)" }} />
                    </div>
                    <span className="text-muted-foreground">{t.cidadeResponsavel}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-border flex gap-2">
                <button onClick={() => openEdit(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-muted text-muted-foreground hover:text-foreground">
                  Editar
                </button>
                <button onClick={() => { if (confirm(`Remover ${t.nome}?`)) deleteMut.mutate({ id: t.id }); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-red-50 text-muted-foreground hover:text-red-500">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              {editId ? "Editar Técnico" : "Novo Técnico"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Nome completo *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Ex: João Silva" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="joao@email.com" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Senha {editId ? "(deixe em branco para manter)" : "*"}</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.senha}
                  onChange={e => setForm(f => ({...f, senha: e.target.value}))}
                  placeholder="Mínimo 6 caracteres"
                  className="rounded-xl pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="(75) 99999-9999" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Cidade Responsável</Label>
              <Input value={form.cidadeResponsavel} onChange={e => setForm(f => ({...f, cidadeResponsavel: e.target.value}))} placeholder="Ex: Monte Santo" className="rounded-xl" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="flex-1 rounded-xl"
              style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.36 0.14 240))", color: "white", border: "none" }}>
              {createMut.isPending || updateMut.isPending ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Técnico"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayoutAuto>
  );
}
