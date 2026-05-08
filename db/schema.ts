import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
  jsonb,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────
export const platformEnum = pgEnum("platform", [
  "github",
  "leetcode",
  "codeforces",
  "codechef",
]);

export const friendStatusEnum = pgEnum("friend_status", [
  "pending",
  "accepted",
  "blocked",
]);

export const predictionTypeEnum = pgEnum("prediction_type", [
  "peak_hours",
  "anomaly",
  "forecast",
]);

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  // 1 = public, 0 = private
  isPublic: integer("is_public").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Platform Profiles ─────────────────────────────────────────────────────────
export const platformProfiles = pgTable(
  "platform_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: platformEnum("platform").notNull(),
    handle: text("handle").notNull(),
    // AES-256-GCM encrypted — format: "iv:authTag:ciphertext" (all hex)
    accessToken: text("access_token"),
    displayName: text("display_name"),
    profileUrl: text("profile_url"),
    avatarUrl: text("avatar_url"),
    rating: integer("rating"),
    rank: text("rank"),
    problemsSolved: integer("problems_solved"),
    // Platform-specific metadata e.g. { difficultyStats: {...}, recentSubmissions: [...] }
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    lastSynced: timestamp("last_synced", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // One handle per platform per user
    userPlatformIdx: uniqueIndex("user_platform_idx").on(
      table.userId,
      table.platform
    ),
    userIdIdx: index("platform_profiles_user_id_idx").on(table.userId),
  })
);

// ── Contribution Snapshots ────────────────────────────────────────────────────
export const contributionSnapshots = pgTable(
  "contribution_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .references(() => platformProfiles.id, { onDelete: "cascade" })
      .notNull(),
    date: date("date").notNull(),
    count: integer("count").default(0).notNull(),
    // Platform-specific metadata e.g. { type: "commit", repo: "..." }
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // One snapshot per profile per day (upsert target)
    profileDateIdx: uniqueIndex("profile_date_idx").on(
      table.profileId,
      table.date
    ),
    profileIdIdx: index("snapshots_profile_id_idx").on(table.profileId),
    dateIdx: index("snapshots_date_idx").on(table.date),
  })
);

// ── Friend Connections ────────────────────────────────────────────────────────
export const friendConnections = pgTable(
  "friend_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    addresseeId: uuid("addressee_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    status: friendStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // No duplicate friend requests
    requesterAddresseeIdx: uniqueIndex("requester_addressee_idx").on(
      table.requesterId,
      table.addresseeId
    ),
  })
);

// ── ML Predictions ────────────────────────────────────────────────────────────
export const mlPredictions = pgTable(
  "ml_predictions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    predictionType: predictionTypeEnum("prediction_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPredictionIdx: index("ml_user_prediction_idx").on(
      table.userId,
      table.predictionType
    ),
  })
);

// ── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  platformProfiles: many(platformProfiles),
  mlPredictions: many(mlPredictions),
  sentFriendRequests: many(friendConnections, { relationName: "requester" }),
  receivedFriendRequests: many(friendConnections, { relationName: "addressee" }),
}));

export const platformProfilesRelations = relations(
  platformProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [platformProfiles.userId],
      references: [users.id],
    }),
    snapshots: many(contributionSnapshots),
  })
);

export const contributionSnapshotsRelations = relations(
  contributionSnapshots,
  ({ one }) => ({
    profile: one(platformProfiles, {
      fields: [contributionSnapshots.profileId],
      references: [platformProfiles.id],
    }),
  })
);

export const friendConnectionsRelations = relations(
  friendConnections,
  ({ one }) => ({
    requester: one(users, {
      fields: [friendConnections.requesterId],
      references: [users.id],
      relationName: "requester",
    }),
    addressee: one(users, {
      fields: [friendConnections.addresseeId],
      references: [users.id],
      relationName: "addressee",
    }),
  })
);

export const mlPredictionsRelations = relations(mlPredictions, ({ one }) => ({
  user: one(users, {
    fields: [mlPredictions.userId],
    references: [users.id],
  }),
}));
