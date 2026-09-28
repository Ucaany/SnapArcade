"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markNotificationRead } from "@/app/crud-actions";
import type { notifications } from "@/db/schema";
type Notice = typeof notifications.$inferSelect;

export function NotificationBell({ href, notices }: { href: string; notices: Notice[] }) {
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label="Buka notifikasi" className="relative inline-flex size-10 items-center justify-center rounded-md border hover:bg-muted">
      <Bell aria-hidden="true" className="size-4" />{notices.length > 0 && <span aria-label={`${notices.length} notifikasi belum dibaca`} className="absolute right-1 top-1 size-2 rounded-full bg-primary" />}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72">
      <DropdownMenuLabel>Notifikasi</DropdownMenuLabel><DropdownMenuSeparator />
      {notices.length ? notices.map((notice) => <DropdownMenuItem key={notice.id} className="whitespace-normal" onClick={() => void markNotificationRead(notice.id)}><span><strong>{notice.title}</strong><br />{notice.message}</span></DropdownMenuItem>) : <DropdownMenuItem className="whitespace-normal">Tidak ada notifikasi baru.</DropdownMenuItem>}
      <DropdownMenuSeparator /><DropdownMenuItem render={<Link href={href} />}>Lihat semua notifikasi</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
