import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const client = getResend();
    const from = payload.from ?? "Netvius <noreply@netvius.org>";
    const { error } = await client.emails.send({
      from,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      console.error("[Email] Erro ao enviar:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Exceção ao enviar:", err);
    return false;
  }
}

/**
 * Gera o HTML do relatório diário de progresso das instalações
 */
export function gerarHtmlRelatoriodiario(dados: {
  tenantNome: string;
  totalEscolas: number;
  concluidas: number;
  pendentes: number;
  emAndamento: number;
  totalApsInstalados: number;
  totalApsPlanejados: number;
  concluidasOntem: number;
  percentual: number;
  data: string;
}): string {
  const {
    tenantNome, totalEscolas, concluidas, pendentes, emAndamento,
    totalApsInstalados, totalApsPlanejados, concluidasOntem, percentual, data
  } = dados;

  const barWidth = Math.min(100, Math.round(percentual));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório Diário — Netvius</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d2137,#0a1628);border-radius:16px 16px 0 0;padding:32px;text-align:center;border-bottom:1px solid rgba(0,245,160,0.15);">
              <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#00f5a0,#00d9f5);border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-weight:900;font-size:18px;color:#050b18;">N</div>
                <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Netvius</span>
              </div>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.4);">Relatório Diário de Progresso</p>
            </td>
          </tr>

          <!-- Data e empresa -->
          <tr>
            <td style="background:#0d1929;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,0.05);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Empresa</p>
                    <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#fff;">${tenantNome}</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Data</p>
                    <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#fff;">${data}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Progresso geral -->
          <tr>
            <td style="background:#0d1929;padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Progresso Geral</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:32px;font-weight:900;color:#00f5a0;">${percentual.toFixed(1)}%</p>
                    <p style="margin:2px 0 0;font-size:13px;color:rgba(255,255,255,0.4);">${concluidas} de ${totalEscolas} unidades concluídas</p>
                  </td>
                  <td align="right" style="padding-left:16px;">
                    <div style="background:rgba(0,245,160,0.15);border:1px solid rgba(0,245,160,0.3);border-radius:8px;padding:8px 16px;text-align:center;">
                      <p style="margin:0;font-size:22px;font-weight:900;color:#00f5a0;">+${concluidasOntem}</p>
                      <p style="margin:2px 0 0;font-size:11px;color:rgba(0,245,160,0.7);">concluídas ontem</p>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Barra de progresso -->
              <div style="margin-top:16px;background:rgba(255,255,255,0.08);border-radius:99px;height:10px;overflow:hidden;">
                <div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg,#00f5a0,#00d9f5);border-radius:99px;"></div>
              </div>
            </td>
          </tr>

          <!-- Cards de status -->
          <tr>
            <td style="background:#0d1929;padding:16px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.05);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="padding-right:8px;">
                    <div style="background:rgba(0,245,160,0.08);border:1px solid rgba(0,245,160,0.2);border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:24px;font-weight:900;color:#00f5a0;">${concluidas}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">Concluídas</p>
                    </div>
                  </td>
                  <td width="33%" style="padding:0 4px;">
                    <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:24px;font-weight:900;color:#fbbf24;">${emAndamento}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">Em andamento</p>
                    </div>
                  </td>
                  <td width="33%" style="padding-left:8px;">
                    <div style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.15);border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:24px;font-weight:900;color:#94a3b8;">${pendentes}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">Pendentes</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- APs -->
          <tr>
            <td style="background:#0d1929;padding:20px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Access Points (APs)</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">APs instalados</p>
                    <p style="margin:2px 0 0;font-size:22px;font-weight:900;color:#00d9f5;">${totalApsInstalados.toLocaleString("pt-BR")}</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">Total planejado</p>
                    <p style="margin:2px 0 0;font-size:22px;font-weight:900;color:rgba(255,255,255,0.6);">${totalApsPlanejados.toLocaleString("pt-BR")}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#0d1929;padding:24px 32px;text-align:center;">
              <a href="https://netvius.org/admin/login"
                style="display:inline-block;background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#050b18;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
                Acessar Painel Completo →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#080d18;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">
                Este relatório é enviado automaticamente às 08:00 todos os dias pela Netvius.<br/>
                © ${new Date().getFullYear()} Netvius — Gestão de equipes de campo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
