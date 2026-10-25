import { env } from "cloudflare:workers";
import { desc, eq, and } from "drizzle-orm";
import { getDb } from "../../../db";
import { moodboardItems } from "../../../db/schema";
import { getClippingsEditor } from "../../clippings-editor";
import { getChatGPTUser } from "../../chatgpt-auth";
import { colorNames } from "../../moodboard/types";

const privateHeaders = { "cache-control": "private, no-store", "vary": "Cookie" };
const accepted = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "video/mp4", "video/webm", "application/pdf"]);
const references = new Set(["/designs/color-study-01.jpg", "/designs/color-study-02.jpg", "/designs/botanical-study.jpg", "/designs/grand-hotel.jpg", "/designs/alpine-painting.jpg", "/designs/summer-ponding.jpg", "/designs/athletic-study.jpg"]);
const isSameOrigin = (request: Request) => !request.headers.get("origin") || request.headers.get("origin") === new URL(request.url).origin;
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const color = (value: unknown) => colorNames.includes(value as typeof colorNames[number]) ? String(value) : "grey";
const photoMode = (value: unknown) => value === "black-and-white" ? "black-and-white" : "color";
const published = (value: unknown) => value !== false && value !== "false" && value !== "0";
const category = (value: unknown, kind: string) => clean(value, 64) || ({ image: "Images", video: "Film", file: "Documents", reference: "Design studies", note: "Notes", link: "Links" }[kind] ?? "Inspiration");
function webUrl(value: unknown): string | null {
  if (!value) return null;
  try { const parsed = new URL(String(value)); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href.slice(0, 2000) : null; } catch { return null; }
}
async function denyMutation(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Open Found Clippings to make changes." }, { status: 403, headers: privateHeaders });
  if (await getClippingsEditor()) return null;
  const signedIn = await getChatGPTUser();
  return Response.json({ error: signedIn ? "This account does not have editor access." : "Sign in with the site owner’s account to edit." }, { status: signedIn ? 403 : 401, headers: privateHeaders });
}

