"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { products, type Product } from "./products";
import "./shop.css";

type CartItem = { productId: string; size: string };
type Study = { title: string; image: string; note: string };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const studies: Study[] = [
  { title: "Color study I", image: "/designs/color-study-01.jpg", note: "Forest, rust, ochre, and plum. A palette assembled by hand." },
  { title: "Color study II", image: "/designs/color-study-02.jpg", note: "Pale pinks and cool blues. An exercise in balance." },
  { title: "Orchard Botanicals", image: "/designs/botanical-study.jpg", note: "Flowers, branches, and vessels. Studies in black ink." },
  { title: "Grand Hôtel Greenburgh", image: "/designs/grand-hotel.jpg", note: "An imagined address, with a flower shop at its heart." },
  { title: "Summer Ponding Classic", image: "/designs/summer-ponding.jpg", note: "Frogs, tadpoles, snapping turtles. A summer afternoon at the pond." },
  { title: "A study in movement", image: "/designs/athletic-study.jpg", note: "A sequence of gestures, captured in a single line." },
  { title: "An alpine memory", image: "/designs/alpine-painting.jpg", note: "Weathered wood, mountain air, and the colors of an old painting." },
];

function Icon({ name }: { name: "search" | "bag" | "close" }) {
  return <svg width="21" height="23" viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">{name === "search" ? <><circle cx="10" cy="11" r="6.5" /><path d="m15 16 6 6" /></> : name === "bag" ? <><path d="M5 8h14l1 15H4L5 8Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></> : <path d="m5 6 14 14M19 6 5 20" />}</svg>;
}

