/**
 * RelationshipExplorerWidget — "How are you related?" quick search
 *
 * User picks a family member, and the widget shows the relationship
 * path and a narrative sentence from the home person to that person.
 * Includes Hindi kinship terms and step-by-step path labels.
 */

import { useState, useCallback, useMemo } from 'react'
import { Search, GitBranch, Loader2, ChevronRight, BookOpen } from 'lucide-react'
import { fetchRelationshipPath, type DerivedRelationship, type StepLabel } from '@/services/neo4jDataService'
import { lookupKinshipTerm, type KinshipTerm } from '@/data/indianKinshipTerms'
import type { StructuralRelationship } from '@/services/relationshipResolver'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'

/**
 * Returns a 1-2 sentence Indian cultural context for a relationship.
 * Keyed on relationship type, with lineage/gender refinements where meaningful.
 */
function getIndianContext(result: DerivedRelationship): string | null {
  const rel = result.relationship
  const gender = result.gender
  const lineage = result.lineage

  const ctx: Record<string, string> = {
    // Nuclear family
    'parent.male':   '???? (Pita) is the head of the household in Indian tradition. The father is respected as a provider and protector whose blessings are sought at every life milestone.',
    'parent.female': '???? (Mata) is revered across Indian culture as the embodiment of love and sacrifice. The word "Mata" itself carries a divine connotation — "Mata" means "Mother Goddess."',
    'parent':        'In Indian tradition, parents are considered living gods — "Matru Devo Bhava, Pitru Devo Bhava" (Mother is God, Father is God). Their blessings are central to all life milestones.',
    'child.male':    '???? (Beta), the son, is considered the carrier of the family name and traditions. In Indian custom, a son performs the last rites (antim sanskar) for his parents.',
    'child.female':  '???? (Beti) is deeply cherished in Indian families. The phrase "Beti Bachao, Beti Padhao" reflects the growing cultural recognition of daughters as the family\'s pride.',
    'child':         'Children (?????, santaan) are considered a divine blessing in Indian culture. The birth of a child is celebrated with elaborate rituals — from the namkaran (naming ceremony) to the annaprashana (first rice feeding).',

    // Siblings
    'sibling.male.elder':   '??? / ???? (Bhaiya) — the elder brother — is a protective and respected figure. Younger siblings traditionally touch his feet for blessings on Bhai Dooj and Raksha Bandhan.',
    'sibling.male.younger': '???? ??? (Chhota Bhai) is cherished and often pampered by the elder siblings. The brother-sister bond is celebrated during Raksha Bandhan across India.',
    'sibling.female.elder': '???? (Didi) — the elder sister — plays a nurturing, almost maternal role in Indian households. She is the confidante and guide for younger siblings.',
    'sibling.female.younger':'???? ??? (Chhoti Bahan) is protected and doted on by the family. Sisters are central to Raksha Bandhan, when brothers pledge lifelong protection.',
    'sibling':              '???-??? (Bhai-bahan) — siblings — share one of the most celebrated bonds in Indian culture. Raksha Bandhan (the thread festival) and Bhai Dooj are national festivals devoted entirely to the sibling relationship.',

    // Paternal side
    'uncle.paternal.elder':  '??? (Tau) is your father\'s elder brother — treated with nearly the same reverence as a father. In joint families, tau and his wife (tai) share the same household and responsibilities.',
    'uncle.paternal.younger':'???? (Chacha) — your father\'s younger brother — is a beloved second-father figure. In Indian joint families, chacha and chachi are closely woven into daily life and upbringing.',
    'aunt.paternal':         '??? (Bua) — your father\'s sister — holds a uniquely affectionate place in Indian families. She is celebrated at weddings where she performs rituals like the tilak ceremony.',
    // Maternal side
    'uncle.maternal':        '???? (Mama) — your mother\'s brother — has a special ritual role in Indian culture. He often brings the first gift for a newborn and plays a prominent part in weddings and sacred ceremonies.',
    'aunt.maternal':         '???? (Mausi) — your mother\'s sister — is often experienced as a second mother in Indian families, sharing warmth, stories and traditions closely with the household.',

    // Cousins
    'cousin.paternal':       '????? / ?????? (Chachera/Phuphera) — paternal cousins are part of your father\'s extended family. In India, cousins are rarely called "cousins" — they are simply ??? (brother) or ??? (sister), reflecting how close the bond is considered.',
    'cousin.maternal':       '????? / ?????? (Mausera) — maternal cousins share your mother\'s roots. In Indian families, cousins from both sides grow up together at festivals and family gatherings, often as close as full siblings.',
    'cousin':                'In Indian culture, cousins are rarely referred to as "cousins" — they are addressed as ??? (brother) or ??? (sister). The distinction between paternal and maternal cousins carries social and sometimes ritual significance.',

    // Grandparents
    'grandparent.paternal.male':   '???? (Dada) — paternal grandfather — is the family patriarch. In Indian joint families, dada is the elder who guides decisions, passes down family history and receives the deepest reverence.',
    'grandparent.paternal.female': '???? (Dadi) — paternal grandmother — is the heart of the home. Her stories, remedies and recipes are the invisible threads that bind generations together.',
    'grandparent.maternal.male':   '???? (Nana) — maternal grandfather — is associated with warmth and indulgence. Many Indians cherish childhood summers spent at "nana\'s house" as their happiest memories.',
    'grandparent.maternal.female': '???? (Nani) — maternal grandmother — is known for unconditional affection and storytelling. "Nani ke ghar" (grandmother\'s home) is a phrase that evokes joy across generations.',
    'grandparent':                 'Grandparents (????-???? / ????-????) are among the most revered figures in Indian families. They are the living repositories of family history, culture and wisdom, often playing a central role in raising grandchildren.',

    // Grandchildren
    'grandchild.male':   '???? (Pota) — grandson — is considered the continuation of the family lineage. In Indian tradition, a grandson is sometimes said to "redeem" the grandfather\'s legacy.',
    'grandchild.female': '???? (Poti) — granddaughter — is immensely cherished. Grandparents take enormous pride in their granddaughter\'s milestones, and the bond is often the most tender in the family.',
    'grandchild':        'Grandchildren (????-???? / ????-?????) are considered the greatest joy in old age in Indian culture. Grandparents often play an active role in upbringing — teaching language, values and traditions.',

    // Nephews / nieces
    'nephew': '????? (Bhatija) — your brother\'s son. Uncles and aunts take an active role in a nephew\'s education and life events in Indian families, often serving as mentors and guides.',
    'niece':  '????? (Bhatiji) — your brother\'s daughter. The uncle-niece bond is warm and protective; uncles traditionally give the first gift at a niece\'s wedding.',

    // Spouse
    'spouse.male':   '??? (Pati) — husband — in Indian tradition the marital bond is considered sacred and lifelong (saat phere — seven vows). Marriage unites not just two people but two entire families.',
    'spouse.female': '????? (Patni) — wife — is referred to as ardhangini ("the other half"). Indian weddings are elaborate multi-day ceremonies that celebrate and sanctify this bond.',

    // Uncle / Aunt generic fallbacks
    'uncle': 'Uncles (???? / ???? / ???) hold distinct roles in Indian families depending on whether they are from the father\'s or mother\'s side. Each has a specific name and set of responsibilities in ceremonies and daily life.',
    'aunt':  'Aunts (??? / ???? / ???? / ????) are cherished figures in Indian extended families. Each aunt has a distinct relationship name based on which parent she is related to, and specific ritual roles at weddings and festivals.',

    // In-law terms (relationship keys from backend)
    'parent-in-law':           '???? / ??? (Sasur/Saas) — in-law parent — is accorded the same respect as one\'s own parents in Indian culture. Their blessings are sought at every major life event, and they are addressed with formal honorifics.',
    'grandparent-in-law':      'In Indian joint families, grandparents-in-law are deeply respected elders. They are central to wedding rituals and are often the first to bless a new bride or groom entering the family.',
    'ancestor-in-law':         'In Indian culture, marriage creates a sacred bond between two entire family lines (gotras). Your spouse\'s ancestors are honoured as part of your own extended family heritage.',
    'child-in-law':            '????? / ??? (Damaad/Bahu) — In Indian tradition, a son-in-law (damaad) is honoured at festivals like Jamai Shashti and a daughter-in-law (bahu) is welcomed with elaborate rituals as the new daughter of the house.',
    'grandchild-in-law':       'In Indian families, the children of one\'s children-in-law are embraced with the same warmth as biological grandchildren. Marriage in India unites not just couples but entire family networks across generations.',
    'sibling-in-law':          '???? / ???? / ???? / ??? (Sala/Sali/Dewar/Nanad) — In India, every sibling-in-law has a distinct name based on gender and whose sibling they are. Bhabhi (brother\'s wife) and Jija (sister\'s husband) are among the most affectionate in-law relationships.',
    'co-parent-in-law':        '???? / ????? (Samdhi/Samadhin) — In Indian culture, the parents of a married couple are called samdhi (male) and samadhin (female). This is a relationship of mutual respect and affection, celebrated especially during weddings and festivals.',
    'co-in-law':               '???? (Samdhi) — co-in-laws — In Indian tradition, the two families joined by a marriage share a lifelong bond of respect and cooperation. Joint family festivals and ceremonies regularly bring samdhis together.',

    // Step / adoptive
    'step-parent': 'Step-parents in Indian families are given the same respect as biological parents. The concept of ?????? (parivar — family) extends beyond blood in Indian ethos.',
    'adoptive-parent': 'Adoption (?????, dattak) has deep roots in Indian law and tradition. An adopted child receives full familial status and participates equally in all rituals and inheritance.',
  }

  // Build a prioritized key to look up
  const keys: string[] = []
  if (rel === 'sibling') {
    const elder = result.elderStatus === 'elder' ? 'elder' : result.elderStatus === 'younger' ? 'younger' : null
    if (elder) keys.push(`sibling.${gender}.${elder}`)
    keys.push(`sibling.${gender}`)
  } else if (rel === 'grandparent') {
    const lin = lineage === 'paternal' ? 'paternal' : lineage === 'maternal' ? 'maternal' : null
    if (lin) keys.push(`grandparent.${lin}.${gender}`)
    keys.push(`grandparent.${gender}`)
  } else if (rel === 'cousin') {
    const lin = lineage === 'paternal' ? 'paternal' : lineage === 'maternal' ? 'maternal' : null
    if (lin) keys.push(`cousin.${lin}`)
    keys.push('cousin')
  } else if (rel === 'uncle') {
    const lin = lineage === 'paternal' ? 'paternal' : lineage === 'maternal' ? 'maternal' : null
    const elder = result.elderStatus === 'elder' ? 'elder' : result.elderStatus === 'younger' ? 'younger' : null
    if (lin && elder) keys.push(`uncle.${lin}.${elder}`)
    if (lin) keys.push(`uncle.${lin}`)
    keys.push('uncle')
  } else if (rel === 'aunt') {
    const lin = lineage === 'paternal' ? 'paternal' : lineage === 'maternal' ? 'maternal' : null
    if (lin) keys.push(`aunt.${lin}`)
    keys.push('aunt')
  } else {
    keys.push(`${rel}.${lineage}.${gender}`, `${rel}.${gender}`, `${rel}.${lineage}`, rel)
  }

  // Always append the bare relationship type as final fallback
  if (!keys.includes(rel)) keys.push(rel)

  for (const k of keys) {
    // Skip keys with literal 'null', 'undefined' in them
    if (k.includes('null') || k.includes('undefined')) continue
    if (ctx[k]) return ctx[k]
  }
  return null
}

