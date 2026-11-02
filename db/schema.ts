import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
export const collections = sqliteTable("collections", {
  ownerId: text("owner_id").primaryKey(), initializedAt: text("initialized_at").notNull(),
  seedRevision: integer("seed_revision").notNull().default(1),
});
export const puzzles = sqliteTable("puzzles", {
  id: text("id").notNull(), ownerId: text("owner_id").notNull(),
  title: text("title").notNull(), brand: text("brand").notNull(), author: text("author"),
  piecesLabel: text("pieces_label").notNull(), piecesTotal: integer("pieces_total").notNull(),
  status: text("status").notNull().default("todo"), completionDate: text("completion_date"),
  collectionType: text("collection_type").notNull().default("owned"),
  datePrecision: text("date_precision").notNull().default("month"), purchasedAt: text("purchased_at"),
  imageUrl: text("image_url"), notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.id] }), index("puzzles_owner_idx").on(table.ownerId)]);
