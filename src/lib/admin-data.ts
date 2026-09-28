export const adminOwners = [
  { id: "studio-senyum", name: "Studio Senyum Abadi", contact: "Rani Maharani", email: "rani@studiosenyum.id", city: "Bandung", plan: "Growth", status: "active", machines: 4, revenue: 12400000 },
  { id: "klik-klik", name: "Klik Klik Photobooth", contact: "Aditya Pratama", email: "adit@klikklik.id", city: "Jakarta", plan: "Starter", status: "active", machines: 2, revenue: 6800000 },
  { id: "pixel-pop", name: "Pixel Pop Photobooth", contact: "Nadia Putri", email: "halo@pixelpop.id", city: "Semarang", plan: "Growth", status: "active", machines: 5, revenue: 15800000 },
  { id: "kotak-kenangan", name: "Kotak Kenangan", contact: "Bima Santoso", email: "bima@kotakkenangan.id", city: "Surabaya", plan: "Starter", status: "suspended", machines: 1, revenue: 2100000 },
  { id: "ruang-ria", name: "Ruang Ria Studio", contact: "Sinta Dewi", email: "sinta@ruangria.id", city: "Yogyakarta", plan: "Enterprise", status: "active", machines: 8, revenue: 27600000 },
];

export const adminInvitations = [
  { email: "hello@bingkaibahagia.id", business: "Bingkai Bahagia", role: "Owner", status: "pending", sent: "28 Sep 2026", expires: "5 Okt 2026" },
  { email: "operator@fotofest.id", business: "FotoFest Surakarta", role: "Owner", status: "pending", sent: "26 Sep 2026", expires: "3 Okt 2026" },
  { email: "dimas@studiosenyum.id", business: "Studio Senyum Abadi", role: "Staff", status: "accepted", sent: "22 Sep 2026", expires: "29 Sep 2026" },
  { email: "owner@kotakkenangan.id", business: "Kotak Kenangan", role: "Owner", status: "expired", sent: "10 Sep 2026", expires: "17 Sep 2026" },
];

export const adminPlans = [
  { name: "Starter", machines: 2, sessions: 500, price: 500000, addon: 50000, status: "Aktif" },
  { name: "Growth", machines: 5, sessions: 1500, price: 1200000, addon: 100000, status: "Aktif" },
  { name: "Enterprise", machines: 20, sessions: 10000, price: 4500000, addon: 250000, status: "Aktif" },
];

export const adminSubscriptions = [
  { owner: "Studio Senyum Abadi", plan: "Growth", invoice: "SRC-INV-202609-0021", amount: 1200000, status: "active", expires: "18 Okt 2026" },
  { owner: "Klik Klik Photobooth", plan: "Starter", invoice: "SRC-INV-202609-0019", amount: 500000, status: "active", expires: "12 Okt 2026" },
  { owner: "Pixel Pop Photobooth", plan: "Growth", invoice: "SRC-INV-202609-0017", amount: 1200000, status: "active", expires: "8 Okt 2026" },
  { owner: "Kotak Kenangan", plan: "Starter", invoice: "SRC-INV-202608-0088", amount: 500000, status: "expired", expires: "14 Sep 2026" },
  { owner: "Ruang Ria Studio", plan: "Enterprise", invoice: "SRC-INV-202609-0012", amount: 4500000, status: "pending", expires: "30 Sep 2026" },
];

export const adminTransactions = [
  { invoice: "SRC-INV-202609-0021", owner: "Studio Senyum Abadi", type: "Langganan Growth", amount: 1200000, method: "QRIS Pakasir", status: "settlement", date: "18 Sep 2026, 09:42" },
  { invoice: "SRC-INV-202609-0019", owner: "Klik Klik Photobooth", type: "Langganan Starter", amount: 500000, method: "Virtual Account", status: "settlement", date: "12 Sep 2026, 14:18" },
  { invoice: "KSK-PIX-84012", owner: "Pixel Pop Photobooth", type: "Agregat transaksi kiosk", amount: 375000, method: "Midtrans QRIS", status: "settlement", date: "28 Sep 2026, 11:06" },
  { invoice: "SRC-INV-202609-0012", owner: "Ruang Ria Studio", type: "Langganan Enterprise", amount: 4500000, method: "QRIS Pakasir", status: "pending", date: "27 Sep 2026, 16:51" },
  { invoice: "KSK-KOT-39103", owner: "Kotak Kenangan", type: "Agregat transaksi kiosk", amount: 0, method: "Xendit QRIS", status: "failed", date: "25 Sep 2026, 20:12" },
];

