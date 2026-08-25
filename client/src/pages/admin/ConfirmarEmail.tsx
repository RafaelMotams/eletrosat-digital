import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle2, CircleAlert, LoaderCircle, MailCheck, Wifi } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ConfirmationState = "loading" | "success" | "error";

export default function ConfirmarEmail() {
  const search = useSearch();
  const [state, setState] = useState<ConfirmationState>("loading");
  const [message, setMessage] = useState("Confirmando seu email e liberando sua conta...");
  const initiated = useRef(false);
  const confirmarEmail = trpc.cadastro.confirmarEmail.useMutation({
    onSuccess: () => {
      setState("success");
      setMessage("Email confirmado. Sua conta está pronta para entrar no painel.");
    },
    onError: (error) => {
      setState("error");
      setMessage(error.message || "Não foi possível confirmar este email.");
    },
  });

  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;
    const token = new URLSearchParams(search).get("token");
    if (!token) {
      setState("error");
      setMessage("O link de confirmação está incompleto.");
      return;
    }
    confirmarEmail.mutate({ token });
  }, [search, confirmarEmail]);

  const icon = state === "success" ? <CheckCircle2 className="h-10 w-10 text-emerald-300" /> : state === "error" ? <CircleAlert className="h-10 w-10 text-amber-300" /> : <LoaderCircle className="h-10 w-10 animate-spin text-emerald-300" />;

  return (
    <main className="min-h-screen bg-[#06161a] px-5 py-10 text-white flex items-center justify-center">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/30 sm:p-10">
        <div className="flex items-center justify-center gap-2 text-lg font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500"><Wifi className="h-4 w-4" /></span> Netvius</div>
        <div className="mx-auto mt-9 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.06]">{icon}</div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{state === "success" ? "Tudo certo" : state === "error" ? "Não foi possível confirmar" : "Confirmando seu cadastro"}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">{message}</p>
        {state === "success" && <Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"><MailCheck className="h-4 w-4" /> Entrar no painel</Link>}
        {state === "error" && <Link href="/admin/cadastro" className="mt-8 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Criar uma nova conta</Link>}
      </section>
    </main>
  );
}
