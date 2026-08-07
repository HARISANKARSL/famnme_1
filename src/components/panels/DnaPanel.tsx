/**
 * DnaPanel - View and edit DNA data for a person (Phase 6.3)
 *
 * Displays Y-DNA haplogroup, mtDNA haplogroup, testing company,
 * test date, kit number, ethnicity estimates, and notes.
 */

import { useState, useCallback } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { X, Dna, Info, Save, Loader2 } from 'lucide-react';
import type { Person } from '@/types';

interface DnaPanelProps {
  personId: string;
  person: Person;
  onClose: () => void;
  onUpdate: (updates: Partial<Person>) => void;
}

const TESTING_COMPANIES = [
  { value: '', label: 'Select company...' },
  { value: '23andMe', label: '23andMe' },
  { value: 'AncestryDNA', label: 'AncestryDNA' },
  { value: 'FamilyTreeDNA', label: 'FamilyTreeDNA' },
  { value: 'MyHeritage', label: 'MyHeritage' },
  { value: 'LivingDNA', label: 'LivingDNA' },
  { value: 'Other', label: 'Other' },
];

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex ml-1">
      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </span>
    </span>
  );
}

export function DnaPanel({ personId: _personId, person, onClose, onUpdate }: DnaPanelProps) {
  const { isMobile } = useResponsive();
  const [saving, setSaving] = useState(false);
  const [yDnaHaplogroup, setYDnaHaplogroup] = useState(person.yDnaHaplogroup || '');
  const [mtDnaHaplogroup, setMtDnaHaplogroup] = useState(person.mtDnaHaplogroup || '');
  const [dnaTestingCompany, setDnaTestingCompany] = useState(person.dnaTestingCompany || '');
  const [dnaTestDate, setDnaTestDate] = useState(person.dnaTestDate || '');
  const [dnaKitNumber, setDnaKitNumber] = useState(person.dnaKitNumber || '');
  const [dnaEthnicityEstimates, setDnaEthnicityEstimates] = useState(person.dnaEthnicityEstimates || '');
  const [dnaNotes, setDnaNotes] = useState('');

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onUpdate({
        yDnaHaplogroup: yDnaHaplogroup || undefined,
        mtDnaHaplogroup: mtDnaHaplogroup || undefined,
        dnaTestingCompany: dnaTestingCompany || undefined,
        dnaTestDate: dnaTestDate || undefined,
        dnaKitNumber: dnaKitNumber || undefined,
        dnaEthnicityEstimates: dnaEthnicityEstimates || undefined,
      });
    } finally {
      setSaving(false);
    }
  }, [yDnaHaplogroup, mtDnaHaplogroup, dnaTestingCompany, dnaTestDate, dnaKitNumber, dnaEthnicityEstimates, onUpdate]);

  const hasChanges =
    yDnaHaplogroup !== (person.yDnaHaplogroup || '') ||
    mtDnaHaplogroup !== (person.mtDnaHaplogroup || '') ||
    dnaTestingCompany !== (person.dnaTestingCompany || '') ||
    dnaTestDate !== (person.dnaTestDate || '') ||
    dnaKitNumber !== (person.dnaKitNumber || '') ||
    dnaEthnicityEstimates !== (person.dnaEthnicityEstimates || '');

  return (
    <div className={`${isMobile ? 'fixed inset-0 z-50' : 'w-[400px] h-full border-l border-gray-200 shadow-lg'} bg-white flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">DNA Data</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Person name */}
      <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
        {person.firstName} {person.lastName}
      </div>

      {/* Form */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMobile ? 'pb-16' : ''}`}>
        {/* Y-DNA Haplogroup */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Y-DNA Haplogroup
            <InfoTooltip text="Paternal lineage marker - inherited father to son" />
          </label>
          <Input
            value={yDnaHaplogroup}
            onChange={(e) => setYDnaHaplogroup(e.target.value)}
            placeholder="e.g., R1b, J2, E1b1b..."
            className="text-sm"
          />
          {person.gender === 'female' && (
            <p className="text-xs text-[#2F3E8F] mt-1">
              Y-DNA is typically only available for males.
            </p>
          )}
        </div>

        {/* mtDNA Haplogroup */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            mtDNA Haplogroup
            <InfoTooltip text="Maternal lineage marker - inherited from mother to all children" />
          </label>
          <Input
            value={mtDnaHaplogroup}
            onChange={(e) => setMtDnaHaplogroup(e.target.value)}
            placeholder="e.g., H, U5, M, R..."
            className="text-sm"
          />
        </div>

        {/* Testing Company */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Testing Company
          </label>
          <select
            value={dnaTestingCompany}
            onChange={(e) => setDnaTestingCompany(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {TESTING_COMPANIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Test Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Date
          </label>
          <DateInput
            value={dnaTestDate}
            onChange={(e) => setDnaTestDate(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Kit Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kit Number
          </label>
          <Input
            value={dnaKitNumber}
            onChange={(e) => setDnaKitNumber(e.target.value)}
            placeholder="Enter kit/sample number..."
            className="text-sm"
          />
        </div>

        {/* Ethnicity Estimates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ethnicity Estimates
            <InfoTooltip text="Paste ethnicity breakdown from your DNA test results" />
          </label>
          <textarea
            value={dnaEthnicityEstimates}
            onChange={(e) => setDnaEthnicityEstimates(e.target.value)}
            placeholder='e.g., South Asian: 85%, Central Asian: 10%, Southeast Asian: 5%'
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={dnaNotes}
            onChange={(e) => setDnaNotes(e.target.value)}
            placeholder="Additional notes about DNA results..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Save DNA Data
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
