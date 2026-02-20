/**
 * types/index.ts
 *
 * File ini berisi semua definisi tipe (TypeScript interfaces & types)
 * yang digunakan secara global di seluruh project.
 *
 * Dengan memusatkan semua tipe di sini, kita menghindari duplikasi
 * dan memudahkan perubahan di satu tempat saja.
 */

/**
 * Representasi user yang sudah login dan tersimpan di context Hono.
 * Dibuat oleh authMiddleware dan bisa diakses via c.get('user') di controller.
 */
export interface AuthUser {
  userId: string; // ID unik user dari database
  email: string; // Email user
  role: "ADMIN" | "MODERATOR" | "USER"; // Role/hak akses user
}

/**
 * Query parameter untuk fitur paginasi (opsional).
 * Digunakan di endpoint yang mengembalikan list data.
 */
export interface PaginationQuery {
  page?: number; // Halaman ke berapa (default: 1)
  limit?: number; // Jumlah data per halaman (default: 10)
}

/**
 * Metadata paginasi yang dikembalikan bersama data list.
 * Digunakan oleh response.paginated() di utils/response.ts.
 */
export interface PaginationMeta {
  page: number; // Halaman saat ini
  limit: number; // Jumlah item per halaman
  total: number; // Total seluruh data
  totalPages: number; // Total halaman yang tersedia
}

/**
 * Struktur standar JSON response untuk semua endpoint API.
 * Generic type T memungkinkan data bisa berbentuk apapun.
 *
 * Contoh sukses:  { success: true, message: '...', data: {...} }
 * Contoh error:   { success: false, message: '...', errors: [...] }
 * Contoh list:    { success: true, data: [...], meta: { page, total, ... } }
 */
export interface ApiResponse<T = unknown> {
  success: boolean; // true = sukses, false = gagal
  message?: string; // Pesan opsional untuk ditampilkan ke user
  data?: T; // Data hasil operasi (bisa object, array, dll)
  meta?: PaginationMeta; // Metadata paginasi, hanya ada jika response berupa list
  errors?: unknown; // Detail error validasi (dari Zod), hanya ada jika gagal
}

/** Tipe role user yang tersedia di sistem */
export type UserRole = "ADMIN" | "MODERATOR" | "USER";

/** Status akun user */
export type UserStatus = "ACTIVE" | "INACTIVE";
