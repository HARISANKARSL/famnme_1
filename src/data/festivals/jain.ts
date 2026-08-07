import type { FestivalPromptBundle } from './types';

export const JAIN_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'mahavir-jayanti', festivalName: 'Mahavir Jayanti', emoji: '🙏',
    dates: ['03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31', '04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12', '04-13', '04-14', '04-15', '04-16', '04-17', '04-18', '04-19', '04-20'],
    religions: ['Jain'],
    banner: "Mahavir Jayanti — celebrate the birth of Lord Mahavira.",
    prompts: [
      { question: 'How does your family celebrate Mahavir Jayanti?', suggestedTitle: 'Mahavir Jayanti', suggestedCategory: 'Jain Festivals' },
      { question: 'Does your family visit a Jain temple or attend a rath yatra on this day?', suggestedTitle: 'Temple Visit', suggestedCategory: 'Jain Festivals' },
      { question: 'What teachings of Lord Mahavira are most important to your family?', suggestedTitle: 'Mahavira Teachings', suggestedCategory: 'Jain Festivals' },
    ],
  },
  {
    id: 'paryushana', festivalName: 'Paryushana', emoji: '📿',
    dates: ['08-15', '08-16', '08-17', '08-18', '08-19', '08-20', '08-21', '08-22', '08-23', '08-24', '08-25', '08-26', '08-27', '08-28', '08-29', '08-30', '08-31', '09-01', '09-02', '09-03', '09-04', '09-05', '09-06', '09-07'],
    religions: ['Jain'],
    banner: 'Paryushana — the sacred period of reflection and forgiveness.',
    prompts: [
      { question: 'How does your family observe Paryushana? Describe the fasting and prayers.', suggestedTitle: 'Paryushana Observance', suggestedCategory: 'Paryushana' },
      { question: 'What does Micchami Dukkadam (seeking forgiveness) mean in your family?', suggestedTitle: 'Seeking Forgiveness', suggestedCategory: 'Paryushana' },
      { question: 'What special prayers or lectures does your family attend during these days?', suggestedTitle: 'Paryushana Prayers', suggestedCategory: 'Paryushana' },
    ],
  },
  {
    id: 'jain-diwali', festivalName: 'Diwali (Jain)', emoji: '🪔',
    dates: ['10-20', '10-21', '10-22', '10-23', '10-24', '10-25', '10-26', '10-27', '10-28', '10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04', '11-05', '11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14'],
    religions: ['Jain'],
    banner: "Diwali — marking Lord Mahavira's attainment of Moksha.",
    prompts: [
      { question: "How does your family celebrate Diwali as the day of Mahavira's Nirvana?", suggestedTitle: 'Jain Diwali', suggestedCategory: 'Jain Festivals' },
      { question: 'What significance does this day hold differently from the Hindu celebration?', suggestedTitle: 'Diwali Meaning', suggestedCategory: 'Jain Festivals' },
      { question: 'Does your family do special prayers at a Derasar on Diwali?', suggestedTitle: 'Derasar Visit', suggestedCategory: 'Jain Festivals' },
    ],
  },
];
