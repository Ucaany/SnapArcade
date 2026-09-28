export function notificationWindows(now: Date) {
  return { offlineBefore: new Date(now.getTime() - 15 * 60000), expiringFrom: new Date(now.getTime() + 6 * 86400000), expiringUntil: new Date(now.getTime() + 7 * 86400000) };
}