export const adminKiosks = [
  { name: "Kiosk Mall Grand Indonesia - Lantai 2", owner: "Klik Klik Photobooth", city: "Jakarta", status: "online", sessions: 38, ping: "Baru saja" },
  { name: "Kiosk Wedding Andini & Bagas", owner: "Studio Senyum Abadi", city: "Bandung", status: "online", sessions: 24, ping: "1 menit lalu" },
  { name: "Kiosk CFD Sudirman Minggu Pagi", owner: "Pixel Pop Photobooth", city: "Semarang", status: "offline", sessions: 0, ping: "42 menit lalu" },
  { name: "Kiosk Atrium Pakuwon", owner: "Ruang Ria Studio", city: "Surabaya", status: "maintenance", sessions: 12, ping: "Diperbarui 10:16" },
  { name: "Kiosk Studio Dago", owner: "Studio Senyum Abadi", city: "Bandung", status: "online", sessions: 19, ping: "3 menit lalu" },
];

export const adminUsers = [
  { name: "Rani Maharani", email: "rani@studiosenyum.id", role: "Owner", business: "Studio Senyum Abadi", status: "active", login: "28 Sep 2026, 08:42" },
  { name: "Aditya Pratama", email: "adit@klikklik.id", role: "Owner", business: "Klik Klik Photobooth", status: "active", login: "28 Sep 2026, 09:14" },
  { name: "Dimas Saputra", email: "dimas@studiosenyum.id", role: "Staff", business: "Studio Senyum Abadi", status: "active", login: "27 Sep 2026, 18:02" },
  { name: "Nadia Putri", email: "halo@pixelpop.id", role: "Owner", business: "Pixel Pop Photobooth", status: "active", login: "28 Sep 2026, 10:31" },
  { name: "admin@snaparcade.id", email: "admin@snaparcade.id", role: "Superadmin", business: "SnapArcade", status: "active", login: "28 Sep 2026, 07:30" },
];

export const adminLogs = [
  { actor: "admin@snaparcade.id", action: "invitation.created", target: "Bingkai Bahagia", ip: "36.78.142.11", date: "28 Sep 2026, 10:42" },
  { actor: "Rani Maharani", action: "subscription.renewed", target: "SRC-INV-202609-0021", ip: "103.12.88.4", date: "28 Sep 2026, 09:18" },
  { actor: "admin@snaparcade.id", action: "owner.status_updated", target: "Kotak Kenangan", ip: "36.78.142.11", date: "27 Sep 2026, 16:07" },
  { actor: "Dimas Saputra", action: "kiosk.test_print", target: "Kiosk Studio Dago", ip: "114.10.22.19", date: "27 Sep 2026, 13:31" },
  { actor: "admin@snaparcade.id", action: "plan.updated", target: "Growth", ip: "36.78.142.11", date: "26 Sep 2026, 11:05" },
];

export const adminNotifications = [
  { title: "Kiosk CFD Sudirman tidak terhubung", detail: "Pixel Pop Photobooth · heartbeat terakhir 42 menit lalu", time: "10 menit lalu", unread: true },
  { title: "Invoice langganan menunggu pembayaran", detail: "Ruang Ria Studio · SRC-INV-202609-0012", time: "1 jam lalu", unread: true },
  { title: "Undangan Owner kedaluwarsa", detail: "owner@kotakkenangan.id · Kotak Kenangan", time: "Kemarin", unread: false },
];

export const formatRupiah = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
