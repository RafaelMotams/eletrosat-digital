import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, CircleAlert, LoaderCircle, Wifi } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ConfirmSignup() {
  const [, navigate] = useLocation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const confirm = trpc.signup.confirmar.useMutation();

  useEffect(() => {
    if (token && !confirm.isPending && !confirm.isSuccess && !confirm.isError) confirm.mutate({ token });
  }, [token, confirm]);

  const status = !token ? "invalid" : confirm.isSuccess ? "success" : confirm.isError ? "error" : "loading";
  return <main className="min-h-screen bg-slate-950 px-4 text-white"><section className="mx-auto flex min-h-screen max-w-xl items-center"><div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">{status === "loading" ? <LoaderCircle className="h-7 w-7 animate-spin" /> : status === "success" ? <CheckCircle2 className="h-7 w-7" /> : <CircleAlert className="h-7 w-7 text-amber-300" />}</div><div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-emerald-300"><Wifi className="h-4 w-4" /> Netvius</div><h1 className="mt-3 text-2xl font-extrabold">{status === "loading" ? "Confirmando cadastro" : status === "success" ? "Conta confirmada" : "Não foi possível confirmar"}</h1><p className="mt-3 leading-7 text-slate-300">{status === "loading" ? "Aguarde alguns instantes." : status === "success" ? "Sua conta administrativa foi criada. Agora você já pode entrar no painel." : confirm.error?.message || "O link é inválido ou expirou. Solicite um novo cadastro."}</p><button onClick={() => navigate(status === "success" ? "/admin/login" : "/cadastro")} className="mt-7 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400">{status === "success" ? "Ir para o login" : "Solicitar novo cadastro"}</button></div></section></main>;
}
