import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const r = await getStore("media").getWithMetadata(context.params.key, { type: "arrayBuffer" });
  if (!r) return new Response("not found", { status: 404 });
  return new Response(r.data, {
    headers: {
      "content-type": r.metadata?.type || "application/octet-stream",
      "cache-control": "public, max-age=31536000",
    },
  });
};

export const config = { path: "/media/:key" };
