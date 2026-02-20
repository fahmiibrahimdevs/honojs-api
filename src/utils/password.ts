/**
 * utils/password.ts
 *
 * Utility untuk hashing dan verifikasi password menggunakan bcrypt.
 *
 * KENAPA HASH PASSWORD?
 * Password TIDAK BOLEH disimpan sebagai plain text di database.
 * Jika database bocor, attacker tidak bisa langsung tahu passwordnya.
 * bcrypt adalah algoritma hashing yang dirancang khusus untuk password:
 * - Lambat secara by-design (mencegah brute force)
 * - Menggunakan 'salt' otomatis (mencegah rainbow table attack)
 * - Cost factor mengontrol seberapa lambat (lebih tinggi = lebih aman tapi lebih lambat)
 *
 * Menggunakan Bun.password (built-in Bun runtime, tidak perlu library tambahan).
 */

/**
 * Hash password plain text menggunakan bcrypt.
 * @param password - Password plain text dari user
 * @returns Hash string yang aman untuk disimpan di database
 *
 * Contoh:
 *   Input:  "mypassword123"
 *   Output: "$2b$10$.........." (60 karakter bcrypt hash)
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt", // Algoritma hashing
    cost: 10, // Cost factor (2^10 = 1024 iterasi). Angka aman & tidak terlalu lambat
  });
};

/**
 * Verifikasi password: bandingkan plain text dengan hash yang tersimpan.
 * @param password       - Password plain text yang diinput user saat login
 * @param hashedPassword - Hash yang tersimpan di database
 * @returns true jika cocok, false jika tidak
 *
 * Catatan: Gunakan fungsi ini, JANGAN hash ulang lalu bandingkan string.
 * bcrypt menggunakan salt acak, jadi hash yang sama akan berbeda setiap kali di-hash.
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await Bun.password.verify(password, hashedPassword, "bcrypt");
};
