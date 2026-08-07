import type { FestivalPromptBundle } from './types';

export const PARSI_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'nowruz', festivalName: 'Nowruz (Parsi New Year)', emoji: '🌅',
    dates: ['08-14', '08-15', '08-16', '08-17', '08-18', '08-19', '08-20'],
    religions: ['Parsi'],
    banner: 'Nowruz Mubarak! Celebrate the Parsi New Year with family.',
    prompts: [
      { question: 'How does your family celebrate Nowruz?', suggestedTitle: 'Our Nowruz', suggestedCategory: 'Parsi Festivals' },
      { question: 'What special dishes are prepared for the New Year feast?', suggestedTitle: 'Nowruz Feast', suggestedCategory: 'Parsi Festivals' },
      { question: 'Does your family visit the Agiary (fire temple) on Nowruz?', suggestedTitle: 'Agiary Visit', suggestedCategory: 'Parsi Festivals' },
    ],
  },
  {
    id: 'pateti', festivalName: 'Pateti', emoji: '🙏',
    dates: ['08-13', '08-14', '08-15', '08-16'],
    religions: ['Parsi'],
    banner: 'Pateti — the day of repentance before the Parsi New Year.',
    prompts: [
      { question: 'How does your family observe Pateti — the day of introspection?', suggestedTitle: 'Pateti Observance', suggestedCategory: 'Parsi Festivals' },
      { question: 'What Zoroastrian values does your family cherish most?', suggestedTitle: 'Our Zoroastrian Values', suggestedCategory: 'Parsi Festivals' },
      { question: 'Does your family gather for special prayers on this day?', suggestedTitle: 'Pateti Prayers', suggestedCategory: 'Parsi Festivals' },
    ],
  },
  {
    id: 'khordad-sal', festivalName: 'Khordad Sal', emoji: '🔥',
    dates: ['05-25', '05-26', '05-27', '05-28', '05-29', '05-30'],
    religions: ['Parsi'],
    banner: "Khordad Sal — celebrate Prophet Zarathustra's birthday.",
    prompts: [
      { question: "How does your family celebrate Zarathustra's birth anniversary?", suggestedTitle: 'Khordad Sal', suggestedCategory: 'Parsi Festivals' },
      { question: 'Does your family visit the fire temple for special prayers?', suggestedTitle: 'Fire Temple Prayers', suggestedCategory: 'Parsi Festivals' },
      { question: 'What does Good Thoughts, Good Words, Good Deeds mean in your daily life?', suggestedTitle: 'Zoroastrian Way', suggestedCategory: 'Parsi Festivals' },
    ],
  },
];
