---
title: Understanding the canvas
description: Pan, zoom, generation tiers, unions, and the grid.
updated: 2026-04-20
order: 5
tags: [canvas, layout, zoom, unions]
---

The canvas is the interactive tree view — the big space in the middle of the dashboard.

## Pan and zoom

- **Drag** the empty background to pan.
- **Scroll** to zoom in and out. Trackpad pinch works too.
- **Ctrl+0** resets the zoom to fit the whole tree on screen.
- **Double-click** a person to center them and zoom in one step.

## Generation tiers

FamNme arranges people in horizontal tiers by generation:

- **0** — the home person (yourself, usually).
- **-1** — parents; **-2** — grandparents; and so on upward.
- **+1** — children; **+2** — grandchildren; and so on downward.

Tiers are calculated by a breadth-first search from the home person. If a relative has no path to the home person they won't appear on the canvas — add a connecting relationship (or make them a root of a new branch).

## Unions — why spouses look like one card

FamNme uses a "family unit" layout. A married couple is rendered as a connected card with both partners, and all their shared children hang from the union. This avoids the classic "spouse cycle" problem where two people are each other's partner and the layout engine can't decide who comes first.

If someone has multiple marriages, each union is drawn as its own unit, positioned to minimize line crossings.

## The grid

Open **Grid settings** from the toolbar to toggle:

- Snap-to-grid alignment.
- Grid spacing (tight / normal / loose).
- Node size (compact / comfortable).
- Text labels (show/hide birth dates, show/hide maiden names).
- Node color by gender, generation, or role.

Your grid preferences are saved per tree.

## Right-click for more

Right-click any person card for a quick menu: *View profile*, *Add relative*, *Edit*, *Delete*, and more. On touch devices, long-press does the same.
