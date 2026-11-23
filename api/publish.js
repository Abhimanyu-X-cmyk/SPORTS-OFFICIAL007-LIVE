
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const allowedOrigin = "https://sports-official007-live.vercel.app";
  if (req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ error: "Invalid origin" });
  }

  const { GITHUB_TOKEN, ADMIN_PASSWORD } = process.env;
  if (!GITHUB_TOKEN || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Server configuration missing" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const password = body?.adminPassword;
  const supplied = typeof password === "string" ? password : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }

  const siteData = body?.siteData;
  if (
    !siteData ||
    typeof siteData !== "object" ||
    !Array.isArray(siteData.matches) ||
    !Array.isArray(siteData.fixtures) ||
    !Array.isArray(siteData.results)
  ) {
    return res.status(400).json({ error: "Invalid website data" });
  }

  try {
    const apiUrl =
      "https://api.github.com/repos/Abhimanyu-X-cmyk/SPORTS-OFFICIAL007-LIVE/contents/data/site-content.json";

    const headers = {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    };

    const current = await fetch(apiUrl, { headers });

    if (!current.ok) {
      throw new Error("Could not read website data from GitHub");
    }

    const file = await current.json();

    const updated = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Update sports website content",
        content: Buffer.from(
          JSON.stringify(siteData, null, 2)
        ).toString("base64"),
        sha: file.sha,
        branch: "main"
      })
    });

    const result = await updated.json();

    if (!updated.ok) {
      throw new Error(result.message || "GitHub update failed");
    }

    return res.status(200).json({
      success: true,
      message: "Website content published successfully"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Publishing failed"
    });
  }
};
