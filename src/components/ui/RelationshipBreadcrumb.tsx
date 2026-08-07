/**
 * RelationshipBreadcrumb - Shows relationship chain in add relative forms
 *
 * Displays the path from home person to the person being added
 * Example: "You → Father → Grandfather (adding his father)"
 *
 * Helps users maintain context when adding deep relatives
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbStep {
  name: string;
  relationship?: string;
  isTarget?: boolean;
}

export interface RelationshipBreadcrumbProps {
  steps: BreadcrumbStep[];
  className?: string;
}

export function RelationshipBreadcrumb({ steps, className }: RelationshipBreadcrumbProps) {
  if (steps.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className={cn(
            'font-medium',
            step.isTarget && 'text-primary'
          )}>
            {step.name}
          </span>
          {step.relationship && (
            <span className="text-xs text-muted-foreground/70">
              ({step.relationship})
            </span>
          )}
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Helper to build breadcrumb chain for adding relatives
 */
export function buildRelationshipChain(
  relationship: string,
  referenceName: string,
  homePerson?: { name: string }
): BreadcrumbStep[] {
  const steps: BreadcrumbStep[] = [];

  // Start with home person (if available)
  if (homePerson) {
    steps.push({ name: homePerson.name });
  }

  // Add reference person
  steps.push({ name: referenceName });

  // Map relationship to a clean, gender-neutral label
  const relationshipLabels: Record<string, string> = {
    father: 'Parent',
    mother: 'Parent',
    parent: 'Parent',
    son: 'Child',
    daughter: 'Child',
    child: 'Child',
    brother: 'Sibling',
    sister: 'Sibling',
    sibling: 'Sibling',
    spouse: 'Spouse',
  };

  steps.push({
    name: relationshipLabels[relationship] || 'New relative',
    isTarget: true,
  });

  return steps;
}
