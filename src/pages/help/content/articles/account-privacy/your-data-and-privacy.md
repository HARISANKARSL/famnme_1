---
title: Your data and privacy
description: Who sees what, and how to export or delete your data.
updated: 2026-04-20
order: 3
tags: [privacy, data, export, gdpr]
---

FamNme treats your family data as sensitive by default. This article summarizes what's shared, what's private, and how to take your data with you.

## Visibility model

Every tree has a default visibility (Public / Family / Private) and every person within can override it. Only collaborators with the right role can see records set to their level. Public is off by default — a tree is never publicly discoverable unless you explicitly share it.

Photos are stored on encrypted object storage and served through a CDN with long, unguessable URLs. A photo URL is viewable by anyone who has the URL, so avoid pasting photo URLs into public spaces.

## What FamNme stores about you

- Your account (email, hashed password, name).
- Trees you own or collaborate on, and the people inside those trees.
- Memories, photos, and stories you've created or are tagged in.
- Session records (IP, user agent, login timestamps) for security.
- Reaction and reply history.

We do **not** store:

- Your plain-text password — ever. Passwords are bcrypt-hashed at rest.
- Tracking data from external analytics providers — we don't embed them.
- Advertising identifiers.

## Exporting your data

From **Settings → Privacy → Export my data** you can request a full archive:

- JSON records of every tree you own, every person, every relationship.
- A zip of all your uploaded photos.
- Memories, stories, and replies you authored.

Exports are prepared asynchronously (large trees can take a few minutes). You'll get an email with a download link when ready; the link expires in 7 days.

## Asking FamNme to delete your data

Delete your account from **Settings → Account → Delete account**. See [Deleting your account](/help/account-privacy/deleting-your-account) for the full two-step flow and what gets removed.

## Legal & compliance

FamNme complies with Indian DPDP Act and GDPR principles for data subject rights. Contact support for formal requests: right-to-access, right-to-be-forgotten, or right-to-rectify.
