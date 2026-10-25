import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  itemsJson: text("items_json").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  status: text("status").notNull().default("awaiting_payment"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const moodboardItems = sqliteTable("moodboard_items", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  url: text("url"),
  objectKey: text("object_key"),
  mimeType: text("mime_type"),
  size: integer("size").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  category: text("category").notNull().default("Inspiration"),
  color: text("color").notNull().default("grey"),
  photoMode: text("photo_mode").notNull().default("color"),
  thumbnailKey: text("thumbnail_key"),
  thumbnailMimeType: text("thumbnail_mime_type"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
