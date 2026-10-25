import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { moodboardItems } from "../../../../../db/schema";
import { getClippingsEditor } from "../../../../clippings-editor";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item] = await getDb().select().from(moodboardItems).where(eq(moodboardItems.id, id)).limit(1);
  if (!item) return new Response("Not found.", { status: 404 });
  if (!item.published) {
    const editor = await getClippingsEditor();
    if (!editor || editor.userId !== item.ownerId) return new Response("Not found.", { status: 404 });
  }
  const thumbnail = new URL(request.url).searchParams.get("thumbnail") === "1";
  const key = thumbnail ? item.thumbnailKey : item.objectKey;
  if (!key) return new Response("Not found.", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found.", { status: 404 });
  return new Response(object.body, { headers: { "content-type": (thumbnail ? item.thumbnailMimeType : item.mimeType) || "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": `${!thumbnail && item.kind === "file" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(item.title)}` } });
}
