import {
  bigint, boolean, index, integer, jsonb, numeric, pgEnum, pgTable,
  text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["superadmin", "owner", "staff"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "suspended"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired", "revoked"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["pending", "active", "expired", "cancelled"]);
export const kioskStatusEnum = pgEnum("kiosk_status", ["pairing", "online", "offline", "maintenance"]);
export const sessionStatusEnum = pgEnum("session_status", ["pending", "paid", "in_progress", "completed", "failed", "expired"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["midtrans", "xendit", "tripay"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "settlement", "expired", "failed", "refunded"]);
export const voucherTypeEnum = pgEnum("voucher_type", ["percentage", "fixed", "free_session"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "subscription_expiring", "subscription_paid", "kiosk_offline", "transaction_failed",
  "printer_error", "camera_error", "invitation", "general",
]);

export type KioskTheme = {
  bgColor: string; primaryColor: string; secondaryColor: string; accentColor: string;
  textColor: string; logoUrl?: string; frameStyle?: string; welcomeText?: string; fontFamily?: string;
};

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 30 }), avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("staff"),
  status: userStatusEnum("status").notNull().default("pending"),
  ownerId: uuid("owner_id"), lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ roleIdx: index("profiles_role_idx").on(t.role), ownerIdx: index("profiles_owner_idx").on(t.ownerId) }));

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(), email: varchar("email", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 150 }).notNull(), businessName: varchar("business_name", { length: 200 }),
  role: userRoleEnum("role").notNull().default("owner"), token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: uuid("invited_by").notNull(), status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ emailIdx: index("invitations_email_idx").on(t.email), tokenIdx: uniqueIndex("invitations_token_idx").on(t.token) }));

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  businessName: varchar("business_name", { length: 200 }).notNull(), slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logo_url"), address: text("address"), city: varchar("city", { length: 100 }), phone: varchar("phone", { length: 30 }),
  defaultTheme: jsonb("default_theme").$type<KioskTheme>(), status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(), name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull().unique(), description: text("description"),
  machineLimit: integer("machine_limit").notNull().default(1), includedSessions: integer("included_sessions").notNull().default(500),
  monthlyPriceIdr: bigint("monthly_price_idr", { mode: "number" }).notNull(), extraSessionPackSize: integer("extra_session_pack_size").default(500),
  extraSessionPriceIdr: bigint("extra_session_price_idr", { mode: "number" }).default(0),
  features: jsonb("features").$type<string[]>().default([]), isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), planId: uuid("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum("status").notNull().default("pending"), machinesCount: integer("machines_count").notNull().default(1),
  includedSessions: integer("included_sessions").notNull().default(0), addOnSessions: integer("add_on_sessions").notNull().default(0),
  sessionsUsed: integer("sessions_used").notNull().default(0), startedAt: timestamp("started_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }), cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerIdx: index("subscriptions_owner_idx").on(t.ownerId), statusIdx: index("subscriptions_status_idx").on(t.status) }));

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(), invoiceNumber: varchar("invoice_number", { length: 40 }).notNull().unique(),
  ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }), type: varchar("type", { length: 20 }).notNull().default("subscription"),
  amount: bigint("amount", { mode: "number" }).notNull(), status: transactionStatusEnum("status").notNull().default("pending"),
  pakasirOrderId: varchar("pakasir_order_id", { length: 100 }).notNull().unique(), pakasirPaymentUrl: text("pakasir_payment_url"),
  pakasirPaymentMethod: varchar("pakasir_payment_method", { length: 40 }), pakasirRawPayload: jsonb("pakasir_raw_payload"),
  paidAt: timestamp("paid_at", { withTimezone: true }), expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerIdx: index("invoices_owner_idx").on(t.ownerId), statusIdx: index("invoices_status_idx").on(t.status) }));

