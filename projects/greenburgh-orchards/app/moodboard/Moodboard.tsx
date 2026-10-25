"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { categoryNames, colorNames, colorValues, type Pin } from "./types";
import "../shop.css";
import "./moodboard.css";

const startingPoints = [
  { title: "Color study I", image: "/designs/color-study-01.jpg", color: "green" },
  { title: "Color study II", image: "/designs/color-study-02.jpg", color: "purple" },
  { title: "Orchard Botanicals", image: "/designs/botanical-study.jpg", color: "black" },
  { title: "Grand Hôtel Greenburgh", image: "/designs/grand-hotel.jpg", color: "brown" },
  { title: "An alpine memory", image: "/designs/alpine-painting.jpg", color: "brown" },
  { title: "Summer Ponding Classic", image: "/designs/summer-ponding.jpg", color: "black" },
  { title: "A study in movement", image: "/designs/athletic-study.jpg", color: "white" },
];
const initialPins: Pin[] = startingPoints.map((item, index) => ({ id: `sketchbook-${index}`, kind: "reference", title: item.title, note: "", url: item.image, src: item.image, thumbnail: item.image, mimeType: "image/jpeg", size: 0, createdAt: "", published: true, category: "Design studies", color: item.color, photoMode: "color" }));

function classifyColor(red: number, green: number, blue: number): string {
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const lightness = (max + min) / 510;
  const delta = max - min;
  const saturation = max ? delta / max : 0;
  if (max < 45) return "black";
  if (min > 225 && delta < 25) return "white";
  if (saturation < 0.14 || delta < 18) return "grey";
  let hue = delta === 0 ? 0 : max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  hue = ((hue * 60) + 360) % 360;
  if (hue < 42 && lightness < 0.48) return "brown";
  if (hue < 15 || hue >= 345) return lightness > 0.65 ? "pink" : "red";
  if (hue < 45) return "orange";
  if (hue < 70) return "yellow";
  if (hue < 165) return "green";
  if (hue < 260) return "blue";
  if (hue < 300) return "purple";
  return "pink";
}

async function imageDetails(file: File): Promise<{ thumbnail: Blob | null; color: string; photoMode: string }> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image preview unavailable");
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const sample = document.createElement("canvas"); sample.width = 64; sample.height = 64;
    const sampler = sample.getContext("2d", { willReadFrequently: true })!;
    sampler.drawImage(canvas, 0, 0, 64, 64);
    const pixels = sampler.getImageData(0, 0, 64, 64).data;
    const counts: Record<string, number> = {};
    let colored = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index], green = pixels[index + 1], blue = pixels[index + 2];
      const name = classifyColor(red, green, blue);
      counts[name] = (counts[name] || 0) + (name === "white" ? 0.12 : name === "grey" ? 0.5 : 1);
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 20) colored++;
    }
    const color = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "grey";
    const thumbnail = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    return { thumbnail, color, photoMode: colored / 4096 < 0.035 ? "black-and-white" : "color" };
  } finally { bitmap.close(); }
}

