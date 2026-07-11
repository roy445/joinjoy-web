import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["member", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const eventVisibilityEnum = pgEnum("event_visibility", ["public", "private"]);
export const eventStatusEnum = pgEnum("event_status", ["active", "cancelled", "completed"]);
export const participantStatusEnum = pgEnum("participant_status", ["pending", "joined", "waitlisted", "left"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").default("member").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    interests: jsonb("interests").$type<string[]>().default([]).notNull(),
    creditScore: integer("credit_score").default(100).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    statusIndex: index("users_status_idx").on(table.status),
  }),
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    emailNotifications: boolean("email_notifications").default(true).notNull(),
    pushNotifications: boolean("push_notifications").default(false).notNull(),
    eventReminders: boolean("event_reminders").default(true).notNull(),
    messageNotifications: boolean("message_notifications").default(true).notNull(),
    marketingEmails: boolean("marketing_emails").default(false).notNull(),
    publicProfile: boolean("public_profile").default(true).notNull(),
    showCreditScore: boolean("show_credit_score").default(true).notNull(),
    theme: varchar("theme", { length: 10 }).default("light").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex("user_settings_user_unique").on(table.userId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    userIndex: index("sessions_user_id_idx").on(table.userId),
    expiryIndex: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hostId: uuid("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    coverUrl: text("cover_url").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    mapUrl: text("map_url"),
    capacity: integer("capacity").notNull(),
    price: integer("price").default(0).notNull(),
    contact: varchar("contact", { length: 160 }).notNull(),
    notes: text("notes"),
    requiresApproval: boolean("requires_approval").default(false).notNull(),
    allowWaitlist: boolean("allow_waitlist").default(true).notNull(),
    ageLimit: boolean("age_limit").default(false).notNull(),
    genderLimit: varchar("gender_limit", { length: 30 }),
    allowCompanion: boolean("allow_companion").default(false).notNull(),
    visibility: eventVisibilityEnum("visibility").default("public").notNull(),
    status: eventStatusEnum("status").default("active").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    hostIndex: index("events_host_id_idx").on(table.hostId),
    categoryIndex: index("events_category_idx").on(table.category),
    startAtIndex: index("events_start_at_idx").on(table.startAt),
    statusIndex: index("events_status_idx").on(table.status),
  }),
);

export const eventParticipants = pgTable(
  "event_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: participantStatusEnum("status").default("joined").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventUserUnique: uniqueIndex("event_participants_event_user_unique").on(table.eventId, table.userId),
    eventIndex: index("event_participants_event_idx").on(table.eventId),
    userIndex: index("event_participants_user_idx").on(table.userId),
  }),
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventUserUnique: uniqueIndex("favorites_event_user_unique").on(table.eventId, table.userId),
    userIndex: index("favorites_user_idx").on(table.userId),
  }),
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIndex: index("comments_event_idx").on(table.eventId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    isAnnouncement: boolean("is_announcement").default(false).notNull(),
    mentions: jsonb("mentions").$type<string[]>().default([]).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIndex: index("chat_messages_event_idx").on(table.eventId),
    createdIndex: index("chat_messages_created_idx").on(table.createdAt),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIndex: index("notifications_user_idx").on(table.userId),
    readIndex: index("notifications_read_idx").on(table.readAt),
  }),
);

export const oneTimeCodes = pgTable(
  "one_time_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    label: varchar("label", { length: 100 }),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    usedBy: uuid("used_by").references(() => users.id),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("one_time_codes_hash_unique").on(table.codeHash),
    usedIndex: index("one_time_codes_used_idx").on(table.usedAt),
  }),
);

export const createRequests = pgTable(
  "create_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: requestStatusEnum("status").default("pending").notNull(),
    reason: text("reason").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIndex: index("create_requests_user_idx").on(table.userId),
    statusIndex: index("create_requests_status_idx").on(table.status),
  }),
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    revieweeId: uuid("reviewee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    punctuality: integer("punctuality").notNull(),
    friendliness: integer("friendliness").notNull(),
    noShow: boolean("no_show").default(false).notNull(),
    overall: integer("overall").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    reviewUnique: uniqueIndex("reviews_event_reviewer_reviewee_unique").on(table.eventId, table.reviewerId, table.revieweeId),
    eventIndex: index("reviews_event_idx").on(table.eventId),
    revieweeIndex: index("reviews_reviewee_idx").on(table.revieweeId),
  }),
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comments.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 80 }).notNull(),
    details: text("details"),
    status: requestStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIndex: index("reports_status_idx").on(table.status),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actorIndex: index("audit_logs_actor_idx").on(table.actorId),
    createdIndex: index("audit_logs_created_idx").on(table.createdAt),
  }),
);
