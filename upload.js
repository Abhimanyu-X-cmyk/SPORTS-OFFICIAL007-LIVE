
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.headers.origin !== "https://sports-official007-live.vercel.app") {
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

  const supplied = typeof body?.adminPassword === "string"
    ? body.adminPassword : "";

  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }

  const allowedTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const mimeType = body?.mimeType;
  const base64 = body?.imageBase64;

  if (!allowedTypes[mimeType] || typeof base64 !== "string") {
    return res.status(400).json({ error: "Unsupported image format" });
  }

  if (
    base64.length > 4 * 1024 * 1024 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    return res.status(413).json({ error: "Image is too large or invalid" });
  }

  const image = Buffer.from(base64, "base64");

  if (image.length === 0 || image.length > 3 * 1024 * 1024) {
    return res.status(413).json({ error: "Maximum image size is 3 MB" });
  }

  const signatures = {
    "image/jpeg": image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff,
    "image/png": image.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    ),
    "image/webp": image.toString("ascii", 0, 4) === "RIFF" &&
      image.toString("ascii", 8, 12) === "WEBP"
  };

  if (!signatures[mimeType]) {
    return res.status(400).json({ error: "Image content does not match its format" });
  }

  const extension = allowedTypes[mimeType];
  const filename = `${crypto.randomUUID()}.${extension}`;
  const path = `media/${filename}`;

  const apiUrl =
    "https://api.github.com/repos/Abhimanyu-X-cmyk/SPORTS-OFFICIAL007-LIVE/contents/" +
    path;

  try {
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Upload sports website image",
        content: image.toString("base64"),
        branch: "main"
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error("GitHub image upload failed: " + (result.message || response.status));
    }

    return res.status(200).json({
      success: true,
      filename,
      path,
      imageUrl:
        `https://raw.githubusercontent.com/Abhimanyu-X-cmyk/SPORTS-OFFICIAL007-LIVE/main/${path}`
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Image upload failed"
    });
  }
};
