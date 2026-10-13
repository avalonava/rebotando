import { getStore } from "@netlify/blobs";

const MAX_SLICE = 4 * 1024 * 1024;

export default async (req, context) => {
  const r = await getStore("media").getWithMetadata(context.params.key, { type: "arrayBuffer" });
  if (!r) return new Response("not found", { status: 404 });

  const total = r.data.byteLength;
  const headers = {
    "content-type": r.metadata?.type || "application/octet-stream",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000",
  };

  // Range support (needed for video/audio, especially on iPhones)
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  if (m) {
    let start = m[1] === "" ? Math.max(0, total - +m[2]) : +m[1];
    let end = m[1] === "" || m[2] === "" ? total - 1 : Math.min(+m[2], total - 1);
    end = Math.min(end, start + MAX_SLICE - 1);
    if (start >= total || start > end)
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${total}` } });
    return new Response(r.data.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${total}`, "content-length": String(end - start + 1) },
    });
  }

  // Full response, streamed in pieces
  const bytes = new Uint8Array(r.data);
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < total; i += 1024 * 1024) c.enqueue(bytes.slice(i, i + 1024 * 1024));
      c.close();
    },
  });
  return new Response(stream, { headers: { ...headers, "content-length": String(total) } });
};

export const config = { path: "/media/:key" };
