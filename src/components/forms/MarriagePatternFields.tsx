/**
 * MarriagePatternFields - Reusable component for marriage pattern selection
 *
 * Used by AddSpouseModal and MarryExistingPersonModal to collect
 * marriage pattern and cultural context for non-standard marriages.
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Union, Person } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import type { MarriageValidationResult } from '@/services/marriageValidationService';

export interface MarriagePatternFieldsProps {
  unionData: Partial<{
    marriagePattern?: Union['marriagePattern'];
    culturalContext?: string;
    precedingUnionId?: string;
  }>;
  setUnionData: (data: Partial<{ marriagePattern?: Union['marriagePattern']; culturalContext?: string; precedingUnionId?: string }>) => void;
  validationResult: MarriageValidationResult;
  unions: Union[];
  relationships: Relationship[];
  referencePerson: Person;
}

export function MarriagePatternFields({
  unionData,
  setUnionData,
  validationResult,
  unions,
  relationships,
  referencePerson,
}: MarriagePatternFieldsProps) {
  // Only show if validation requires it
  if (!validationResult.warnings.some(w => w.requiresMarriagePattern || w.requiresJustification)) {
    return null;
  }

  return (
    <div className="space-y-4 border-2 border-[#2F3E8F]/30 bg-[#E8EDFF] p-4 rounded-lg">
      <h3 className="text-sm font-semibold text-blue-900">
        Marriage Pattern & Cultural Context
      </h3>
      <p className="text-sm text-[#2F3E8F]">
        This marriage requires additional information for historical accuracy and cultural context.
      </p>

      {/* Marriage Pattern Selector */}
      <div>
        <Label htmlFor="marriagePattern">Marriage Pattern *</Label>
        <Select
          value={unionData.marriagePattern || 'standard'}
          onValueChange={(value) => setUnionData({ ...unionData, marriagePattern: value as Union['marriagePattern'] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard Marriage</SelectItem>
            <SelectItem value="consanguineous">Close family marriage (e.g., uncle-niece)</SelectItem>
            <SelectItem value="polyandry">Multiple husbands</SelectItem>
            <SelectItem value="polygyny">Multiple wives</SelectItem>
            <SelectItem value="levirate">Widow married husband's brother</SelectItem>
            <SelectItem value="sororate">Widower married wife's sister</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Select the pattern that best describes this marriage
        </p>
      </div>

      {/* Cultural Context (if required) */}
      {validationResult.warnings.some(w => w.requiresJustification) && (
        <div>
          <Label htmlFor="culturalContext">Cultural/Historical Context *</Label>
          <Textarea
            id="culturalContext"
            value={unionData.culturalContext || ''}
            onChange={(e) => setUnionData({ ...unionData, culturalContext: e.target.value })}
            placeholder="e.g., Tamil Brahmin tradition allowing maternal uncle-niece marriages, Toda tribal polyandry custom, historical levirate practice"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Please provide cultural or historical context to justify this marriage pattern
          </p>
        </div>
      )}

      {/* Preceding Union (for levirate/sororate) */}
      {(unionData.marriagePattern === 'levirate' || unionData.marriagePattern === 'sororate') && (
        <div>
          <Label htmlFor="precedingUnion">Preceding Marriage (Optional)</Label>
          <Select
            value={unionData.precedingUnionId || 'none'}
            onValueChange={(value) => setUnionData({ ...unionData, precedingUnionId: value === 'none' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              {/* Filter for ended marriages of reference person */}
              {unions
                .filter(u => u.endDate && relationships.some(r =>
                  r.type === 'PARTNER_IN' &&
                  (r.fromId === referencePerson.personId || r.toId === referencePerson.personId) &&
                  (r.fromId === u.unionId || r.toId === u.unionId)
                ))
                .map(u => (
                  <SelectItem key={u.unionId} value={u.unionId}>
                    Previous marriage (ended {u.endDate})
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Link to the previous marriage if this is a levirate/sororate union
          </p>
        </div>
      )}
    </div>
  );
}
