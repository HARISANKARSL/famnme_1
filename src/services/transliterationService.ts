/**
 * Transliteration Service — Client-Side Phonetic Transliteration
 *
 * Converts English/Latin-script names into Indian-language scripts
 * using phoneme mapping + Unicode block offsets from Devanagari.
 *
 * All Brahmi-derived scripts (Devanagari, Bengali, Gujarati, Telugu,
 * Kannada, Malayalam) share the same character ordering, so we define
 * mappings once in Devanagari and apply an offset for other scripts.
 * Tamil requires separate handling due to fewer consonant distinctions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhonemeInfo {
  /** Devanagari consonant code point (e.g. 0x0915 for क) */
  consonant?: number;
  /** Devanagari independent vowel code point (e.g. 0x0905 for अ) */
  vowel?: number;
  /** Devanagari dependent vowel sign (matra) code point */
  matra?: number;
}

// ---------------------------------------------------------------------------
// Script offsets from Devanagari (U+0900)
// ---------------------------------------------------------------------------

const SCRIPT_OFFSET: Record<string, number> = {
  'hi-IN': 0,
  'mr-IN': 0,
  'bn-IN': 0x80,
  'gu-IN': 0x180,
  'ta-IN': 0x280,   // needs special consonant mapping
  'te-IN': 0x300,
  'kn-IN': 0x380,
  'ml-IN': 0x400,
};

// ---------------------------------------------------------------------------
// Devanagari phoneme map
// ---------------------------------------------------------------------------

// Consonants: code point of the base consonant in Devanagari
// Vowels: independent form + dependent matra form
const DEVANAGARI_MAP: Record<string, PhonemeInfo> = {
  // Vowels — independent form and matra (dependent) form
  'a':   { vowel: 0x0905 },                       // अ  (inherent, no matra needed)
  'aa':  { vowel: 0x0906, matra: 0x093E },        // आ  ा
  'i':   { vowel: 0x0907, matra: 0x093F },        // इ  ि
  'ee':  { vowel: 0x0908, matra: 0x0940 },        // ई  ी
  'u':   { vowel: 0x0909, matra: 0x0941 },        // उ  ु
  'oo':  { vowel: 0x090A, matra: 0x0942 },        // ऊ  ू
  'ri':  { vowel: 0x090B, matra: 0x0943 },        // ऋ  ृ
  'e':   { vowel: 0x090F, matra: 0x0947 },        // ए  े
  'ai':  { vowel: 0x0910, matra: 0x0948 },        // ऐ  ै
  'o':   { vowel: 0x0913, matra: 0x094B },        // ओ  ो
  'au':  { vowel: 0x0914, matra: 0x094C },        // औ  ौ

  // Consonants
  'k':   { consonant: 0x0915 },  // क
  'kh':  { consonant: 0x0916 },  // ख
  'g':   { consonant: 0x0917 },  // ग
  'gh':  { consonant: 0x0918 },  // घ
  'ng':  { consonant: 0x0919 },  // ङ

  'ch':  { consonant: 0x091A },  // च
  'chh': { consonant: 0x091B },  // छ
  'j':   { consonant: 0x091C },  // ज
  'jh':  { consonant: 0x091D },  // झ
  'ny':  { consonant: 0x091E },  // ञ

  'T':   { consonant: 0x091F },  // ट (retroflex)
  'Th':  { consonant: 0x0920 },  // ठ
  'D':   { consonant: 0x0921 },  // ड
  'Dh':  { consonant: 0x0922 },  // ढ
  'N':   { consonant: 0x0923 },  // ण

  't':   { consonant: 0x0924 },  // त
  'th':  { consonant: 0x0925 },  // थ
  'd':   { consonant: 0x0926 },  // द
  'dh':  { consonant: 0x0927 },  // ध
  'n':   { consonant: 0x0928 },  // न

  'p':   { consonant: 0x092A },  // प
  'ph':  { consonant: 0x092B },  // फ
  'f':   { consonant: 0x092B },  // फ (same as ph)
  'b':   { consonant: 0x092C },  // ब
  'bh':  { consonant: 0x092D },  // भ
  'm':   { consonant: 0x092E },  // म

  'y':   { consonant: 0x092F },  // य
  'r':   { consonant: 0x0930 },  // र
  'l':   { consonant: 0x0932 },  // ल
  'v':   { consonant: 0x0935 },  // व
  'w':   { consonant: 0x0935 },  // व (same as v)

  'sh':  { consonant: 0x0936 },  // श
  'Sh':  { consonant: 0x0937 },  // ष (retroflex sh)
  's':   { consonant: 0x0938 },  // स
  'h':   { consonant: 0x0939 },  // ह

  'x':   { consonant: 0x0915 },  // क्ष mapped to क (simplified)
  'z':   { consonant: 0x091C },  // ज (z → j)
  'q':   { consonant: 0x0915 },  // क (q → k)
};

