import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  if (req.method !== "POST" || url.searchParams.get("key") !== process.env.SECRET)
    return new Response("no", { status: 403 });

  const m = await req.json();
  const allowed = (process.env.ALLOWED_SENDERS || "").toLowerCase()
    .split(",").map(s => s.trim()).filter(Boolean);
  const from = (m.FromFull?.Email || m.From || "").toLowerCase();
  if (allowed.length && !allowed.includes(from)) return new Response("ignored");

  const posts = getStore("posts");
  const media = getStore("media");
  const subject = (m.Subject || "").trim();

  const id = Date.now().toString();
  const files = [];
  for (const [i, a] of (m.Attachments || []).entries()) {
    const key = `${id}-${i}`;
    const bytes = Uint8Array.from(Buffer.from(a.Content, "base64")).buffer;
    await media.set(key, bytes, { metadata: { type: a.ContentType, name: a.Name } });
    files.push({ key, type: a.ContentType, name: a.Name });
  }
  await posts.setJSON(id, { id, title: subject, text: (m.TextBody || "").trim(), files });
  return new Response("ok");
};

export const config = { path: "/api/inbound" };
