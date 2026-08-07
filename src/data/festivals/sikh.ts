import type { FestivalPromptBundle } from './types';

export const SIKH_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'lohri', festivalName: 'Lohri', emoji: '🔥',
    dates: ['01-12', '01-13', '01-14'],
    religions: ['Sikh', 'Hindu'], regions: ['Punjab', 'Haryana', 'Delhi'],
    banner: 'Lohri — gather around the bonfire and celebrate!',
    prompts: [
      { question: 'How does your family celebrate Lohri? Describe the bonfire gathering.', suggestedTitle: 'Our Lohri Night', suggestedCategory: 'Lohri' },
      { question: 'What songs and dances are part of your Lohri celebrations?', suggestedTitle: 'Lohri Songs', suggestedCategory: 'Lohri' },
      { question: 'Is Lohri celebrated especially for newborns or newlyweds in your family?', suggestedTitle: 'Special Lohri', suggestedCategory: 'Lohri' },
    ],
  },
  {
    id: 'guru-gobind-jayanti', festivalName: 'Guru Gobind Singh Jayanti', emoji: '⚔️',
    dates: ['01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '01-09', '01-10'],
    religions: ['Sikh'],
    banner: "Celebrate the birth of Guru Gobind Singh Ji, the tenth Guru.",
    prompts: [
      { question: 'How does your family honour Guru Gobind Singh Ji on this day?', suggestedTitle: 'Guru Gobind Singh Jayanti', suggestedCategory: 'Sikh Festivals' },
      { question: 'Does your family attend a nagar kirtan or special diwan?', suggestedTitle: 'Nagar Kirtan', suggestedCategory: 'Sikh Festivals' },
      { question: 'What teachings of the tenth Guru are most important to your family?', suggestedTitle: 'Teachings of the Tenth Guru', suggestedCategory: 'Sikh Festivals' },
    ],
  },
  {
    id: 'baisakhi', festivalName: 'Baisakhi', emoji: '🌾',
    dates: ['04-12', '04-13', '04-14', '04-15'],
    religions: ['Sikh', 'Hindu'], regions: ['Punjab', 'Haryana'],
    banner: 'Baisakhi — the harvest festival and birth of the Khalsa.',
    prompts: [
      { question: 'How does your family celebrate Baisakhi?', suggestedTitle: 'Our Baisakhi', suggestedCategory: 'Baisakhi' },
      { question: 'Does your family attend Baisakhi mela or bhangra celebrations?', suggestedTitle: 'Baisakhi Mela', suggestedCategory: 'Baisakhi' },
      { question: 'What does the founding of the Khalsa mean to your family?', suggestedTitle: 'The Khalsa Spirit', suggestedCategory: 'Baisakhi' },
    ],
  },
  {
    id: 'hola-mohalla', festivalName: 'Hola Mohalla', emoji: '🏇',
    dates: ['03-10', '03-11', '03-12', '03-13', '03-14', '03-15', '03-16', '03-17', '03-18', '03-19', '03-20', '03-21', '03-22', '03-23', '03-24', '03-25'],
    religions: ['Sikh'],
    banner: 'Hola Mohalla — the Sikh festival of martial spirit and valour.',
    prompts: [
      { question: 'Has your family attended Hola Mohalla at Anandpur Sahib?', suggestedTitle: 'Hola Mohalla Experience', suggestedCategory: 'Hola Mohalla' },
      { question: 'What martial arts or gatka traditions does your family follow?', suggestedTitle: 'Sikh Martial Traditions', suggestedCategory: 'Hola Mohalla' },
      { question: 'How does your community celebrate the warrior spirit of the Khalsa?', suggestedTitle: 'Khalsa Warriors', suggestedCategory: 'Hola Mohalla' },
    ],
  },
  {
    id: 'guru-nanak-jayanti', festivalName: 'Guru Nanak Jayanti', emoji: '🙏',
    dates: ['11-05', '11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19', '11-20', '11-21', '11-22', '11-23', '11-24', '11-25'],
    religions: ['Sikh'],
    banner: "Guru Nanak Jayanti — celebrate the founder of Sikhism.",
    prompts: [
      { question: 'How does your family celebrate Guru Nanak Dev Ji\'s Parkash Purab?', suggestedTitle: 'Guru Nanak Jayanti', suggestedCategory: 'Sikh Festivals' },
      { question: 'Does your family participate in Prabhat Pheri or langar on this day?', suggestedTitle: 'Prabhat Pheri', suggestedCategory: 'Sikh Festivals' },
      { question: 'What teachings of Guru Nanak are closest to your family\'s heart?', suggestedTitle: 'Guru Nanak Teachings', suggestedCategory: 'Sikh Festivals' },
    ],
  },
];
