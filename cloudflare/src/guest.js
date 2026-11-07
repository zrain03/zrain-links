/**
 * Fail / File: cloudflare/src/guest.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created: 2026-11-07
 * Dikemas kini / Last updated: 2026-11-07
 * BM: Cipta identiti Guest dan sahkan hak milik pautan tanpa meluaskan akses akaun.
 * EN: Create guest identities and verify link ownership without granting account privileges.
 */

const validKey = /^[a-f0-9]{64}$/;

// BM: Setiap Guest mendapat pengguna sintetik yang mematuhi kekangan pemilik sedia ada.
// EN: Each guest receives a synthetic user that satisfies the existing owner foreign keys.
export async function createGuest(db, {id, now, token, hash}) {
  const uid = id(), guestKey = token(), createdAt = now(), ownerId = "guest:" + uid;
  await db.batch([
    db.prepare("INSERT INTO users (id,email,password_salt,password_hash,created_at) VALUES (?,?,?,?,?)")
      .bind(ownerId,"guest-"+uid+"@guest.invalid","","",createdAt),
    db.prepare("INSERT INTO guest_credentials (key_hash,user_id,created_at) VALUES (?,?,?)")
      .bind(await hash(guestKey),ownerId,createdAt)
  ]);
  return {guestKey};
}

// BM: Token Guest tidak pernah menjadi token login dan tidak boleh mengakses API akaun.
// EN: Guest credentials are never login tokens and cannot access account APIs.
export async function linkOwner(request, db, {authUser, hash}) {
  if (request.headers.has("authorization")) return authUser(request, db);
  const guestKey = request.headers.get("x-guest-key") || "";
  if (!validKey.test(guestKey)) throw {status:401,message:"A valid guest session or sign-in is required."};
  const owner = await db.prepare(
    "SELECT users.id FROM guest_credentials JOIN users ON guest_credentials.user_id = users.id WHERE guest_credentials.key_hash = ?"
  ).bind(await hash(guestKey)).first();
  if (!owner) throw {status:401,message:"Guest session unavailable. Try creating the link again."};
  return {id:owner.id,guest:true};
}
