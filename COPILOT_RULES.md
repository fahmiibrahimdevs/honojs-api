# 🤖 Copilot Rules — honojs-api

> File ini adalah panduan wajib yang harus diikuti setiap kali melakukan prompting ke AI (GitHub Copilot, ChatGPT, dll) untuk project ini.
> Tujuannya agar semua kode yang dihasilkan konsisten, mudah dipahami, dan sesuai arsitektur yang sudah ada.

---

## 🏗️ 1. Arsitektur

Project ini menggunakan **Clean Architecture** dengan alur berikut:

```
Request → Route → Middleware → Controller → Service → Repository → Prisma → Database
```

- **Route** (`src/routes/`) — Hanya mendefinisikan path dan menghubungkan middleware + controller. Tidak ada logika.
- **Middleware** (`src/middleware/`) — Autentikasi (JWT) dan otorisasi (role). Gunakan `throw Exception`, bukan `return c.json(...)`.
- **Controller** (`src/controllers/`) — Baca request (query, body, param), validasi pakai Zod `.safeParse()`, panggil service, return response. Tidak ada query database.
- **Service** (`src/services/`) — Semua logika bisnis. Tidak boleh tahu apapun tentang HTTP. Jika error, lempar Exception.
- **Repository** (`src/repositories/`) — Satu-satunya tempat query Prisma. Service tidak boleh akses `prisma` langsung.
- **Types** (`src/types/`) — Semua interface/type global.
- **Exceptions** (`src/exceptions/`) — Gunakan exception class yang sudah ada. Jangan buat `new Error()` biasa.

---

## 💬 2. Komentar Kode (WAJIB)

Setiap file dan setiap baris kode **HARUS** disertai komentar yang jelas.

### Aturan komentar:

1. **Setiap file wajib memiliki JSDoc block di baris pertama**, menjelaskan:
   - Nama file
   - Peran file dalam arsitektur
   - Hal penting yang perlu diketahui

   ```typescript
   /**
    * src/services/contoh.service.ts
    *
    * Service untuk [deskripsi singkat].
    *
    * [Penjelasan lebih lanjut jika perlu]
    */
   ```

2. **Setiap function/method wajib ada JSDoc** di atasnya:

   ```typescript
   /**
    * Buat todo baru untuk user yang sedang login.
    * userId diambil dari JWT token, bukan dari body request.
    */
   async create(...) { ... }
   ```

3. **Setiap baris logika penting wajib ada inline comment**:

   ```typescript
   const skip = (page - 1) * limit; // Hitung offset dari nomor halaman
   const where = role === "ADMIN" ? {} : { userId }; // Admin lihat semua, user lihat milik sendiri
   ```

4. **Komentar dalam Bahasa Indonesia** (kecuali nama variabel/function tetap bahasa Inggris).

5. **Setiap `import` wajib ada komentar** singkat apa fungsinya:
   ```typescript
   import { prisma } from "../lib/prisma"; // Singleton Prisma client
   import { hashPassword } from "../utils/password"; // Bcrypt hash helper
   ```

---

## 🧱 3. Tech Stack

Selalu gunakan teknologi berikut, jangan mengganti dengan library lain tanpa alasan:

| Kebutuhan | Yang Dipakai                                                |
| --------- | ----------------------------------------------------------- |
| Runtime   | **Bun** (bukan Node.js)                                     |
| Framework | **Hono.js v3**                                              |
| ORM       | **Prisma v5** + MySQL                                       |
| Validasi  | **Zod** — selalu pakai `.safeParse()`, bukan `.parse()`     |
| Auth      | **JWT dual-token** (access 15m + refresh 7d) via `hono/jwt` |
| Password  | **`Bun.password`** (bcrypt bawaan Bun, bukan bcryptjs)      |
| Response  | Helper `response.*` dari `src/utils/response.ts`            |
| Logging   | Helper `logger.*` dari `src/utils/logger.ts`                |
| Error     | Throw class dari `src/exceptions/index.ts`                  |

---

## 🔐 4. Autentikasi & Otorisasi

- Token dikirim via header: `Authorization: Bearer <token>`
- Payload JWT berisi: `{ userId, email, role }`
- Data user di context Hono diambil dengan: `c.get("user")`
- Role yang tersedia: `ADMIN`, `MODERATOR`, `USER`
- Status yang tersedia: `ACTIVE`, `INACTIVE`
- User dengan status `INACTIVE` tidak boleh login maupun akses API

