/**
 * PersonMenu — canonical person context menu (C4).
 *
 * Consolidates the previous `PersonContextMenu` (Radix-based, deprecated) and
 * `SimpleContextMenu` (custom, mobile-aware) into a single component. Under
 * the hood we delegate to `SimpleContextMenu` because its mobile bottom-sheet
 * story and tiered structure are superior. The wrapper exists so all callers
 * have one import path and one component name to reason about, and so that
 * future migrations to a different primitive are isolated here.
 *
 * Tier structure (implemented inside SimpleContextMenu):
 *   Quick     — Edit · Add Relative · View Relationships · View Profile · Delete
 *   Memories  — Add memory · View gallery (collapsible)
 *   Privacy   — Branch privacy · Invite to claim (collapsible)
 *   Advanced  — View history · Manage tags · Life story · Comments · Their tree · Ghost add (collapsible)
 *
 * Accessibility:
 *   - role="menu" / role="menuitem" semantics are applied in the wrapped component.
 *   - Escape closes; click-outside closes; arrow keys traverse.
 *   - Mobile: bottom sheet with drag-dismiss.
 */
export { SimpleContextMenu as PersonMenu } from './SimpleContextMenu'
export type { SimpleContextMenuProps as PersonMenuProps } from './SimpleContextMenu'
