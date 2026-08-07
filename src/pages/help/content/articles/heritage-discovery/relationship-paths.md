---
title: Relationship paths
description: How FamNme figures out "cousin twice removed" and other labels.
updated: 2026-04-20
order: 1
tags: [relationship, kinship, cousin, path]
---

The Relationship Path tool shows how any two people in the tree are connected, with an English-language label for the relationship.

## Opening it

- From the Heritage section of the sidebar → **Relationship Path**.
- Or right-click any person and pick **Find relationship to…**. You'll be prompted for the second person.

## What you see

- A visual path — the chain of parent, child, and spouse links connecting the two people.
- A label like *"First cousin, once removed"* or *"Paternal great-aunt"*.
- The degree (number of links in the shortest path).

## How it's computed

The algorithm finds the shortest path between the two people through a BFS over the relationship graph, then runs a kinship-labeling step:

- Direct ancestors / descendants (parent, grandparent, great-grandparent).
- Siblings, half-siblings, step-siblings — detected from shared parents and the parent edge types.
- Cousins — with removals (generational offset) and degrees (common-ancestor distance).
- Spousal variants — spouse, spouse's parent (in-law), etc.

If there's no connecting path, the tool says so — this usually means two separate branches of the tree that haven't been bridged yet.

## Indian-family labels

Because English has fewer relationship words than many Indian languages, FamNme also offers **Indian English** labels (e.g., *chacha*, *bua*, *mama*) when the path is unambiguous. Toggle at the top of the Relationship Path panel.

## Caveats

- Adoptive and step-relationships are labeled distinctly (*step-aunt*) when the edge types are set correctly.
- Multiple paths: if two people share more than one connection, FamNme shows the shortest; click *Show other paths* to see alternatives.
