import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Mail, ShieldCheck, Wifi } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AdminCadastro() {
  const [, navigate] = useLocation();
  const [empresa, setEmpresa] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState<boolean | null>(null);

  const criarCadastro = trpc.cadastro.criar.useMutation({
    onSuccess: (result) => {
      setEmailEnviado(result.emailEnviado);
    },
    onError: (error) => toast.error(error.message || "Não foi possível criar sua conta."),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (senha !== confirmacaoSenha) {
      toast.error("As senhas precisam ser iguais.");
      return;
    }
    criarCadastro.mutate({
      empresa,
      nome,
      email,
      telefone: telefone || undefined,
      senha,
      origin: window.location.origin,
    });
  };

  if (emailEnviado !== null) {
    return (
      <main className="min-h-screen bg-[#06161a] px-5 py-10 text-white flex items-center justify-center">
        <section className="w-full max-w-xl rounded-3xl border border-emerald-300/20 bg-white/[0.045] p-7 sm:p-10 shadow-2xl shadow-black/30 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <Mail className="h-8 w-8" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Cadastro criado</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Confirme seu email para entrar</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300">
            {emailEnviado
              ? <>Enviamos um link de confirmação para <strong className="text-white">{email}</strong>. Após confirmar, seu painel será liberado com cinco dias de demonstração.</>
              : <>Sua conta foi criada, mas não conseguimos enviar o email de confirmação agora. Use a opção de reenviar no login ou fale com o suporte comercial.</>}
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/login")}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#06161a]"
          >
            Ir para o login <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06161a] px-5 py-8 text-white sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>

        <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative overflow-hidden bg-gradient-to-br from-emerald-900/45 via-[#09242b] to-[#0c172d] p-7 sm:p-10">
            <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20"><Wifi className="h-5 w-5" /></div>
                <span className="text-xl font-extrabold tracking-tight">Netvius</span>
              </div>
              <p className="mt-14 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">Demonstração gratuita</p>
              <h1 className="mt-3 max-w-sm text-4xl font-extrabold leading-tight tracking-tight">Organize a operação da sua equipe.</h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">Crie sua empresa, confirme seu email e comece com um painel separado para sua operação.</p>
              <div className="mt-10 space-y-4 text-sm text-slate-200">
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> Cinco dias para conhecer a plataforma</div>
                <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> Acesso confirmado por email</div>
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> Dados organizados por empresa</div>
              </div>
            </div>
          </aside>

          <section className="p-7 sm:p-10">
            <p className="text-sm font-semibold text-emerald-300">COMECE AGORA</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Crie sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Use um email que você possa acessar para confirmar sua empresa.</p>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Nome da empresa
                <input value={empresa} onChange={(event) => setEmpresa(event.target.value)} required minLength={2} autoComplete="organization" placeholder="Ex.: Minha Empresa Ltda." className="h-12 rounded-xl border border-white/10 bg-slate-950/40 px-4 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Seu nome
                <input value={nome} onChange={(event) => setNome(event.target.value)} required minLength={2} autoComplete="name" placeholder="Nome do responsável" className="h-12 rounded-xl border border-white/10 bg-slate-950/40 px-4 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" autoComplete="email" placeholder="voce@empresa.com" className="h-12 rounded-xl border border-white/10 bg-slate-950/40 px-4 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-200">WhatsApp <span className="font-normal text-slate-500">(opcional)</span>
                <input value={telefone} onChange={(event) => setTelefone(event.target.value)} autoComplete="tel" placeholder="(75) 99999-9999" className="h-12 rounded-xl border border-white/10 bg-slate-950/40 px-4 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-200">Senha
                  <div className="relative"><input value={senha} onChange={(event) => setSenha(event.target.value)} required minLength={8} type={mostrarSenha ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 pr-11 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" /><button type="button" onClick={() => setMostrarSenha((value) => !value)} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-3 text-slate-400 hover:text-white">{mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-200">Confirmar senha
                  <input value={confirmacaoSenha} onChange={(event) => setConfirmacaoSenha(event.target.value)} required minLength={8} type={mostrarSenha ? "text" : "password"} autoComplete="new-password" placeholder="Repita a senha" className="h-12 rounded-xl border border-white/10 bg-slate-950/40 px-4 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
                </label>
              </div>
              <button type="submit" disabled={criarCadastro.isPending} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#06161a]">
                {criarCadastro.isPending ? "Criando conta..." : <>Criar conta e confirmar email <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-400">Já possui acesso? <Link href="/admin/login" className="font-bold text-emerald-300 hover:text-emerald-200">Entrar no painel</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
