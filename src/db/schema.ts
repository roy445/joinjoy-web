import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// ---------- Users ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id", { length: 255 }),
  name: varchar("name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio").default(""),
  gender: varchar("gender", { length: 10 }),
  age: integer("age"),
  interests: jsonb("interests").$type<string[]>().default([]),
  role: varchar("role", { length: 20 }).notNull().default("user"), // user | admin
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | suspended
  suspendReason: text("suspend_reason"),
  canCreateEvent: boolean("can_create_event").notNull().default(false),
  eventCreateCredits: integer("event_create_credits").notNull().default(0),
  hostGuidelinesAgreedAt: timestamp("host_guidelines_agreed_at"),
  canCreateGroup: boolean("can_create_group").notNull().default(false),
  groupCreateCredits: integer("group_create_credits").notNull().default(0),
  groupGuidelinesAgreedAt: timestamp("group_guidelines_agreed_at"),
  creditScore: numeric("credit_score", { precision: 6, scale: 2 }).notNull().default("100"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  noShowCount: integer("no_show_count").notNull().default(0),
  // ---------- Gamification ----------
  jCoins: integer("j_coins").notNull().default(0),
  aiTitles: jsonb("ai_titles").$type<string[]>().default([]),
  activeTitle: varchar("active_title", { length: 100 }),
  activeBadge: varchar("active_badge", { length: 100 }),
  activeAvatarFrame: varchar("active_avatar_frame", { length: 100 }),
  activityStats: jsonb("activity_stats").$type<Record<string, number>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Sessions ----------
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Password reset ----------
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- One-time codes for creating events / groups ----------
export const oneTimeCodes = pgTable("one_time_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("event"), // event | group
  createdBy: integer("created_by").notNull().references(() => users.id),
  usedBy: integer("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
  revoked: boolean("revoked").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Requests to gain create-event permission ----------
export const createEventRequests = pgTable("create_event_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Requests to gain create-group permission ----------
export const createGroupRequests = pgTable("create_group_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Groups (private/public communities that can scope events) ----------
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  coverImageUrl: text("cover_image_url"),
  isPrivate: boolean("is_private").notNull().default(true),
  inviteCode: varchar("invite_code", { length: 20 }).notNull().unique(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"), // owner | member
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("group_members_group_idx").on(table.groupId),
    userIdx: index("group_members_user_idx").on(table.userId),
  })
);

// ---------- Events ----------
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 150 }).notNull(),
    coverImageUrl: text("cover_image_url"),
    images: jsonb("images").$type<string[]>().default([]),
    description: text("description").notNull(),
    region: varchar("region", { length: 50 }),
    eventDate: varchar("event_date", { length: 10 }).notNull(), // YYYY-MM-DD
    startTime: varchar("start_time", { length: 5 }).notNull(), // HH:mm
    endTime: varchar("end_time", { length: 5 }),
    meetingLocation: varchar("meeting_location", { length: 255 }).notNull(),
    mapAddress: text("map_address"),
    lat: numeric("lat", { precision: 10, scale: 6 }),
    lng: numeric("lng", { precision: 10, scale: 6 }),
    capacity: integer("capacity").notNull().default(10),
    fee: numeric("fee", { precision: 10, scale: 2 }).notNull().default("0"),
    contactInfo: varchar("contact_info", { length: 255 }).notNull(),
    notes: text("notes"),
    requireApproval: boolean("require_approval").notNull().default(false),
    allowWaitlist: boolean("allow_waitlist").notNull().default(true),
    ageMin: integer("age_min"),
    ageMax: integer("age_max"),
    genderLimit: varchar("gender_limit", { length: 10 }).notNull().default("any"), // any|male|female
    allowPlusOne: boolean("allow_plus_one").notNull().default(false),
    isPrivate: boolean("is_private").notNull().default(false),
    tags: jsonb("tags").$type<string[]>().default([]),
    aiItinerary: jsonb("ai_itinerary").$type<any>().default(null),
    isAiPlanned: boolean("is_ai_planned").default(false).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("upcoming"), // upcoming|ongoing|completed|cancelled
    cancelReason: text("cancel_reason"),
    hostId: integer("host_id").notNull().references(() => users.id),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
    viewCount: integer("view_count").notNull().default(0),
    reminderSentAt: timestamp("reminder_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dateIdx: index("events_date_idx").on(table.eventDate),
    hostIdx: index("events_host_idx").on(table.hostId),
  })
);

// ---------- Participants ----------
export const eventParticipants = pgTable(
  "event_participants",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("approved"), // pending|approved|rejected|waitlist|cancelled
    plusOneCount: integer("plus_one_count").notNull().default(0),
    attended: boolean("attended"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: index("participants_event_idx").on(table.eventId),
    userIdx: index("participants_user_idx").on(table.userId),
  })
);

// ---------- Favorites ----------
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Comments ----------
export const eventComments = pgTable("event_comments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Chat ----------
export const eventChatMessages = pgTable(
  "event_chat_messages",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull().default("text"), // text|image|announcement|poll|system
    content: text("content"),
    imageUrl: text("image_url"),
    mentions: jsonb("mentions").$type<number[]>().default([]),
    pollId: integer("poll_id"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: index("chat_event_idx").on(table.eventId),
  })
);

export const eventChatReads = pgTable("event_chat_reads", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
});

// ---------- Polls ----------
export const eventPolls = pgTable("event_polls", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  question: varchar("question", { length: 255 }).notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const eventPollVotes = pgTable("event_poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => eventPolls.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Announcements (per event) ----------
export const eventAnnouncements = pgTable("event_announcements", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Notifications ----------
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    content: text("content"),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
  })
);

// ---------- Reports (events / comments / chat) ----------
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // event|comment|chat|user
  targetId: integer("target_id").notNull(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|resolved|rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Blacklist requests raised by 揪主 (hosts) ----------
export const blacklistRequests = pgTable("blacklist_requests", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => users.id),
  targetUserId: integer("target_user_id").notNull().references(() => users.id),
  eventId: integer("event_id").references(() => events.id),
  reason: varchar("reason", { length: 150 }).notNull(),
  description: text("description").notNull(),
  evidenceUrls: jsonb("evidence_urls").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|approved|rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Blacklist entries ----------
export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  sourceRequestId: integer("source_request_id"),
  addedBy: integer("added_by").notNull().references(() => users.id),
  active: boolean("active").notNull().default(true),
  removedReason: text("removed_reason"),
  removedBy: integer("removed_by").references(() => users.id),
  removedAt: timestamp("removed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Shop Items ----------
export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // title | badge | frame | effect
  price: integer("price").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"), // common | rare | epic | legendary
  metadata: jsonb("metadata").$type<any>().default({}), // For special styles/effects
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- User Inventory (Purchased items) ----------
export const userInventory = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => shopItems.id, { onDelete: "cascade" }),
  isEquipped: boolean("is_equipped").notNull().default(false),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
});

// ---------- Ratings / credit reviews ----------
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  raterId: integer("rater_id").notNull().references(() => users.id),
  rateeId: integer("ratee_id").notNull().references(() => users.id),
  punctuality: integer("punctuality").notNull(),
  friendliness: integer("friendliness").notNull(),
  noShow: boolean("no_show").notNull().default(false),
  overall: integer("overall").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Site-wide announcements ----------
export const siteAnnouncements = pgTable("site_announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  content: text("content").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Account appeals (suspended / blacklisted users requesting review) ----------
export const accountAppeals = pgTable("account_appeals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // suspend | blacklist
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | resolved | rejected
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Admin operation logs ----------
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 40 }),
  targetId: integer("target_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});