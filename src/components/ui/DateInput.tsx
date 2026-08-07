import * as React from "react"
import { Calendar } from "lucide-react"
import { Input } from "./input"

type DateQualifier = 'exact' | 'about' | 'before' | 'after' | 'between';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string; // YYYY-MM-DD format
  onChange: (e: { target: { value: string } }) => void;
  qualifier?: DateQualifier;
  onQualifierChange?: (qualifier: DateQualifier) => void;
  endDate?: string;
  onEndDateChange?: (e: { target: { value: string } }) => void;
  /** E4: allow free-text "circa 1950", "before WWII", year-only entries. */
  allowFuzzy?: boolean;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
}

// Convert YYYY-MM-DD to DD-MM-YYYY for display
function toDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Convert DD-MM-YYYY to YYYY-MM-DD for storage
function toISO(displayDate: string): string {
  if (!displayDate) return '';
  const cleaned = displayDate.replace(/-/g, '');
  if (cleaned.length < 8) return '';
  const day = cleaned.substring(0, 2);
  const month = cleaned.substring(2, 4);
  const year = cleaned.substring(4, 8);
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return '';
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * E4 — fuzzy date parsing. Accepts:
 *   - "1950"                 → { iso: '1950-06-15', qualifier: 'about' }
 *   - "circa 1950" / "c. 1950" / "ca 1950" → same as above
 *   - "before 1960" / "pre-1960" → { iso: '1960-01-01', qualifier: 'before' }
 *   - "after 1960" / "post-1960" → { iso: '1960-12-31', qualifier: 'after' }
 *   - "after WWII" / "post-WWII" → { iso: '1945-09-02', qualifier: 'after' }
 *   - "early 1900s"           → { iso: '1910-01-01', qualifier: 'about' }
 *   - "late 1800s"            → { iso: '1890-01-01', qualifier: 'about' }
 *   - "mid 1900s"             → { iso: '1950-01-01', qualifier: 'about' }
 * Returns null if it can't parse confidently (caller falls back to literal text).
 */
function parseFuzzyDate(raw: string): { iso: string; qualifier: DateQualifier } | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  // Historical events shorthand
  const events: Record<string, string> = {
    wwii: '1945-09-02', 'ww2': '1945-09-02', 'world war 2': '1945-09-02',
    wwi:  '1918-11-11', 'ww1': '1918-11-11', 'world war 1': '1918-11-11',
    'partition': '1947-08-15',
    'independence': '1947-08-15',
  };
  for (const key of Object.keys(events)) {
    if (s.includes(key)) {
      if (/(after|post|since)/.test(s)) return { iso: events[key], qualifier: 'after' };
      if (/(before|pre)/.test(s))       return { iso: events[key], qualifier: 'before' };
      return { iso: events[key], qualifier: 'about' };
    }
  }
  // "early/mid/late YYYY0s" — decade
  const decadeMatch = s.match(/(early|mid|late)?\s*(\d{3})0s?/);
  if (decadeMatch) {
    const decade = parseInt(decadeMatch[2], 10) * 10;
    const offset = decadeMatch[1] === 'early' ? 0 : decadeMatch[1] === 'late' ? 8 : 5;
    return { iso: `${decade + offset}-01-01`, qualifier: 'about' };
  }
  // "before YYYY" / "pre-YYYY"
  const beforeMatch = s.match(/(?:before|pre[-\s]?)(\d{4})/);
  if (beforeMatch) return { iso: `${beforeMatch[1]}-01-01`, qualifier: 'before' };
  // "after YYYY" / "post-YYYY"
  const afterMatch = s.match(/(?:after|post[-\s]?|since)\s*(\d{4})/);
  if (afterMatch) return { iso: `${afterMatch[1]}-12-31`, qualifier: 'after' };
  // "circa YYYY" / "c. YYYY" / "ca YYYY" / "about YYYY"
  const circaMatch = s.match(/(?:circa|c\.?|ca\.?|about|around|approx\.?)\s*(\d{4})/);
  if (circaMatch) return { iso: `${circaMatch[1]}-06-15`, qualifier: 'about' };
  // Bare year
  const yearMatch = s.match(/^(\d{4})$/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1], 10);
    if (y >= 1000 && y <= 9999) return { iso: `${yearMatch[1]}-06-15`, qualifier: 'about' };
  }
  return null;
}

// Auto-format as user types: insert dashes after DD and MM
function formatAsTyping(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let result = '';
  for (let i = 0; i < digits.length && i < 8; i++) {
    if (i === 2 || i === 4) result += '-';
    result += digits[i];
  }
  return result;
}

/** Custom date field that handles typing + browser picker across all devices */
const SingleDateField = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    max?: string;
    min?: string;
  }
