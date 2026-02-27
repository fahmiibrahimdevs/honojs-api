/**
 * services/post.service.ts
 *
 * Service layer untuk semua logika bisnis terkait Post dan upload file.
 *
 * ATURAN AKSES:
 * - ADMIN     : bisa melihat, mengubah, dan menghapus SEMUA post milik siapapun
 * - USER/MOD  : hanya bisa mengakses, mengubah, dan menghapus post MILIKNYA sendiri
 *
 * FITUR UPLOAD FILE:
 * - Mendukung upload multiple file sekaligus dalam satu request (multipart/form-data)
 * - File disimpan di folder uploads/posts/<postId>/
 * - Nama file di disk menggunakan UUID untuk menghindari konflik
 * - Validasi: tipe MIME dan ukuran maksimum per file
 * - Hapus file dari disk otomatis saat post atau file dihapus
 */

import { join } from "path"; // Helper path untuk membentuk path file
import { PostRepository } from "../repositories/post.repository"; // Satu-satunya akses ke DB
import { NotFoundException, ForbiddenException, BadRequestException } from "../exceptions"; // Exception class yang sudah tersedia
import type { CreatePostInput, UpdatePostInput } from "../validators/post"; // Tipe input dari Zod

// ─── Konfigurasi Upload ────────────────────────────────────────────────────────

/** Tipe MIME yang diizinkan untuk di-upload */
const ALLOWED_MIME_TYPES = [
  "image/jpeg", // JPEG
  "image/png", // PNG
  "image/gif", // GIF
  "image/webp", // WebP
  "application/pdf", // PDF
  "application/msword", // DOC lama
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "text/plain", // TXT
];

/** Ukuran maksimum per file: 5 MB dalam bytes */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Maksimum jumlah file per upload */
const MAX_FILES = 10;

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Hasilkan nama file unik di disk dengan format: {NamaAsli-XX}.ext
 * Dua karakter random di akhir mencegah konflik jika nama file sama.
 * Nama asli dipertahankan apa adanya (spasi dan karakter lain dibiarkan).
 * @param originalName - Nama file asli dari user
 * @returns Nama file unik, contoh: "laporan keuangan-a3.pdf"
 */
const generateStoredName = (originalName: string): string => {
  const lastDot = originalName.lastIndexOf("."); // Cari posisi titik ekstensi terakhir
  const nameWithoutExt = lastDot !== -1 ? originalName.slice(0, lastDot) : originalName; // Nama tanpa ekstensi
  const ext = lastDot !== -1 ? originalName.slice(lastDot + 1) : "bin"; // Ekstensi asli, fallback "bin"
  const random2 = crypto.randomUUID().replace(/-/g, "").slice(0, 2); // Ambil 2 karakter hex acak
  return `${nameWithoutExt}-${random2}.${ext}`; // Format: {NamaAsli-XX}.ext
};

/**
 * Simpan satu file ke disk menggunakan Bun.write.
 * @param filePath - Path lengkap tujuan penyimpanan
 * @param file     - Objek File dari FormData
 */
const saveFileToDisk = async (filePath: string, file: File): Promise<void> => {
  const buffer = await file.arrayBuffer(); // Baca konten file sebagai buffer
  await Bun.write(filePath, buffer); // Tulis ke disk menggunakan Bun native API
};

/**
 * Hapus file dari disk. Tidak melempar error jika file tidak ditemukan
 * (mungkin sudah terhapus sebelumnya).
 * @param filePath - Path lengkap file yang akan dihapus
 */
