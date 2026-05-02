import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Settings, User, Lock, Building2, Shield,
  Eye, EyeOff, Save, CheckCircle, Bell, Wifi,
  Key, AlertTriangle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantAuth } from "@/hooks/useTenantAuth";

function SectionCard({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border"
        style={{ background: "oklch(0.97 0.008 240)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, disabled, hint }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function AdminConfiguracoes() {
  const { admin } = useTenantAuth();

  // Alterar senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const alterarSenhaMut = trpc.tenantAdmin.alterarSenha.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
      setSalvandoSenha(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setSalvandoSenha(false);
    },
  });

  function handleAlterarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast.error("Preencha todos os campos"); return;
    }
    if (novaSenha.length < 6) {
      toast.error("Nova senha deve ter pelo menos 6 caracteres"); return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem"); return;
    }
    setSalvandoSenha(true);
    alterarSenhaMut.mutate({ senhaAtual, novaSenha });
  }

  const senhaForte = novaSenha.length >= 8 && /[A-Z]/.test(novaSenha) && /[0-9]/.test(novaSenha);
  const senhaMedia = novaSenha.length >= 6 && !senhaForte;

  return (
    <AdminLayoutAuto title="Configurações">
      <div className="max-w-2xl space-y-6">

        {/* Informações da conta */}
        <SectionCard title="Informações da Conta" icon={User} color="oklch(0.30 0.10 240)">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "oklch(0.96 0.015 240)", border: "1px solid oklch(0.90 0.02 240)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: "linear-gradient(135deg, oklch(0.30 0.10 240), oklch(0.50 0.18 162))" }}>
                {admin?.nome?.charAt(0).toUpperCase() ?? "A"}
              </div>
              <div>
                <p className="font-semibold text-foreground">{admin?.nome ?? "Administrador"}</p>
                <p className="text-sm text-muted-foreground">{admin?.email ?? ""}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Conta ativa</span>
                </div>
              </div>
            </div>
            <InputField label="Nome" value={admin?.nome ?? ""} disabled placeholder="Nome do administrador" />
            <InputField label="E-mail" value={admin?.email ?? ""} disabled placeholder="email@empresa.com" />
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: "oklch(0.95 0.04 60)", border: "1px solid oklch(0.88 0.08 60)" }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.42 0.14 60)" }} />
              <p className="text-xs" style={{ color: "oklch(0.42 0.14 60)" }}>
                Para alterar nome ou e-mail, entre em contato com o administrador do sistema.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Segurança */}
        <SectionCard title="Segurança e Senha" icon={Lock} color="oklch(0.38 0.18 290)">
          <div className="space-y-4">
            <InputField
              label="Senha atual"
              type="password"
              value={senhaAtual}
              onChange={setSenhaAtual}
              placeholder="Digite sua senha atual"
            />
            <InputField
              label="Nova senha"
              type="password"
              value={novaSenha}
              onChange={setNovaSenha}
              placeholder="Mínimo 6 caracteres"
            />
            {novaSenha.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: senhaForte ? "100%" : senhaMedia ? "60%" : novaSenha.length > 0 ? "30%" : "0%",
                        background: senhaForte ? "oklch(0.50 0.18 162)" : senhaMedia ? "oklch(0.55 0.16 75)" : "oklch(0.45 0.20 25)"
                      }} />
                  </div>
                  <span className="text-xs font-medium"
                    style={{ color: senhaForte ? "oklch(0.40 0.18 162)" : senhaMedia ? "oklch(0.42 0.14 60)" : "oklch(0.45 0.20 25)" }}>
                    {senhaForte ? "Forte" : senhaMedia ? "Média" : "Fraca"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use 8+ caracteres, letras maiúsculas e números para uma senha forte.
                </p>
              </div>
            )}
            <InputField
              label="Confirmar nova senha"
              type="password"
              value={confirmarSenha}
              onChange={setConfirmarSenha}
              placeholder="Repita a nova senha"
            />
            {confirmarSenha.length > 0 && novaSenha !== confirmarSenha && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.45 0.20 25)" }}>
                <AlertTriangle className="w-3.5 h-3.5" />
                As senhas não coincidem
              </div>
            )}
            {confirmarSenha.length > 0 && novaSenha === confirmarSenha && novaSenha.length >= 6 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.40 0.18 162)" }}>
                <CheckCircle className="w-3.5 h-3.5" />
                Senhas coincidem
              </div>
            )}
            <Button
              onClick={handleAlterarSenha}
              disabled={salvandoSenha || !senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha}
              className="w-full gap-2 rounded-xl"
              style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.36 0.14 240))", color: "white", border: "none" }}>
              {salvandoSenha ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Salvando...</>
              ) : (
                <><Save className="w-4 h-4" />Alterar Senha</>
              )}
            </Button>
          </div>
        </SectionCard>

        {/* Sobre o sistema */}
        <SectionCard title="Sobre o Sistema" icon={Wifi} color="oklch(0.40 0.18 162)">
          <div className="space-y-3">
            {[
              { label: "Plataforma", value: "Netvionis — Gestão de Instalação Wi-Fi" },
              { label: "Versão", value: "2.0.0 Enterprise" },
              { label: "Suporte", value: "suporte@netvionis.com.br" },
              { label: "Segurança", value: "Dados criptografados com JWT + bcrypt" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </AdminLayoutAuto>
  );
}
