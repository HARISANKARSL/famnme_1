import type { FestivalPromptBundle } from './types';

export const BUDDHIST_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'ambedkar-jayanti', festivalName: 'Ambedkar Jayanti', emoji: '📘',
    dates: ['04-13', '04-14', '04-15'],
    religions: ['Buddhist'],
    banner: "Ambedkar Jayanti — honour Dr. B.R. Ambedkar's legacy.",
    prompts: [
      { question: "How does your family commemorate Dr. Ambedkar's birth anniversary?", suggestedTitle: 'Ambedkar Jayanti', suggestedCategory: 'Buddhist Festivals' },
      { question: "What does Dr. Ambedkar's legacy of equality mean to your family?", suggestedTitle: "Ambedkar's Legacy", suggestedCategory: 'Buddhist Festivals' },
      { question: 'Does your family attend rallies, lectures, or community gatherings on this day?', suggestedTitle: 'Community Gatherings', suggestedCategory: 'Buddhist Festivals' },
    ],
  },
  {
    id: 'buddha-purnima', festivalName: 'Buddha Purnima', emoji: '🪷',
    dates: ['04-25', '04-26', '04-27', '04-28', '04-29', '04-30', '05-01', '05-02', '05-03', '05-04', '05-05', '05-06', '05-07', '05-08', '05-09', '05-10', '05-11', '05-12', '05-13', '05-14', '05-15', '05-16', '05-17', '05-18', '05-19', '05-20', '05-21', '05-22', '05-23'],
    religions: ['Buddhist', 'Hindu'],
    banner: 'Buddha Purnima — celebrate the birth and enlightenment of the Buddha.',
    prompts: [
      { question: 'How does your family observe Buddha Purnima?', suggestedTitle: 'Buddha Purnima', suggestedCategory: 'Buddhist Festivals' },
      { question: 'Does your family visit a Buddhist temple or vihara on this day?', suggestedTitle: 'Temple Visit', suggestedCategory: 'Buddhist Festivals' },
      { question: "What Buddhist teachings are most important to your family?", suggestedTitle: 'Buddhist Teachings', suggestedCategory: 'Buddhist Festivals' },
    ],
  },
  {
    id: 'losar', festivalName: 'Losar', emoji: '🏔️',
    dates: ['02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21', '02-22', '02-23', '02-24', '02-25', '02-26', '02-27', '02-28', '03-01', '03-02', '03-03', '03-04', '03-05'],
    religions: ['Buddhist'], regions: ['Sikkim', 'Ladakh', 'Arunachal Pradesh', 'Himachal Pradesh'],
    banner: 'Losar — the Tibetan Buddhist New Year.',
    prompts: [
      { question: 'How does your family celebrate the Buddhist New Year?', suggestedTitle: 'Losar Celebrations', suggestedCategory: 'Buddhist Festivals' },
      { question: 'What special prayers, dances, or foods are part of your Losar tradition?', suggestedTitle: 'Losar Traditions', suggestedCategory: 'Buddhist Festivals' },
      { question: 'Does your family display prayer flags or visit monasteries for Losar?', suggestedTitle: 'Prayer Flags', suggestedCategory: 'Buddhist Festivals' },
    ],
  },
];
