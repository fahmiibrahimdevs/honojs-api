/**
 * validators/post.ts
 *
 * Skema validasi Zod untuk semua operasi Post.
 *
 * Digunakan oleh PostController untuk memvalidasi body request
 * sebelum data diteruskan ke service layer.
 *
 * Aturan:
 * - Selalu gunakan .safeParse() (bukan .parse()) agar error bisa ditangani manual
 * - Pesan error dalam bahasa Inggris (konsisten dengan validator lain)
 */

import { z } from "zod"; // Library validasi skema

/**
 * Skema untuk membuat post baru.
 * Field title dan content wajib diisi.
 */
export const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"), // Judul minimal 3 karakter
  content: z.string().min(10, "Content must be at least 10 characters"), // Konten minimal 10 karakter
  published: z.boolean().optional(), // Status publish, opsional (default false di DB)
});

/**
 * Skema untuk mengupdate post yang sudah ada.
 * Semua field opsional karena ini partial update.
 */
export const updatePostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").optional(),
  content: z.string().min(10, "Content must be at least 10 characters").optional(),
  published: z.boolean().optional(), // Bisa digunakan untuk publish/unpublish post
});

/** Tipe TypeScript yang diturunkan dari skema createPost */
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** Tipe TypeScript yang diturunkan dari skema updatePost */
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
