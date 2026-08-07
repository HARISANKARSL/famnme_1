import { useReducer } from 'react';

export interface MemoriesPageState {
  viewMode: 'grid' | 'list' | 'timeline' | 'albums' | 'lifePhase' | 'map' | 'for-you' | 'interviews' | 'trash' | 'archived' | 'stories';
  typeFilter: string;
  statusFilter: 'all' | 'published' | 'draft';
  categoryFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  taggedPersonId: string;
  templeFilterId: string;
  sortBy: 'newest' | 'oldest' | 'dateTaken' | 'mostLiked' | 'title-az' | 'title-za';
  activeAlbumId: string | null;
  activeAlbumName: string;
  selectMode: boolean;
  selectedIds: Set<string>;
  elderMode: boolean;
}

type Action =
  | { type: 'SET_VIEW_MODE'; payload: MemoriesPageState['viewMode'] }
  | { type: 'SET_TYPE_FILTER'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: MemoriesPageState['statusFilter'] }
  | { type: 'SET_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_DATE_FROM'; payload: string }
  | { type: 'SET_DATE_TO'; payload: string }
  | { type: 'SET_TAGGED_PERSON'; payload: string }
  | { type: 'SET_TEMPLE_FILTER'; payload: string }
  | { type: 'SET_SORT_BY'; payload: MemoriesPageState['sortBy'] }
  | { type: 'SET_ACTIVE_ALBUM'; payload: { id: string | null; name: string } }
  | { type: 'TOGGLE_SELECT_MODE' }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'EXIT_SELECT_MODE' }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_ELDER_MODE' };

const initialState: MemoriesPageState = {
  viewMode: 'grid',
  typeFilter: 'all',
  statusFilter: 'all',
  categoryFilter: '',
  searchQuery: '',
  dateFrom: '',
  dateTo: '',
  taggedPersonId: '',
  templeFilterId: '',
  sortBy: 'newest',
  activeAlbumId: null,
  activeAlbumName: '',
  selectMode: false,
  selectedIds: new Set(),
  elderMode: false,
};

function reducer(state: MemoriesPageState, action: Action): MemoriesPageState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload, activeAlbumId: null, activeAlbumName: '', selectMode: false, selectedIds: new Set() };
    case 'SET_TYPE_FILTER':
      return { ...state, typeFilter: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'SET_CATEGORY_FILTER':
      return { ...state, categoryFilter: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_DATE_FROM':
      return { ...state, dateFrom: action.payload };
    case 'SET_DATE_TO':
      return { ...state, dateTo: action.payload };
    case 'SET_TAGGED_PERSON':
      return { ...state, taggedPersonId: action.payload };
    case 'SET_TEMPLE_FILTER':
      return { ...state, templeFilterId: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_ACTIVE_ALBUM':
      return { ...state, activeAlbumId: action.payload.id, activeAlbumName: action.payload.name, selectMode: false, selectedIds: new Set() };
    case 'TOGGLE_SELECT_MODE': {
      const entering = !state.selectMode;
      return { ...state, selectMode: entering, selectedIds: entering ? state.selectedIds : new Set() };
    }
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedIds: next };
    }
    case 'SELECT_ALL':
      return { ...state, selectedIds: new Set(action.payload) };
    case 'DESELECT_ALL':
      return { ...state, selectedIds: new Set() };
    case 'EXIT_SELECT_MODE':
      return { ...state, selectMode: false, selectedIds: new Set() };
    case 'CLEAR_FILTERS':
      return { ...state, typeFilter: 'all', statusFilter: 'all', categoryFilter: '', searchQuery: '', dateFrom: '', dateTo: '', taggedPersonId: '', templeFilterId: '', sortBy: 'newest', activeAlbumId: null, activeAlbumName: '' };
    case 'TOGGLE_ELDER_MODE':
      return { ...state, elderMode: !state.elderMode };
    default:
      return state;
  }
}

export function useMemoriesPageState(initialViewMode?: MemoriesPageState['viewMode']) {
  return useReducer(reducer, { ...initialState, viewMode: initialViewMode || 'grid' });
}
