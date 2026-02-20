/**
 * lib/prisma.ts
 *
 * Inisialisasi dan ekspor Prisma Client.
 *
 * KENAPA TIDAK LANGSUNG `new PrismaClient()` di setiap file?
 * Membuat instance PrismaClient baru di setiap import akan mengakibatkan
 * terlalu banyak koneksi database terbuka, yang bisa menyebabkan error.
 *
 * SOLUSI - Global singleton pattern:
 * Simpan instance Prisma di `globalThis` agar:
 * - Di development dengan hot-reload (bun --watch), instance tidak dibuat ulang
 *   setiap kali ada perubahan kode (mencegah connection leak)
 * - Di production, hanya ada SATU instance Prisma yang dibuat
 *
 * CARA PAKAI di file lain:
 *   import { prisma } from '../lib/prisma'
 *   const user = await prisma.user.findUnique({ where: { id } })
 */

import { PrismaClient } from "@prisma/client";

// Extend globalThis agar TypeScript tidak komplain saat kita tambahkan property 'prisma'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Gunakan instance yang sudah ada di globalThis jika ada (hot-reload safety),
 * atau buat instance baru.
 * Log hanya error dan warning, tidak termasuk query (agar terminal tidak bising).
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"], // Hanya log error dan peringatan, bukan setiap query
  });

/**
 * Di luar production (development/test), simpan instance ke globalThis
 * agar tidak dibuat ulang saat hot-reload.
 * Di production, tidak perlu karena server tidak hot-reload.
 */
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
