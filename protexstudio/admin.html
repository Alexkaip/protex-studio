export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt." });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.ORDER_TO_EMAIL || "office@protex-austria.at";
    const fromEmail = process.env.ORDER_FROM_EMAIL || "Protex Studio <onboarding@resend.dev>";

    if (!apiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY fehlt in Vercel Environment Variables." });
    }

    const { clientEmail, mailText, attachments = [] } = req.body || {};
    if (!clientEmail || !mailText) {
      return res.status(400).json({ error: "Kunden-E-Mail oder Nachricht fehlt." });
    }

    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 5).map((file, index) => ({
          filename: file.filename || `layout-${index + 1}.jpg`,
          content: file.content || ""
        })).filter(file => file.content)
      : [];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: clientEmail,
        subject: "Neue Protex Studio Anfrage",
        text: mailText,
        attachments: safeAttachments
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || data.error || "E-Mail konnte nicht gesendet werden." });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unbekannter Fehler." });
  }
}
