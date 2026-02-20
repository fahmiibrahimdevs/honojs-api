/**
 * utils/response.ts
 *
 * Helper untuk membuat JSON response yang konsisten di seluruh aplikasi.
 *
 * TUJUAN:
 * Semua response API memiliki format yang sama sehingga mudah diparsing
 * oleh frontend/client. Format standarnya:
 *   { success: boolean, message?: string, data?: T, meta?: {...}, errors?: [...] }
 *
 * CARA PAKAI (di controller):
 *   return response.success(c, user)              → 200 OK
 *   return response.created(c, user, 'Created!')  → 201 Created
 *   return response.paginated(c, list, meta)       → 200 dengan paginasi
 *   return response.noContent(c, 'Deleted')        → 200 tanpa data
 *   return response.error(c, 'Not found', 404)     → error
 */

import { Context } from "hono";
import type { ApiResponse, PaginationMeta } from "../types";

export const response = {
  /**
   * Response sukses umum (default HTTP 200).
   * @param c       - Context Hono dari handler
   * @param data    - Data yang akan dikembalikan ke client
   * @param message - Pesan opsional
   * @param statusCode - HTTP status code (default 200)
   */
  success<T>(c: Context, data: T, message?: string, statusCode: number = 200) {
    const body: ApiResponse<T> = { success: true }; // Selalu set success: true
    if (message) body.message = message; // Tambah message jika ada
    body.data = data; // Masukkan data ke response
    return c.json(body, statusCode as any);
  },

  /**
   * Response untuk resource yang baru dibuat (HTTP 201 Created).
   * Shortcut dari success() dengan status 201.
   */
  created<T>(c: Context, data: T, message: string = "Resource created successfully") {
    return this.success(c, data, message, 201); // Delegasi ke success() dengan kode 201
  },

  /**
   * Response untuk data yang berpaginasi (list data).
   * Menyertakan metadata paginasi (page, limit, total, totalPages).
   */
  paginated<T>(c: Context, data: T[], meta: PaginationMeta, message?: string) {
    const body: ApiResponse<T[]> = { success: true, data, meta }; // Gabungkan data + meta
    if (message) body.message = message;
    return c.json(body); // Default HTTP 200
  },

  /**
   * Response sukses tanpa mengembalikan data (misalnya setelah delete/logout).
   * Hanya mengembalikan pesan konfirmasi.
   */
  noContent(c: Context, message: string = "Operation successful") {
    return c.json({ success: true, message }); // Tidak ada field 'data'
  },

  /**
   * Response error. Digunakan oleh global error handler di index.ts.
   * @param errors - Detail error opsional (biasanya dari validasi Zod)
   */
  error(c: Context, message: string, statusCode: number = 500, errors?: unknown) {
    const body: ApiResponse = { success: false, message }; // success: false untuk error
    if (errors) body.errors = errors; // Tambah detail error jika ada
    return c.json(body, statusCode as any);
  },
};
