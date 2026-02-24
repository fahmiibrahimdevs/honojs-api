/**
 * src/docs/openapi.ts
 *
 * Definisi OpenAPI 3.0 specification untuk seluruh endpoint API.
 *
 * File ini berisi schema dan metadata yang digunakan oleh Swagger UI
 * untuk menampilkan dokumentasi interaktif di /docs.
 *
 * Akses Swagger UI: http://localhost:3000/docs
 * Akses raw JSON spec: http://localhost:3000/docs/json
 */

// ─── Type Definisi OpenAPI ─────────────────────────────────────────────────────

/** Tipe untuk OpenAPI schema object */
type SchemaObject = Record<string, unknown>;

/** Tipe untuk satu endpoint operation (GET, POST, dll) */
interface OpenAPIOperation {
  tags: string[];
  summary: string;
  description?: string;
  security?: Record<string, unknown>[];
  parameters?: Record<string, unknown>[];
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
}

/** Tipe untuk path item (kumpulan method di satu path) */
type PathItem = Partial<Record<"get" | "post" | "put" | "patch" | "delete", OpenAPIOperation>>;

// ─── Reusable Schema Components ────────────────────────────────────────────────

/** Schema standar untuk response sukses */
const successResponse = (dataSchema: SchemaObject, description = "Sukses") => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: dataSchema,
        },
      },
    },
  },
});

/** Schema standar untuk response sukses dengan paginasi */
const paginatedResponse = (itemSchema: SchemaObject, description = "Sukses dengan paginasi") => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "array", items: itemSchema },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 42 },
              totalPages: { type: "integer", example: 5 },
              search: { type: "string", example: "keyword" },
            },
          },
        },
      },
    },
  },
});

/** Response error standar */
const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
});

/** Security requirement untuk endpoint yang butuh Bearer token */
const bearerAuth = [{ bearerAuth: [] }];

// ─── Reusable Schemas ──────────────────────────────────────────────────────────

/** Schema data user (tanpa password/refreshToken) */
const userSchema: SchemaObject = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
    name: { type: "string", example: "John Doe" },
    email: { type: "string", format: "email", example: "john@example.com" },
    phone: { type: "string", example: "081234567890", nullable: true },
    birthDate: { type: "string", format: "date-time", nullable: true },
    role: { type: "string", enum: ["ADMIN", "MODERATOR", "USER"], example: "USER" },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

/** Schema data todo beserta info user pemilik */
const todoSchema: SchemaObject = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440001" },
    title: { type: "string", example: "Belajar Hono.js" },
    description: { type: "string", example: "Pelajari dokumentasi Hono.js", nullable: true },
    completed: { type: "boolean", example: false },
    userId: { type: "string", format: "uuid" },
    user: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", example: "John Doe" },
        email: { type: "string", format: "email", example: "john@example.com" },
      },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

/** Schema data satu file yang terlampir di post */
const postFileSchema: SchemaObject = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
    originalName: { type: "string", example: "laporan.pdf", description: "Nama file asli dari user" },
    storedName: { type: "string", example: "laporan-a3.pdf", description: "Nama file di disk ({NamaAsli-XX}.ext)" },
    path: { type: "string", example: "uploads/posts/xxx/laporan-a3.pdf", description: "Path file di server" },
    mimeType: { type: "string", example: "application/pdf", description: "Tipe MIME file" },
    size: { type: "integer", example: 204800, description: "Ukuran file dalam bytes" },
    createdAt: { type: "string", format: "date-time" },
  },
};

/** Schema data post beserta info author dan daftar file */
const postSchema: SchemaObject = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440003" },
    title: { type: "string", example: "Pengenalan Hono.js" },
    content: { type: "string", example: "Hono.js adalah framework web ultra-cepat untuk edge runtime..." },
    published: { type: "boolean", example: false },
    authorId: { type: "string", format: "uuid" },
    author: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string", example: "John Doe" },
        email: { type: "string", format: "email", example: "john@example.com" },
      },
    },
    files: { type: "array", items: postFileSchema, description: "Daftar file yang terlampir" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

/** Query params paginasi yang dipakai di semua endpoint list */
const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Nomor halaman" },
  { name: "limit", in: "query", schema: { type: "integer", default: 10 }, description: "Jumlah item per halaman" },
];

// ─── Path Definitions ──────────────────────────────────────────────────────────

