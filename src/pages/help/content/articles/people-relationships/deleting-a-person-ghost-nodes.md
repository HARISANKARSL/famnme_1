---
title: Deleting a person and ghost nodes
description: What happens to relationships, and how to reactivate a deletion.
updated: 2026-04-20
order: 5
tags: [delete, ghost node, restore]
---

Deleting a person in FamNme is intentionally soft. When you delete someone, their record becomes a **ghost node** — a placeholder that preserves the lineage chain so the tree doesn't visually collapse.

## Why ghost nodes

If you delete your great-grandfather, you still have a great-grandmother and children of that marriage. Hard-deleting the node would orphan everyone who descended through him. Ghost nodes solve this by:

- Keeping the slot in the union intact (shown as a "+" placeholder).
- Preserving every relationship that passed through the deleted person.
- Allowing the union to continue existing so children still render.

## What a ghost node looks like

A neutral grey card with a plus icon where the photo would be, and "Deleted member" as the label. Hovering it shows "click to add a replacement" — useful when you want to remove one person and add a different one in the same slot.

## Reactivating / restoring

Ghost nodes are not permanently deleted — the underlying record is flagged `isDeleted=true`. From the person's Edit panel (right-click the ghost, pick *Edit*), click **Restore person** to bring them back with all their original data.

Restoration works for up to 30 days after deletion. After 30 days the ghost becomes permanent — the card stays as a placeholder but the underlying data is purged.

## Hard delete (admin)

Tree owners can hard-delete a person immediately (no ghost node) from the person's Edit panel → *Delete forever*. Warning: this also removes their memories, photos, and history. It cannot be undone.

## What about the home person?

If you delete the home person, FamNme automatically reassigns the role to the next-closest remaining relative. You'll see a banner confirming the reassignment and can change it from Tree settings.
