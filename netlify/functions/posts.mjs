import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("posts");
  const { blobs } = await store.list();
  const keys = blobs.map(b => b.key).sort().reverse();
  const posts = await Promise.all(keys.map(k => store.get(k, { type: "json" })));
  return Response.json(posts.filter(Boolean), { headers: { "cache-control": "no-cache" } });
};

export const config = { path: "/api/posts" };
