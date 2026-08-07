---
title: Adding spouses and partners
description: How unions work, bidirectional spouse records, and multiple marriages.
updated: 2026-04-20
order: 2
tags: [spouse, marriage, union]
---

A spouse is added by selecting a person and choosing **Add spouse / partner** from the add menu. FamNme creates a **union** that links the two of you; all shared children will hang from that union.

## Bidirectional by design

Behind the scenes, a spouse relationship is recorded in both directions (A → B and B → A). This matters because:

- Both partners can initiate canvas actions like *Add child* on the union.
- Deletion of either partner preserves the other (the union becomes a single-parent unit).
- The layout engine has no ambiguity about who comes first.

You don't have to do anything special — adding a spouse through the UI creates both records automatically.

## Multiple marriages

One person can have multiple spouses (sequentially, historically, or both). Each marriage is its own union:

- The original union stays intact.
- A new union is added, positioned to the side of the first.
- Children are associated with the union they belong to, not just a parent — so a child of a second marriage won't appear under the first spouse.

When you add a child to a person with multiple unions, FamNme asks which union the child belongs to.

## Partners without marriage

The *Add spouse / partner* form has a **partnership type** field: *Married*, *Partnered*, *Engaged*, *Separated*, *Divorced*. Pick the one that matches. The canvas treats all of these the same visually; the label just changes.

## Common issues

- **Spouse only appears on one side** — this was a bug in very early versions. If you see it, edit the person and re-save the relationship; FamNme will create the missing reverse edge.
- **Can't add spouse to a ghost node** — see [Deleting a person and ghost nodes](/help/people-relationships/deleting-a-person-ghost-nodes).
