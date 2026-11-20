# Security Specification & Payload-First TDD (`FicheMaster IA`)

## 1. Data Invariants
1. **Strict Ownership Isolation**: No authenticated user can read, list, create, update, or delete any document under `/users/{otherUserId}/...`. Every document's `ownerId` must equal both the path `{userId}` and `request.auth.uid`.
2. **Email Verification Gate**: All reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Integrity**: Subcollection reads/writes (`settings`, `sheets`, `tdExercises`, `annales`) require the parent `/users/{userId}` document to exist and belong to `request.auth.uid`.
4. **Immutable Ownership & Identifiers**: `ownerId`, `id`, and `createdAt` can never be reassigned on update.
5. **Server Timestamp Enforcement**: `createdAt` (on create) and `updatedAt` (on create and update) must equal `request.time`.
6. **Strict Schema & Volumetric Bounds**: No extra shadow fields (`hasOnly`), bounded string sizes, bounded list sizes, valid enums, and regex-validated IDs (`^[a-zA-Z0-9_\\-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: `auth = null` reading `/users/alice/sheets/s1`.
2. **Unverified Email Write**: `auth = { uid: 'alice', token: { email_verified: false } }` creating `/users/alice`.
3. **Cross-User Spoofing (`ownerId` Mismatch)**: `auth = alice` writing `/users/alice/sheets/s1` with `ownerId: 'bob'`.
4. **Cross-User Path Access**: `auth = alice` reading or listing `/users/bob/sheets`.
5. **Shadow / Ghost Field Injection**: `auth = alice` creating a sheet with an extra `{ isAdmin: true }` or `{ quotaBypass: true }` field.
6. **Path ID Poisoning**: `auth = alice` writing `/users/alice/sheets/../../bad$id!` or a 300-character document ID.
7. **Orphan Subcollection Write (Missing Master Gate)**: `auth = alice` creating `/users/alice/sheets/s1` before `/users/alice` exists.
8. **Client-Forged Timestamp**: `auth = alice` creating a sheet with `createdAt: "2099-01-01T00:00:00Z"` instead of `request.time`.
9. **Immutable `createdAt` / `ownerId` Tampering on Update**: `auth = alice` updating a sheet and changing `createdAt` or `ownerId` or `id`.
10. **Invalid Enum Value Poisoning**: `auth = alice` setting `mastery: "hacked_level"` or `status: "bypassed"` or `selectedProvider: "unknown"`.
11. **Array Exhaustion ("Denial of Wallet")**: `auth = alice` uploading a sheet with `tags` array of length `> 25` or `flashcards` length `> 120`.
12. **Oversized String Exhaustion**: `auth = alice` updating `settings/preferences` with `claudeKey` length `> 512` or `title` length `> 300`.
