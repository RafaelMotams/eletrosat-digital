import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Wifi, Smartphone } from "lucide-react";

export default function TecnicoLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const loginMut = trpc.tecnicoAuth.login.useMutation({
    onSuccess: (data) => {
      // Salvar dados do técnico no localStorage
      localStorage.setItem("tecnico", JSON.stringify(data));
      toast.success(`Bem-vindo, ${data.nome}!`);
      navigate("/tecnico");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) { toast.error("Preencha email e senha"); return; }
    loginMut.mutate({ email, senha });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
            <Wifi className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Eletrosat Digital</h1>
          <p className="text-blue-300 text-sm mt-1">App do Técnico</p>
        </div>

        {/* Card de login */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <Smartphone className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold">Entrar na sua conta</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-blue-200 text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-blue-200 text-sm">Senha</Label>
              <Input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-green-400"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-5 mt-2"
              disabled={loginMut.isPending}
            >
              {loginMut.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-blue-400/60 text-xs mt-6">
          Problemas para entrar? Contate o administrador.
        </p>
      </div>
    </div>
  );
}