const paths: Record<string, PathItem> = {
  // ── Health Check ────────────────────────────────────────────────────────────
  "/": {
    get: {
      tags: ["Health"],
      summary: "Health check server",
      responses: {
        "200": successResponse({
          type: "object",
          properties: {
            name: { type: "string", example: "Hono.js REST API" },
            version: { type: "string", example: "2.0.0" },
            status: { type: "string", example: "running" },
            timestamp: { type: "string", format: "date-time" },
          },
        }),
      },
    },
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  "/api/auth/setup-admin": {
    post: {
      tags: ["Auth"],
      summary: "Setup admin pertama",
      description: "Hanya bisa dijalankan **sekali**. Akan error jika admin sudah ada.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password", "passwordConfirmation"],
              properties: {
                name: { type: "string", example: "Super Admin" },
                email: { type: "string", format: "email", example: "admin@example.com" },
                password: { type: "string", minLength: 6, example: "password123" },
                passwordConfirmation: { type: "string", example: "password123" },
                phone: { type: "string", example: "081234567890" },
                birthDate: { type: "string", example: "1990-01-01" },
              },
            },
          },
        },
      },
      responses: {
        "201": successResponse(userSchema, "Admin berhasil dibuat"),
        "403": errorResponse("Admin sudah ada"),
        "409": errorResponse("Email sudah terdaftar"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register user baru",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password", "passwordConfirmation"],
              properties: {
                name: { type: "string", minLength: 2, example: "John Doe" },
                email: { type: "string", format: "email", example: "john@example.com" },
                password: { type: "string", minLength: 6, example: "password123" },
                passwordConfirmation: { type: "string", example: "password123" },
                phone: { type: "string", example: "081234567890" },
                birthDate: { type: "string", example: "1995-06-15" },
              },
            },
          },
        },
      },
      responses: {
        "201": successResponse(userSchema, "Registrasi berhasil"),
        "409": errorResponse("Email sudah terdaftar"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email", example: "john@example.com" },
                password: { type: "string", example: "password123" },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(
          {
            type: "object",
            properties: {
              accessToken: { type: "string", description: "JWT access token, berlaku 15 menit" },
              refreshToken: { type: "string", description: "JWT refresh token, berlaku 7 hari" },
              user: userSchema,
            },
          },
          "Login berhasil",
        ),
        "401": errorResponse("Email atau password salah"),
        "403": errorResponse("Akun tidak aktif"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/auth/refresh-token": {
    post: {
      tags: ["Auth"],
      summary: "Perbarui access token",
      description: "Gunakan refresh token untuk mendapatkan access token baru. Menghasilkan pasangan token baru (rotation).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["refreshToken"],
              properties: {
                refreshToken: { type: "string", example: "eyJhbGci..." },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(
          {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
            },
          },
          "Token berhasil diperbarui",
        ),
        "401": errorResponse("Refresh token tidak valid"),
      },
    },
  },

  "/api/auth/profile": {
    get: {
      tags: ["Auth"],
      summary: "Lihat profil sendiri",
      security: bearerAuth,
      responses: {
        "200": successResponse(userSchema),
        "401": errorResponse("Token tidak valid"),
      },
    },
    put: {
      tags: ["Auth"],
      summary: "Update profil sendiri",
      security: bearerAuth,
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 2, example: "John Updated" },
                phone: { type: "string", example: "089876543210" },
                birthDate: { type: "string", example: "1995-06-15" },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(userSchema, "Profil berhasil diupdate"),
        "401": errorResponse("Token tidak valid"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/auth/change-password": {
    post: {
      tags: ["Auth"],
      summary: "Ganti password",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["currentPassword", "newPassword", "passwordConfirmation"],
              properties: {
                currentPassword: { type: "string", example: "password123" },
                newPassword: { type: "string", minLength: 6, example: "newpassword456" },
                passwordConfirmation: { type: "string", example: "newpassword456" },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse({}, "Password berhasil diganti"),
        "400": errorResponse("Password lama salah"),
        "401": errorResponse("Token tidak valid"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Logout",
      security: bearerAuth,
      responses: {
        "200": successResponse({}, "Logout berhasil"),
        "401": errorResponse("Token tidak valid"),
      },
    },
  },

  // ── Todos ────────────────────────────────────────────────────────────────────
  "/api/todos": {
    get: {
      tags: ["Todos"],
      summary: "List todos",
      description: "**ADMIN** melihat semua todo. **USER** hanya melihat todo miliknya.",
      security: bearerAuth,
      parameters: [...paginationParams, { name: "search", in: "query", schema: { type: "string" }, description: "Cari di title & description" }],
      responses: {
        "200": paginatedResponse(todoSchema),
        "401": errorResponse("Token tidak valid"),
      },
    },
    post: {
      tags: ["Todos"],
      summary: "Buat todo baru",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title"],
              properties: {
                title: { type: "string", minLength: 1, example: "Belajar Prisma ORM" },
                description: { type: "string", example: "Pelajari relasi dan migrasi" },
                completed: { type: "boolean", default: false },
              },
            },
          },
        },
      },
      responses: {
        "201": successResponse(todoSchema, "Todo berhasil dibuat"),
        "401": errorResponse("Token tidak valid"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/todos/{id}": {
    get: {
      tags: ["Todos"],
      summary: "Detail todo",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": successResponse(todoSchema),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan todo milik kamu"),
        "404": errorResponse("Todo tidak ditemukan"),
      },
    },
    put: {
      tags: ["Todos"],
      summary: "Update todo",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", example: "Judul baru" },
                description: { type: "string", example: "Deskripsi baru", nullable: true },
                completed: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(todoSchema, "Todo berhasil diupdate"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan todo milik kamu"),
        "404": errorResponse("Todo tidak ditemukan"),
        "422": errorResponse("Validasi gagal"),
      },
    },
    delete: {
      tags: ["Todos"],
      summary: "Hapus todo",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": successResponse({}, "Todo berhasil dihapus"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan todo milik kamu"),
        "404": errorResponse("Todo tidak ditemukan"),
      },
    },
  },

  // ── Posts ───────────────────────────────────────────────────────────────────
  "/api/posts": {
    get: {
      tags: ["Posts"],
      summary: "List post",
      description: "**ADMIN** melihat semua post. **USER** hanya melihat post miliknya.",
      security: bearerAuth,
      parameters: [
        ...paginationParams,
        { name: "search", in: "query", schema: { type: "string" }, description: "Cari di title & content" },
      ],
      responses: {
        "200": paginatedResponse(postSchema),
        "401": errorResponse("Token tidak valid"),
      },
    },
    post: {
      tags: ["Posts"],
      summary: "Buat post baru",
      description: "Buat post baru tanpa file. Untuk upload file, gunakan `POST /api/posts/:id/files` setelah post dibuat.",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "content"],
              properties: {
                title: { type: "string", minLength: 3, example: "Pengenalan Hono.js" },
                content: { type: "string", minLength: 10, example: "Hono.js adalah framework web ultra-cepat..." },
                published: { type: "boolean", default: false, description: "Publish langsung atau simpan sebagai draft" },
              },
            },
          },
        },
      },
      responses: {
        "201": successResponse(postSchema, "Post berhasil dibuat"),
        "401": errorResponse("Token tidak valid"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/posts/{id}": {
    get: {
      tags: ["Posts"],
      summary: "Detail post",
      description: "Mengembalikan data post lengkap beserta info author dan daftar file yang terlampir.",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": successResponse(postSchema),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan post milik kamu"),
        "404": errorResponse("Post tidak ditemukan"),
      },
    },
    put: {
      tags: ["Posts"],
      summary: "Update post",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 3, example: "Judul baru" },
                content: { type: "string", minLength: 10, example: "Konten baru yang lebih panjang..." },
                published: { type: "boolean", example: true, description: "true = publish, false = unpublish" },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(postSchema, "Post berhasil diupdate"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan post milik kamu"),
        "404": errorResponse("Post tidak ditemukan"),
        "422": errorResponse("Validasi gagal"),
      },
    },
    delete: {
      tags: ["Posts"],
      summary: "Hapus post",
      description: "Menghapus post beserta **semua file** yang terlampir dari disk dan database.",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": successResponse({}, "Post berhasil dihapus"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan post milik kamu"),
        "404": errorResponse("Post tidak ditemukan"),
      },
    },
  },

  "/api/posts/{id}/files": {
    post: {
      tags: ["Posts"],
      summary: "Upload multiple file ke post",
      description: [
        "Upload satu atau lebih file ke post yang sudah ada.",
        "",
        "**Batasan:**",
        "- Maksimum **10 file** per request",
        "- Ukuran maksimum per file: **5MB**",
        "- Tipe yang didukung: **JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT**",
        "",
        "**Cara kirim:** gunakan `Content-Type: multipart/form-data` dengan field name **`files`**.",
      ].join("\n"),
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "ID post tujuan" }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["files"],
              properties: {
                files: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: "File yang akan diupload (bisa lebih dari satu)",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": successResponse(
          { type: "array", items: postFileSchema },
          "File berhasil diupload",
        ),
        "400": errorResponse("Tidak ada file / tipe tidak didukung / ukuran melebihi batas"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan post milik kamu"),
        "404": errorResponse("Post tidak ditemukan"),
      },
    },
  },

  "/api/posts/{id}/files/{fileId}": {
    delete: {
      tags: ["Posts"],
      summary: "Hapus satu file dari post",
      description: "Menghapus file dari disk dan menghapus record-nya dari database.",
      security: bearerAuth,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "ID post" },
        { name: "fileId", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "ID file yang akan dihapus" },
      ],
      responses: {
        "200": successResponse({}, "File berhasil dihapus"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan file dari post milik kamu"),
        "404": errorResponse("File tidak ditemukan"),
      },
    },
  },

  // ── Users (Admin only) ───────────────────────────────────────────────────────
  "/api/users": {
    get: {
      tags: ["Users (Admin)"],
      summary: "List semua user",
      description: "Hanya **ADMIN** yang bisa akses.",
      security: bearerAuth,
      parameters: [...paginationParams, { name: "role", in: "query", schema: { type: "string", enum: ["ADMIN", "MODERATOR", "USER"] }, description: "Filter berdasarkan role" }, { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] }, description: "Filter berdasarkan status" }],
      responses: {
        "200": paginatedResponse(userSchema),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan admin"),
      },
    },
    post: {
      tags: ["Users (Admin)"],
      summary: "Buat user baru (admin)",
      description: "Hanya **ADMIN** yang bisa akses. Bisa menentukan role langsung.",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password"],
              properties: {
                name: { type: "string", minLength: 2, example: "Jane Doe" },
                email: { type: "string", format: "email", example: "jane@example.com" },
                password: { type: "string", minLength: 6, example: "password123" },
                role: { type: "string", enum: ["ADMIN", "MODERATOR", "USER"], default: "USER" },
                status: { type: "string", enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
                phone: { type: "string", example: "081234567890" },
                birthDate: { type: "string", example: "1998-03-20" },
              },
            },
          },
        },
      },
      responses: {
        "201": successResponse(userSchema, "User berhasil dibuat"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan admin"),
        "409": errorResponse("Email sudah terdaftar"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/users/{id}": {
    get: {
      tags: ["Users (Admin)"],
      summary: "Detail user",
      description: "Hanya **ADMIN** yang bisa akses. Menyertakan daftar todo milik user.",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": successResponse(userSchema),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan admin"),
        "404": errorResponse("User tidak ditemukan"),
      },
    },
    delete: {
      tags: ["Users (Admin)"],
      summary: "Hapus user",
      description: "Admin tidak bisa menghapus akunnya sendiri.",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": successResponse({}, "User berhasil dihapus"),
        "400": errorResponse("Tidak bisa menghapus akun sendiri"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan admin"),
        "404": errorResponse("User tidak ditemukan"),
      },
    },
  },

  "/api/users/{id}/role": {
    patch: {
      tags: ["Users (Admin)"],
      summary: "Update role user",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["role"],
              properties: {
                role: { type: "string", enum: ["ADMIN", "MODERATOR", "USER"], example: "MODERATOR" },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(userSchema, "Role berhasil diupdate"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan admin"),
        "404": errorResponse("User tidak ditemukan"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },

  "/api/users/{id}/status": {
    patch: {
      tags: ["Users (Admin)"],
      summary: "Update status user",
      security: bearerAuth,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "INACTIVE" },
              },
            },
          },
        },
      },
      responses: {
        "200": successResponse(userSchema, "Status berhasil diupdate"),
        "401": errorResponse("Token tidak valid"),
        "403": errorResponse("Bukan admin"),
        "404": errorResponse("User tidak ditemukan"),
        "422": errorResponse("Validasi gagal"),
      },
    },
  },
};