// Virama (halant) in Devanagari — suppresses inherent 'a'
const DEVANAGARI_VIRAMA = 0x094D;

// Anusvara (nasal)
const DEVANAGARI_ANUSVARA = 0x0902;

// ---------------------------------------------------------------------------
// Tamil consonant remapping
// Tamil lacks aspirated consonants and has fewer distinctions.
// Map Devanagari consonant code points → Tamil consonant code points.
// ---------------------------------------------------------------------------

const TAMIL_CONSONANT_MAP: Record<number, number> = {
  // Velars: க
  0x0915: 0x0B95, // क → க (ka)
  0x0916: 0x0B95, // ख → க
  0x0917: 0x0B95, // ग → க
  0x0918: 0x0B95, // घ → க
  0x0919: 0x0B99, // ङ → ங

  // Palatals: ச
  0x091A: 0x0B9A, // च → ச
  0x091B: 0x0B9A, // छ → ச
  0x091C: 0x0B9C, // ज → ஜ
  0x091D: 0x0B9A, // झ → ச
  0x091E: 0x0B9E, // ञ → ஞ

  // Retroflexes: ட
  0x091F: 0x0B9F, // ट → ட
  0x0920: 0x0B9F, // ठ → ட
  0x0921: 0x0B9F, // ड → ட
  0x0922: 0x0B9F, // ढ → ட
  0x0923: 0x0BA3, // ण → ண

  // Dentals: த
  0x0924: 0x0BA4, // त → த
  0x0925: 0x0BA4, // थ → த
  0x0926: 0x0BA4, // द → த
  0x0927: 0x0BA4, // ध → த
  0x0928: 0x0BA8, // न → ந

  // Labials: ப
  0x092A: 0x0BAA, // प → ப
  0x092B: 0x0BAA, // फ → ப
  0x092C: 0x0BAA, // ब → ப
  0x092D: 0x0BAA, // भ → ப
  0x092E: 0x0BAE, // म → ம

  // Semi-vowels / sibilants
  0x092F: 0x0BAF, // य → ய
  0x0930: 0x0BB0, // र → ர
  0x0932: 0x0BB2, // ल → ல
  0x0935: 0x0BB5, // व → வ
  0x0936: 0x0BB7, // श → ஷ (using sha)
  0x0937: 0x0BB7, // ष → ஷ
  0x0938: 0x0BB8, // स → ஸ
  0x0939: 0x0BB9, // ह → ஹ
};

// Tamil vowel remapping (independent vowels)
const TAMIL_VOWEL_MAP: Record<number, number> = {
  0x0905: 0x0B85, // अ → அ
  0x0906: 0x0B86, // आ → ஆ
  0x0907: 0x0B87, // इ → இ
  0x0908: 0x0B88, // ई → ஈ
  0x0909: 0x0B89, // उ → உ
  0x090A: 0x0B8A, // ऊ → ஊ
  0x090B: 0x0B8C, // ऋ → ஌ (approximation)
  0x090F: 0x0B8F, // ए → எ
  0x0910: 0x0B90, // ऐ → ஐ
  0x0913: 0x0B93, // ओ → ஓ
  0x0914: 0x0B94, // औ → ஔ
};

