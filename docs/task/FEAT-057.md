# FEAT-057: Server Auto-Discovery (.well-known)

## Status: In Progress

## Description
Implement Matrix server auto-discovery using the `.well-known` mechanism:
- `GET https://<domain>/.well-known/matrix/client` returns `{"m.homeserver": {"base_url": "..."}}`
- Allow users to enter just a domain name (e.g., "matrix.org") in the server field
- Automatically resolve the actual homeserver URL

## Implementation
- `packages/matrix-client/src/auth/well-known-service.ts` — discovery logic
- Update `ServerSelector` to support domain-based input with auto-discovery
- i18n keys for discovery status messages

## References
- Matrix spec: [Server Discovery](https://spec.matrix.org/v1.13/client-server-api/#server-discovery)
