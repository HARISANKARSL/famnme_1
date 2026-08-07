# ELK Layout Service Documentation

The ELK Layout Service is responsible for calculating positions for all nodes in the family tree visualization. It uses the Eclipse Layout Kernel (ELK.js) with a Union-based graph model.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Usage](#usage)
- [Configuration](#configuration)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is ELK?

**Eclipse Layout Kernel (ELK)** is an industry-grade graph layout library that automatically calculates optimal positions for nodes and edges in a graph. It's used by Eclipse IDE, PlantUML, and many other professional applications.

### Why ELK for Family Trees?

✅ **Deterministic** - Same input always produces same output
✅ **Handles Complexity** - Multiple marriages, large families, distant relatives
✅ **Separation of Concerns** - Layout logic separate from rendering
✅ **Battle-Tested** - Used in production by major software tools
✅ **Configurable** - Extensive options for fine-tuning

---

## Architecture

### Union-Based Model

The family tree uses a **Union-based model** to solve the spouse cycle problem:

```
Traditional Model (BROKEN):           Union-Based Model (CORRECT):
    Dad ←→ Mom (cycle!)                    Dad → Union ← Mom
     ↓      ↓                                      ↓
     Child                                       Child
```

**Key Principles:**
- **Person nodes** are visible cards (180×240px)
- **Union nodes** are invisible anchors (24×24px)
- **Children belong to Unions**, not directly to parents
- This creates a proper Directed Acyclic Graph (DAG) for ELK

### Data Flow

```
Neo4j Data → ELK Layout Service → Positions → React Components
```

1. **Input**: Persons, unions, relationships from Neo4j
2. **Processing**: ELK calculates optimal positions
3. **Post-processing**: Adjust spouse positions, fix separations
4. **Output**: Map of node IDs to `{x, y}` positions

---

## Usage

### Basic Usage

```typescript
import { calculateFamilyTreeLayout } from '@/services/elkLayoutService';

const layoutInput = {
  persons: [...],  // Array of Person objects
  unions: [...],   // Array of Union objects
  relationships: [...]  // Array of Relationship objects
};

const result = await calculateFamilyTreeLayout(layoutInput);

// result.positions is a Map<string, {x: number, y: number}>
const johnPos = result.positions.get('john-id');
console.log(`John is at (${johnPos.x}, ${johnPos.y})`);

// result.bounds contains bounding box
console.log(`Tree size: ${result.bounds.width}×${result.bounds.height}`);
```

### Input Types

```typescript
interface LayoutInput {
  persons: Person[];      // Array of person nodes
  unions: Union[];        // Array of union nodes
  relationships: Relationship[];  // Array of edges
}

interface Relationship {
  fromId: string;
  toId: string;
  type: 'PARTNER_IN' | 'HAS_CHILD';
}
```

### Output Types

```typescript
interface LayoutResult {
  positions: Map<string, Position>;  // Node ID → {x, y}
  bounds: {
    width: number;
    height: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}
```

---

## Configuration

### Layout Constants

Defined in `src/constants/layoutConstants.ts`:

```typescript
export const LAYOUT_CONSTANTS = {
  PERSON_WIDTH: 180,        // Fixed person card width
  PERSON_HEIGHT: 240,       // Fixed person card height
  UNION_WIDTH: 24,          // Invisible union node width
  UNION_HEIGHT: 24,         // Invisible union node height
  GENERATION_GAP: 40,       // Vertical spacing between generations
  NODE_SPACING: 120,        // Horizontal spacing between nodes
  SPOUSE_GAP: 200,          // Distance between spouses
  SIBLING_GAP: 240,         // Distance between siblings
};
```

### ELK Configuration

```typescript
const ELK_CONFIG = {
  'elk.algorithm': 'layered',           // Use layered (hierarchical) layout
  'elk.direction': 'DOWN',              // Top to bottom
  'elk.edgeRouting': 'ORTHOGONAL',      // Right-angle edges
  'elk.layered.spacing.nodeNodeBetweenLayers': 52,  // Generation gap
  'elk.spacing.nodeNode': 240,          // Horizontal spacing
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',  // Optimize placement
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',  // Minimize edge crossings
};
```

**Modifying Configuration:**

To change spacing:
1. Update `LAYOUT_CONSTANTS` in `layoutConstants.ts`
2. ELK config automatically uses these values
3. Re-run layout to see changes

---

## Advanced Features

### 1. Fixing Separated Spouses

**Problem**: ELK may position a person BETWEEN two spouses in cases of multiple marriages.

**Example**:
```
Before Fix:  Deepak — Sneha — Kavya   (Sneha is between Deepak and Kavya)
After Fix:   Deepak — Kavya     Sneha (Spouses brought together)
```

**Solution**: `fixSeparatedSpouses()` detects and swaps positions.

```typescript
function fixSeparatedSpouses(
  positions: Map<string, Position>,
  unions: Union[],
  relationships: Relationship[],
  persons: Person[]
): void
```

**Algorithm**:
1. For each union, find the two partners
2. Check if they're on the same horizontal level
3. Detect if any person is positioned BETWEEN them
4. Swap the intruder with the farther spouse

### 2. Adjusting Spouse Positions

**Goal**: Position spouses side-by-side around their union node.

```typescript
function adjustSpousePositions(
  positions: Map<string, Position>,
  unions: Union[],
  relationships: Relationship[],
  persons: Person[]
): void
```

**CRITICAL**: We DON'T reposition person nodes - we trust ELK's layout. We ONLY recalculate the union anchor point to be between the two spouses.

**Algorithm**:
1. For each union, find its partners
2. Calculate midpoint between spouse centers
3. Position union at the midpoint
4. This creates the visual "connection line" between spouses

### 3. Handling Multiple Marriages

The layout service automatically handles:
- ✅ Person with multiple unions (e.g., widower remarriage)
- ✅ Half-siblings from different unions
- ✅ Stepfamilies
- ✅ Complex lineages

**Example**:
```
Person A — Union1 — Person B
    |
Person A — Union2 — Person C
    |
  Children from each union
```

Each union is independent, so layout doesn't get confused.

---

## Troubleshooting

### Common Issues

#### 1. Overlapping Nodes

**Symptom**: Person cards overlap each other

**Solution**: Increase spacing constants
```typescript
NODE_SPACING: 150,  // Was 120
SPOUSE_GAP: 250,    // Was 200
```

#### 2. Spouses Too Far Apart

**Symptom**: Married couples are positioned far from each other

**Cause**: ELK optimized for overall layout, not spouse proximity

**Solution**: `adjustSpousePositions()` runs automatically. If still too far:
- Check union width calculation in `buildELKGraph()`
- Verify `SPOUSE_GAP` constant

#### 3. Children Not Centered Under Parents

**Symptom**: Child appears offset from parent union

**Cause**: Union anchor point not between spouses

**Solution**: Verify `adjustSpousePositions()` is running correctly

#### 4. Vertical Spacing Too Large/Small

**Symptom**: Generations are too far apart or too close

**Solution**: Adjust `GENERATION_GAP` constant
```typescript
GENERATION_GAP: 60,  // Increase for more space
```

#### 5. Layout Changes on Refresh

**Symptom**: Tree layout is different each time

**Cause**: Non-deterministic input order

**Solution**: Ensure consistent ordering of input data
```typescript
persons.sort((a, b) => a.personId.localeCompare(b.personId));
```

---

## Performance

### Benchmarks

| Tree Size | Nodes | Time  | Notes |
|-----------|-------|-------|-------|
| Small     | 10    | <50ms | Instant |
| Medium    | 50    | <200ms | Fast |
| Large     | 200   | <1s   | Acceptable |
| Huge      | 1000  | 2-5s  | Use windowed queries |

### Optimization Tips

1. **Use Windowed Queries**: Only load 3 generations up/down
2. **Cache Results**: Store layout in state, don't recalculate on every render
3. **Debounce**: Wait for user to stop panning before recalculating
4. **Web Workers**: Run ELK in a worker thread (future enhancement)

---

## React Component Contract

**CRITICAL RULE**: "If ELK didn't say it, React must not do it."

❌ **NEVER** calculate positions in React components
❌ **NEVER** apply manual offsets to ELK positions
❌ **NEVER** implement your own layout logic

✅ **ALWAYS** use positions from `calculateFamilyTreeLayout()`
✅ **ALWAYS** trust ELK's output
✅ **ONLY** render what ELK tells you to render

**Example**:

```typescript
// ✅ GOOD
function PersonCard({ person, position }) {
  return (
    <div style={{
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: LAYOUT_CONSTANTS.PERSON_WIDTH,
      height: LAYOUT_CONSTANTS.PERSON_HEIGHT
    }}>
      {person.firstName}
    </div>
  );
}

// ❌ BAD
function PersonCard({ person, position }) {
  const adjustedX = position.x + 50; // NO! Don't modify ELK positions!
  return <div style={{ left: adjustedX }}>...</div>;
}
```

---

## Testing

### Unit Tests

Located in `src/services/__tests__/elkLayoutService.test.ts`

```bash
npm test elkLayoutService
```

### Manual Testing

```bash
npx tsx src/services/__tests__/elkLayoutService.test.ts
```

This outputs positions for sample families to verify layout works.

---

## Future Enhancements

- [ ] Web Worker support for better performance
- [ ] Incremental layout (only recalculate changed portions)
- [ ] Animation between layout states
- [ ] Force-directed layout option for exploratory mode
- [ ] Constraint-based layout (keep certain nodes fixed)
- [ ] Export layout as SVG/PNG

---

## References

- [ELK.js Documentation](https://www.eclipse.org/elk/)
- [ELK Layered Algorithm](https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-layered.html)
- [Union-Based Model](../../references/family-tree_ancestry.md)
- [Layout Mathematics](../../references/layout-mathematics.md)

---

## Support

For issues with the ELK layout service:
1. Check this documentation
2. Review test cases in `__tests__/elkLayoutService.test.ts`
3. Enable debug logging: `console.log()` in `calculateFamilyTreeLayout()`
4. Verify input data structure matches expected format

**Common Debug Commands**:

```typescript
// Log all positions
console.log('Positions:', Object.fromEntries(result.positions));

// Log bounds
console.log('Bounds:', result.bounds);

// Check if specific node has position
console.log('Has john?', result.positions.has('john-id'));
```
