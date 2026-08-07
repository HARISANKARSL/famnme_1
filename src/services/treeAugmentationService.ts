
import type { Person, Union, ExtendedRelationship, TreeWindowData } from '@/types';

/**
 * Augment tree data with ghost spouse nodes for single parents.
 * 
 * If a union has exactly one partner but has children, this function
 * injects a "ghost" person (with isDeleted: true) as the missing spouse.
 * This triggers the "Add Person" UI in the vertical tree (UnionBasedTreeCanvas).
 */
export function augmentWithGhostSpouses(data: TreeWindowData): TreeWindowData {
  const { persons, unions, relationships } = data;
  
  // Maps to quickly find partners and children of unions
  const unionPartners = new Map<string, string[]>();
  const unionHasChildren = new Set<string>();
  
  for (const rel of relationships) {
    if (rel.type === 'PARTNER_IN') {
      const partners = unionPartners.get(rel.toId) ?? [];
      partners.push(rel.fromId);
      unionPartners.set(rel.toId, partners);
    } else if (rel.type === 'HAS_CHILD') {
      unionHasChildren.add(rel.fromId);
    }
  }
  
  const personMap = new Map(persons.map(p => [p.personId, p]));
  const augmentedPersons = [...persons];
  const augmentedRelationships = [...relationships];
  
  for (const union of unions) {
    // Only process unions that have children
    if (!unionHasChildren.has(union.unionId)) continue;
    
    const partners = unionPartners.get(union.unionId) ?? [];
    
    // If exactly one partner, inject a ghost spouse
    if (partners.length === 1) {
      const existingParent = personMap.get(partners[0]);
      if (!existingParent) continue;
      
      const ghostId = `ghost-spouse-${union.unionId}-for-${existingParent.personId}`;
      
      // Determine ghost gender (opposite of existing parent)
      let ghostGender: Person['gender'] = 'female';
      if (existingParent.gender === 'female') {
        ghostGender = 'male';
      } else if (existingParent.gender === 'other') {
        ghostGender = 'other';
      }
      
      // Create ghost person object
      const ghostPerson: Person = {
        personId: ghostId,
        firstName: '',
        lastName: '',
        gender: ghostGender,
        isLiving: true,
        isHomePerson: false,
        isDeleted: true, // Key flag for PersonCard
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Add to persons list
      augmentedPersons.push(ghostPerson);
      
      // Link ghost to union
      augmentedRelationships.push({
        fromId: ghostId,
        toId: union.unionId,
        type: 'PARTNER_IN'
      });
    }
  }
  
  return {
    ...data,
    persons: augmentedPersons,
    relationships: augmentedRelationships
  };
}