---

## ❌ 5. Error Handling

Selalu gunakan exception class yang sudah tersedia di `src/exceptions/index.ts`:

```typescript
throw new NotFoundException("Todo"); // 404
throw new UnauthorizedException("..."); // 401
throw new ForbiddenException("..."); // 403
throw new ValidationException(zodErrors); // 422
throw new ConflictException("..."); // 409
throw new BadRequestException("..."); // 400
```

- **Jangan** pernah pakai `throw new Error("...")` biasa
- **Jangan** pernah pakai `return c.json(...)` untuk error di middleware/service
- Global error handler di `src/index.ts` yang akan menangkap semua exception

---

## 📦 6. Response Format

Selalu gunakan helper dari `src/utils/response.ts`:

```typescript
return response.success(c, data); // 200
return response.created(c, data, "Pesan sukses"); // 201
return response.paginated(c, data, meta); // 200 dengan meta paginasi
return response.noContent(c); // 204
return response.error(c, "Pesan error", statusCode); // Error
```

Format response yang dihasilkan selalu konsisten:

```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 }
}
```

---

## 🗂️ 7. Konvensi Penamaan

### File

- Repository : `nama.repository.ts`
- Service : `nama.service.ts`
- Controller : `nama.controller.ts`
- Route : `nama.ts` (di folder `routes/`)

### Method Controller (konvensi Laravel Resource):

| Method    | HTTP      | Path                |
| --------- | --------- | ------------------- |
| `index`   | GET       | `/api/resource`     |
| `show`    | GET       | `/api/resource/:id` |
| `store`   | POST      | `/api/resource`     |
| `update`  | PUT/PATCH | `/api/resource/:id` |
| `destroy` | DELETE    | `/api/resource/:id` |

### Variabel

- camelCase untuk variabel dan function
- PascalCase untuk class, interface, type, dan object export (`UserRepository`, `AuthService`)
- UPPER_SNAKE_CASE untuk konstanta config

---

## 🔁 8. Paginasi & Search

Setiap endpoint list (`index`) harus mendukung:

- `?page=1` — nomor halaman (default: 1)
- `?limit=10` — jumlah per halaman (default: 10)
- `?search=keyword` — pencarian teks (jika relevan)

Meta paginasi wajib disertakan di response:

```json
{
  "page": 1,
  "limit": 10,
  "total": 42,
  "totalPages": 5,
  "search": "keyword"
}
```

---

## 🛡️ 9. Keamanan

- Jangan pernah return field `password` atau `refreshToken` di response
- Selalu gunakan `userSelect` di repository untuk query yang aman
- Pesan error login selalu generik: `"Invalid credentials"` (jangan bocorkan apakah email ada atau tidak)
- `userId` selalu diambil dari JWT token, **bukan** dari body request
- Validasi semua input dengan Zod sebelum diproses

---

## 📝 10. Cara Prompting yang Benar

Ketika membuat prompt ke AI untuk project ini, selalu sertakan konteks berikut di awal:

```
Ikuti aturan di COPILOT_RULES.md untuk project ini:
- Bahasa komentar: Indonesia
- Arsitektur: Clean Architecture (Route → Controller → Service → Repository)
- Setiap baris kode harus ada inline comment
- Setiap file harus ada JSDoc block di baris pertama
- Gunakan exception class yang sudah ada, bukan throw new Error()
- Gunakan response helper, bukan c.json() langsung
- Tech stack: Bun + Hono.js v3 + Prisma v5 + Zod + JWT dual-token
```

---

## 🚀 11. Git: Semantic Commit & Versioning

### Semantic Commit Message

Setiap commit **wajib** menggunakan format berikut:

```
<type>(<scope>): <deskripsi singkat>
```

**Type yang tersedia:**

| Type       | Kapan dipakai                                |
| ---------- | -------------------------------------------- |
| `feat`     | Fitur baru                                   |
| `fix`      | Bug fix                                      |
| `refactor` | Restrukturisasi kode tanpa mengubah perilaku |
| `docs`     | Perubahan dokumentasi / komentar             |
| `chore`    | Update dependency, config, tooling           |
| `test`     | Menambah atau memperbaiki test               |
| `perf`     | Optimasi performa                            |
| `style`    | Formatting, tidak mengubah logika            |

**Contoh commit yang benar:**