export async function GET(request: Request) {
  const editor = await getClippingsEditor();
  const editing = new URL(request.url).searchParams.get("edit") === "1" && editor;
  const items = await getDb().select().from(moodboardItems).where(editing ? eq(moodboardItems.ownerId, editor.userId) : eq(moodboardItems.published, true)).orderBy(desc(moodboardItems.createdAt), desc(moodboardItems.id));
  return Response.json({ canEdit: Boolean(editor), items: items.map(({ ownerId: _ownerId, objectKey, thumbnailKey, thumbnailMimeType: _thumbnailMimeType, thumbnailUrl, ...item }) => ({ ...item, src: objectKey ? `/api/moodboard/${item.id}/file` : item.url, thumbnail: thumbnailKey ? `/api/moodboard/${item.id}/file?thumbnail=1` : thumbnailUrl || (["image", "reference"].includes(item.kind) ? objectKey ? `/api/moodboard/${item.id}/file` : item.url : null) })) }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const denied = await denyMutation(request); if (denied) return denied;
  const user = (await getClippingsEditor())!;
  const id = crypto.randomUUID();
  let objectKey: string | null = null;
  let thumbnailKey: string | null = null;
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      if (Number(request.headers.get("content-length") || 0) > 22 * 1024 * 1024) return Response.json({ error: "Keep each file under 20 MB." }, { status: 413 });
      const data = await request.formData();
      const file = data.get("file");
      if (!(file instanceof File) || !file.size || file.size > 20 * 1024 * 1024) return Response.json({ error: "Choose a file up to 20 MB." }, { status: 400 });
      if (!accepted.has(file.type)) return Response.json({ error: "Choose a JPG, PNG, WebP, GIF, AVIF, MP4, WebM, or PDF file." }, { status: 400 });
      const thumbnail = data.get("thumbnail");
      if (thumbnail instanceof File && (thumbnail.size > 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(thumbnail.type))) return Response.json({ error: "The image preview could not be saved. Please try a different image." }, { status: 400 });
      objectKey = `moodboard/${id}`;
      await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
      let thumbnailMimeType: string | null = null;
      if (thumbnail instanceof File && thumbnail.size) {
        thumbnailKey = `moodboard/${id}/thumbnail`;
        thumbnailMimeType = thumbnail.type;
        await env.BUCKET.put(thumbnailKey, thumbnail.stream(), { httpMetadata: { contentType: thumbnail.type } });
      }
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
      await getDb().insert(moodboardItems).values({ id, ownerId: user.userId, kind, title: clean(data.get("title"), 160) || file.name.slice(0, 160), note: clean(data.get("note"), 5000), objectKey, mimeType: file.type, size: file.size, thumbnailKey, thumbnailMimeType, category: category(data.get("category"), kind), color: color(data.get("color")), photoMode: photoMode(data.get("photoMode")), published: published(data.get("published")) });
    } else {
      const data = await request.json() as Record<string, unknown>;
      const kind = String(data.kind ?? "");
      if (!["note", "link", "reference"].includes(kind)) return Response.json({ error: "Choose a note or a link." }, { status: 400 });
      const title = clean(data.title, 160);
      if (!title) return Response.json({ error: "Add a title." }, { status: 400 });
      let url: string | null = null;
      if (kind === "link") { url = webUrl(data.url); if (!url) return Response.json({ error: "Enter a full http or https link." }, { status: 400 }); }
      if (kind === "reference") { if (!references.has(String(data.url ?? ""))) return Response.json({ error: "Unknown sketchbook image." }, { status: 400 }); url = String(data.url); }
      const thumbnailUrl = webUrl(data.thumbnailUrl);
      if (data.thumbnailUrl && !thumbnailUrl) return Response.json({ error: "Enter a full http or https preview image link." }, { status: 400 });
      await getDb().insert(moodboardItems).values({ id, ownerId: user.userId, kind, title, note: clean(data.note, 5000), url, thumbnailUrl, category: category(data.category, kind), color: color(data.color), photoMode: photoMode(data.photoMode), published: published(data.published) });
    }
    return Response.json({ id }, { status: 201, headers: privateHeaders });
  } catch {
    if (objectKey) await env.BUCKET.delete(objectKey).catch(() => undefined);
    if (thumbnailKey) await env.BUCKET.delete(thumbnailKey).catch(() => undefined);
    return Response.json({ error: "We couldn’t save that. Please try again." }, { status: 500, headers: privateHeaders });
  }
}

export async function DELETE(request: Request) {
  const denied = await denyMutation(request); if (denied) return denied;
  const user = (await getClippingsEditor())!;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const [item] = await getDb().select().from(moodboardItems).where(and(eq(moodboardItems.id, id), eq(moodboardItems.ownerId, user.userId))).limit(1);
  if (!item) return Response.json({ error: "Item not found." }, { status: 404 });
  if (item.objectKey) await env.BUCKET.delete(item.objectKey);
  if (item.thumbnailKey) await env.BUCKET.delete(item.thumbnailKey);
  await getDb().delete(moodboardItems).where(and(eq(moodboardItems.id, id), eq(moodboardItems.ownerId, user.userId)));
  return Response.json({ removed: true }, { headers: privateHeaders });
}

export async function PATCH(request: Request) {
  const denied = await denyMutation(request); if (denied) return denied;
  const user = (await getClippingsEditor())!;
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return Response.json({ error: "Couldn’t read the details." }, { status: 400 }); }
  if (typeof data.id !== "string" || !clean(data.title, 160)) return Response.json({ error: "Add a title." }, { status: 400 });
  const [item] = await getDb().select().from(moodboardItems).where(and(eq(moodboardItems.id, data.id), eq(moodboardItems.ownerId, user.userId))).limit(1);
  if (!item) return Response.json({ error: "Item not found." }, { status: 404 });
  await getDb().update(moodboardItems).set({ title: clean(data.title, 160), note: data.note === undefined ? item.note : clean(data.note, 5000), category: data.category === undefined ? item.category : category(data.category, item.kind), color: data.color === undefined ? item.color : color(data.color), photoMode: data.photoMode === undefined ? item.photoMode : photoMode(data.photoMode), published: data.published === undefined ? item.published : published(data.published) }).where(and(eq(moodboardItems.id, data.id), eq(moodboardItems.ownerId, user.userId)));
  return Response.json({ saved: true }, { headers: privateHeaders });
}