// ─── OpenAPI Spec Object ───────────────────────────────────────────────────────

/** Objek OpenAPI 3.0 lengkap yang diekspor untuk dipakai di index.ts */
export const openApiSpec = {
  openapi: "3.0.0",

  info: {
    title: "Hono.js REST API",
    version: "2.1.0",
    description: `
REST API dibangun dengan **Bun**, **Hono.js v4**, dan **Prisma ORM**.

## Autentikasi
Gunakan endpoint \`POST /api/auth/login\` untuk mendapatkan \`accessToken\`,
lalu klik tombol **Authorize** di atas dan masukkan token dengan format:
\`\`\`
Bearer <accessToken>
\`\`\`

## Role
- **ADMIN** — Akses penuh ke semua endpoint
- **MODERATOR** — Akses terbatas
- **USER** — Hanya akses profil dan todo milik sendiri
    `,
    contact: {
      name: "fahmiibrahimdevs",
      url: "https://github.com/fahmiibrahimdevs/honojs-api",
    },
  },

  servers: [{ url: "http://localhost:3000", description: "Development server" }],

  /** Definisi security scheme untuk Bearer token */
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Masukkan access token dari endpoint login",
      },
    },
  },

  /** Urutan tag yang tampil di sidebar Swagger UI */
  tags: [
    { name: "Health", description: "Status server" },
    { name: "Auth", description: "Autentikasi dan manajemen profil" },
    { name: "Todos", description: "CRUD todos (semua user, akses sesuai role)" },
    { name: "Posts", description: "CRUD post dengan upload multiple file (semua user, akses sesuai role)" },
    { name: "Users (Admin)", description: "Manajemen user — hanya ADMIN" },
  ],

  paths,
};
