"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function NotificationBell({ href }: { href: string }) {
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label="Buka notifikasi" className="relative inline-flex size-10 items-center justify-center rounded-md border hover:bg-muted">
      <Bell aria-hidden="true" className="size-4" /><span aria-label="1 notifikasi contoh belum dibaca" className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72">
      <DropdownMenuLabel>Notifikasi contoh</DropdownMenuLabel><DropdownMenuSeparator />
      <DropdownMenuItem className="whitespace-normal">Notifikasi dan aktivitas akan muncul di sini.</DropdownMenuItem>
      <DropdownMenuSeparator /><DropdownMenuItem render={<Link href={href} />}>Lihat semua notifikasi</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