export const kiosks = pgTable("kiosks", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), name: varchar("name", { length: 150 }).notNull(),
  location: text("location"), pairingCode: varchar("pairing_code", { length: 6 }), pairingCodeExpiresAt: timestamp("pairing_code_expires_at", { withTimezone: true }),
  pairingTokenHash: varchar("pairing_token_hash", { length: 128 }), status: kioskStatusEnum("status").notNull().default("pairing"),
  sessionLimit: integer("session_limit").notNull().default(1000), sessionsToday: integer("sessions_today").notNull().default(0),
  theme: jsonb("theme").$type<KioskTheme>(),
  cameraSettings: jsonb("camera_settings").$type<{ iso: number; shutterSpeed: string; aperture: string; resolution: string; whiteBalance: string; focusMode: "auto" | "manual" }>(),
  printerSettings: jsonb("printer_settings").$type<{ paperSize: "4R" | "2x6" | "5R"; dpi: number; orientation: "portrait" | "landscape"; maxCopy: number; layout: string }>(),
  deviceInfo: jsonb("device_info").$type<{ os: string; model: string; appVersion: string; cameraConnected: boolean; printerConnected: boolean }>(),
  lastPingAt: timestamp("last_ping_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerIdx: index("kiosks_owner_idx").on(t.ownerId), statusIdx: index("kiosks_status_idx").on(t.status), pairingCodeIdx: index("kiosks_pairing_code_idx").on(t.pairingCode) }));

export const staffAssignments = pgTable("staff_assignments", {
  id: uuid("id").primaryKey().defaultRandom(), staffId: uuid("staff_id").notNull().references(() => profiles.id, { onDelete: "cascade" }), kioskId: uuid("kiosk_id").notNull().references(() => kiosks.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ staffIdx: index("staff_assignments_staff_idx").on(t.staffId), kioskIdx: index("staff_assignments_kiosk_idx").on(t.kioskId), staffKioskUnique: uniqueIndex("staff_assignments_staff_kiosk_unique").on(t.staffId, t.kioskId) }));

export const paymentCredentials = pgTable("payment_credentials", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), provider: paymentProviderEnum("provider").notNull(),
  label: varchar("label", { length: 100 }).notNull().default("Default"), encryptedConfig: text("encrypted_config").notNull(),
  isActive: boolean("is_active").notNull().default(true), isSandbox: boolean("is_sandbox").notNull().default(false),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerProviderIdx: index("payment_credentials_owner_provider_idx").on(t.ownerId, t.provider) }));

export const vouchers = pgTable("vouchers", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), code: varchar("code", { length: 50 }).notNull(),
  type: voucherTypeEnum("type").notNull(), value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  maxUses: integer("max_uses").notNull().default(100), usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(), validUntil: timestamp("valid_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerCodeUnique: uniqueIndex("vouchers_owner_code_unique").on(t.ownerId, t.code) }));

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), kioskId: uuid("kiosk_id").notNull().references(() => kiosks.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 64 }).notNull().unique(), customerName: varchar("customer_name", { length: 150 }),
  customerEmail: varchar("customer_email", { length: 255 }), packageId: varchar("package_id", { length: 60 }), packageName: varchar("package_name", { length: 100 }),
  photoCount: integer("photo_count").notNull().default(0), status: sessionStatusEnum("status").notNull().default("pending"), voucherId: uuid("voucher_id").references(() => vouchers.id, { onDelete: "set null" }),
  amountPaid: bigint("amount_paid", { mode: "number" }).notNull().default(0), startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }), expiresAt: timestamp("expires_at", { withTimezone: true }),
  downloadCount: integer("download_count").notNull().default(0),
}, (t) => ({ ownerIdx: index("sessions_owner_idx").on(t.ownerId), kioskIdx: index("sessions_kiosk_idx").on(t.kioskId), statusIdx: index("sessions_status_idx").on(t.status), startedAtIdx: index("sessions_kiosk_started_idx").on(t.kioskId, t.startedAt) }));

