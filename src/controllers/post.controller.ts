/**
 * controllers/post.controller.ts
 *
 * Controller untuk semua operasi CRUD Post dan upload file.
 *
 * Penamaan method mengikuti konvensi Laravel Resource Controller:
 *   index       → GET    /api/posts            (list)
 *   show        → GET    /api/posts/:id         (detail)
 *   store       → POST   /api/posts             (buat)
 *   update      → PUT    /api/posts/:id         (update)
 *   destroy     → DELETE /api/posts/:id         (hapus)
 *   uploadFiles → POST   /api/posts/:id/files   (upload multiple file)
 *   destroyFile → DELETE /api/posts/:id/files/:fileId (hapus satu file)
 *
 * Semua endpoint memerlukan autentikasi (authMiddleware).
 * Kontrol akses ditangani di PostService (bukan di sini).
 */

import type { Context } from "hono"; // Tipe Context dari Hono.js
import { PostService } from "../services/post.service"; // Logika bisnis
import { response } from "../utils/response"; // Helper response JSON
import { createPostSchema, updatePostSchema } from "../validators/post"; // Skema validasi Zod
import { ValidationException, BadRequestException } from "../exceptions"; // Exception class

export const PostController = {
  /**
   * GET /api/posts?page=1&limit=10&search=keyword
   * Ambil semua post dengan paginasi dan search opsional.
   * - ADMIN : melihat semua post
   * - USER  : hanya melihat post milik sendiri
   */
  async index(c: Context) {
    const user = c.get("user"); // Data user dari JWT (via authMiddleware)
    const page = Number(c.req.query("page")) || 1; // Default halaman 1
    const limit = Number(c.req.query("limit")) || 10; // Default 10 per halaman
    const search = c.req.query("search") || undefined; // Keyword pencarian (opsional)

    const result = await PostService.getAll(user.userId, user.role, page, limit, search);
    return response.paginated(c, result.data, result.meta); // HTTP 200 dengan meta paginasi
  },

  /**
   * GET /api/posts/:id
   * Ambil detail satu post beserta info author dan daftar file-nya.
   * User biasa tidak bisa akses post milik orang lain.
   */
  async show(c: Context) {
    const id = c.req.param("id"); // ID post dari URL parameter
    const user = c.get("user");

    const post = await PostService.getById(id, user.userId, user.role);
    return response.success(c, post); // HTTP 200
  },

  /**
   * POST /api/posts
   * Buat post baru (tanpa file).
   * authorId otomatis dari token JWT, bukan dari body.
   * Untuk upload file setelah buat post, gunakan POST /api/posts/:id/files
   */
  async store(c: Context) {
    const user = c.get("user");
    const body = await c.req.json(); // Baca body sebagai JSON
    const result = createPostSchema.safeParse(body); // Validasi: title & content wajib
    if (!result.success) throw new ValidationException(result.error.issues); // 422 jika gagal

    const post = await PostService.create(result.data, user.userId); // authorId dari token
    return response.created(c, post, "Post created successfully"); // HTTP 201
  },

  /**
   * PUT /api/posts/:id
   * Update post. Semua field opsional (partial update).
   * User biasa tidak bisa update post milik orang lain.
   */
  async update(c: Context) {
    const id = c.req.param("id"); // ID post dari URL
    const user = c.get("user");
    const body = await c.req.json(); // Baca body JSON
    const result = updatePostSchema.safeParse(body); // Validasi: semua field opsional
    if (!result.success) throw new ValidationException(result.error.issues); // 422 jika gagal

    const post = await PostService.update(id, user.userId, user.role, result.data);
    return response.success(c, post, "Post updated successfully"); // HTTP 200
  },

  /**
   * DELETE /api/posts/:id
   * Hapus post beserta SEMUA file yang terlampir (dari disk dan DB).
   * User biasa tidak bisa hapus post milik orang lain.
   */
  async destroy(c: Context) {
    const id = c.req.param("id"); // ID post dari URL
    const user = c.get("user");

    await PostService.delete(id, user.userId, user.role);
    return response.noContent(c, "Post deleted successfully"); // HTTP 200 tanpa data
  },

  /**
   * POST /api/posts/:id/files
   * Upload multiple file ke post yang sudah ada.
   *
   * Request harus menggunakan Content-Type: multipart/form-data
   * Field nama: "files" (bisa kirim beberapa file dengan nama yang sama)
   *
   * Batasan:
   * - Maksimum 10 file per request
   * - Ukuran maksimum per file: 5MB
   * - Tipe yang didukung: image (JPEG/PNG/GIF/WebP), PDF, DOC, DOCX, TXT
   */
  async uploadFiles(c: Context) {
    const postId = c.req.param("id"); // ID post dari URL
    const user = c.get("user");

    // Baca body sebagai FormData (multipart/form-data)
    const formData = await c.req.formData();

    // Ambil semua file dengan field name "files" dari FormData
    const fileEntries = formData.getAll("files");

    // Filter hanya yang merupakan instance File (bukan string)
    const files = fileEntries.filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      throw new BadRequestException('No files provided. Use field name "files" in multipart form'); // 400
    }

    const uploadedFiles = await PostService.uploadFiles(postId, user.userId, user.role, files);
    return response.created(c, uploadedFiles, `${uploadedFiles.length} file(s) uploaded successfully`); // HTTP 201
  },

  /**
   * DELETE /api/posts/:id/files/:fileId
   * Hapus satu file dari post berdasarkan fileId.
   * File dihapus dari disk dan record-nya dari database.
   * User biasa tidak bisa hapus file dari post milik orang lain.
   */
  async destroyFile(c: Context) {
    const fileId = c.req.param("fileId"); // ID file dari URL
    const user = c.get("user");

    await PostService.deleteFile(fileId, user.userId, user.role);
    return response.noContent(c, "File deleted successfully"); // HTTP 200 tanpa data
  },
};