interface Props {
  treeId: string
  homePersonId: string
  persons: Person[]
  onOpenProfile: (personId: string) => void
}

/**
 * Map the backend DerivedRelationship to the frontend StructuralRelationship
 * format expected by lookupKinshipTerm().
 */
function mapToStructural(dr: DerivedRelationship): StructuralRelationship {
  return {
    relationship: dr.relationship as StructuralRelationship['relationship'],
    degree: dr.degree,
    removed: dr.removed,
    lineage: (dr.lineage === 'unknown' ? 'direct' : dr.lineage) as StructuralRelationship['lineage'],
    gender: (dr.gender || 'other') as 'male' | 'female' | 'other',
    elderStatus: dr.elderStatus ?? null,
    guardianType: dr.guardianType as StructuralRelationship['guardianType'],
  }
}

export function RelationshipExplorerWidget({ treeId, homePersonId, persons, onOpenProfile }: Props) {
  const [query, setQuery] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [result, setResult] = useState<DerivedRelationship | null>(null)
  const [pathPersons, setPathPersons] = useState<Person[]>([])
  const [stepLabels, setStepLabels] = useState<StepLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Filter persons for dropdown (exclude home person)
  const filtered = query.trim().length >= 2
    ? persons
        .filter(p => p.personId !== homePersonId)
        .filter(p => {
          const name = `${p.firstName} ${p.lastName || ''}`.toLowerCase()
          return name.includes(query.toLowerCase())
        })
        .slice(0, 6)
    : []

  // Look up Hindi kinship term when result changes
  const kinshipTerm: KinshipTerm | null = useMemo(() => {
    if (!result) return null
    try {
      return lookupKinshipTerm(mapToStructural(result))
    } catch {
      return null
    }
  }, [result])

  const indianContext: string | null = useMemo(() => {
    if (!result) return null
    return getIndianContext(result)
  }, [result])

  const handleSelect = useCallback(async (person: Person) => {
    setSelectedPerson(person)
    setQuery(`${person.firstName} ${person.lastName || ''}`.trim())
    setShowDropdown(false)
    setLoading(true)
    setResult(null)
    setStepLabels([])

    try {
      const pathResult = await fetchRelationshipPath(homePersonId, person.personId, treeId)
      setResult(pathResult.derivedRelationship || null)
      setPathPersons(pathResult.path || [])
      setStepLabels(pathResult.stepLabels || [])
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [homePersonId, treeId])

  return (
    <div>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8A090]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowDropdown(true)
            if (e.target.value.trim().length < 2) {
              setSelectedPerson(null)
              setResult(null)
              setStepLabels([])
            }
          }}
          onFocus={() => { if (filtered.length > 0) setShowDropdown(true) }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search a family member..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 focus:border-[#2F3E8F] bg-[#F9FAFB]"
        />

        {/* Dropdown */}
        {showDropdown && filtered.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.map(person => {
              const photoUrl = person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null
              return (
                <li
                  key={person.personId}
                  onMouseDown={() => handleSelect(person)}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#E8EDFF] text-sm"
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#E8DCC8] flex items-center justify-center text-[10px] text-[#8B7355] font-medium">
                      {person.firstName?.[0]}
                    </div>
                  )}
                  <span className="text-[#3D2E1F]">{person.firstName} {person.lastName || ''}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#2F3E8F]" />
        </div>
      )}

      {/* Result */}
      {!loading && result && selectedPerson && (
        <div className="mt-4">
          {/* Narrative card */}
          <div className="bg-[#F9FAFB] rounded-lg p-3.5 border border-[#E2E8F0]/50 mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#2F3E8F]" />
              <span className="text-[10px] text-[#2F3E8F] font-semibold uppercase tracking-wider">{result.label}</span>
            </div>

            {/* Hindi kinship term */}
            {kinshipTerm && (
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-base font-semibold text-[#3D2E1F]">{kinshipTerm.label}</span>
                {kinshipTerm.romanization && (
                  <span className="text-xs text-[#8B7355] italic">({kinshipTerm.romanization})</span>
                )}
              </div>
            )}

            <p className="text-sm text-[#3D2E1F] leading-relaxed">
              {result.description}
            </p>

            {/* Lineage badge */}
            {result.lineage && result.lineage !== 'direct' && result.lineage !== 'unknown' && (
              <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[#E8DCC8]/60 text-[#6B5B4A] capitalize">
                {result.lineage === 'paternal' ? "Father's side" : "Mother's side"}
              </span>
            )}

            {/* Indian cultural context */}
            {indianContext && (
              <div className="mt-3 pt-3 border-t border-[#E8DCC8]/60">
                <div className="flex items-center gap-1 mb-1.5">
                  <BookOpen className="w-3 h-3 text-[#8B6B3A]" strokeWidth={1.5} />
                  <span className="text-[9px] font-semibold text-[#8B6B3A] uppercase tracking-wider">In Indian Culture</span>
                </div>
                <p className="text-[12px] text-[#1e3a5f] leading-relaxed">{indianContext}</p>
              </div>
            )}
          </div>

          {/* Path visualization with step labels */}
          {pathPersons.length > 0 && (
            <div className="flex items-center gap-0.5 flex-wrap">
              {pathPersons.map((person, i) => (
                <div key={person.personId} className="flex items-center gap-0.5">
                  <button
                    onClick={() => onOpenProfile(person.personId)}
                    className="text-xs px-2 py-1 rounded-md bg-white border border-[#E2E8F0] hover:bg-[#E8EDFF] text-[#3D2E1F] truncate max-w-[100px] transition-colors"
                    title={`${person.firstName} ${person.lastName || ''}`}
                  >
                    {person.firstName}
                  </button>
                  {i < pathPersons.length - 1 && (
                    <div className="flex items-center gap-0.5">
                      <ChevronRight className="w-3 h-3 text-[#B8A090] shrink-0" />
                      {stepLabels[i] && (
                        <span className="text-[9px] text-[#2F3E8F] font-medium whitespace-nowrap">
                          {stepLabels[i].label}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-[#B8A090] shrink-0" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No result */}
      {!loading && selectedPerson && !result && (
        <div className="mt-4 text-center py-4">
          <p className="text-sm text-[#8B7355]">No relationship path found</p>
          <p className="text-xs text-[#B8A090] mt-0.5">These persons may not be connected in the tree</p>
        </div>
      )}

      {/* Empty state */}
      {!selectedPerson && !loading && (
        <div className="mt-4 text-center py-4">
          <GitBranch className="w-8 h-8 text-[#E2DBCE] mx-auto mb-2" strokeWidth={1} />
          <p className="text-xs text-[#8B7355]">Search for any family member to discover your relationship</p>
        </div>
      )}
    </div>
  )
}