// Tamil matra (dependent vowel) remapping
const TAMIL_MATRA_MAP: Record<number, number> = {
  0x093E: 0x0BBE, // ा → ா
  0x093F: 0x0BBF, // ि → ி
  0x0940: 0x0BC0, // ी → ீ
  0x0941: 0x0BC1, // ु → ு
  0x0942: 0x0BC2, // ू → ூ
  0x0943: 0x0BC3, // ृ → ிர (approximation → just use ிர simplified to ி)
  0x0947: 0x0BC6, // े → ெ
  0x0948: 0x0BC8, // ै → ை
  0x094B: 0x0BCB, // ो → ோ
  0x094C: 0x0BCC, // ौ → ௌ
};

const TAMIL_VIRAMA = 0x0BCD;
const TAMIL_ANUSVARA = 0x0B82;

// ---------------------------------------------------------------------------
// English phoneme patterns — sorted longest-first for greedy matching
// ---------------------------------------------------------------------------

const ENGLISH_PHONEME_PATTERNS: [string, string][] = [
  // Trigraphs
  ['chh', 'chh'],
  ['shh', 'sh'],
  // Digraphs — vowels
  ['aa', 'aa'],
  ['ee', 'ee'],
  ['oo', 'oo'],
  ['ai', 'ai'],
  ['au', 'au'],
  ['ou', 'au'],  // "ou" as in "Hou" → au
  ['ei', 'ai'],  // "ei" treated as ai
  // Digraphs — consonants
  ['sh', 'sh'],
  ['ch', 'ch'],
  ['th', 'th'],
  ['dh', 'dh'],
  ['bh', 'bh'],
  ['kh', 'kh'],
  ['ph', 'ph'],
  ['gh', 'gh'],
  ['jh', 'jh'],
  ['ng', 'ng'],
  ['ny', 'ny'],
  // Singles
  ['a', 'a'],
  ['b', 'b'],
  ['c', 'k'],   // c → k
  ['d', 'd'],
  ['e', 'e'],
  ['f', 'f'],
  ['g', 'g'],
  ['h', 'h'],
  ['i', 'i'],
  ['j', 'j'],
  ['k', 'k'],
  ['l', 'l'],
  ['m', 'm'],
  ['n', 'n'],
  ['o', 'o'],
  ['p', 'p'],
  ['q', 'q'],
  ['r', 'r'],
  ['s', 's'],
  ['t', 't'],
  ['u', 'u'],
  ['v', 'v'],
  ['w', 'w'],
  ['x', 'x'],
  ['y', 'y'],
  ['z', 'z'],
];

// ---------------------------------------------------------------------------
// Result cache
// ---------------------------------------------------------------------------

const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isVowelPhoneme(phoneme: string): boolean {
  const info = DEVANAGARI_MAP[phoneme];
  return !!info && !!info.vowel && !info.consonant;
}

function applyOffset(codePoint: number, offset: number): number {
  return codePoint + offset;
}

/**
 * Convert a Devanagari code point to the target script.
 * For Tamil, use explicit remapping tables.
 * For others, apply the Unicode block offset.
 */
function toTargetConsonant(devConsonant: number, locale: string): number {
  if (locale === 'ta-IN') {
    return TAMIL_CONSONANT_MAP[devConsonant] ?? devConsonant;
  }
  return applyOffset(devConsonant, SCRIPT_OFFSET[locale] ?? 0);
}

function toTargetVowel(devVowel: number, locale: string): number {
  if (locale === 'ta-IN') {
    return TAMIL_VOWEL_MAP[devVowel] ?? devVowel;
  }
  return applyOffset(devVowel, SCRIPT_OFFSET[locale] ?? 0);
}

