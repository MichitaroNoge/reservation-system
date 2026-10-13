export function buildEmailContent(subject: string, body: string) {
  const escapedBody = escapeHtml(body).replaceAll("\n", "<br>");
  return {
    subject,
    text: body,
    html: `<!doctype html><html lang="ja"><body style="margin:0;background:#f6f8fb;color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><header style="padding:18px 24px;background:#14213d;color:#fff;font-weight:700">Reserve</header><main style="padding:28px 24px;background:#fff;line-height:1.8">${escapedBody}</main><footer style="padding:18px 24px;color:#667085;font-size:12px">このメールは予約システムから送信されました。お問い合わせは店舗までお願いいたします。</footer></div></body></html>`,
  };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
