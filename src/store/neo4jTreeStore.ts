/**
 * Neo4j Tree Store - Zustand store for Neo4j-based family tree
 *
 * Replaces Supabase-based treeStore with Neo4j backend.
 * Compatible API with existing modals (AddRelativeModal, etc.)
 */

import { create } from 'zustand';
import { neo4jService, type Person, type Union, type FamilyTree, type PersonInput, type UnionInput } from '@/services/neo4jService';
import type { Relationship } from '@/services/elkLayoutService';

interface Neo4jTreeState {
  tree: FamilyTree | null;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  selectedPersonId: string | null;
  loading: boolean;

  // Actions
  setTree: (tree: FamilyTree | null) => void;
  setPersons: (persons: Person[]) => void;
  setSelectedPersonId: (id: string | null) => void;

  // API operations
  loadTree: () => Promise<void>;
  createTree: (treeName: string) => Promise<void>;
  loadTreeWindow: (focusPersonId: string) => Promise<void>;
  createPerson: (treeId: string, personData: PersonInput) => Promise<Person>;
  createUnion: (partner1Id: string, partner2Id: string | null, unionData?: UnionInput) => Promise<Union>;
  addChildToUnion: (unionId: string, childData: PersonInput) => Promise<Person>;
  addSibling: (
    referencePersonId: string,
    siblingData: PersonInput,
    parentChoice: 'FULL' | 'MATERNAL_HALF' | 'PATERNAL_HALF' | 'UNKNOWN'
  ) => Promise<Person>;
}

export const useNeo4jTreeStore = create<Neo4jTreeState>((set, _get) => ({
  tree: null,
  persons: [],
  unions: [],
  relationships: [],
  selectedPersonId: null,
  loading: false,

  setTree: (tree) => set({ tree }),
  setPersons: (persons) => set({ persons }),
  setSelectedPersonId: (id) => set({ selectedPersonId: id }),

  /**
   * Load user's trees (just gets the first one for demo)
   */
  loadTree: async () => {
    try {
      set({ loading: true });
      const trees = await neo4jService.getUserTrees();

      if (trees.length > 0) {
        set({ tree: trees[0], loading: false });
      } else {
        set({ tree: null, loading: false });
      }
    } catch (error) {
      console.error('Failed to load tree:', error);
      set({ loading: false });
    }
  },

  /**
   * Create a new family tree
   */
  createTree: async (treeName) => {
    try {
      const tree = await neo4jService.createTree(treeName, 'My Family Tree');
      set({ tree });
    } catch (error) {
      console.error('Failed to create tree:', error);
      throw error;
    }
  },

  /**
   * Load tree window around a focus person
   */
  loadTreeWindow: async (focusPersonId) => {
    try {
      set({ loading: true });
      const windowData = await neo4jService.getTreeWindow(focusPersonId, 99, 99);

      set({
        persons: windowData.persons,
        unions: windowData.unions,
        relationships: windowData.relationships,
        tree: windowData.trees[0] || null,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load tree window:', error);
      set({ loading: false });
    }
  },

  /**
   * Create a new person
   */
  createPerson: async (treeId, personData) => {
    try {
      const person = await neo4jService.createPerson(treeId, personData);

      // Add to local state
      set((state) => ({
        persons: [...state.persons, person]
      }));

      return person;
    } catch (error) {
      console.error('Failed to create person:', error);
      throw error;
    }
  },

  /**
   * Create a union (marriage/partnership)
   */
  createUnion: async (partner1Id, partner2Id, unionData = {}) => {
    try {
      const union = await neo4jService.createUnion(partner1Id, partner2Id, unionData);

      // Add to local state
      set((state) => ({
        unions: [...state.unions, union]
      }));

      return union;
    } catch (error) {
      console.error('Failed to create union:', error);
      throw error;
    }
  },

  /**
   * Add child to an existing union
   */
  addChildToUnion: async (unionId, childData) => {
    try {
      const child = await neo4jService.addChildToUnion(unionId, childData);

      // Add to local state
      set((state) => ({
        persons: [...state.persons, child]
      }));

      return child;
    } catch (error) {
      console.error('Failed to add child:', error);
      throw error;
    }
  },

  /**
   * Add sibling with parent choice
   */
  addSibling: async (referencePersonId, siblingData, parentChoice) => {
    try {
      const sibling = await neo4jService.addSibling(referencePersonId, siblingData, parentChoice);

      // Add to local state
      set((state) => ({
        persons: [...state.persons, sibling]
      }));

      return sibling;
    } catch (error) {
      console.error('Failed to add sibling:', error);
      throw error;
    }
  },
}));
