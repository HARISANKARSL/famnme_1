---
title: Duplicate detection and merging
description: Finding and safely merging accidental duplicate relatives.
updated: 2026-04-20
order: 3
tags: [duplicate, merge, cleanup]
---

Duplicate people creep into any tree over time — usually because two collaborators add the same relative without checking first. FamNme's Duplicate Detection tool surfaces likely matches and helps you merge them safely.

## How detection works

A background job compares every pair of people on:

- Name similarity (first + last, with transliteration awareness for Indian names).
- Birth date proximity.
- Overlapping relationships (same parent, same spouse, same child).
- Photos (image similarity, if both have photos).

Pairs with enough signal are flagged as *potential duplicates* and surfaced in the Discover → Duplicate Detection panel.

## Reviewing a pair

Each pair shows both cards side-by-side with fields highlighted where they differ. You have three options:

- **Merge** — combine them into one record. See below.
- **Not a duplicate** — dismisses the pair permanently.
- **Skip for now** — leaves the pair in the queue.

## The merge flow

When you click Merge, FamNme asks you to pick:

1. **Which record to keep** — the target of the merge. The other's relationships are moved onto this record.
2. **Conflicting fields** — for any field where both records have a value, pick which to keep (or edit a new value).
3. **Photos** — both records' photos are combined on the kept record.
4. **Confirm**.

After merging:

- Relationships from the removed record point to the kept record.
- Memories tagged with the removed record are re-tagged to the kept one.
- The removed record becomes a ghost node pointing to the kept one, so that anyone with a bookmark to the old record still lands somewhere sensible.

## Undo

Merges can be reverted within 7 days from the Activity Feed (see [The activity feed](/help/collaboration-sharing/the-activity-feed)). After 7 days the merge is permanent.

## Preventing duplicates

- Search (Ctrl+K) before adding a new person.
- Fill in birth dates — they're the most reliable disambiguator.
- Ask co-owners to claim their own nodes — then they won't add a duplicate of themselves.
