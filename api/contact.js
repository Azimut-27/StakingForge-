module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (error) {
    return res.status(400).json({ ok: false, error: "Invalid request body" });
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const topic = String(body.topic || "").trim();
  const message = String(body.message || "").trim();
  const honeypot = String(body._honey || "").trim();

  if (honeypot) return res.status(200).json({ ok: true });
  if (!name || !email || !topic || !message) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || "stakingforge@gmail.com";
  const from = process.env.CONTACT_FROM_EMAIL || "StakingForge <onboarding@resend.dev>";

  if (!apiKey) {
    return res.status(501).json({
      ok: false,
      error: "Email provider is not configured"
    });
  }

  const safe = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `New StakingForge request: ${topic}`,
      html: `
        <h2>New StakingForge contact request</h2>
        <p><strong>Name:</strong> ${safe(name)}</p>
        <p><strong>Email:</strong> ${safe(email)}</p>
        <p><strong>Topic:</strong> ${safe(topic)}</p>
        <p><strong>Message:</strong></p>
        <p>${safe(message).replace(/\n/g, "<br>")}</p>
      `
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return res.status(502).json({ ok: false, error: "Email provider failed", detail });
  }

  return res.status(200).json({ ok: true });
};
