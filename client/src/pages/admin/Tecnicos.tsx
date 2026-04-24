import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Pencil, Trash2, Phone, Mail, MapPin, User } from "lucide-react";

type TecnicoForm = {
  nome: string;
  telefone: string;
  email: string;
  senha: string;
  cidadeResponsavel: string;
};

export default function AdminTecnicos() {
  const utils = trpc.useUtils();
  const { data: tecnicos, isLoading } = trpc.tecnicos.list.useQuery();
  const createMut = trpc.tecnicos.create.useMutation({
    onSuccess: () => { toast.success("Técnico criado!"); utils.tecnicos.list.invalidate(); setOpen(false); resetForm(); },
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
  const [form, setForm] = useState<TecnicoForm>({ nome: "", telefone: "", email: "", senha: "", cidadeResponsavel: "" });

  function resetForm() { setForm({ nome: "", telefone: "", email: "", senha: "", cidadeResponsavel: "" }); }

  function openCreate() { resetForm(); setEditId(null); setOpen(true); }

  function openEdit(t: NonNullable<typeof tecnicos>[0]) {
    setForm({ nome: t.nome, telefone: t.telefone ?? "", email: t.email, senha: "", cidadeResponsavel: t.cidadeResponsavel ?? "" });
    setEditId(t.id);
    setOpen(true);
  }

  function handleSubmit() {
    if (!form.nome || !form.email) { toast.error("Nome e email são obrigatórios"); return; }
    if (editId) {
      updateMut.mutate({ id: editId, nome: form.nome, telefone: form.telefone || undefined, email: form.email, senha: form.senha || undefined, cidadeResponsavel: form.cidadeResponsavel || undefined });
    } else {
      if (!form.senha) { toast.error("Senha é obrigatória"); return; }
      createMut.mutate({ nome: form.nome, telefone: form.telefone || undefined, email: form.email, senha: form.senha, cidadeResponsavel: form.cidadeResponsavel || undefined });
    }
  }

  return (
    <AdminLayout title="Gestão de Técnicos">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{tecnicos?.length ?? 0} técnico(s) cadastrado(s)</p>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Novo Técnico
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : !tecnicos || tecnicos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum técnico cadastrado ainda.</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Adicionar Técnico</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicos.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-primary text-sm">{t.nome[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Remover técnico?")) deleteMut.mutate({ id: t.id }); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t.nome}</h3>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span className="truncate">{t.email}</span></div>
                  {t.telefone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{t.telefone}</span></div>}
                  {t.cidadeResponsavel && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span>{t.cidadeResponsavel}</span></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Nome completo" /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@exemplo.com" /></div>
            <div><Label>Senha {editId ? "(deixe em branco para manter)" : "*"}</Label><Input type="password" value={form.senha} onChange={e => setForm(f => ({...f, senha: e.target.value}))} placeholder="Mínimo 6 caracteres" /></div>
            <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))} placeholder="(75) 99999-9999" /></div>
            <div><Label>Cidade Responsável</Label><Input value={form.cidadeResponsavel} onChange={e => setForm(f => ({...f, cidadeResponsavel: e.target.value}))} placeholder="Ex: Monte Santo" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