```bash
git commit -m "feat(todos): add search query param support"
git commit -m "fix(auth): remove duplicate method in auth.service.ts"
git commit -m "refactor(routes): rewrite to Laravel-style resource routing"
git commit -m "docs: add COPILOT_RULES.md with project conventions"
git commit -m "chore: upgrade hono to v4"
```

**Aturan tambahan:**

- Gunakan bahasa **Inggris** untuk pesan commit
- Deskripsi singkat, maksimal **72 karakter**
- Jangan pakai titik di akhir
- Kelompokkan perubahan yang relevan dalam satu commit (jangan commit per baris)

---

### Semantic Versioning (SemVer)

Format versi: `vMAJOR.MINOR.PATCH`

| Versi   | Kapan naik                                               |
| ------- | -------------------------------------------------------- |
| `MAJOR` | Breaking change (API berubah, tidak backward compatible) |
| `MINOR` | Fitur baru yang backward compatible                      |
| `PATCH` | Bug fix atau perubahan kecil                             |

**Cara membuat tag versi baru:**

```bash
# Buat annotated tag dengan deskripsi
git tag -a v2.1.0 -m "release: v2.1.0 - deskripsi singkat perubahan"

# Push tag ke GitHub
git push origin v2.1.0
```

**Setelah push tag, buat GitHub Release dengan `gh` CLI:**

```bash
gh release create v2.1.0 \
  --title "v2.1.0 - Judul Release" \
  --notes "## ✨ Changelog

### ✨ New Features
- Fitur baru A

### ♻️ Refactored
- Perubahan B

### 🐛 Bug Fixes
- Fix C"
```

> ⚠️ Tag saja (`git tag + git push`) **TIDAK** otomatis membuat Release di GitHub.
> Selalu jalankan `gh release create` setelah push tag agar muncul di halaman Releases.

**Contoh alur lengkap:**

```bash
# 1. Commit dengan semantic message
git add src/repositories/todo.repository.ts
git commit -m "feat(todos): add search by title and description"

# 2. Tag dan push
git tag -a v2.1.0 -m "release: v2.1.0 - add search feature for todos"
git push origin main
git push origin v2.1.0

# 3. Buat GitHub Release
gh release create v2.1.0 \
  --title "v2.1.0 - Search Feature for Todos" \
  --notes "## ✨ New Features
- Add search by title and description on GET /api/todos
- Support ?search=keyword query param"
```

---

## 📖 12. Swagger UI & OpenAPI Spec

API ini memiliki dokumentasi interaktif yang bisa diakses di:

- **Swagger UI** : `http://localhost:3000/docs`
- **Raw JSON spec** : `http://localhost:3000/docs/json`

### File spec

Semua definisi OpenAPI ada di **`src/docs/openapi.ts`**.
File ini **harus diupdate** setiap kali ada perubahan endpoint.

### Aturan update spec:

1. **Tambah endpoint baru** → tambahkan path baru di objek `paths` di `openapi.ts`
2. **Ubah request body / response** → update schema yang bersesuaian
3. **Endpoint butuh auth** → tambahkan `security: bearerAuth`
4. **Endpoint baru butuh tag baru** → tambahkan di array `tags` di bagian bawah spec

### Struktur `openapi.ts`:

```
openapi.ts
├── successResponse()     → helper untuk response 200/201
├── paginatedResponse()   → helper untuk response dengan meta paginasi
├── errorResponse()       → helper untuk response error
├── userSchema            → reusable schema data user
├── todoSchema            → reusable schema data todo
├── paginationParams      → reusable query params (page, limit)
├── paths                 → semua definisi endpoint
└── openApiSpec           → objek final yang diekspor
```

### Cara test Swagger UI:

1. Buka `http://localhost:3000/docs`
2. Klik **Authorize** → masukkan `Bearer <accessToken>` dari hasil login
3. Pilih endpoint → **Try it out** → isi parameter → **Execute**

---

## 📁 Struktur Direktori

```
src/
├── config/         → Konfigurasi app dari env vars
├── controllers/    → HTTP handler (baca request, validasi, panggil service)
├── docs/           → OpenAPI 3.0 spec (openapi.ts) → Swagger UI di /docs
├── exceptions/     → Custom exception classes
├── lib/            → Singleton (Prisma client)
├── middleware/     → Auth & role middleware
├── repositories/   → Query database (hanya Prisma di sini)
├── routes/         → Definisi path API
├── services/       → Logika bisnis
├── types/          → Interface & type global
└── utils/          → Helper (response, logger, jwt, password)
prisma/
└── schema.prisma   → Skema database
```
