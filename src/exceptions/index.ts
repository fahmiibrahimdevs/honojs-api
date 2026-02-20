/**
 * exceptions/index.ts
 *
 * File ini berisi semua custom exception (error class) yang digunakan
 * di seluruh aplikasi.
 *
 * KONSEP:
 * Alih-alih return c.json({ error: '...' }, 400) langsung di setiap tempat,
 * kita cukup `throw new BadRequestException('...')` dari mana saja
 * (service, controller, middleware), lalu global error handler di index.ts
 * yang akan menangkap dan mengubahnya menjadi response JSON yang tepat.
 *
 * Ini membuat kode lebih bersih dan konsisten.
 */

/**
 * Base class untuk semua exception di aplikasi ini.
 * Semua exception lainnya extends dari class ini.
 * Meng-extend Error bawaan JavaScript agar bisa di-catch secara normal.
 */
export class AppException extends Error {
  public statusCode: number; // HTTP status code yang akan dikirim ke client
  public errors?: unknown; // Detail error tambahan (contoh: error validasi dari Zod)

  constructor(
    message: string, // Pesan error yang akan ditampilkan ke user
    statusCode: number = 500, // Default 500 jika tidak dispesifikasikan
    errors?: unknown, // Data error tambahan (opsional)
  ) {
    super(message); // Panggil constructor Error bawaan JS
    this.name = "AppException"; // Nama class untuk identifikasi di logger
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Dilempar ketika resource yang dicari tidak ditemukan di database.
 * Menghasilkan HTTP 404 Not Found.
 * Contoh: `throw new NotFoundException('User')`  →  "User not found"
 */
export class NotFoundException extends AppException {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404); // Format pesan: "[Resource] not found"
    this.name = "NotFoundException";
  }
}

/**
 * Dilempar ketika user tidak terautentikasi (belum login / token tidak valid).
 * Menghasilkan HTTP 401 Unauthorized.
 * Contoh: `throw new UnauthorizedException('Token expired')`
 */
export class UnauthorizedException extends AppException {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedException";
  }
}

/**
 * Dilempar ketika user sudah login tapi tidak punya izin untuk aksi tersebut.
 * Menghasilkan HTTP 403 Forbidden.
 * Contoh: user biasa mencoba mengakses endpoint admin-only.
 */
export class ForbiddenException extends AppException {
  constructor(message: string = "Forbidden - Insufficient permissions") {
    super(message, 403);
    this.name = "ForbiddenException";
  }
}

/**
 * Dilempar ketika input/data dari user gagal validasi Zod.
 * Menghasilkan HTTP 422 Unprocessable Entity.
 * `errors` berisi detail field mana yang gagal dan alasannya.
 */
export class ValidationException extends AppException {
  constructor(errors: unknown) {
    super("Validation failed", 422, errors); // errors = array ZodIssue dari safeParse
    this.name = "ValidationException";
  }
}

/**
 * Dilempar ketika terjadi konflik data, biasanya duplikasi unique field.
 * Menghasilkan HTTP 409 Conflict.
 * Contoh: email yang sama sudah terdaftar di database.
 */
export class ConflictException extends AppException {
  constructor(message: string = "Conflict") {
    super(message, 409);
    this.name = "ConflictException";
  }
}

/**
 * Dilempar ketika request tidak valid secara logika bisnis.
 * Menghasilkan HTTP 400 Bad Request.
 * Contoh: password lama yang dimasukkan salah saat ganti password.
 */
export class BadRequestException extends AppException {
  constructor(message: string = "Bad request") {
    super(message, 400);
    this.name = "BadRequestException";
  }
}
