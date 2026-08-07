/**
 * Memory Prompts — warm questions to help families start writing memories
 */

export interface MemoryPrompt {
  id: string;
  category: MemoryPromptCategory;
  prompt: string;
  suggestedTitle: string;
  suggestedCategory?: string;
  suggestedMemoryType: 'text' | 'photo' | 'audio';
}

export type MemoryPromptCategory =
  | 'Childhood'
  | 'Food & Traditions'
  | 'Work & Achievements'
  | 'Places & Travel'
  | 'Relationships'
  | 'Hardships & Triumphs'
  | 'Faith & Temples';

export const PROMPT_CATEGORY_COLORS: Record<MemoryPromptCategory, { bg: string; text: string; border: string }> = {
  'Childhood': { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  'Food & Traditions': { bg: 'bg-[#E8EDFF] dark:bg-blue-950/30', text: 'text-[#2F3E8F] dark:text-blue-300', border: 'border-[#2F3E8F]/30 dark:border-blue-800' },
  'Work & Achievements': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'Places & Travel': { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  'Relationships': { bg: 'bg-[#E8EDFF] dark:bg-blue-950/30', text: 'text-[#2F3E8F] dark:text-blue-300', border: 'border-[#2F3E8F]/30 dark:border-blue-800' },
  'Hardships & Triumphs': { bg: 'bg-[#E8EDFF] dark:bg-blue-950/30', text: 'text-[#2F3E8F] dark:text-blue-300', border: 'border-[#2F3E8F]/30 dark:border-blue-800' },
  'Faith & Temples': { bg: 'bg-[#E8EDFF] dark:bg-blue-950/30', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
};

export const MEMORY_PROMPTS: MemoryPrompt[] = [
  // Childhood
  { id: 'c1', category: 'Childhood', prompt: 'What is your earliest memory? What do you see, hear, or feel?', suggestedTitle: 'My Earliest Memory', suggestedMemoryType: 'text' },
  { id: 'c2', category: 'Childhood', prompt: 'What games did you play as a child? Who did you play with?', suggestedTitle: 'Childhood Games', suggestedMemoryType: 'text' },
  { id: 'c3', category: 'Childhood', prompt: 'Describe the house you grew up in. What did it look like?', suggestedTitle: 'The House I Grew Up In', suggestedCategory: 'Ancestral Home', suggestedMemoryType: 'text' },
  { id: 'c4', category: 'Childhood', prompt: 'Who was your favourite teacher? What did they teach you?', suggestedTitle: 'My Favourite Teacher', suggestedCategory: 'Education', suggestedMemoryType: 'text' },
  { id: 'c5', category: 'Childhood', prompt: 'What was your first day of school like?', suggestedTitle: 'First Day of School', suggestedCategory: 'Education', suggestedMemoryType: 'text' },
  { id: 'c6', category: 'Childhood', prompt: 'What mischief did you get into as a child?', suggestedTitle: 'Childhood Mischief', suggestedMemoryType: 'text' },
  { id: 'c7', category: 'Childhood', prompt: 'What bedtime stories were you told? Who told them?', suggestedTitle: 'Bedtime Stories', suggestedCategory: 'Oral History', suggestedMemoryType: 'text' },
  { id: 'c8', category: 'Childhood', prompt: 'What was the neighbourhood like where you grew up?', suggestedTitle: 'My Neighbourhood', suggestedMemoryType: 'text' },
  { id: 'c9', category: 'Childhood', prompt: 'What was your favourite toy or possession as a child?', suggestedTitle: 'My Favourite Childhood Toy', suggestedCategory: 'Heirloom', suggestedMemoryType: 'text' },
  { id: 'c10', category: 'Childhood', prompt: 'Describe summer holidays from your childhood.', suggestedTitle: 'Summer Holidays', suggestedMemoryType: 'text' },
  { id: 'c11', category: 'Childhood', prompt: 'What was your favourite festival celebration as a child?', suggestedTitle: 'Festivals of My Childhood', suggestedMemoryType: 'text' },
  { id: 'c12', category: 'Childhood', prompt: 'Did you have a nickname? How did you get it?', suggestedTitle: 'My Nickname', suggestedMemoryType: 'text' },

  // Food & Traditions
  { id: 'f1', category: 'Food & Traditions', prompt: 'What dish did your grandmother always make for festivals?', suggestedTitle: 'Grandmother\'s Festival Dish', suggestedCategory: 'Recipe', suggestedMemoryType: 'text' },
  { id: 'f2', category: 'Food & Traditions', prompt: 'What was the most elaborate meal your family ever prepared? What was the occasion?', suggestedTitle: 'The Grand Family Feast', suggestedCategory: 'Joint Family Gathering', suggestedMemoryType: 'text' },
  { id: 'f3', category: 'Food & Traditions', prompt: 'Is there a family recipe that has been passed down through generations?', suggestedTitle: 'Our Family Recipe', suggestedCategory: 'Recipe', suggestedMemoryType: 'text' },
  { id: 'f4', category: 'Food & Traditions', prompt: 'How did your family celebrate Diwali? What made it special?', suggestedTitle: 'Our Diwali Celebrations', suggestedCategory: 'Diwali', suggestedMemoryType: 'text' },
  { id: 'f5', category: 'Food & Traditions', prompt: 'What rituals or traditions does your family follow that are unique?', suggestedTitle: 'Our Family Traditions', suggestedCategory: 'Oral History', suggestedMemoryType: 'text' },
  { id: 'f6', category: 'Food & Traditions', prompt: 'Describe a typical Sunday in your family home.', suggestedTitle: 'Sundays at Home', suggestedCategory: 'Joint Family Gathering', suggestedMemoryType: 'text' },
  { id: 'f7', category: 'Food & Traditions', prompt: 'What food reminds you most of home? Why?', suggestedTitle: 'The Taste of Home', suggestedCategory: 'Recipe', suggestedMemoryType: 'text' },
  { id: 'f8', category: 'Food & Traditions', prompt: 'How does your family celebrate weddings? What are the customs?', suggestedTitle: 'Our Wedding Traditions', suggestedCategory: 'Vivah/Wedding', suggestedMemoryType: 'text' },
  { id: 'f9', category: 'Food & Traditions', prompt: 'What prayers or mantras did your family recite together?', suggestedTitle: 'Family Prayers', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 'f10', category: 'Food & Traditions', prompt: 'Describe the rangoli or decorations your family makes for festivals.', suggestedTitle: 'Festival Decorations', suggestedMemoryType: 'text' },
  { id: 'f11', category: 'Food & Traditions', prompt: 'What special sweets were made in your home during celebrations?', suggestedTitle: 'Festival Sweets', suggestedCategory: 'Recipe', suggestedMemoryType: 'text' },
  { id: 'f12', category: 'Food & Traditions', prompt: 'How does your family celebrate birthdays? Any unique customs?', suggestedTitle: 'Birthday Traditions', suggestedCategory: 'Birthday', suggestedMemoryType: 'text' },

  // Work & Achievements
  { id: 'w1', category: 'Work & Achievements', prompt: 'What was your first job? How did you get it?', suggestedTitle: 'My First Job', suggestedCategory: 'Occupation', suggestedMemoryType: 'text' },
  { id: 'w2', category: 'Work & Achievements', prompt: 'What is the achievement you are most proud of?', suggestedTitle: 'My Proudest Achievement', suggestedCategory: 'Award/Medal', suggestedMemoryType: 'text' },
  { id: 'w3', category: 'Work & Achievements', prompt: 'Who inspired you in your career? What did they teach you?', suggestedTitle: 'My Career Inspiration', suggestedCategory: 'Occupation', suggestedMemoryType: 'text' },
  { id: 'w4', category: 'Work & Achievements', prompt: 'Describe the moment you got your first salary. How did you spend it?', suggestedTitle: 'My First Salary', suggestedCategory: 'Occupation', suggestedMemoryType: 'text' },
  { id: 'w5', category: 'Work & Achievements', prompt: 'What skill did you learn that changed your life?', suggestedTitle: 'A Life-Changing Skill', suggestedCategory: 'Education', suggestedMemoryType: 'text' },
  { id: 'w6', category: 'Work & Achievements', prompt: 'Tell about a time you failed and what you learned from it.', suggestedTitle: 'A Lesson from Failure', suggestedMemoryType: 'text' },
  { id: 'w7', category: 'Work & Achievements', prompt: 'What was your education like? Where did you study?', suggestedTitle: 'My Education Journey', suggestedCategory: 'Education', suggestedMemoryType: 'text' },
  { id: 'w8', category: 'Work & Achievements', prompt: 'What did retirement feel like? What did you do next?', suggestedTitle: 'Life After Retirement', suggestedCategory: 'Retirement', suggestedMemoryType: 'text' },

  // Places & Travel
  { id: 'p1', category: 'Places & Travel', prompt: 'Describe your ancestral village or hometown. What makes it special?', suggestedTitle: 'Our Ancestral Village', suggestedCategory: 'Ancestral Home', suggestedMemoryType: 'text' },
  { id: 'p2', category: 'Places & Travel', prompt: 'When did your family move to the city? What was the transition like?', suggestedTitle: 'Coming to the City', suggestedCategory: 'Migration Story', suggestedMemoryType: 'text' },
  { id: 'p3', category: 'Places & Travel', prompt: 'What is the most memorable journey your family took together?', suggestedTitle: 'Our Family Journey', suggestedMemoryType: 'text' },
  { id: 'p4', category: 'Places & Travel', prompt: 'Describe a place that no longer exists but lives in your memory.', suggestedTitle: 'A Place That Lives in Memory', suggestedCategory: 'Place/Building', suggestedMemoryType: 'text' },
  { id: 'p5', category: 'Places & Travel', prompt: 'What was the first long-distance trip you ever took?', suggestedTitle: 'My First Big Trip', suggestedMemoryType: 'text' },
  { id: 'p6', category: 'Places & Travel', prompt: 'Tell about a pilgrimage your family made together.', suggestedTitle: 'Our Family Pilgrimage', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 'p7', category: 'Places & Travel', prompt: 'Describe a family home that has been in the family for generations.', suggestedTitle: 'The Family Home', suggestedCategory: 'Ancestral Home', suggestedMemoryType: 'text' },
  { id: 'p8', category: 'Places & Travel', prompt: 'What was the neighbourhood market like where you grew up?', suggestedTitle: 'The Neighbourhood Market', suggestedCategory: 'Place/Building', suggestedMemoryType: 'text' },
  { id: 'p9', category: 'Places & Travel', prompt: 'Has your family moved between countries? What was that experience like?', suggestedTitle: 'Our Immigration Story', suggestedCategory: 'Immigration', suggestedMemoryType: 'text' },

  // Relationships
  { id: 'r1', category: 'Relationships', prompt: 'How did your parents or grandparents meet?', suggestedTitle: 'How They Met', suggestedMemoryType: 'text' },
  { id: 'r2', category: 'Relationships', prompt: 'Who was the wisest person in your family? What did they teach you?', suggestedTitle: 'The Wisest in Our Family', suggestedMemoryType: 'text' },
  { id: 'r3', category: 'Relationships', prompt: 'Describe a moment that brought your entire family together.', suggestedTitle: 'When the Family United', suggestedCategory: 'Family Reunion', suggestedMemoryType: 'text' },
  { id: 'r4', category: 'Relationships', prompt: 'What values did your parents teach you that you carry today?', suggestedTitle: 'Values My Parents Taught Me', suggestedMemoryType: 'text' },
  { id: 'r5', category: 'Relationships', prompt: 'Describe the bond between you and your siblings.', suggestedTitle: 'My Siblings and I', suggestedMemoryType: 'text' },
  { id: 'r6', category: 'Relationships', prompt: 'What is the most thoughtful thing a family member ever did for you?', suggestedTitle: 'An Act of Love', suggestedMemoryType: 'text' },
  { id: 'r7', category: 'Relationships', prompt: 'Tell the story of a family elder you wish the younger generation could have met.', suggestedTitle: 'An Elder They Should Know', suggestedMemoryType: 'text' },
  { id: 'r8', category: 'Relationships', prompt: 'What advice would you give to the next generation of your family?', suggestedTitle: 'Advice for the Next Generation', suggestedMemoryType: 'text' },
  { id: 'r9', category: 'Relationships', prompt: 'Describe a letter or message from a family member that you treasure.', suggestedTitle: 'A Treasured Message', suggestedCategory: 'Personal Paper', suggestedMemoryType: 'text' },
  { id: 'r10', category: 'Relationships', prompt: 'What does "family" mean to you? How has that changed over time?', suggestedTitle: 'What Family Means to Me', suggestedMemoryType: 'text' },

  // Hardships & Triumphs
  { id: 'h1', category: 'Hardships & Triumphs', prompt: 'Tell about a time your family faced a great challenge. How did you overcome it?', suggestedTitle: 'A Challenge We Overcame', suggestedMemoryType: 'text' },
  { id: 'h2', category: 'Hardships & Triumphs', prompt: 'Describe a moment of great joy that came after a difficult time.', suggestedTitle: 'Joy After the Storm', suggestedMemoryType: 'text' },
  { id: 'h3', category: 'Hardships & Triumphs', prompt: 'How did your family cope during a natural disaster or difficult period?', suggestedTitle: 'How We Coped', suggestedMemoryType: 'text' },
  { id: 'h4', category: 'Hardships & Triumphs', prompt: 'What sacrifice did a family member make for the others?', suggestedTitle: 'A Family Sacrifice', suggestedMemoryType: 'text' },
  { id: 'h5', category: 'Hardships & Triumphs', prompt: 'Describe a turning point in your family\'s history.', suggestedTitle: 'A Turning Point', suggestedMemoryType: 'text' },
  { id: 'h6', category: 'Hardships & Triumphs', prompt: 'What did your family do during Partition, Independence, or a major national event?', suggestedTitle: 'Our Family and History', suggestedMemoryType: 'text' },
  { id: 'h7', category: 'Hardships & Triumphs', prompt: 'Tell about someone in your family who started from nothing and built something meaningful.', suggestedTitle: 'From Nothing to Something', suggestedMemoryType: 'text' },
  { id: 'h8', category: 'Hardships & Triumphs', prompt: 'What is a story of courage in your family that inspires you?', suggestedTitle: 'A Story of Courage', suggestedMemoryType: 'text' },

  // Faith & Temples
  { id: 't1', category: 'Faith & Temples', prompt: 'Which temple does your family consider its Kula Devata (family deity) temple? What is its significance to your lineage?', suggestedTitle: 'Our Kula Devata Temple', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't2', category: 'Faith & Temples', prompt: 'Describe the atmosphere of your family temple on a major festival day — the crowds, the sounds, the smells, the rituals you witnessed.', suggestedTitle: 'The Temple on Festival Day', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't3', category: 'Faith & Temples', prompt: 'Who in your family was the most devoted to the temple? What did they do there — rituals, seva, offerings?', suggestedTitle: 'Our Most Devoted Family Member', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't4', category: 'Faith & Temples', prompt: 'What offerings did your family traditionally make at the temple — flowers, lamps, fruits, or something unique to your tradition?', suggestedTitle: 'Our Temple Offerings', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't5', category: 'Faith & Temples', prompt: 'Have you ever been part of a temple procession, rath yatra, or a special ritual role? What do you remember about it?', suggestedTitle: 'The Temple Procession', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't6', category: 'Faith & Temples', prompt: 'What is the story of how your family first came to be connected to this temple? Was it through birth, marriage, or a divine calling?', suggestedTitle: 'How We Found Our Temple', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },

  // ── Expansion (Phase 3 / 6.6) — grows library past 100 prompts ──
  // Childhood add-ons
  { id: 'c13', category: 'Childhood', prompt: 'What was your favourite cartoon, comic, or story hero? Why?', suggestedTitle: 'My Childhood Hero', suggestedMemoryType: 'text' },
  { id: 'c14', category: 'Childhood', prompt: 'What was the walk or bus ride to school like?', suggestedTitle: 'The Road to School', suggestedCategory: 'Education', suggestedMemoryType: 'text' },
  { id: 'c15', category: 'Childhood', prompt: 'Describe a rainy day from your childhood.', suggestedTitle: 'A Rainy Day', suggestedMemoryType: 'text' },
  { id: 'c16', category: 'Childhood', prompt: 'What song did your mother sing at bedtime?', suggestedTitle: 'Mother\'s Lullaby', suggestedMemoryType: 'text' },
  { id: 'c17', category: 'Childhood', prompt: 'Who taught you to ride a bicycle or swim?', suggestedTitle: 'My First Balance', suggestedMemoryType: 'text' },
  { id: 'c18', category: 'Childhood', prompt: 'What was your family\'s first television or radio like?', suggestedTitle: 'The Family TV', suggestedCategory: 'Heirloom', suggestedMemoryType: 'text' },
  // Food & Traditions add-ons
  { id: 'f13', category: 'Food & Traditions', prompt: 'Describe your grandmother\'s spice box — which were her favourites?', suggestedTitle: 'Grandmother\'s Spice Box', suggestedCategory: 'Heirloom', suggestedMemoryType: 'text' },
  { id: 'f14', category: 'Food & Traditions', prompt: 'Which pickle lived in your kitchen for years? Who made it?', suggestedTitle: 'The Family Pickle', suggestedCategory: 'Recipe', suggestedMemoryType: 'text' },
  { id: 'f15', category: 'Food & Traditions', prompt: 'Who taught you your first cup of tea or coffee?', suggestedTitle: 'My First Cup', suggestedMemoryType: 'text' },
  { id: 'f16', category: 'Food & Traditions', prompt: 'What food did your family make to comfort a sick child?', suggestedTitle: 'Comfort Food', suggestedMemoryType: 'text' },
  { id: 'f17', category: 'Food & Traditions', prompt: 'What did Onam, Pongal, Bihu, or your regional harvest festival look like at home?', suggestedTitle: 'Our Harvest Festival', suggestedMemoryType: 'text' },
  { id: 'f18', category: 'Food & Traditions', prompt: 'Who tied your first rakhi, or still ties it every year?', suggestedTitle: 'Our Rakhi Tradition', suggestedMemoryType: 'text' },
  // Places & Travel add-ons
  { id: 'p10', category: 'Places & Travel', prompt: 'Tell us about a tree in your ancestral home.', suggestedTitle: 'The Family Tree (literal)', suggestedMemoryType: 'text' },
  { id: 'p11', category: 'Places & Travel', prompt: 'Describe a river, lake, or sea that\'s meaningful to your family.', suggestedTitle: 'Our Family Water', suggestedMemoryType: 'text' },
  { id: 'p12', category: 'Places & Travel', prompt: 'What was the local market like on a Sunday morning?', suggestedTitle: 'Sunday Market', suggestedCategory: 'Place/Building', suggestedMemoryType: 'text' },
  { id: 'p13', category: 'Places & Travel', prompt: 'What does your hometown sound like in the early morning?', suggestedTitle: 'My Hometown at Dawn', suggestedMemoryType: 'text' },
  { id: 'p14', category: 'Places & Travel', prompt: 'Describe the courtyard or verandah of your grandparents\' house.', suggestedTitle: 'The Verandah', suggestedCategory: 'Ancestral Home', suggestedMemoryType: 'text' },
  // Relationships add-ons
  { id: 'r11', category: 'Relationships', prompt: 'Which family member\'s visit was always the best — what did they bring?', suggestedTitle: 'The Visitor', suggestedMemoryType: 'text' },
  { id: 'r12', category: 'Relationships', prompt: 'Describe a grandparent\'s hands.', suggestedTitle: 'My Grandparent\'s Hands', suggestedMemoryType: 'text' },
  { id: 'r13', category: 'Relationships', prompt: 'Who was the family\'s unofficial historian?', suggestedTitle: 'The Family Historian', suggestedMemoryType: 'text' },
  { id: 'r14', category: 'Relationships', prompt: 'Share a nickname someone in the family had, and how they got it.', suggestedTitle: 'The Nickname Story', suggestedMemoryType: 'text' },
  { id: 'r15', category: 'Relationships', prompt: 'Tell us about a friend the family considered one of its own.', suggestedTitle: 'Chosen Family', suggestedMemoryType: 'text' },
  { id: 'r16', category: 'Relationships', prompt: 'Write a short letter to a grandparent you never met.', suggestedTitle: 'Letter to an Ancestor', suggestedMemoryType: 'text' },
  // Work & Achievements add-ons
  { id: 'w9', category: 'Work & Achievements', prompt: 'What\'s a skill you picked up from a parent?', suggestedTitle: 'Learned from a Parent', suggestedMemoryType: 'text' },
  { id: 'w10', category: 'Work & Achievements', prompt: 'Who was your hardest boss and what did they teach you?', suggestedTitle: 'Tough Lessons', suggestedCategory: 'Occupation', suggestedMemoryType: 'text' },
  // Hardships & Triumphs add-ons
  { id: 'h9', category: 'Hardships & Triumphs', prompt: 'Describe a time the family pulled together when it mattered most.', suggestedTitle: 'When We Came Together', suggestedMemoryType: 'text' },
  { id: 'h10', category: 'Hardships & Triumphs', prompt: 'Share a story of resilience passed down from an elder.', suggestedTitle: 'Ancestor\'s Resilience', suggestedMemoryType: 'text' },
  // Faith & Temples add-ons
  { id: 't7', category: 'Faith & Temples', prompt: 'What prayer, shloka, or mantra did your family recite before meals?', suggestedTitle: 'Before We Ate', suggestedMemoryType: 'text' },
  { id: 't8', category: 'Faith & Temples', prompt: 'Describe a pilgrimage that became part of family legend.', suggestedTitle: 'A Family Pilgrimage', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't9', category: 'Faith & Temples', prompt: 'Who in the family had the strongest faith? What did it look like in practice?', suggestedTitle: 'The Devout One', suggestedMemoryType: 'text' },
  { id: 't10', category: 'Faith & Temples', prompt: 'Is there a Gotra, Vansh, or lineage story your family repeats at gatherings?', suggestedTitle: 'Our Lineage Story', suggestedCategory: 'Oral History', suggestedMemoryType: 'text' },
  { id: 't11', category: 'Faith & Temples', prompt: 'Describe a diya, puja thali, or sacred object used across generations.', suggestedTitle: 'Our Sacred Object', suggestedCategory: 'Heirloom', suggestedMemoryType: 'text' },
  { id: 't12', category: 'Faith & Temples', prompt: 'What happens in your family when a baby is born — the rituals, the songs?', suggestedTitle: 'When a Baby Arrives', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
  { id: 't13', category: 'Faith & Temples', prompt: 'Share the story of a wedding mandap, nikaah, or sacred ceremony that shaped the family.', suggestedTitle: 'The Sacred Ceremony', suggestedCategory: 'Vivah/Wedding', suggestedMemoryType: 'text' },
  { id: 't14', category: 'Faith & Temples', prompt: 'Tell us about a ritual you want the next generation to know by heart.', suggestedTitle: 'Ritual to Pass Down', suggestedMemoryType: 'text' },
  { id: 't15', category: 'Faith & Temples', prompt: 'Which kuladevata, ishta devata, or patron saint does your family turn to in hard times?', suggestedTitle: 'Our Family Deity', suggestedCategory: 'Temple/Place of Worship', suggestedMemoryType: 'text' },
];

/** Get today's prompt deterministically */
export function getPromptOfTheDay(): MemoryPrompt {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return MEMORY_PROMPTS[dayIndex % MEMORY_PROMPTS.length];
}

/** Get all unique prompt categories */
export function getPromptCategories(): MemoryPromptCategory[] {
  return [...new Set(MEMORY_PROMPTS.map(p => p.category))];
}
