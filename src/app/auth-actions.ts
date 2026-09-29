"use server";

import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { invitations, owners, profiles } from "@/db/schema";
import { sanitizeText } from "@/lib/security";

const credentials = z.object({ email: z.string().email().max(255), password: z.string().min(8).max(128) }).strict();

export async function signIn(_state: { error: string }, formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Email atau password tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email atau password salah." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/masuk");
}

export async function inviteOwner(formData: FormData) {
  const parsed = z.object({ email: z.string().email().max(255), fullName: z.string().trim().min(2).max(150), businessName: z.string().trim().min(2).max(200) }).strict().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Periksa kembali email, nama, dan nama bisnis." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi tidak valid." };
  const [actor] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (actor?.role !== "superadmin") return { error: "Akses ditolak." };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.insert(invitations).values({ email: parsed.data.email.toLowerCase(), fullName: sanitizeText(parsed.data.fullName), businessName: sanitizeText(parsed.data.businessName), token, invitedBy: user.id, expiresAt });
  const site = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { error } = await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo: `${site}/auth/callback?token=${token}` });
  if (error) {
    await db.delete(invitations).where(eq(invitations.token, token));
    return { error: "Undangan gagal dikirim. Coba kembali setelah konfigurasi email diperiksa." };
  }
  return { error: "", success: "Undangan berhasil dikirim." };
}

export async function acceptInvitation(_state: { error: string }, formData: FormData) {
  const parsed = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), businessName: z.string().trim().min(2).max(200), password: z.string().min(8).max(128) }).strict().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Data aktivasi tidak valid." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Buka tautan aktivasi dari email terlebih dahulu." };
  const [invitation] = await db.select().from(invitations).where(and(eq(invitations.token, parsed.data.token), eq(invitations.status, "pending"), gt(invitations.expiresAt, new Date()))).limit(1);
  if (!invitation || invitation.email.toLowerCase() !== user.email.toLowerCase()) return { error: "Undangan tidak valid, kedaluwarsa, atau email tidak cocok." };

  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (passwordError) return { error: "Password gagal disimpan. Coba kembali." };
  const businessName = sanitizeText(parsed.data.businessName);
  const slugBase = businessName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "bisnis";
  try {
    await db.transaction(async (tx) => {
       await tx.insert(profiles).values({ id: user.id, email: user.email!.toLowerCase(), fullName: sanitizeText(invitation.fullName), role: "owner", status: "active" });
      let created = false;
      for (let suffix = 0; suffix < 100; suffix++) {
        const slug = suffix ? `${slugBase}-${suffix + 1}` : slugBase;
        try {
           await tx.insert(owners).values({ userId: user.id, businessName, slug, status: "active" });
          created = true;
          break;
        } catch (error) {
          if (!(error instanceof Error) || !("code" in error) || error.code !== "23505") throw error;
        }
      }
      if (!created) throw new Error("Tidak dapat membuat slug bisnis unik.");
      const updated = await tx.update(invitations).set({ status: "accepted", acceptedAt: new Date() }).where(and(eq(invitations.id, invitation.id), eq(invitations.status, "pending"))).returning({ id: invitations.id });
      if (!updated.length) throw new Error("Undangan sudah digunakan.");
    });
  } catch {
    return { error: "Aktivasi gagal disimpan. Hubungi Superadmin untuk undangan baru." };
  }
  redirect("/dashboard");
}
