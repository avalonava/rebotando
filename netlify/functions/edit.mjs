import { getStore } from "@netlify/blobs";

const STYLES = ["auto", "normal", "cita", "grande", "centrado", "pequeno", "mono"];

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (req.method !== "POST" || q.get("key") !== process.env.SECRET)
    return new Response("no", { status: 403 });

  const p = await req.json();
  if (p.check) return new Response("ok");

  // Clear leftover files once every post is gone
  if (p.purge) {
    if ((await getStore("posts").list()).blobs.length) return new Response("posts remain", { status: 409 });
    for (const name of ["media", "chunks"]) {
      const st = getStore(name);
      const { blobs } = await st.list();
      for (let i = 0; i < blobs.length; i += 25)
        await Promise.all(blobs.slice(i, i + 25).map(b => st.delete(b.key)));
    }
    return new Response("purged");
  }

  const store = getStore("posts");
  const post = await store.get(String(p.id), { type: "json" });
  if (!post) return new Response("not found", { status: 404 });

  if (p.delete) {
    const media = getStore("media");
    for (const f of post.files || []) await media.delete(f.key);
    await store.delete(String(p.id));
    return new Response("deleted");
  }

  post.title = String(p.title ?? post.title).trim();
  post.text = String(p.text ?? post.text).trim();
  if (p.style !== undefined) post.style = STYLES.includes(p.style) ? p.style : "auto";
  await store.setJSON(post.id, post);
  return new Response("ok");
};

export const config = { path: "/api/edit" };
