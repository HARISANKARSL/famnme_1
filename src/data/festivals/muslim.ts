import type { FestivalPromptBundle } from './types';

export const MUSLIM_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'eid-ul-fitr', festivalName: 'Eid ul-Fitr', emoji: '🌙',
    dates: ['03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31', '04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12', '04-13', '04-14', '04-15'],
    religions: ['Muslim'],
    banner: "Eid Mubarak! Preserve your family's Eid traditions.",
    prompts: [
      { question: 'How does your family prepare for Eid? What are the traditions?', suggestedTitle: 'Our Eid Preparations', suggestedCategory: 'Eid' },
      { question: 'What special dishes are made for Eid in your home?', suggestedTitle: 'Eid Feast', suggestedCategory: 'Eid' },
      { question: 'Share a childhood memory of Eid celebrations.', suggestedTitle: 'Eid of My Childhood', suggestedCategory: 'Eid' },
      { question: 'How do you celebrate Eid with extended family?', suggestedTitle: 'Eid with Family', suggestedCategory: 'Eid' },
    ],
  },
  {
    id: 'eid-ul-adha', festivalName: 'Eid ul-Adha', emoji: '🐑',
    dates: ['06-05', '06-06', '06-07', '06-08', '06-09', '06-10', '06-11', '06-12', '06-13', '06-14', '06-15', '06-16', '06-17', '06-18', '06-19', '06-20', '06-21', '06-22', '06-23', '06-24', '06-25'],
    religions: ['Muslim'],
    banner: 'Eid ul-Adha — celebrate the spirit of sacrifice and sharing.',
    prompts: [
      { question: 'How does your family celebrate Bakr-Eid? Describe your traditions.', suggestedTitle: 'Our Eid ul-Adha', suggestedCategory: 'Eid ul-Adha' },
      { question: 'What does the spirit of sacrifice mean in your family?', suggestedTitle: 'Spirit of Qurbani', suggestedCategory: 'Eid ul-Adha' },
      { question: 'How does your family share food and joy with neighbours on this day?', suggestedTitle: 'Sharing on Eid', suggestedCategory: 'Eid ul-Adha' },
    ],
  },
  {
    id: 'muharram', festivalName: 'Muharram', emoji: '🏴',
    dates: ['07-05', '07-06', '07-07', '07-08', '07-09', '07-10', '07-11', '07-12', '07-13', '07-14', '07-15', '07-16', '07-17', '07-18', '07-19', '07-20'],
    religions: ['Muslim'],
    banner: 'Muharram — a time of reflection and remembrance.',
    prompts: [
      { question: 'How does your family observe Muharram?', suggestedTitle: 'Muharram Observance', suggestedCategory: 'Muharram' },
      { question: 'What stories of sacrifice and faith are shared in your family?', suggestedTitle: 'Stories of Faith', suggestedCategory: 'Muharram' },
      { question: 'Does your community hold processions or gatherings? Describe them.', suggestedTitle: 'Muharram Processions', suggestedCategory: 'Muharram' },
    ],
  },
  {
    id: 'milad-un-nabi', festivalName: 'Milad-un-Nabi', emoji: '✨',
    dates: ['09-10', '09-11', '09-12', '09-13', '09-14', '09-15', '09-16', '09-17', '09-18', '09-19', '09-20', '09-21', '09-22', '09-23', '09-24', '09-25', '09-26', '09-27'],
    religions: ['Muslim'],
    banner: "Milad-un-Nabi — celebrate the Prophet's birthday.",
    prompts: [
      { question: 'How does your family celebrate the birth of the Prophet?', suggestedTitle: 'Milad Celebrations', suggestedCategory: 'Milad-un-Nabi' },
      { question: 'What special prayers or gatherings does your family attend?', suggestedTitle: 'Milad Gatherings', suggestedCategory: 'Milad-un-Nabi' },
      { question: 'What teachings from the Prophet are most valued in your family?', suggestedTitle: 'Prophetic Teachings', suggestedCategory: 'Milad-un-Nabi' },
    ],
  },
  {
    id: 'shab-e-barat', festivalName: 'Shab-e-Barat', emoji: '🌟',
    dates: ['02-10', '02-11', '02-12', '02-13', '02-14', '02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21', '02-22', '02-23', '02-24', '02-25'],
    religions: ['Muslim'],
    banner: 'Shab-e-Barat — the night of forgiveness and prayer.',
    prompts: [
      { question: 'How does your family observe the night of Shab-e-Barat?', suggestedTitle: 'Night of Prayer', suggestedCategory: 'Shab-e-Barat' },
      { question: 'What special food is prepared for this night?', suggestedTitle: 'Shab-e-Barat Food', suggestedCategory: 'Shab-e-Barat' },
      { question: 'Do you visit the graves of ancestors on this day?', suggestedTitle: 'Remembering Ancestors', suggestedCategory: 'Shab-e-Barat' },
    ],
  },
];