>(({ value, onChange, onBlur, className, placeholder, disabled, max, min }, ref) => {
  const [displayValue, setDisplayValue] = React.useState('');
  const nativeInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDisplayValue(toDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAsTyping(e.target.value);
    setDisplayValue(formatted);

    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      const iso = toISO(formatted);
      if (iso) {
        onChange({ target: { value: iso } });
      }
    } else if (digits.length === 0) {
      onChange({ target: { value: '' } });
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD format
    onChange({ target: { value: val } });
  };

  const triggerPicker = () => {
    if (nativeInputRef.current) {
      try {
        nativeInputRef.current.showPicker();
      } catch (err) {
        console.warn('Failed to call showPicker:', err);
      }
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder || "DD-MM-YYYY"}
        className={`${className || ''} pr-10 text-stone-800 dark:text-stone-200`}
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        maxLength={10}
        ref={ref}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={triggerPicker}
        disabled={disabled}
        className="absolute right-3 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 focus:outline-none transition-colors"
      >
        <Calendar className="w-4 h-4" />
      </button>
      <input
        type="date"
        ref={nativeInputRef}
        value={value || ''}
        onChange={handleNativeChange}
        disabled={disabled}
        max={max}
        min={min}
        className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
});
SingleDateField.displayName = "SingleDateField";

const QUALIFIER_OPTIONS: { value: DateQualifier; label: string }[] = [
  { value: 'exact', label: 'Exact' },
  { value: 'about', label: 'About' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
];

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, onBlur, qualifier, onQualifierChange, endDate, onEndDateChange, allowFuzzy, ...props }, ref) => {
    const [isMobile, setIsMobile] = React.useState(false);
    const [fuzzyMode, setFuzzyMode] = React.useState(false);
    const [fuzzyText, setFuzzyText] = React.useState('');

    React.useEffect(() => {
      setIsMobile(isMobileDevice());
    }, []);

    const hasQualifier = qualifier !== undefined && onQualifierChange !== undefined;
    const showFuzzyToggle = allowFuzzy && hasQualifier;

    // Render fuzzy free-text variant
    if (showFuzzyToggle && fuzzyMode) {
      const commit = () => {
        const parsed = parseFuzzyDate(fuzzyText);
        if (parsed) {
          onChange({ target: { value: parsed.iso } });
          onQualifierChange?.(parsed.qualifier);
        }
      };
      return (
        <div className="flex items-center gap-1.5 w-full">
          <Input
            type="text"
            placeholder='e.g. "1950", "circa 1920", "after WWII"'
            value={fuzzyText}
            onChange={(e) => setFuzzyText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
            className={`${className || ''} min-w-0 flex-1`}
            disabled={props.disabled}
          />
          <button
            type="button"
            onClick={() => setFuzzyMode(false)}
            className="h-9 px-2 text-xs rounded-md border border-input shadow-sm hover:bg-stone-50 shrink-0"
            title="Switch back to date picker"
          >
            123
          </button>
        </div>
      );
    }

    // No qualifier props: render exactly as before (backward compatible)
    if (!hasQualifier) {
      return (
        <SingleDateField
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={className}
          disabled={props.disabled}
          isMobile={isMobile}
          max={props.max as string}
          min={props.min as string}
          ref={ref}
        />
      );
    }

    // With qualifier: render qualifier select + date input(s)
    const isBetween = qualifier === 'between';

    return (
      <div className="flex items-center gap-1.5 w-full">
        <select
          value={qualifier}
          onChange={(e) => onQualifierChange(e.target.value as DateQualifier)}
          className="h-9 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
          disabled={props.disabled}
        >
          {QUALIFIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <SingleDateField
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`${className || ''} ${isBetween ? 'min-w-0 flex-1' : 'min-w-0 flex-1'}`}
          disabled={props.disabled}
          isMobile={isMobile}
          max={props.max as string}
          min={props.min as string}
          ref={ref}
        />

        {showFuzzyToggle && !isBetween && (
          <button
            type="button"
            onClick={() => { setFuzzyText(''); setFuzzyMode(true); }}
            className="h-9 px-2 text-xs rounded-md border border-input shadow-sm hover:bg-stone-50 shrink-0"
            title='Type with words like "circa 1950" or "before WWII"'
          >
            abc
          </button>
        )}

        {isBetween && (
          <>
            <span className="text-xs text-muted-foreground shrink-0">to</span>
            <SingleDateField
              value={endDate || ''}
              onChange={onEndDateChange || (() => {})}
              onBlur={onBlur}
              className="min-w-0 flex-1"
              disabled={props.disabled}
              isMobile={isMobile}
              max={props.max as string}
              min={props.min as string}
            />
          </>
        )}
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
export type { DateQualifier };