function toTargetMatra(devMatra: number, locale: string): number {
  if (locale === 'ta-IN') {
    return TAMIL_MATRA_MAP[devMatra] ?? devMatra;
  }
  return applyOffset(devMatra, SCRIPT_OFFSET[locale] ?? 0);
}

function toTargetVirama(locale: string): number {
  if (locale === 'ta-IN') return TAMIL_VIRAMA;
  return applyOffset(DEVANAGARI_VIRAMA, SCRIPT_OFFSET[locale] ?? 0);
}

export function toTargetAnusvara(locale: string): number {
  if (locale === 'ta-IN') return TAMIL_ANUSVARA;
  return applyOffset(DEVANAGARI_ANUSVARA, SCRIPT_OFFSET[locale] ?? 0);
}

// ---------------------------------------------------------------------------
// Tokenizer: parse English text into phoneme codes
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  const phonemes: string[] = [];
  const lower = text.toLowerCase();
  let i = 0;

  while (i < lower.length) {
    let matched = false;

    // Try matching longest patterns first
    for (const [pattern, phoneme] of ENGLISH_PHONEME_PATTERNS) {
      if (lower.startsWith(pattern, i)) {
        phonemes.push(phoneme);
        i += pattern.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Non-alphabetic character — pass through as-is
      phonemes.push(lower[i]);
      i++;
    }
  }

  return phonemes;
}

// ---------------------------------------------------------------------------
// Core transliteration for a single word
// ---------------------------------------------------------------------------

function transliterateWord(word: string, locale: string): string {
  if (!word) return word;

  const phonemes = tokenize(word);
  const result: number[] = [];
  let prevWasConsonant = false;

  for (let i = 0; i < phonemes.length; i++) {
    const ph = phonemes[i];
    const info = DEVANAGARI_MAP[ph];

    if (!info) {
      // Not a recognized phoneme (number, punctuation, etc.) — pass through
      result.push(ph.charCodeAt(0));
      prevWasConsonant = false;
      continue;
    }

    if (info.consonant) {
      // If previous was also a consonant, insert virama before this one
      if (prevWasConsonant) {
        result.push(toTargetVirama(locale));
      }
      result.push(toTargetConsonant(info.consonant, locale));
      prevWasConsonant = true;
    } else if (info.vowel) {
      // Vowel
      if (prevWasConsonant && info.matra) {
        // After a consonant: use dependent matra form
        result.push(toTargetMatra(info.matra, locale));
      } else if (prevWasConsonant && !info.matra) {
        // 'a' after consonant: inherent vowel, no extra character needed
        // do nothing
      } else {
        // Word-initial or vowel-after-vowel: use independent form
        result.push(toTargetVowel(info.vowel, locale));
      }
      prevWasConsonant = false;
    }
  }

  // Word-final schwa deletion: if the last phoneme was a consonant,
  // add virama to suppress the inherent 'a'
  if (prevWasConsonant) {
    result.push(toTargetVirama(locale));
  }

  return String.fromCodePoint(...result);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transliterate English text into the target locale's script.
 *
 * Returns the original text unchanged for English locale or
 * unsupported locales.
 *
 * @param text - English text to transliterate
 * @param locale - Target locale code (e.g. 'hi-IN', 'ta-IN')
 * @returns Transliterated text in the target script
 */
export function transliterate(text: string, locale: string): string {
  // No-op for English or unsupported locales
  if (!locale || locale === 'en' || !(locale in SCRIPT_OFFSET)) {
    return text;
  }

  const cacheKey = `${locale}:${text}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Split by whitespace, transliterate each word, rejoin
  const result = text
    .split(/(\s+)/)
    .map(segment => {
      // Preserve whitespace segments
      if (/^\s+$/.test(segment)) return segment;
      return transliterateWord(segment, locale);
    })
    .join('');

  // Manage cache size
  if (cache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entries (first 500)
    const keys = cache.keys();
    for (let i = 0; i < 500; i++) {
      const next = keys.next();
      if (next.done) break;
      cache.delete(next.value);
    }
  }

  cache.set(cacheKey, result);
  return result;
}
