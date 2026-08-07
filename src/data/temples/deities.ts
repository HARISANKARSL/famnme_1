export interface DeityInfo {
  name: string;
  templeIds: string[];
}

export const DEITY_LIST: DeityInfo[] = [
  {
    name: 'Brahma',
    templeIds: ['brahma-temple-pushkar', 'brahma-temple-khedbrahma', 'brahma-temple-chamba', 'brahma-temple-goa', 'brahma-temple-alwar'],
  },
  {
    name: 'Vishnu',
    templeIds: ['sri-jagannath-temple', 'tirumala-venkateswara-temple', 'kamkhent', 'vaishno-devi-jammu-and-kashmir'],
  },
  {
    name: 'Shiva',
    templeIds: ['kanchipuram-ekambareswarar-temple', 'pelling-doi'],
  },
  {
    name: 'Meenakshi',
    templeIds: ['madurai-meenakshi-amman-temple'],
  },
  {
    name: 'Saraswati',
    templeIds: ['sringeri-sharada-peetham'],
  },
  {
    name: 'Shakti',
    templeIds: ['shakti-peeth'],
  },
];
