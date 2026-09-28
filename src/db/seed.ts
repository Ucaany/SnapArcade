import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  kioskPackages, kiosks, owners, profiles, sessions, subscriptionPlans, subscriptions, vouchers,
} from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes("replace-me") || databaseUrl.includes("your-project")) {
  throw new Error("Set DATABASE_URL to a Supabase PostgreSQL connection before seeding.");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(sql);

const ownerData = [
  { email: "studio@senyumabadi.id", fullName: "Ayu Lestari", businessName: "Studio Senyum Abadi", slug: "studio-senyum-abadi", city: "Jakarta" },
  { email: "halo@klikklikbdg.id", fullName: "Rian Pratama", businessName: "Klik Klik Photobooth Bandung", slug: "klik-klik-bandung", city: "Bandung" },
  { email: "studio@pixelpop-smg.id", fullName: "Nadia Putri", businessName: "Pixel Pop Photobooth Semarang", slug: "pixel-pop-semarang", city: "Semarang" },
] as const;

const kioskData = [
  { owner: 0, name: "Kiosk Mall Grand Indonesia - Lantai 2", location: "Grand Indonesia, Jakarta", status: "online" as const },
  { owner: 0, name: "Kiosk Wedding Andini & Bagas", location: "The Ritz-Carlton Jakarta", status: "offline" as const },
  { owner: 1, name: "Kiosk CFD Sudirman Minggu Pagi", location: "Jalan Jenderal Sudirman, Bandung", status: "online" as const },
  { owner: 1, name: "Kiosk Braga City Walk", location: "Braga, Bandung", status: "maintenance" as const },
  { owner: 2, name: "Kiosk Java Mall Semarang", location: "Java Mall, Semarang", status: "online" as const },
  { owner: 2, name: "Kiosk Wedding Fajar & Nadia", location: "Hotel Tentrem, Semarang", status: "pairing" as const },
] as const;

const voucherData = [
  { owner: 0, code: "UNDANGANDEWI20", type: "percentage" as const, value: "20" },
  { owner: 0, code: "GRATISFIRSTSESI", type: "free_session" as const, value: "1" },
  { owner: 0, code: "DISKONJUMAT", type: "fixed" as const, value: "5000" },
  { owner: 1, code: "BANDUNGHEMAT20", type: "percentage" as const, value: "20" },
  { owner: 1, code: "BRAGAGRATIS", type: "free_session" as const, value: "1" },
  { owner: 1, code: "KLIK5000", type: "fixed" as const, value: "5000" },
  { owner: 2, code: "PIXELPOP20", type: "percentage" as const, value: "20" },
  { owner: 2, code: "SEMARANGGRATIS", type: "free_session" as const, value: "1" },
] as const;

const customerNames = ["Rian Pratama", "Ayu Lestari", "Fajar & Nadia Wedding", "Dimas Saputra", "Sari Maharani"];
const frameNames = ["Pastel Party", "Retro 90s", "Wedding Elegance", "Urban Neon", "Classic Black"];

try {
  await db.transaction(async (tx) => {
    const authRows = await sql<{ id: string; email: string }[]>`
      select id, email from auth.users
      where email in ${sql(ownerData.map((owner) => owner.email))}
    `;
    const authByEmail = new Map(authRows.map((row) => [row.email, row.id]));
    const missing = ownerData.filter((owner) => !authByEmail.has(owner.email)).map((owner) => owner.email);
    if (missing.length) {
      throw new Error(`Create these Supabase Auth users first, then rerun seed: ${missing.join(", ")}`);
    }

    const ownerIds: string[] = [];
    const userIds: string[] = [];
    for (const owner of ownerData) {
      const userId = authByEmail.get(owner.email)!;
      userIds.push(userId);
      await tx.insert(profiles).values({ id: userId, email: owner.email, fullName: owner.fullName, role: "owner", status: "active" })
        .onConflictDoUpdate({ target: profiles.id, set: { email: owner.email, fullName: owner.fullName, role: "owner", status: "active" } });
      const [record] = await tx.insert(owners).values({ userId, businessName: owner.businessName, slug: owner.slug, city: owner.city, status: "active" })
        .onConflictDoUpdate({ target: owners.userId, set: { businessName: owner.businessName, slug: owner.slug, city: owner.city, status: "active" } })
        .returning({ id: owners.id });
      ownerIds.push(record.id);
    }

    const planRows = await tx.insert(subscriptionPlans).values([
      { name: "Starter (2 Mesin)", slug: "starter", description: "Paket awal untuk usaha photobooth", machineLimit: 2, includedSessions: 500, monthlyPriceIdr: 500000, extraSessionPackSize: 500, extraSessionPriceIdr: 50000, features: ["2 mesin", "500 sesi per bulan"] },
      { name: "Growth (5 Mesin)", slug: "growth", description: "Untuk usaha photobooth berkembang", machineLimit: 5, includedSessions: 1500, monthlyPriceIdr: 1200000, extraSessionPackSize: 500, extraSessionPriceIdr: 50000, features: ["5 mesin", "1.500 sesi per bulan"] },
      { name: "Enterprise (Custom)", slug: "enterprise", description: "Paket sesuai kebutuhan bisnis", machineLimit: 50, includedSessions: 10000, monthlyPriceIdr: 0, extraSessionPackSize: 500, extraSessionPriceIdr: 0, features: ["Limit kustom", "Dukungan prioritas"] },
    ]).onConflictDoUpdate({ target: subscriptionPlans.slug, set: { name: subscriptionPlans.name, description: subscriptionPlans.description, machineLimit: subscriptionPlans.machineLimit, includedSessions: subscriptionPlans.includedSessions, monthlyPriceIdr: subscriptionPlans.monthlyPriceIdr, extraSessionPriceIdr: subscriptionPlans.extraSessionPriceIdr, features: subscriptionPlans.features } }).returning({ id: subscriptionPlans.id, slug: subscriptionPlans.slug });
    const planBySlug = new Map(planRows.map((plan) => [plan.slug, plan.id]));

    const kioskIds: string[] = [];
    for (const kiosk of kioskData) {
      const [existing] = await tx.select({ id: kiosks.id }).from(kiosks).where(eq(kiosks.name, kiosk.name));
      const [record] = existing
        ? await tx.update(kiosks).set({ location: kiosk.location, status: kiosk.status }).where(eq(kiosks.id, existing.id)).returning({ id: kiosks.id })
        : await tx.insert(kiosks).values({ ownerId: ownerIds[kiosk.owner], name: kiosk.name, location: kiosk.location, status: kiosk.status }).returning({ id: kiosks.id });
      kioskIds.push(record.id);
    }

    const starterPlanId = planBySlug.get("starter")!;
    for (let i = 0; i < ownerIds.length; i++) {
      const [existing] = await tx.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.ownerId, ownerIds[i]));
      if (!existing) await tx.insert(subscriptions).values({ ownerId: ownerIds[i], planId: starterPlanId, status: "active", machinesCount: i === 0 ? 2 : 1, includedSessions: 500, startedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) });
    }

    for (const voucher of voucherData) {
      await tx.insert(vouchers).values({ ownerId: ownerIds[voucher.owner], code: voucher.code, type: voucher.type, value: voucher.value, maxUses: 100, isActive: true })
        .onConflictDoUpdate({ target: [vouchers.ownerId, vouchers.code], set: { type: voucher.type, value: voucher.value, maxUses: 100, isActive: true } });
    }

    const photoPackages = [
      { owner: 0, name: "Paket A - 2 Strip, 6 Foto", description: "Enam foto, dua strip cetak", photoCount: 6, copyCount: 2, priceIdr: 25000 },
      { owner: 1, name: "Paket B - 1 Strip, 4 Foto", description: "Empat foto, satu strip cetak", photoCount: 4, copyCount: 1, priceIdr: 20000 },
      { owner: 2, name: "Paket C - 2 Strip, 8 Foto", description: "Delapan foto, dua strip cetak", photoCount: 8, copyCount: 2, priceIdr: 35000 },
    ];
    for (const pack of photoPackages) {
      const [existing] = await tx.select({ id: kioskPackages.id }).from(kioskPackages).where(eq(kioskPackages.name, pack.name));
      if (!existing) await tx.insert(kioskPackages).values({ ownerId: ownerIds[pack.owner], ...pack });
    }

    const allVouchers = await tx.select({ id: vouchers.id, ownerId: vouchers.ownerId, code: vouchers.code }).from(vouchers);
    const voucherIds = new Map(allVouchers.map((voucher) => [`${voucher.ownerId}:${voucher.code}`, voucher.id]));
    const fixedSessions = ["Rian Pratama", "Ayu Lestari", "Fajar & Nadia Wedding"];
    for (let i = 0; i < 20; i++) {
      const ownerIndex = i % ownerIds.length;
      const kioskIndex = kioskData.findIndex((kiosk, index) => kiosk.owner === ownerIndex && index >= Math.floor(i / 7) * 2);
      const kioskId = kioskIds[kioskIndex < 0 ? ownerIndex * 2 : kioskIndex];
      const sessionToken = `seed-session-${String(i + 1).padStart(3, "0")}-${ownerIds[ownerIndex].slice(0, 8)}`;
      const [existing] = await tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.sessionToken, sessionToken));
      if (existing) continue;
      const currentVoucher = voucherData.find((voucher) => voucher.owner === ownerIndex);
      const voucherId = currentVoucher ? voucherIds.get(`${ownerIds[ownerIndex]}:${currentVoucher.code}`) : undefined;
      await tx.insert(sessions).values({
        ownerId: ownerIds[ownerIndex], kioskId, sessionToken,
        customerName: customerNames[i % customerNames.length],
        packageId: "paket-a", packageName: "Paket A - 2 Strip, 6 Foto", photoCount: 6,
        status: i % 5 === 0 ? "in_progress" : "completed", voucherId,
        amountPaid: i % 5 === 0 ? 0 : 25000, startedAt: new Date(Date.now() - i * 3600000),
        completedAt: i % 5 === 0 ? null : new Date(Date.now() - i * 3600000 + 15 * 60000),
      });
    }
    for (let ownerIndex = 0; ownerIndex < ownerData.length; ownerIndex++) {
      await tx.update(profiles).set({ ownerId: ownerIds[ownerIndex] }).where(eq(profiles.id, userIds[ownerIndex]));
    }
    console.info("Seed selesai: 3 owner, 6 kiosk, 8 voucher, 20 sesi, 3 paket langganan.");
  });
} finally {
  await sql.end();
}
