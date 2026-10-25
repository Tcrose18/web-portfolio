"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./photography.css";

type PhotoMode = "black-and-white" | "color";
type Photograph = {
  id: string;
  kind: string;
  title: string;
  note?: string | null;
  src?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  photoMode?: string | null;
  published?: boolean;
};

const modes: { value: PhotoMode; label: string }[] = [
  { value: "black-and-white", label: "Black & white" },
  { value: "color", label: "Color" },
];

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>;
}

export default function Photography() {
  const [mode, setMode] = useState<PhotoMode | null>(null);
  const [photographs, setPhotographs] = useState<Photograph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chooserOpen, setChooserOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const chooser = useRef<HTMLDialogElement>(null);
  const lightbox = useRef<HTMLDialogElement>(null);
  const choiceTrigger = useRef<HTMLButtonElement>(null);
  const lastPhotoTrigger = useRef<HTMLButtonElement | null>(null);

  const visiblePhotos = useMemo(() => photographs.filter((photo) => photo.photoMode === mode), [photographs, mode]);
  const selectedIndex = visiblePhotos.findIndex((photo) => photo.id === selectedId);
  const selected = visiblePhotos[selectedIndex];

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/moodboard", { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { items?: Photograph[]; error?: string };
        if (!response.ok) throw new Error(data.error || "The photographs couldn’t be loaded.");
        setPhotographs((data.items ?? []).filter((photo) => photo.category === "Photography" && ["image", "reference"].includes(photo.kind) && Boolean(photo.src)));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "The photographs couldn’t be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const dialog = chooser.current;
    if (chooserOpen) {
      if (dialog && !dialog.open) dialog.showModal();
    } else dialog?.close();
  }, [chooserOpen]);

  useEffect(() => {
    const dialog = lightbox.current;
    if (selectedId) {
      if (dialog && !dialog.open) dialog.showModal();
    } else dialog?.close();
  }, [selectedId]);

  useEffect(() => {
    if (!chooserOpen && !selectedId) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [chooserOpen, selectedId]);

  const choose = (nextMode: PhotoMode) => {
    setMode(nextMode);
    setSelectedId(null);
    setChooserOpen(false);
    requestAnimationFrame(() => choiceTrigger.current?.focus());
  };
  const closeLightbox = useCallback(() => {
    setSelectedId(null);
    requestAnimationFrame(() => lastPhotoTrigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!selectedId || visiblePhotos.length < 2) return;
    const navigate = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const index = (selectedIndex + direction + visiblePhotos.length) % visiblePhotos.length;
      setSelectedId(visiblePhotos[index].id);
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [selectedId, selectedIndex, visiblePhotos]);

  return <section className="ph-page" aria-labelledby="ph-title">
    <header className="ph-heading">
      <a className="ph-home" href="/">stroll back to home</a>
      <div className="ph-title-row">
        <h1 id="ph-title">Photography</h1>
        <button ref={choiceTrigger} className="ph-view-choice" onClick={() => setChooserOpen(true)} aria-haspopup="dialog">
          {mode ? modes.find((item) => item.value === mode)?.label : "Choose a view"}
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <nav className="ph-filters" aria-label="Photographic collection">
        {modes.map((item) => <button key={item.value} aria-pressed={mode === item.value} onClick={() => choose(item.value)}>
          <span className={`ph-swatch ph-swatch-${item.value}`} aria-hidden="true" />{item.label}
        </button>)}
      </nav>
    </header>

    <div className="ph-gallery-region" aria-live="polite" aria-busy={loading}>
      {loading ? <div className="ph-empty"><p>Gathering the photographs…</p></div> : error ? <div className="ph-empty"><p>{error}</p><button className="ph-retry" onClick={() => setReload((value) => value + 1)}>Try again</button></div> : !mode ? <div className="ph-empty"><p>Choose black & white or color to begin.</p><button className="ph-retry" onClick={() => setChooserOpen(true)}>Choose a view</button></div> : visiblePhotos.length ? <div className="ph-gallery" key={mode}>
        {visiblePhotos.map((photo, index) => <button key={photo.id} className="ph-photo" onClick={(event) => { lastPhotoTrigger.current = event.currentTarget; setSelectedId(photo.id); }} aria-label={`View ${photo.title}`}>
          <img src={photo.thumbnail || photo.src || ""} alt={photo.title} loading="lazy" decoding="async" />
          <span className="ph-photo-caption"><span>{photo.title}</span><span className="ph-photo-number">{String(index + 1).padStart(2, "0")}</span></span>
        </button>)}
      </div> : <div className="ph-empty"><span className={`ph-empty-mark ph-swatch-${mode}`} aria-hidden="true" /><p>Photographs will be gathered here.</p></div>}
    </div>

    <dialog ref={chooser} className="ph-dialog ph-choice-dialog" aria-labelledby="ph-choice-title" onCancel={() => setChooserOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setChooserOpen(false); }}>
      <div className="ph-choice-inner">
        <button className="ph-close" onClick={() => setChooserOpen(false)} aria-label="Close view selection"><CloseIcon /></button>
        <p className="ph-dialog-kicker">Photography</p>
        <h2 id="ph-choice-title">Black & white,<br />or color?</h2>
        <div className="ph-choice-options">
          {modes.map((item) => <button key={item.value} onClick={() => choose(item.value)}>
            <span className={`ph-choice-sample ph-swatch-${item.value}`} aria-hidden="true" />
            <span>{item.label}</span>
          </button>)}
        </div>
      </div>
    </dialog>

    <dialog ref={lightbox} className="ph-dialog ph-lightbox" aria-labelledby="ph-photo-title" onCancel={closeLightbox} onClick={(event) => { if (event.target === event.currentTarget) closeLightbox(); }}>
      {selected && <div className="ph-lightbox-inner">
        <button className="ph-close" onClick={closeLightbox} aria-label="Close photograph"><CloseIcon /></button>
        <img src={selected.src || ""} alt={selected.title} />
        <footer className="ph-lightbox-caption">
          <div><h2 id="ph-photo-title">{selected.title}</h2>{selected.note && <p>{selected.note}</p>}</div>
          {visiblePhotos.length > 1 && <nav aria-label="Browse photographs"><button onClick={() => setSelectedId(visiblePhotos[(selectedIndex - 1 + visiblePhotos.length) % visiblePhotos.length].id)}>Previous</button><span>{selectedIndex + 1} / {visiblePhotos.length}</span><button onClick={() => setSelectedId(visiblePhotos[(selectedIndex + 1) % visiblePhotos.length].id)}>Next</button></nav>}
        </footer>
      </div>}
    </dialog>
  </section>;
}
