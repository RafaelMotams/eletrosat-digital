import { Lock, MessageCircle, RefreshCw } from "lucide-react";

const WHATSAPP = "5575999142134";
const MSG = encodeURIComponent("Olá! Meu período de demonstração do Netvius expirou. Gostaria de contratar o sistema.");

export default function TrialExpirado({ motivo = "trial_expirado" }: { motivo?: string }) {
  const titulo =
    motivo === "suspenso" ? "Conta Suspensa" :
    motivo === "cancelado" ? "Conta Cancelada" :
    "Demonstração Encerrada";

  const descricao =
    motivo === "suspenso"
      ? "Sua conta foi temporariamente suspensa. Entre em contato com o suporte para regularizar."
      : motivo === "cancelado"
      ? "Esta conta foi cancelada. Entre em contato para reativar o serviço."
      : "Seu período de demonstração gratuita chegou ao fim. Para continuar usando o Netvius, contrate um plano.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #070d1a 0%, #0d1a2e 100%)" }}>
      <div className="max-w-md w-full text-center">
        {/* Ícone */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(248,113,113,0.1)", border: "2px solid rgba(248,113,113,0.3)" }}>
          <Lock size={32} style={{ color: "#f87171" }} />
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
            <span className="text-black font-black text-xs">N</span>
          </div>
          <span className="text-white font-black text-lg">Netvius</span>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black text-white mb-3">{titulo}</h1>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>{descricao}</p>

        {/* CTA */}
        <a href={`https://wa.me/${WHATSAPP}?text=${MSG}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold mb-4"
          style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "white", textDecoration: "none" }}>
          <MessageCircle size={18} />
          Falar com o suporte agora
        </a>

        <button onClick={() => { localStorage.removeItem("admin_token"); localStorage.removeItem("admin_user"); window.location.href = "/admin/login"; }}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-medium"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw size={14} />
          Voltar ao login
        </button>

        <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.2)" }}>
          Netvius · Sistema de Gestão de Campo
        </p>
      </div>
    </div>
  );
}
