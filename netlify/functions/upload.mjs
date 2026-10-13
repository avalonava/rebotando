import { getStore } from "@netlify/blobs";

const num = /^\d+$/;

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (req.method !== "POST" || q.get("key") !== process.env.SECRET)
    return new Response("no", { status: 403 });

  // Save the finished post
  if (q.get("kind") === "post") {
    const p = await req.json();
    if (!num.test(String(p.id))) return new Response("bad id", { status: 400 });
    await getStore("posts").setJSON(p.id, {
      id: p.id, title: p.title || "", text: p.text || "", files: p.files || [],
    });
    return new Response("ok");
  }

  // Receive one chunk of a file; stitch together when the last one arrives
  if (q.get("kind") === "part") {
    const post = q.get("post"), file = q.get("file");
    const part = +q.get("part"), parts = +q.get("parts");
    if (![post, file].every(v => num.test(v ?? "")) || !(parts > 0)) return new Response("bad", { status: 400 });

    const chunks = getStore("chunks");
    const base = `${post}-${file}`;
    await chunks.set(`${base}-${part}`, await req.arrayBuffer());

    if (part === parts - 1) {
      const bufs = [];
      for (let i = 0; i < parts; i++)
        bufs.push(new Uint8Array(await chunks.get(`${base}-${i}`, { type: "arrayBuffer" })));
      const out = new Uint8Array(bufs.reduce((n, b) => n + b.length, 0));
      let o = 0;
      for (const b of bufs) { out.set(b, o); o += b.length; }
      await getStore("media").set(base, out.buffer, {
        metadata: { type: q.get("type") || "application/octet-stream", name: q.get("name") || "file" },
      });
      for (let i = 0; i < parts; i++) await chunks.delete(`${base}-${i}`);
    }
    return new Response("ok");
  }
  return new Response("bad", { status: 400 });
};

export const config = { path: "/api/upload" };
