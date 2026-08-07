/**
 * PersonPicker - Searchable dropdown for selecting existing people from the tree
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Person } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, User } from 'lucide-react';

export const formatPersonName = (p?: Person | null) => {
  if (!p) return '';
  const first = p.firstName || '';
  const last = p.lastName;
  if (!last || last === 'undefined' || last === 'null') {
    return first;
  }
  return `${first} ${last}`;
};

export interface PersonPickerProps {
  persons: Person[];
  selectedPersonId?: string;
  onSelect: (person: Person) => void;
  excludePersonIds?: string[];
  label?: string;
  placeholder?: string;
  filterEligible?: boolean;
}

export function PersonPicker({
  persons,
  selectedPersonId,
  onSelect,
  excludePersonIds = [],
  label = 'Select Person',
  placeholder = 'Search person...',
}: PersonPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter persons based on search and exclusions
  const filteredPersons = useMemo(() => {
    return persons.filter(p => {
      // Exclude certain persons
      if (excludePersonIds.includes(p.personId)) return false;

      // Search filter
      if (searchTerm) {
        const fullName = formatPersonName(p).toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      }

      return true;
    });
  }, [persons, searchTerm, excludePersonIds]);

  const selectedPerson = useMemo(
    () => persons.find(p => p.personId === selectedPersonId),
    [persons, selectedPersonId]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (person: Person) => {
    onSelect(person);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label>{label}</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={selectedPerson ? formatPersonName(selectedPerson) : placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
        </div>

        {/* Dropdown list */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-[#1a1a1a] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
              {filteredPersons.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No person found.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredPersons.map((person) => (
                    <button
                      key={person.personId}
                      onClick={() => handleSelect(person)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground',
                        selectedPersonId === person.personId && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {formatPersonName(person)}
                        </div>
                        {person.birthDate && (
                          <div className="text-xs text-muted-foreground">
                            Born: {person.birthDate}
                          </div>
                        )}
                      </div>
                      {person.gender && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {person.gender}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedPerson && !searchTerm && (
        <div className="text-xs text-muted-foreground">
          Selected: {formatPersonName(selectedPerson)}
        </div>
      )}
    </div>
  );
}
