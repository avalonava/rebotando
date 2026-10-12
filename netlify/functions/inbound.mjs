import { getStore } from "@netlify/blobs";

// Accepts CloudMailin (JSON normalized) or Postmark inbound payloads.
export default async (req) => {
  const url = new URL(req.url);
  if (req.method !== "POST" || url.searchParams.get("key") !== process.env.SECRET)
    return new Response("no", { status: 403 });

  const m = await req.json();
  const rawFrom = m.envelope?.from || m.headers?.from || m.FromFull?.Email || m.From || "";
  const from = (rawFrom.match(/[^\s<>"]+@[^\s<>"]+/)?.[0] || "").toLowerCase();
  const allowed = (process.env.ALLOWED_SENDERS || "").toLowerCase()
    .split(",").map(s => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(from)) return new Response("ignored");

  const subject = String(m.headers?.subject ?? m.Subject ?? "").trim();
  const text = String(m.plain ?? m.TextBody ?? "").trim();

  const id = Date.now().toString();
  const media = getStore("media");
  const files = [];
  for (const [i, a] of (m.attachments || m.Attachments || []).entries()) {
    const key = `${id}-${i}`;
    const type = a.content_type || a.ContentType || "application/octet-stream";
    const name = a.file_name || a.Name || "file";
    const bytes = Uint8Array.from(Buffer.from(a.content || a.Content, "base64")).buffer;
    await media.set(key, bytes, { metadata: { type, name } });
    files.push({ key, type, name });
  }
  await getStore("posts").setJSON(id, { id, title: subject, text, files });
  return new Response("ok");
};

export const config = { path: "/api/inbound" };