export const sessionPhotos = pgTable("session_photos", {
  id: uuid("id").primaryKey().defaultRandom(), sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }), storagePath: text("storage_path").notNull(),
  orderIndex: integer("order_index").notNull().default(0), filterApplied: jsonb("filter_applied").$type<Record<string, number>>(),
  frameId: varchar("frame_id", { length: 60 }), isFinalStrip: boolean("is_final_strip").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ sessionIdx: index("session_photos_session_idx").on(t.sessionId) }));

export const voucherRedemptions = pgTable("voucher_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(), voucherId: uuid("voucher_id").notNull().references(() => vouchers.id, { onDelete: "cascade" }), sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  discountAmount: bigint("discount_amount", { mode: "number" }).notNull().default(0), redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ voucherIdx: index("voucher_redemptions_voucher_idx").on(t.voucherId), sessionIdx: index("voucher_redemptions_session_idx").on(t.sessionId) }));

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(), sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }), kioskId: uuid("kiosk_id").notNull().references(() => kiosks.id, { onDelete: "cascade" }), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  credentialId: uuid("credential_id").references(() => paymentCredentials.id, { onDelete: "set null" }), provider: paymentProviderEnum("provider").notNull(), method: varchar("method", { length: 40 }).notNull().default("qris"),
  gatewayTransactionId: varchar("gateway_transaction_id", { length: 150 }), gatewayReference: varchar("gateway_reference", { length: 150 }),
  paymentUrl: text("payment_url"), qrString: text("qr_string"), amount: bigint("amount", { mode: "number" }).notNull(),
  fee: bigint("fee", { mode: "number" }).default(0), netAmount: bigint("net_amount", { mode: "number" }).default(0), discountAmount: bigint("discount_amount", { mode: "number" }).default(0),
  status: transactionStatusEnum("status").notNull().default("pending"), signatureKey: varchar("signature_key", { length: 255 }), webhookPayload: jsonb("webhook_payload"),
  expiresAt: timestamp("expires_at", { withTimezone: true }), settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerIdx: index("transactions_owner_idx").on(t.ownerId), ownerCreatedIdx: index("transactions_owner_created_idx").on(t.ownerId, t.createdAt), sessionIdx: index("transactions_session_idx").on(t.sessionId), kioskIdx: index("transactions_kiosk_idx").on(t.kioskId), statusIdx: index("transactions_status_idx").on(t.status), gatewayIdx: index("transactions_gateway_id_idx").on(t.gatewayTransactionId), gatewayRefIdx: index("transactions_gateway_reference_idx").on(t.gatewayReference) }));

export const kioskPackages = pgTable("kiosk_packages", {
  id: uuid("id").primaryKey().defaultRandom(), ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }), name: varchar("name", { length: 100 }).notNull(),
  description: text("description"), photoCount: integer("photo_count").notNull().default(4), copyCount: integer("copy_count").notNull().default(1),
  priceIdr: bigint("price_idr", { mode: "number" }).notNull(), isActive: boolean("is_active").notNull().default(true), orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ ownerIdx: index("kiosk_packages_owner_idx").on(t.ownerId) }));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }), ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "cascade" }), kioskId: uuid("kiosk_id").references(() => kiosks.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("general"), title: varchar("title", { length: 200 }).notNull(), message: text("message").notNull(),
  link: varchar("link", { length: 255 }), isRead: boolean("is_read").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), eventKey: varchar("event_key", { length: 255 }),
}, (t) => ({ userIdx: index("notifications_user_idx").on(t.userId, t.isRead), eventKeyUserUnique: uniqueIndex("notifications_event_key_user_unique").on(t.userId, t.eventKey) }));

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }), ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "set null" }), kioskId: uuid("kiosk_id").references(() => kiosks.id, { onDelete: "set null" }),
  action: varchar("action", { length: 80 }).notNull(), meta: jsonb("meta"), ipAddress: varchar("ip_address", { length: 45 }), userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ createdAtIdx: index("activity_logs_created_idx").on(t.createdAt), actionIdx: index("activity_logs_action_idx").on(t.action) }));