function PinFields({ pin, upload = false }: { pin?: Pin; upload?: boolean }) {
  return <>
    <div className="mb-field-row"><label>Category<input name="category" list="mb-categories" defaultValue={pin?.category || ""} placeholder={upload ? "Automatic by file type" : "Choose or create a category"} maxLength={64} /><datalist id="mb-categories">{categoryNames.map((value) => <option key={value} value={value} />)}</datalist></label>{!upload && <label>Color<select name="color" defaultValue={pin?.color || "grey"}>{colorNames.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}</div>
    {!upload && <label>Photography display<select name="photoMode" defaultValue={pin?.photoMode || "color"}><option value="color">Color</option><option value="black-and-white">Black and white</option></select></label>}
    <label className="mb-checkbox"><input name="published" type="checkbox" defaultChecked={pin ? pin.published : true} /><span>Publish for everyone to see</span></label>
  </>;
}

export default function Moodboard({ editor, editRequested, signedIn, signInPath, initialCategory }: { editor: boolean; editRequested: boolean; signedIn: boolean; signInPath: string; initialCategory: string }) {
  const editing = editor && editRequested;
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [composer, setComposer] = useState<"link" | "note" | null>(null);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [kindFilter, setKindFilter] = useState("All material");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [colorFilter, setColorFilter] = useState("All colors");
  const [sort, setSort] = useState("Newest first");
  const [uploadCategory, setUploadCategory] = useState(initialCategory === "All categories" ? "" : initialCategory);
  const [publishUploads, setPublishUploads] = useState(true);
  const [columnCount, setColumnCount] = useState(4);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    const resize = () => setColumnCount(window.innerWidth < 520 ? 1 : window.innerWidth < 850 ? 2 : window.innerWidth < 1200 ? 3 : 4);
    resize(); window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, []);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/moodboard${editing ? "?edit=1" : ""}`, { cache: "no-store" });
      const data = await response.json() as { items?: Pin[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Couldn’t open the clippings.");
      setPins(data.items ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t open the clippings."); }
    finally { setLoading(false); }
  }, [editing]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);

  const upload = useCallback(async (files: File[]) => {
    if (!editing || busy || !files.length) return;
    setBusy(true); setError("");
    const failures: string[] = [];
    for (const [index, file] of files.slice(0, 20).entries()) {
      setStatus(`Uploading ${index + 1} of ${Math.min(files.length, 20)}…`);
      if (file.size > 20 * 1024 * 1024) { failures.push(`${file.name}: over 20 MB`); continue; }
      try {
        const data = new FormData(); data.append("file", file); data.append("published", String(publishUploads));
        data.append("title", file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
        if (uploadCategory) data.append("category", uploadCategory);
        if (file.type.startsWith("image/")) {
          try {
            const details = await imageDetails(file);
            if (details.thumbnail) data.append("thumbnail", details.thumbnail, "preview.webp");
            data.append("color", details.color); data.append("photoMode", details.photoMode);
          } catch { /* The original image remains uploadable if the browser cannot decode its preview. */ }
        }
        const response = await fetch("/api/moodboard", { method: "POST", body: data });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Upload failed");
      } catch (caught) { failures.push(`${file.name}: ${caught instanceof Error ? caught.message : "Upload failed"}`); }
    }
    await load(); setError(failures.join(" · "));
    setStatus(failures.length ? "Some files still need to be uploaded." : publishUploads ? "Published to Found Clippings." : "Saved as drafts. Only you can see them.");
    setBusy(false); if (input.current) input.current.value = "";
  }, [editing, busy, load, publishUploads, uploadCategory]);
  useEffect(() => {
    if (!editing) return;
    const paste = (event: ClipboardEvent) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(event.target.tagName)) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) { event.preventDefault(); void upload(files); }
    };
    window.addEventListener("paste", paste); return () => window.removeEventListener("paste", paste);
  }, [upload, editing]);
  const savePin = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/moodboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "Couldn’t save that.");
  };
  const addText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      await savePin({ kind: composer!, title: data.get("title"), note: data.get("note") || "", url: data.get("url") || "", thumbnailUrl: data.get("thumbnailUrl") || "", category: data.get("category"), color: data.get("color"), photoMode: data.get("photoMode"), published: data.has("published") });
      setComposer(null); setStatus(data.has("published") ? "Published to Found Clippings." : "Draft saved."); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t save that."); } finally { setBusy(false); }
  };
  const pinReference = async (item: typeof startingPoints[number]) => {
    if (busy) return; setBusy(true); setError("");
    try { await savePin({ kind: "reference", title: item.title, url: item.image, category: "Design studies", color: item.color, published: true }); await load(); setStatus("Published to Found Clippings."); }
    catch { setError("Couldn’t pin that image. Please try again."); } finally { setBusy(false); }
  };
  const remove = async (pin: Pin) => {
    if (!window.confirm(`Remove “${pin.title}” from Found Clippings?`)) return; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/moodboard?id=${encodeURIComponent(pin.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(); setSelected(null); await load(); setStatus("Clipping removed.");
    } catch { setError("Couldn’t remove that. Please try again."); } finally { setBusy(false); }
  };
  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return; const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const response = await fetch("/api/moodboard", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, title: data.get("title"), note: data.get("note"), category: data.get("category"), color: data.get("color"), photoMode: data.get("photoMode"), published: data.has("published") }) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error);
      setSelected(null); await load(); setStatus("Details saved.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t save the details."); } finally { setBusy(false); }
  };

  const allPins = !loading && !pins.length && !editing ? initialPins : pins;
  const categories = Array.from(new Set([...categoryNames, ...allPins.map((pin) => pin.category), ...(initialCategory !== "All categories" ? [initialCategory] : [])])).sort();
  const shown = allPins.filter((pin) => (categoryFilter === "All categories" || pin.category === categoryFilter) && (colorFilter === "All colors" || pin.color === colorFilter) && (kindFilter === "All material" || (kindFilter === "Images" ? ["image", "reference"].includes(pin.kind) : kindFilter === "Notes" ? pin.kind === "note" : kindFilter === "Links" ? pin.kind === "link" : ["file", "video"].includes(pin.kind)))).sort((a, b) => sort === "Color" ? colorNames.indexOf(a.color as typeof colorNames[number]) - colorNames.indexOf(b.color as typeof colorNames[number]) : sort === "Oldest first" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const columns = Array.from({ length: Math.min(columnCount, shown.length) }, (_, index) => shown.filter((_, pinIndex) => pinIndex % Math.min(columnCount, shown.length) === index));

  return <main className={`go-site mb-page ${dragging ? "mb-dragging" : ""}`} onDragEnter={(event) => { if (editing && event.dataTransfer.types.includes("Files")) { event.preventDefault(); dragDepth.current++; setDragging(true); } }} onDragOver={(event) => { if (editing && event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDragLeave={() => { dragDepth.current--; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }} onDrop={(event) => { if (editing && event.dataTransfer.files.length) { event.preventDefault(); dragDepth.current = 0; setDragging(false); void upload(Array.from(event.dataTransfer.files)); } }}>
    <header className="go-header mb-header"><a className="mb-back" href="/">stroll back to home</a><a className="go-brand" href="/">GREENBURGH<span>ORCHARDS</span></a>{editing && <a className="mb-view-public" href="/moodboard">View published page</a>}</header>
    <div className="mb-heading"><div><h1>Found Clippings</h1><p>a means by which I</p></div>{editing && <div className="mb-tools"><button className="mb-upload-button" onClick={() => input.current?.click()} disabled={busy}>Upload material</button><button onClick={() => setComposer(composer === "link" ? null : "link")} disabled={busy}>Add a link</button><button onClick={() => setComposer(composer === "note" ? null : "note")} disabled={busy}>Write a note</button></div>}</div>
    {editRequested && !editor && <section className="mb-signin">{signedIn ? <p>This account does not have editor access.</p> : <><p>Sign in with the Greenburgh Orchards owner’s account to edit the clippings.</p><a href={signInPath} target="_top">Sign in to edit</a></>}</section>}
    {editing && <>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,application/pdf" className="mb-file-input" aria-label="Upload inspiration files" onChange={(event: ChangeEvent<HTMLInputElement>) => void upload(Array.from(event.target.files ?? []))} />
      <section className="mb-upload-area"><div className="mb-upload-options"><label>File into<select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}><option value="">Automatic by file type</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mb-checkbox"><input type="checkbox" checked={publishUploads} onChange={(event) => setPublishUploads(event.target.checked)} /><span>Publish new uploads</span></label><p>Images receive a thumbnail and a color automatically. Open any clipping to refine its details.</p></div><button className="mb-dropzone" disabled={busy} onClick={() => input.current?.click()}><span>{busy ? status || "Saving…" : "Drop something here."}</span><small>Drag in files, browse, or paste an image.</small><small>Images, video &amp; PDF · 20 MB each · 20 files at a time</small></button></section>
      {composer && <form className="mb-composer" onSubmit={addText}><div><h2>{composer === "link" ? "A link worth keeping" : "A thought for later"}</h2><button type="button" onClick={() => setComposer(null)} aria-label="Close new clipping">×</button></div><label>Title<input name="title" required maxLength={160} autoFocus /></label>{composer === "link" && <><label>Website link<input name="url" type="url" required placeholder="https://" /></label><label>Preview image link <small>(optional)</small><input name="thumbnailUrl" type="url" placeholder="https://…/image.jpg" /></label></>}<label>{composer === "note" ? "Your note" : "Caption"}<textarea name="note" rows={3} maxLength={5000} /></label><PinFields /><button className="mb-save" disabled={busy}>{busy ? "Saving…" : "Save clipping"}</button></form>}
    </>}
    {(error || status) && <div className="mb-status" aria-live="polite">{error ? <p role="alert">{error} <button onClick={() => { setError(""); void load(); }}>Retry</button></p> : status}</div>}
    <section className="mb-board" aria-label="Found Clippings"><div className="mb-board-toolbar"><span>{allPins.length} {allPins.length === 1 ? "clipping" : "clippings"}</span><div className="mb-select-filters"><label className="mb-visually-label">Category<select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="mb-visually-label">Material<select aria-label="Filter by material" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>{["All material", "Images", "Notes", "Links", "Files"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="mb-visually-label">Sort<select aria-label="Sort clippings" value={sort} onChange={(event) => setSort(event.target.value)}>{["Newest first", "Oldest first", "Color"].map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
      <div className="mb-color-filters" role="group" aria-label="Filter by color"><button aria-pressed={colorFilter === "All colors"} onClick={() => setColorFilter("All colors")}>All colors</button>{colorNames.map((value) => <button key={value} aria-label={`Filter by ${value}`} title={value} aria-pressed={colorFilter === value} onClick={() => setColorFilter(colorFilter === value ? "All colors" : value)}><i style={{ backgroundColor: colorValues[value] }} /><span>{value}</span></button>)}</div>
      {loading ? <p className="mb-empty" role="status">Opening the clippings…</p> : shown.length ? <div className="mb-masonry" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>{columns.map((column, columnIndex) => <div className="mb-column" key={columnIndex}>{column.map((pin) => <article className={`mb-pin mb-pin-${pin.kind}`} key={pin.id}><button className="mb-pin-open" onClick={() => setSelected(pin)} aria-label={`View ${pin.title}`}>
        {pin.thumbnail ? <img src={pin.thumbnail} alt={pin.title} loading="lazy" /> : pin.kind === "video" && pin.src ? <div className="mb-video-preview"><video src={pin.src} muted preload="metadata" /><span>Play video</span></div> : pin.kind === "note" ? <div className="mb-note-text"><p>{pin.note || pin.title}</p></div> : <div className="mb-link-text"><span>{pin.kind === "file" ? "DOCUMENT" : "SAVED LINK"}</span><h3>{pin.title}</h3>{pin.url && <small>{new URL(pin.url, "https://greenburgh.local").hostname.replace(/^www\./, "")}</small>}</div>}
        <div className="mb-pin-caption"><h3>{pin.title}</h3>{pin.note && pin.kind !== "note" && <p>{pin.note}</p>}<div><span>{pin.category}</span>{editing && <span className={`mb-publish-state ${pin.published ? "is-public" : ""}`}>{pin.published ? "Published" : "Draft"}</span>}</div></div>
      </button></article>)}</div>)}</div> : <p className="mb-empty">{pins.length || allPins.length ? "No clippings match this selection." : editing ? "Add your first image, link, or note above." : "More clippings will find their way here."}</p>}
    </section>
    {editing && <section className="mb-starting"><h2>From the sketchbook</h2><div className="mb-reference-row">{startingPoints.map((item) => <article key={item.title}><img src={item.image} alt={item.title} loading="lazy" /><div><span>{item.title}</span><button disabled={busy || pins.some((pin) => pin.url === item.image)} onClick={() => void pinReference(item)}>{pins.some((pin) => pin.url === item.image) ? "Added" : "Publish"}</button></div></article>)}</div></section>}
    <footer className="mb-bottom"><span>Greenburgh Orchards</span><a href={editing ? "/moodboard" : "/moodboard?edit=1"}>{editing ? "View published page" : "Editor access"}</a></footer>
    {dragging && <div className="mb-drop-overlay"><span>Let it land here.</span></div>}
    <dialog ref={dialog} className="mb-edit-dialog" onCancel={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>{selected && <div><button className="mb-edit-close" onClick={() => setSelected(null)} aria-label="Close clipping">×</button>{["image", "reference"].includes(selected.kind) && selected.src && <img src={selected.src} alt={selected.title} />}{selected.kind === "video" && selected.src && <video src={selected.src} controls playsInline />}{["link", "file"].includes(selected.kind) && <a className="mb-original" href={selected.src || selected.url || "#"} target="_blank" rel="noopener noreferrer">{selected.kind === "file" ? "Download original document" : "Open original website"}</a>}
      {editing && !selected.id.startsWith("sketchbook-") ? <form onSubmit={update} key={selected.id}><label>Title<input name="title" defaultValue={selected.title} maxLength={160} required /></label><label>Caption<textarea name="note" defaultValue={selected.note} maxLength={5000} rows={3} /></label><PinFields pin={selected} /><div className="mb-edit-actions"><button className="mb-save" disabled={busy}>{busy ? "Saving…" : "Save details"}</button><button type="button" className="mb-remove" disabled={busy} onClick={() => void remove(selected)}>Remove clipping</button></div>{error && <p role="alert">{error}</p>}</form> : <div className="mb-reader-caption"><h2>{selected.title}</h2>{selected.note && <p>{selected.note}</p>}<small>{selected.category}</small></div>}
    </div>}</dialog>
  </main>;
}