const deleteFileFromDisk = async (filePath: string): Promise<void> => {
  try {
    const file = Bun.file(filePath); // Buka file
    const exists = await file.exists(); // Cek keberadaan file
    if (exists) {
      await import("fs/promises").then((fs) => fs.unlink(filePath)); // Hapus file
    }
  } catch {
    // Abaikan error jika file tidak bisa dihapus (tidak blokir operasi lain)
  }
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const PostService = {
  /**
   * Ambil semua post dengan paginasi dan search opsional.
   * - ADMIN : melihat semua post (published maupun tidak)
   * - USER  : hanya melihat post miliknya sendiri
   * @param search - Keyword pencarian di title/content (opsional)
   */
  async getAll(userId: string, role: string, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit; // Hitung offset dari nomor halaman

    // Admin lihat semua post, user biasa hanya lihat post miliknya
    const where = role === "ADMIN" ? {} : { authorId: userId };

    const [posts, total] = await PostRepository.findMany(where, skip, limit, search);

    return {
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        ...(search && { search }), // Sertakan keyword di meta jika ada
      },
    };
  },

  /**
   * Ambil detail satu post berdasarkan ID beserta files-nya.
   * User biasa tidak bisa akses post milik orang lain.
   */
  async getById(id: string, userId: string, role: string) {
    const post = await PostRepository.findById(id);
    if (!post) throw new NotFoundException("Post"); // 404 jika tidak ditemukan

    // Cek kepemilikan jika bukan admin
    if (role !== "ADMIN" && post.authorId !== userId) {
      throw new ForbiddenException("You can only access your own posts"); // 403
    }

    return post;
  },

  /**
   * Buat post baru tanpa file.
   * authorId otomatis diambil dari JWT token (bukan dari body request).
   */
  async create(data: CreatePostInput, authorId: string) {
    return PostRepository.create({ ...data, authorId }); // Sisipkan authorId dari token
  },

  /**
   * Update post berdasarkan ID.
   * Cek kepemilikan sebelum mengizinkan update (kecuali admin).
   */
  async update(id: string, userId: string, role: string, data: UpdatePostInput) {
    const post = await PostRepository.findById(id);
    if (!post) throw new NotFoundException("Post"); // 404

    // Hanya pemilik atau admin yang boleh update
    if (role !== "ADMIN" && post.authorId !== userId) {
      throw new ForbiddenException("You can only update your own posts"); // 403
    }

    return PostRepository.update(id, data);
  },

  /**
   * Hapus post beserta semua file-nya dari disk dan database.
   *
   * Alur:
   * 1. Pastikan post ada dan user punya akses
   * 2. Hapus seluruh folder uploads/posts/<postId>/ beserta isinya sekaligus
   *    menggunakan fs.rm({ recursive: true, force: true }) — lebih aman dan efisien
   *    daripada hapus file satu-satu lalu rmdir (yang hanya bisa hapus folder kosong)
   * 3. Hapus record post dari DB — record PostFile ikut terhapus otomatis
   *    karena relasi Post → PostFile menggunakan onDelete: Cascade di schema Prisma
   */
  async delete(id: string, userId: string, role: string) {
    const post = await PostRepository.findById(id);
    if (!post) throw new NotFoundException("Post"); // 404

    // Hanya pemilik atau admin yang boleh hapus
    if (role !== "ADMIN" && post.authorId !== userId) {
      throw new ForbiddenException("You can only delete your own posts"); // 403
    }

    // Hapus seluruh folder post beserta semua file di dalamnya sekaligus
    const uploadDir = process.env.UPLOAD_DIR || "uploads"; // Root folder upload dari env
    const postDir = join(uploadDir, "posts", id); // Path folder milik post ini
    const fs = await import("fs/promises");
    await fs.rm(postDir, { recursive: true, force: true }); // force: true agar tidak error jika folder tidak ada

    await PostRepository.delete(id); // Hapus post dari DB (PostFile ikut terhapus via onDelete: Cascade)
  },

  /**
   * Upload multiple file dan lampirkan ke post yang sudah ada.
   *
   * Alur:
   * 1. Validasi post ada dan user punya akses
   * 2. Validasi jumlah file, tipe MIME, dan ukuran tiap file
   * 3. Buat folder uploads/posts/<postId>/ jika belum ada
   * 4. Simpan semua file ke disk dengan nama UUID
   * 5. Simpan metadata file ke database
   *
   * @param postId  - ID post tujuan
   * @param userId  - ID user yang mengupload (dari JWT)
   * @param role    - Role user
   * @param files   - Array File object dari multipart/form-data
   * @returns Daftar metadata file yang berhasil diupload
   */
  async uploadFiles(postId: string, userId: string, role: string, files: File[]) {
    // Pastikan post ada dan user punya akses
    const post = await PostRepository.findById(postId);
    if (!post) throw new NotFoundException("Post"); // 404

    if (role !== "ADMIN" && post.authorId !== userId) {
      throw new ForbiddenException("You can only upload files to your own posts"); // 403
    }

    // Validasi jumlah file
    if (files.length === 0) {
      throw new BadRequestException("No files provided"); // 400
    }
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`Maximum ${MAX_FILES} files allowed per upload`); // 400
    }

    // Validasi tipe MIME dan ukuran setiap file
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new BadRequestException(`File "${file.name}" has unsupported type: ${file.type}. Allowed: images, PDF, DOC, DOCX, TXT`); // 400
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File "${file.name}" exceeds maximum size of 5MB`, // 400
        );
      }
    }

    // Buat folder tujuan: uploads/posts/<postId>/
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    const postDir = join(uploadDir, "posts", postId);
    await import("fs/promises").then(
      (fs) => fs.mkdir(postDir, { recursive: true }), // Buat folder rekursif jika belum ada
    );

    // Proses dan simpan setiap file
    const fileRecords = [];
    for (const file of files) {
      const storedName = generateStoredName(file.name); // Nama unik di disk
      const filePath = join(postDir, storedName); // Path lengkap di server

      await saveFileToDisk(filePath, file); // Tulis file ke disk

      // Kumpulkan metadata file untuk disimpan ke DB
      fileRecords.push({
        postId,
        originalName: file.name, // Nama asli untuk ditampilkan ke user
        storedName,
        path: filePath, // Path di server
        mimeType: file.type, // Tipe MIME
        size: file.size, // Ukuran dalam bytes
      });
    }

    // Simpan semua metadata file ke database sekaligus
    return PostRepository.createFiles(fileRecords);
  },

  /**
   * Hapus satu file dari post berdasarkan fileId.
   * File dihapus dari disk terlebih dahulu, kemudian record-nya dari DB.
   */
  async deleteFile(fileId: string, userId: string, role: string) {
    // Cari file beserta info post pemiliknya untuk validasi akses
    const file = await PostRepository.findFileById(fileId);
    if (!file) throw new NotFoundException("File"); // 404

    // Cek kepemilikan: hanya pemilik post atau admin yang boleh hapus file
    if (role !== "ADMIN" && file.post.authorId !== userId) {
      throw new ForbiddenException("You can only delete files from your own posts"); // 403
    }

    await deleteFileFromDisk(file.path); // Hapus dari disk dulu
    await PostRepository.deleteFile(fileId); // Kemudian hapus record dari DB
  },
};
