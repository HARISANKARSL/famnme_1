---
title: Managing passkeys
description: Add, name, and remove passkeys for passwordless sign-in.
updated: 2026-04-20
order: 1
tags: [passkey, webauthn, security]
---

Passkeys are the easiest and safest way to sign in. Instead of a password, your device proves it's you using biometrics (Face ID, Touch ID, Windows Hello) and a cryptographic key.

## Adding a passkey

1. Sign in first using your password or Google.
2. Go to **Settings → Account → Passkeys**.
3. Click **+ Add passkey**.
4. Your browser prompts for biometrics. Approve.
5. Optionally name the passkey (e.g., *"iPhone 16"*, *"Office Mac"*) so you can identify it later.

The passkey is stored in your device's secure enclave and synced to your cloud keychain (iCloud Keychain, Google Password Manager, 1Password, etc.) depending on your setup.

## Signing in with a passkey

On the login screen, click **Sign in with passkey**. Your browser suggests matching passkeys; pick one and approve with biometrics. No password, no 2FA code — you're in.

Browsers that don't support passkeys (old versions) fall back to password + 2FA automatically.

## Removing a passkey

From Settings → Account → Passkeys, click the trash icon next to the passkey you want to remove. A confirmation dialog appears; confirm.

**Important**: remove passkeys for lost or old devices promptly. A passkey is a credential — anyone with the device (and its biometrics bypassed) can sign in with it.

## Multiple passkeys

We recommend adding passkeys to every device you regularly use. If you lose one, the others still work. There's no hard cap, but most people have 2–4.

## Passkey troubleshooting

- **"No passkeys found"** on login: your current browser doesn't have synced access to your passkeys. Sign in with password instead, then add a passkey from this device.
- **Can't add a passkey**: your browser/device must support WebAuthn — most modern browsers do. Update to the latest version.
