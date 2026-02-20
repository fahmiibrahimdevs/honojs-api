/**
 * utils/logger.ts
 *
 * Custom logger berwarna untuk debugging di terminal.
 *
 * Mengapa tidak pakai console.log biasa?
 * Logger ini menambahkan:
 *   - Timestamp ISO di setiap log
 *   - Level (INFO/WARN/ERROR/DEBUG) dengan warna berbeda
 *   - Context/data tambahan dalam format JSON yang rapi
 *   - Log DEBUG otomatis disembunyikan di environment production
 *
 * CARA PAKAI:
 *   logger.info('Server started')              → [2026-...] [INFO] Server started
 *   logger.warn('Token expired', { userId })   → [2026-...] [WARN] Token expired {...}
 *   logger.error('DB Error', err)              → [2026-...] [ERROR] DB Error {...}
 *   logger.debug('Payload', payload)           → hanya muncul saat development
 *   logger.request('GET', '/api', 200, 12)     → [2026-...] [HTTP] GET /api 200 12ms
 */

/** Tipe level log yang tersedia */
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

/**
 * Kode warna ANSI untuk terminal.
 * \x1b[Xm = escape code warna, \x1b[0m = reset ke warna normal.
 */
const colors = {
  INFO: "\x1b[36m", // cyan   → untuk info umum
  WARN: "\x1b[33m", // yellow → untuk peringatan
  ERROR: "\x1b[31m", // red    → untuk error
  DEBUG: "\x1b[35m", // magenta → untuk debugging
  RESET: "\x1b[0m", // reset semua warna
  DIM: "\x1b[2m", // teks redup (dipakai untuk timestamp)
  BOLD: "\x1b[1m", // teks tebal (dipakai untuk level & method)
};

/** Menghasilkan timestamp format ISO 8601, contoh: 2026-02-20T02:30:00.000Z */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Fungsi internal inti yang melakukan pencetakan log ke console.
 * Dipanggil oleh semua method public di object logger.
 */
function log(level: LogLevel, message: string, context?: unknown) {
  const timestamp = formatTimestamp(); // Waktu saat log dicetak
  const color = colors[level]; // Warna sesuai level
  // Buat prefix: [timestamp] [LEVEL]
  const prefix = `${colors.DIM}[${timestamp}]${colors.RESET} ${color}${colors.BOLD}[${level}]${colors.RESET}`;

  if (context !== undefined) {
    // Jika ada context, cetak sebagai JSON yang rapi (indent 2 spasi)
    console.log(`${prefix} ${message}`, typeof context === "object" ? JSON.stringify(context, null, 2) : context);
  } else {
    // Tanpa context, cetak pesan saja
    console.log(`${prefix} ${message}`);
  }
}

/** Object logger yang diekspor dan dipakai di seluruh aplikasi */
export const logger = {
  /** Log informasi umum, contoh: server start, operasi berhasil */
  info: (message: string, context?: unknown) => log("INFO", message, context),

  /** Log peringatan, contoh: token expired, validasi gagal (bukan error fatal) */
  warn: (message: string, context?: unknown) => log("WARN", message, context),

  /** Log error serius yang perlu diinvestigasi, contoh: database error */
  error: (message: string, context?: unknown) => log("ERROR", message, context),

  /**
   * Log khusus debugging, hanya tampil di environment development.
   * Di production (NODE_ENV=production) log ini diabaikan/disembunyikan.
   */
  debug: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      // Cek environment
      log("DEBUG", message, context);
    }
  },

  /**
   * Log khusus untuk setiap HTTP request yang masuk.
   * Dipakai di middleware di index.ts untuk mencatat semua request.
   * Warna status code: hijau (2xx), kuning (4xx), merah (5xx).
   */
  request: (method: string, path: string, statusCode: number, durationMs: number) => {
    // Pilih warna berdasarkan status code HTTP
    const statusColor =
      statusCode >= 500
        ? colors.ERROR // Merah untuk 5xx (server error)
        : statusCode >= 400
          ? colors.WARN // Kuning untuk 4xx (client error)
          : "\x1b[32m"; // Hijau untuk 2xx/3xx (sukses)
    console.log(`${colors.DIM}[${formatTimestamp()}]${colors.RESET} \x1b[32m${colors.BOLD}[HTTP]${colors.RESET} ${colors.BOLD}${method}${colors.RESET} ${path} ${statusColor}${statusCode}${colors.RESET} ${colors.DIM}${durationMs}ms${colors.RESET}`);
  },
};
