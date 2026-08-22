import { FormEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, LockKeyhole, Mail, ShieldCheck, Wifi } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function slugify(value: string) {
  return value
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Signup() {
  const [, navigate] = useLocation();
  const [nome, setNome] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [slugEditado, setSlugEditado] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [sent, setSent] = useState(false);
  const slug = useMemo(() => slugEditado || slugify(empresaNome), [empresaNome, slugEditado]);

  const signup = trpc.signup.solicitar.useMutation({
    onSuccess: () => setSent(true),
    onError: (error) => toast.error(error.message || "Não foi possível solicitar o cadastro."),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (senha !== confirmacao) return toast.error("As senhas não coincidem.");
    if (!slug || slug.length < 2) return toast.error("Informe o nome da empresa para criar o identificador.");
    signup.mutate({ nome, empresaNome, slug, email, senha });
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto flex min-h-[80vh] max-w-xl items-center">
          <div className="w-full rounded-3xl border border-emerald-400/20 bg-white/[0.04] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Mail className="h-7 w-7" /></div>
            <h1 className="mt-6 text-2xl font-extrabold">Verifique seu email</h1>
            <p className="mt-3 leading-7 text-slate-300">Se o endereço informado estiver apto para cadastro, enviamos um link de confirmação. A conta só será criada após a confirmação do email.</p>
            <button onClick={() => navigate("/admin/login")} className="mt-7 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400">Ir para o login</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="bg-gradient-to-br from-emerald-500/20 via-slate-950 to-indigo-500/10 p-8 sm:p-12">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500"><Wifi className="h-5 w-5" /></span><strong className="text-xl">Netvius</strong></div>
          <h1 className="mt-12 text-3xl font-extrabold leading-tight">Comece com uma conta protegida.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">O cadastro é confirmado por email antes de liberar o painel da sua empresa.</p>
          <div className="mt-10 space-y-4 text-sm text-slate-200">
            <p className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />Dados isolados por cliente</p>
            <p className="flex gap-3"><LockKeyhole className="h-5 w-5 shrink-0 text-emerald-300" />Senha protegida por hash</p>
            <p className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />Confirmação de email antes do acesso</p>
          </div>
        </aside>
        <form onSubmit={submit} className="p-8 sm:p-12">
          <div className="mb-8"><p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Criar conta</p><h2 className="mt-2 text-2xl font-extrabold">Solicite seu acesso</h2><p className="mt-2 text-sm text-slate-400">Use um email que você consiga confirmar.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-200">Seu nome<input required value={nome} onChange={e => setNome(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none ring-emerald-400 focus:ring-2" placeholder="Nome completo" /></label>
            <label className="text-sm font-medium text-slate-200">Empresa<input required value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none ring-emerald-400 focus:ring-2" placeholder="Nome da empresa" /></label>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-200">Identificador da empresa<input required value={slug} onChange={e => setSlugEditado(slugify(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none ring-emerald-400 focus:ring-2" placeholder="minha-empresa" /><span className="mt-1 block text-xs text-slate-500">Apenas letras minúsculas, números e hífens.</span></label>
          <label className="mt-4 block text-sm font-medium text-slate-200">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none ring-emerald-400 focus:ring-2" placeholder="voce@empresa.com" /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-200">Senha<input required minLength={8} type="password" value={senha} onChange={e => setSenha(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none ring-emerald-400 focus:ring-2" placeholder="Mínimo 8 caracteres" /></label><label className="text-sm font-medium text-slate-200">Confirmar senha<input required minLength={8} type="password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none ring-emerald-400 focus:ring-2" placeholder="Repita a senha" /></label></div>
          <button disabled={signup.isPending} className="mt-7 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{signup.isPending ? "Enviando confirmação..." : "Enviar email de confirmação"}</button>
          <p className="mt-5 text-center text-sm text-slate-400">Já possui conta? <button type="button" onClick={() => navigate("/admin/login")} className="font-semibold text-emerald-300 hover:text-emerald-200">Entrar no painel</button></p>
        </form>
      </section>
    </main>
  );
}