function Modal({ label, children, onClose, className = "" }: { label: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={ref} className={`go-dialog ${className}`} aria-label={label} onCancel={(e) => { e.preventDefault(); closeRef.current(); }} onClick={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}>
    <div className="go-dialog-inner"><button className="go-close" onClick={onClose} aria-label={`Close ${label}`}><Icon name="close" /></button>{children}</div>
  </dialog>;
}

type StorefrontPage = "home" | "collection" | "studies" | "biography" | "photography" | "letters" | "contact";
export default function Storefront({ page = "home", initialCategory = "All", children }: { page?: StorefrontPage; initialCategory?: string; children?: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState(false);
  const [bag, setBag] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [study, setStudy] = useState<Study | null>(null);
  const filter = initialCategory;
  const searchInput = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [subscription, setSubscription] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("greenburgh-bag") || "[]");
      if (Array.isArray(saved)) setCart(saved.filter((item): item is CartItem => typeof item?.productId === "string" && products.some((p) => p.id === item.productId && !p.preview && p.sizes.includes(item.size))));
    } catch { /* A fresh bag is safe if browser storage is unavailable. */ }
    setCartLoaded(true);
  }, []);
  useEffect(() => {
    if (cartLoaded) try { localStorage.setItem("greenburgh-bag", JSON.stringify(cart)); } catch { /* Shopping still works without storage. */ }
  }, [cart, cartLoaded]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setDesktopMenu(false); setSearch(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => { if (search) searchInput.current?.focus(); }, [search]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("piece");
    const product = products.find((item) => item.id === requested);
    if (product) setSelected(product);
  }, []);

  const openProduct = (product: Product) => { setSearch(false); setSelected(product); setSize(""); setSizeError(false); };
  const addToBag = () => {
    if (!selected || selected.preview) return;
    if (!size) { setSizeError(true); return; }
    setCart((current) => [...current, { productId: selected.id, size }]);
    setSelected(null); setBag(true);
  };
  const subtotal = cart.reduce((sum, item) => sum + (products.find((p) => p.id === item.productId)?.price ?? 0), 0);
  const checkout = () => {
    const params = new URLSearchParams();
    cart.forEach((item) => params.append("item", `${item.productId}.${item.size}`));
    window.location.assign(`/checkout?${params.toString()}`);
  };
  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubscription("loading");
    try {
      const response = await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: new FormData(form).get("email")?.toString().trim() }) });
      if (!response.ok) throw new Error("Please try again");
      setSubscription("success"); form.reset();
    } catch { setSubscription("error"); }
  };
  const visibleProducts = products.filter((p) => filter === "All" || p.category === filter);
  const results = products.filter((p) => `${p.name} ${p.edition}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <main className="go-site" id="top">
    <a className="go-skip" href={page === "home" ? "#collection" : "#page-content"}>Skip to content</a>
    <header className={`go-header ${search ? "go-search-expanded" : ""}`}>
      <nav className="go-desktop-nav" aria-label="Main navigation">
        <div className="go-shop-menu" onMouseEnter={() => setDesktopMenu(true)} onMouseLeave={() => setDesktopMenu(false)}>
          <button onClick={() => setDesktopMenu(!desktopMenu)} aria-expanded={desktopMenu} aria-controls={desktopMenu ? "shop-navigation" : undefined}>Collection</button>
          {desktopMenu && <div className="go-dropdown" id="shop-navigation" onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setDesktopMenu(false); }}>
            <a href="/collection"><i className="go-menu-square go-square-pieces" />All pieces</a><a href="/studies"><i className="go-menu-square go-square-studies" />Design studies</a><a href="/photography"><i className="go-menu-square go-square-photography" />Photography</a>
          </div>}
        </div>
        <a href="/studies">Studies</a><a href="/moodboard">Moodboard</a>
      </nav>
      <button className="go-menu-trigger" aria-label="Open navigation" onClick={() => setMenu(true)}><i /><i /><i /></button>
      <a className="go-brand" href="/" aria-label="Greenburgh Orchards home">GREENBURGH<span>ORCHARDS</span></a>
      <div className="go-header-tools">
        <form className={`go-header-search ${search ? "is-open" : ""}`} role="search" onSubmit={(event) => { event.preventDefault(); if (!search) setSearch(true); }}>
          <input ref={searchInput} id="header-search" type="search" placeholder="Search the collection" aria-label="Search the collection" value={query} onChange={(event) => setQuery(event.target.value)} tabIndex={search ? 0 : -1} />
          {search && <button type="button" className="go-search-close" onClick={() => { setSearch(false); setQuery(""); }} aria-label="Close search">×</button>}
          <button type="button" onClick={() => setSearch(!search)} aria-expanded={search} aria-controls="header-search" aria-label="Search the collection"><Icon name="search" /></button>
        </form>
        <a className="go-biography-icon" href="/biography" aria-label="Biography" title="Biography"><img src="/icons/windmill.svg?v=3" alt="" /></a>
        <button className="go-bag-icon" onClick={() => setBag(true)} aria-label={`Shopping basket, ${cart.length} items`}><img src="/icons/apple-basket.svg?v=2" alt="" /><span>{cart.length}</span></button>
      </div>
      {search && query.trim() && <div className="go-header-results"><p>{results.length} {results.length === 1 ? "piece" : "pieces"}</p>{results.map((product) => <button key={product.id} onClick={() => openProduct(product)}><img src={product.image} alt="" /><span>{product.name}<small>{product.preview ? "Design preview" : money.format(product.price)}</small></span></button>)}{!results.length && <p>No pieces found. Try another word.</p>}</div>}
    </header>

    <div id="page-content" />
    {page === "home" && <><section className="go-hero go-autumn-hero" aria-label="The orchard collection">
      <img src="/designs/autumn-houses-v1.jpg" alt="An autumn painting of quiet cottages and a winding path in warm orange evening light" fetchPriority="high" />
      <div className="go-hero-caption"><h1>Autumn at the orchard</h1><a className="go-white-button" href="/collection">THE ORCHARD COLLECTION</a></div>
      <span className="go-hero-note">GREENBURGH ORCHARDS — A STUDY OF EVERYDAY LIFE</span>
    </section>

    <section className="go-editorial" aria-label="Explore Greenburgh Orchards">
      <a className="go-editorial-tile" href="/collection/t-shirts"><img src="/designs/verger-tee.jpg" alt="Verger Neigeux sheep T-shirt on warm wooden floorboards" loading="lazy" /><span className="go-white-button">THE T-SHIRT EDITION</span></a>
      <a className="go-editorial-tile go-hotel-tile" href="/studies"><img src="/designs/grand-hotel.jpg" alt="Grand Hôtel Greenburgh illustrated storefronts" loading="lazy" /><span className="go-white-button">DESIGN STUDIES</span></a>
      <a className="go-editorial-tile" href="/collection/sweatshirts"><img src="/designs/ochre-sweatshirt.jpg" alt="Ochre embroidered sweatshirt" loading="lazy" /><span className="go-white-button">EMBROIDERY STUDIES</span></a>
    </section></>}

    {page === "collection" && <div className="go-page-heading"><a href="/">stroll back to home</a><h1>The Orchard Collection</h1><p>All pieces, gathered in one place.</p></div>}
    {(page === "home" || page === "collection") && <section className={`go-collection ${page === "collection" ? "go-full-collection" : ""}`} id="collection" aria-labelledby="collection-title">
      <div className="go-section-top"><h2 id="collection-title"><a href="/collection">{page === "home" ? "The Orchard Collection" : "All pieces"}</a></h2>{page === "collection" ? <nav className="go-filters" aria-label="Filter collection">{[{label:"All",category:"All",path:"/collection"},{label:"T-shirts",category:"Tees",path:"/collection/t-shirts"},{label:"Sweatshirts",category:"Sweatshirts",path:"/collection/sweatshirts"}].map((category) => <a key={category.category} aria-current={filter === category.category ? "page" : undefined} href={category.path}>{category.label}</a>)}</nav> : <a className="go-view-all" href="/collection">All pieces</a>}</div>
      <div className="go-products">{visibleProducts.map((product) => <button className="go-product-card" key={product.id} onClick={() => openProduct(product)}>
        <div className={`go-product-image ${product.id === "vineyard-wrestling-tee" ? "go-vineyard-image" : ""}`}><img src={product.image} alt={product.alt} loading="lazy" /><span className="go-quick-view">View piece +</span></div>
        <div className="go-product-label"><h3>{product.name}</h3><span>{product.preview ? "Design preview" : money.format(product.price)}</span></div>
      </button>)}</div>
      <a className="go-collection-foot" href="/contact">message personally for all inquiries</a>
    </section>}

    {page === "home" && <section className="go-story-banner" aria-label="Summer Ponding Classic">
      <div className="go-pond-art"><img src="/designs/summer-ponding.jpg" alt="Summer Ponding Classic illustration of swimming and fishing at a country pond" loading="lazy" /></div>
      <div className="go-story-copy"><p>FROM THE SKETCHBOOK</p><h2>Time well<br />spent outside.</h2><p>Gardens, games, and the familiar places we return to. The small things find their way into what we make.</p><a href="/studies">Explore the studies</a></div>
    </section>}

    {page === "studies" && <div className="go-page-heading"><a href="/">stroll back to home</a><h1>Design Studies</h1><p>Drawings, colors &amp; collected things.</p></div>}
    {(page === "home" || page === "studies") && <section className={`go-studies ${page === "studies" ? "go-full-studies" : ""}`} id="studies" aria-labelledby="studies-title">
      <div className="go-section-top"><h2 id="studies-title"><a href="/studies">Drawings, Colors &amp; Collected Things</a></h2><a href="/studies">The Greenburgh sketchbook</a></div>
      <div className="go-study-grid">{studies.map((item, index) => <button className={`go-study-card go-study-${index}`} key={item.title} onClick={() => setStudy(item)}><div><img src={item.image} alt={item.title} loading="lazy" /></div><span>{item.title}<i>↗</i></span></button>)}</div>
    </section>}

    {page === "biography" && <section className="go-biography-page"><a className="go-home-return" href="/">stroll back to home</a><div className="go-biography-grid"><img src="/designs/grand-hotel.jpg" alt="The imagined Grand Hôtel Greenburgh" /><article><h1>Biography</h1><p>Clothing shaped by the orchard. A collection of familiar things: pasture animals, garden flowers, country games, and afternoons with nowhere else to be.</p><p>Our drawings and color studies are the starting point. Each piece carries a little of that world with it.</p><a href="/studies">Step into the sketchbook</a></article></div></section>}
    {page === "contact" && <section className="go-simple-page"><a className="go-home-return" href="/">stroll back to home</a><h1>Inquiries</h1><p>message personally for all inquiries</p><a className="go-contact-link" href="mailto:hello@greenburghorchards.com">hello@greenburghorchards.com</a></section>}
    {page === "letters" && <section className="go-simple-page"><a className="go-home-return" href="/">stroll back to home</a><h1>Letters from<br />the orchard.</h1><p>New pieces, drawings, and occasional field notes.</p><a className="go-contact-link" href="#newsletter">Join the orchard list below</a></section>}
    {children}

    <footer className="go-footer" id="newsletter">
      <div className="go-footer-links"><div><h2>Greenburgh Orchards</h2><a href="/collection">The collection</a><a href="/studies">The sketchbook</a><a href="/biography">Biography</a><a href="/photography">Photography</a></div><div><h2>Information</h2><a href="/contact">Contact</a><a href="/letters">New editions</a><a href="/moodboard">Moodboard</a><a href="/">stroll back to home</a></div></div>
      <form className="go-newsletter" onSubmit={subscribe}><label htmlFor="orchard-email">Letters from the orchard</label><p>New pieces, drawings, and occasional field notes.</p>{subscription === "success" ? <p className="go-subscription-message" role="status">Thank you. You’re on the orchard list.</p> : <><div><input type="email" id="orchard-email" name="email" placeholder="Email address" required autoComplete="email" /><button type="submit" disabled={subscription === "loading"}>{subscription === "loading" ? "Joining…" : "Subscribe"}</button></div>{subscription === "error" && <p role="alert">We couldn’t add your email. Please try again.</p>}</>}</form>
      <div className="go-footer-bottom"><span>© {new Date().getFullYear()} Greenburgh Orchards</span><span>Clothing shaped by the orchard.</span><span>United States · USD $</span></div>
    </footer>

    {menu && <Modal label="Navigation" onClose={() => setMenu(false)} className="go-nav-dialog"><div className="go-panel-heading">Greenburgh Orchards</div><nav className="go-mobile-nav"><a href="/collection"><i className="go-menu-square go-square-pieces" />All pieces</a><a href="/studies"><i className="go-menu-square go-square-studies" />Design studies</a><a href="/photography"><i className="go-menu-square go-square-photography" />Photography</a><a href="/biography">Biography</a><a href="/moodboard">Moodboard</a><a href="/letters">Letters from the orchard</a></nav></Modal>}

    {selected && <Modal label={selected.name} onClose={() => setSelected(null)} className="go-product-dialog"><div className="go-detail-grid"><img className="go-detail-image" src={selected.image} alt={selected.alt} /><div className="go-detail-copy"><p className="go-detail-kicker">GREENBURGH ORCHARDS</p><h2>{selected.name}</h2><p>{selected.preview ? "Design preview — in development" : money.format(selected.price)}</p><p className="go-detail-description">{selected.description}</p>{selected.preview ? <><p className="go-preview-note">This piece is part of our developing collection. Join the orchard list for release details.</p><a className="go-purchase" href="#newsletter" onClick={() => setSelected(null)}>Keep me posted</a></> : <><fieldset className="go-sizes"><legend>Select a size</legend>{selected.sizes.map((value) => <button type="button" key={value} aria-pressed={size === value} onClick={() => { setSize(value); setSizeError(false); }}>{value}</button>)}</fieldset>{sizeError && <p className="go-error" role="alert">Please select your size.</p>}<button className="go-purchase" onClick={addToBag}>Add to shopping bag</button></>}<details className="go-product-details"><summary>Details &amp; inspiration</summary><ul>{selected.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></details></div></div></Modal>}

    {bag && <Modal label="Shopping basket" onClose={() => setBag(false)} className="go-bag-dialog"><div className="go-panel-heading">Shopping Basket ({cart.length})</div>{cart.length ? <><div className="go-bag-items">{cart.map((item, index) => { const product = products.find((p) => p.id === item.productId)!; return <article className="go-bag-item" key={`${item.productId}-${index}`}><img src={product.image} alt={product.alt} /><div><h3>{product.name}</h3><p>Size {item.size}</p><button onClick={() => setCart((current) => current.filter((_, i) => i !== index))}>Remove</button></div><span>{money.format(product.price)}</span></article>; })}</div><div className="go-bag-total"><p><span>Subtotal</span><span>{money.format(subtotal)}</span></p><small>Order reservation. Payment is arranged separately.</small><button className="go-purchase" onClick={checkout}>Continue to checkout</button></div></> : <div className="go-empty"><p>Your shopping basket is empty.</p><a href="/collection">Explore the collection</a></div>}</Modal>}

    {study && <Modal label={study.title} onClose={() => setStudy(null)} className="go-art-dialog"><img src={study.image} alt={study.title} /><div><h2>{study.title}</h2><p>{study.note}</p></div></Modal>}
  </main>;
}
