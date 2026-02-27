/**
 * repositories/post.repository.ts
 *
 * Repository layer untuk tabel 'posts' dan 'post_files' di database.
 *
 * PERAN DALAM CLEAN ARCHITECTURE:
 * Satu-satunya tempat yang boleh berinteraksi langsung dengan Prisma
 * untuk data Post dan PostFile. Layer lain (service, controller) tidak
 * boleh mengakses prisma.post atau prisma.postFile secara langsung.
 *
 * Setiap query post selalu menyertakan data author dan files-nya (include)
 * agar client mendapatkan data lengkap dalam satu request.
 */

import { prisma } from "../lib/prisma"; // Singleton Prisma client

/** Data yang dibutuhkan untuk membuat post baru */
export interface CreatePostData {
  title: string; // Judul post (wajib)
  content: string; // Konten post (wajib)
  published?: boolean; // Status publish, default false
  authorId: string; // ID penulis (dari JWT token, bukan body request)
}

/** Data yang bisa diperbarui pada post yang sudah ada (semua opsional) */
export interface UpdatePostData {
  title?: string;
  content?: string;
  published?: boolean; // Bisa digunakan untuk publish/unpublish
}

/** Data untuk menyimpan satu file yang diunggah */
export interface CreatePostFileData {
  postId: string; // ID post yang file ini menjadi bagiannya
  originalName: string; // Nama file asli dari user (untuk ditampilkan)
  storedName: string; // Nama file di disk (UUID + ext, mencegah konflik nama)
  path: string; // Path relatif ke file di server
  mimeType: string; // Tipe MIME file (image/jpeg, application/pdf, dll)
  size: number; // Ukuran file dalam bytes
}

/**
 * Konfigurasi include untuk relasi post → author dan post → files.
 * Setiap query post akan menyertakan data author (aman) dan daftar file.
 */
const postInclude = {
  author: {
    select: { id: true, name: true, email: true }, // Hanya field aman, tidak ada password
  },
  files: {
    select: {
      id: true,
      originalName: true, // Nama file asli untuk ditampilkan ke user
      storedName: true,
      path: true, // Path untuk diakses via URL
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const }, // File diurutkan sesuai urutan upload
  },
};

export const PostRepository = {
  /**
   * Cari satu post berdasarkan ID beserta data author dan files-nya.
   * Mengembalikan null jika tidak ditemukan.
   */
  async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: postInclude, // Sertakan author dan files
    });
  },

  /**
   * Ambil banyak post dengan paginasi, search, dan filter published.
   * @param where  - Filter tambahan (misal: { authorId } untuk filter by penulis)
   * @param skip   - Offset paginasi: (page - 1) * limit
   * @param take   - Jumlah data per halaman
   * @param search - Keyword untuk mencari di title atau content (opsional)
   * @returns [array of posts, total count]
   */
  async findMany(where: { authorId?: string; published?: boolean }, skip: number, take: number, search?: string) {
    // Bangun kondisi where lengkap dengan search (jika ada)
    const fullWhere = {
      ...where,
      ...(search && {
        OR: [
          { title: { contains: search } }, // Cari di judul
          { content: { contains: search } }, // Cari di konten
        ],
      }),
    };

    // Jalankan dua query secara paralel untuk efisiensi
    return Promise.all([
      prisma.post.findMany({
        where: fullWhere,
        skip, // Offset untuk paginasi
        take, // Limit per halaman
        orderBy: { createdAt: "desc" }, // Post terbaru di atas
        include: postInclude, // Sertakan author dan files
      }),
      prisma.post.count({ where: fullWhere }), // Total count untuk meta paginasi
    ]);
  },

  /**
   * Buat post baru dan kembalikan data lengkapnya beserta author dan files.
   * Files belum ada saat pertama kali dibuat, bisa ditambahkan via uploadFiles.
   */
  async create(data: CreatePostData) {
    return prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        published: data.published ?? false, // Default: belum dipublish
        authorId: data.authorId, // ID dari JWT token
      },
      include: postInclude, // Return dengan data author dan files (kosong)
    });
  },

  /**
   * Update post berdasarkan ID.
   * Hanya field yang disertakan di `data` yang akan diubah (partial update).
   */
  async update(id: string, data: UpdatePostData) {
    return prisma.post.update({
      where: { id },
      data, // Partial update: field yang undefined tidak diubah
      include: postInclude,
    });
  },

  /** Hapus post berdasarkan ID. Files akan ikut terhapus karena onDelete: Cascade. */
  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  },

  /**
   * Simpan banyak file sekaligus ke tabel post_files.
   * Dipanggil setelah file berhasil disimpan ke disk.
   * @param files - Array data file yang sudah diproses
   * @returns Daftar record PostFile yang baru dibuat
   */
  async createFiles(files: CreatePostFileData[]) {
    // Gunakan createMany untuk insert banyak baris sekaligus (lebih efisien)
    await prisma.postFile.createMany({ data: files });

    // createMany tidak mengembalikan data, jadi ambil ulang file yang baru dibuat
    return prisma.postFile.findMany({
      where: { postId: files[0].postId }, // Semua file pasti punya postId yang sama
      orderBy: { createdAt: "asc" }, // Urutan sesuai upload
    });
  },

  /**
   * Cari satu file berdasarkan ID-nya.
   * Digunakan untuk validasi kepemilikan sebelum menghapus file.
   */
  async findFileById(fileId: string) {
    return prisma.postFile.findUnique({
      where: { id: fileId },
      include: { post: { select: { authorId: true } } }, // Sertakan authorId untuk cek kepemilikan
    });
  },

  /** Hapus satu file dari tabel post_files berdasarkan ID. */
  async deleteFile(fileId: string) {
    return prisma.postFile.delete({ where: { id: fileId } });
  },
};
