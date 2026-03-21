# PLAN-015 Rewrite E2EE crypto module

- **status**: draft
- **task**: FEAT-089
- **createdAt**: 2026-03-21

## Current State

The current E2EE module has SSSS, cross-signing, and key backup as three independent UI operations. This is architecturally wrong — they must be a single ordered bootstrap flow. Additionally, cross-signing setup has no UIA (User Interactive Auth) handling, and there is no new-device verification flow.

### Files to modify/replace

| File | Action | Description |
|------|--------|-------------|
| `packages/matrix-client/src/services/secret-storage-service.ts` | **Rewrite** | Replace with Map-based key cache (like Cinny), add `storePrivateKey()`, `clearSecretStorageKeys()` |
| `packages/matrix-client/src/services/crypto-service.ts` | **Simplify** | Remove duplicated bootstrap wrappers, keep trust/verification helpers |
| `packages/matrix-client/src/sync/crypto-bridge.ts` | **Keep** | Already correct, minor event listener additions |
| `packages/matrix-client/src/stores/crypto-store.ts` | **Keep** | Already correct |
| `apps/web/src/components/crypto/secret-storage-setup-dialog.tsx` | **Delete** | Replaced by unified setup |
| `apps/web/src/components/crypto/cross-signing-setup-dialog.tsx` | **Delete** | Replaced by unified setup |
| `apps/web/src/components/crypto/device-verification-setup.tsx` | **New** | Unified bootstrap: SSSS → cross-signing → key backup |
| `apps/web/src/components/crypto/manual-verification.tsx` | **New** | New-device verification via recovery key/passphrase |
| `apps/web/src/components/crypto/recovery-key-input-dialog.tsx` | **Rewrite** | Add `checkKey()` validation, passphrase support |
| `apps/web/src/components/settings/panels/encryption-panel.tsx` | **Rewrite** | Replace fragmented buttons with unified flow |

## Proposed Design

### 1. Secret Storage Key Management (Cinny pattern)

Replace the single `cachedKey` variable with a `Map<string, Uint8Array>` for proper multi-key support:

```typescript
// secret-storage-keys.ts
const secretStorageKeys = new Map<string, Uint8Array>()

export function storePrivateKey(keyId: string, privateKey: Uint8Array): void
export function clearSecretStorageKeys(): void
export function hasPrivateKey(keyId: string): boolean

export const cryptoCallbacks = {
  getSecretStorageKey: async ({ keys }) => {
    // Return cached key if available
    // Otherwise return undefined (SDK will call UI callback)
  },
  cacheSecretStorageKey: (keyId, keyInfo, privateKey) => {
    secretStorageKeys.set(keyId, privateKey)
  },
}
```

### 2. Unified Bootstrap Flow (DeviceVerificationSetup)

Single dialog with this exact sequence (from Cinny):

```
1. User enters optional passphrase
2. crypto.createRecoveryKeyFromPassphrase(passphrase)
3. clearSecretStorageKeys()
4. crypto.bootstrapSecretStorage({
     createSecretStorageKey: async () => recoveryKeyData,
     setupNewSecretStorage: true,
   })
5. crypto.bootstrapCrossSigning({
     authUploadDeviceSigningKeys,  // with proper UIA handling
     setupNewCrossSigning: true,
   })
6. crypto.resetKeyBackup()
7. Display recovery key for user to save
```

### 3. UIA (User Interactive Auth) Handling

When `bootstrapCrossSigning` needs to upload device signing keys, the server may require interactive auth (401). Handle this properly:

```typescript
authUploadDeviceSigningKeys: async (makeRequest) => {
  try {
    await makeRequest(null)  // Try without auth first
  } catch (error) {
    if (error instanceof MatrixError && error.httpStatus === 401) {
      // Show password dialog, get auth dict
      const authDict = await promptForAuth(error.data)
      await makeRequest(authDict)
    } else {
      throw error
    }
  }
}
```

### 4. New Device Verification (ManualVerification)

When a user logs in on a new device where cross-signing is already active:

```
1. Detect: cross-signing active but device unverified
2. Show ManualVerification component
3. User enters recovery key or passphrase
4. Validate with secretStorage.checkKey()
5. storePrivateKey(keyId, decodedKey)
6. crypto.bootstrapCrossSigning({})  // loads from SSSS
7. crypto.bootstrapSecretStorage({})  // loads from SSSS
8. crypto.loadSessionBackupPrivateKeyFromSecretStorage()
```

### 5. Recovery Key Validation

Before using any recovery key/passphrase, validate it:

```typescript
// For recovery key string:
const decoded = decodeRecoveryKey(recoveryKeyString)
const match = await client.secretStorage.checkKey(decoded, keyContent)
if (!match) throw new Error('Invalid recovery key')

// For passphrase:
const decoded = await deriveRecoveryKeyFromPassphrase(passphrase, salt, iterations, bits)
const match = await client.secretStorage.checkKey(decoded, keyContent)
if (!match) throw new Error('Invalid passphrase')
```

### 6. Cross-Signing Status Detection

Use account data events (like Cinny) instead of SDK polling:

```typescript
// Check if cross-signing is set up by looking at account data
const masterEvent = client.getAccountData('m.cross_signing.master')
const crossSigningActive = !!masterEvent?.getContent()

// Check if SSSS is set up
const defaultKeyEvent = client.getAccountData('m.secret_storage.default_key')
const defaultKeyId = defaultKeyEvent?.getContent()?.key
```

### 7. Encryption Panel Redesign

Replace the current 4-section panel with:

- **Section 1**: Overall E2EE status (initialized, verified/unverified)
- **Section 2**: If not set up → "Enable Device Verification" button → opens DeviceVerificationSetup
- **Section 2**: If set up but unverified → "Verify This Device" button → opens ManualVerification
- **Section 2**: If verified → Status badge + "Reset" button
- **Section 3**: Key backup status (read-only, managed by the bootstrap flow)

## Implementation Steps

1. Create `secret-storage-keys.ts` with Map-based key cache
2. Rewrite `secret-storage-service.ts` to use new key cache
3. Create `device-verification-setup.tsx` (unified bootstrap)
4. Create `manual-verification.tsx` (new device verification)
5. Rewrite `recovery-key-input-dialog.tsx` with validation
6. Rewrite `encryption-panel.tsx` with unified flow
7. Remove `secret-storage-setup-dialog.tsx` and `cross-signing-setup-dialog.tsx`
8. Update exports in `index.ts`

## Risks

- UIA flow varies by homeserver — may need SSO support in addition to password auth
- Existing users with partial setup may need migration path
- Recovery key format must match matrix-js-sdk expectations exactly

## Alternatives Considered

- Keep fragmented approach and add ordering constraints → Rejected (still error-prone)
- Use matrix-js-sdk's built-in auto-bootstrap → Not available in current SDK version
