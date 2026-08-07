import type { FestivalPromptBundle } from './types';

export const HINDU_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'makar-sankranti', festivalName: 'Makar Sankranti', emoji: '🪁',
    dates: ['01-13', '01-14', '01-15', '01-16'],
    religions: ['Hindu'], regions: ['Gujarat', 'Maharashtra', 'Karnataka', 'Rajasthan'],
    banner: 'Makar Sankranti is here! Celebrate the harvest and kite-flying traditions.',
    prompts: [
      { question: 'Does your family fly kites on Sankranti? Describe the experience.', suggestedTitle: 'Sankranti Kite Flying', suggestedCategory: 'Makar Sankranti' },
      { question: 'What special dishes like til-gul or pongal are made in your home?', suggestedTitle: 'Sankranti Food', suggestedCategory: 'Makar Sankranti' },
      { question: 'How has your family celebrated the harvest season over the years?', suggestedTitle: 'Harvest Celebrations', suggestedCategory: 'Makar Sankranti' },
    ],
  },
  {
    id: 'vasant-panchami', festivalName: 'Vasant Panchami', emoji: '🌼',
    dates: ['01-25', '01-26', '01-27', '01-28', '01-29', '01-30', '01-31', '02-01', '02-02', '02-03', '02-04', '02-05', '02-06', '02-07', '02-08', '02-09', '02-10'],
    religions: ['Hindu'],
    banner: 'Vasant Panchami — honour Goddess Saraswati and welcome spring.',
    prompts: [
      { question: 'Does your family perform Saraswati Puja on Vasant Panchami?', suggestedTitle: 'Saraswati Puja', suggestedCategory: 'Vasant Panchami' },
      { question: 'What does wearing yellow on this day mean in your family?', suggestedTitle: 'Yellow Day Traditions', suggestedCategory: 'Vasant Panchami' },
      { question: 'Were children in your family introduced to learning (Vidyarambha) on this day?', suggestedTitle: 'Starting to Learn', suggestedCategory: 'Vasant Panchami' },
    ],
  },
  {
    id: 'maha-shivaratri', festivalName: 'Maha Shivaratri', emoji: '🔱',
    dates: ['02-18', '02-19', '02-20', '02-21', '02-22', '02-23', '02-24', '02-25', '02-26', '02-27', '02-28', '03-01', '03-02', '03-03', '03-04', '03-05'],
    religions: ['Hindu'],
    banner: 'Maha Shivaratri — a night of devotion to Lord Shiva.',
    prompts: [
      { question: 'Does your family observe fasting or night vigil on Shivaratri?', suggestedTitle: 'Shivaratri Traditions', suggestedCategory: 'Maha Shivaratri' },
      { question: 'Which Shiva temple does your family visit on this day?', suggestedTitle: 'Our Shiva Temple', suggestedCategory: 'Maha Shivaratri' },
      { question: 'What stories about Lord Shiva have been passed down in your family?', suggestedTitle: 'Shiva Stories', suggestedCategory: 'Maha Shivaratri' },
    ],
  },
  {
    id: 'holi', festivalName: 'Holi', emoji: '🎨',
    dates: ['02-25', '02-26', '02-27', '02-28', '03-01', '03-02', '03-03', '03-04', '03-05', '03-06', '03-07', '03-08', '03-09', '03-10', '03-11', '03-12', '03-13', '03-14', '03-15', '03-16', '03-17', '03-18', '03-19', '03-20', '03-21', '03-22', '03-23', '03-24', '03-25'],
    religions: ['Hindu'],
    banner: "Holi is coming! Preserve your family's colorful celebrations.",
    prompts: [
      { question: 'How does your family celebrate Holi? Any special rituals?', suggestedTitle: 'Our Holi Celebrations', suggestedCategory: 'Holi' },
      { question: 'What special food is prepared for Holi in your home?', suggestedTitle: 'Holi Feast', suggestedCategory: 'Holi' },
      { question: 'Share your funniest Holi memory.', suggestedTitle: 'My Funniest Holi', suggestedCategory: 'Holi' },
      { question: 'Do you remember your first Holika Dahan?', suggestedTitle: 'Holika Dahan Memories', suggestedCategory: 'Holi' },
      { question: 'Who do you play Holi with? How has the group changed over years?', suggestedTitle: 'Playing Holi Together', suggestedCategory: 'Holi' },
    ],
  },
  {
    id: 'ram-navami', festivalName: 'Ram Navami', emoji: '🏹',
    dates: ['03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31', '04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12', '04-13', '04-14', '04-15', '04-16', '04-17'],
    religions: ['Hindu'],
    banner: 'Ram Navami — celebrate the birth of Lord Rama.',
    prompts: [
      { question: 'Does your family perform special pujas on Ram Navami?', suggestedTitle: 'Ram Navami Puja', suggestedCategory: 'Ram Navami' },
      { question: 'What Ramayana stories or recitations does your family cherish?', suggestedTitle: 'Ramayana in Our Family', suggestedCategory: 'Ram Navami' },
      { question: 'How do you celebrate Lord Rama\'s birthday in your community?', suggestedTitle: 'Ram Navami Celebrations', suggestedCategory: 'Ram Navami' },
    ],
  },
  {
    id: 'guru-purnima', festivalName: 'Guru Purnima', emoji: '🙏',
    dates: ['07-10', '07-11', '07-12', '07-13', '07-14', '07-15', '07-16', '07-17', '07-18', '07-19', '07-20', '07-21', '07-22', '07-23', '07-24', '07-25'],
    religions: ['Hindu', 'Buddhist', 'Jain'],
    banner: 'Guru Purnima — honour your teachers and mentors.',
    prompts: [
      { question: 'Who has been the most important guru or mentor in your family?', suggestedTitle: 'Our Family Guru', suggestedCategory: 'Guru Purnima' },
      { question: 'Does your family follow a particular spiritual guru or tradition?', suggestedTitle: 'Our Spiritual Tradition', suggestedCategory: 'Guru Purnima' },
      { question: 'How does your family express gratitude to teachers?', suggestedTitle: 'Honouring Teachers', suggestedCategory: 'Guru Purnima' },
    ],
  },
  {
    id: 'raksha-bandhan', festivalName: 'Raksha Bandhan', emoji: '🎀',
    dates: ['07-25', '07-26', '07-27', '07-28', '07-29', '07-30', '07-31', '08-01', '08-02', '08-03', '08-04', '08-05', '08-06', '08-07', '08-08', '08-09', '08-10', '08-11', '08-12', '08-13', '08-14'],
    religions: ['Hindu', 'Sikh', 'Jain'],
    banner: 'Raksha Bandhan is near! Celebrate the bond of siblings.',
    prompts: [
      { question: 'How does your family celebrate Raksha Bandhan?', suggestedTitle: 'Our Raksha Bandhan', suggestedCategory: 'Raksha Bandhan' },
      { question: 'Share a special memory with your sibling.', suggestedTitle: 'Sibling Bond', suggestedCategory: 'Raksha Bandhan' },
      { question: 'What gifts have you exchanged over the years?', suggestedTitle: 'Rakhi Gifts', suggestedCategory: 'Raksha Bandhan' },
      { question: 'How do you celebrate when siblings live far apart?', suggestedTitle: 'Rakhi Across Distance', suggestedCategory: 'Raksha Bandhan' },
    ],
  },
  {
    id: 'janmashtami', festivalName: 'Janmashtami', emoji: '🦚',
    dates: ['08-15', '08-16', '08-17', '08-18', '08-19', '08-20', '08-21', '08-22', '08-23', '08-24', '08-25', '08-26', '08-27', '08-28', '08-29', '08-30', '08-31', '09-01', '09-02', '09-03', '09-04', '09-05'],
    religions: ['Hindu'],
    banner: "Janmashtami — celebrate Lord Krishna's birth!",
    prompts: [
      { question: 'How does your family celebrate Janmashtami? Any midnight rituals?', suggestedTitle: 'Janmashtami Night', suggestedCategory: 'Janmashtami' },
      { question: 'Does your family participate in Dahi Handi or Krishna processions?', suggestedTitle: 'Dahi Handi', suggestedCategory: 'Janmashtami' },
      { question: 'What Krishna stories are special to your family?', suggestedTitle: 'Krishna in Our Family', suggestedCategory: 'Janmashtami' },
    ],
  },
  {
    id: 'ganesh-chaturthi', festivalName: 'Ganesh Chaturthi', emoji: '🐘',
    dates: ['08-25', '08-26', '08-27', '08-28', '08-29', '08-30', '08-31', '09-01', '09-02', '09-03', '09-04', '09-05', '09-06', '09-07', '09-08', '09-09', '09-10', '09-11', '09-12', '09-13', '09-14', '09-15', '09-16', '09-17', '09-18', '09-19', '09-20'],
    religions: ['Hindu'], regions: ['Maharashtra', 'Karnataka', 'Goa', 'Andhra Pradesh', 'Telangana'],
    banner: "Ganpati Bappa Morya! Capture your family's Ganesh festival traditions.",
    prompts: [
      { question: 'Does your family bring Ganesh idol home? Describe the tradition.', suggestedTitle: 'Our Ganesh Festival', suggestedCategory: 'Ganesh Chaturthi' },
      { question: 'What modak or special prasad does your family make?', suggestedTitle: 'Ganesh Chaturthi Food', suggestedCategory: 'Ganesh Chaturthi' },
      { question: 'Share your most memorable visarjan (immersion) experience.', suggestedTitle: 'Ganesh Visarjan', suggestedCategory: 'Ganesh Chaturthi' },
    ],
  },
  {
    id: 'navratri', festivalName: 'Navratri', emoji: '💃',
    dates: ['09-20', '09-21', '09-22', '09-23', '09-24', '09-25', '09-26', '09-27', '09-28', '09-29', '09-30', '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-08', '10-09', '10-10', '10-11', '10-12', '10-13', '10-14', '10-15', '10-16', '10-17', '10-18', '10-19'],
    religions: ['Hindu'],
    banner: "Navratri nights are here! Capture your family's dance and devotion.",
    prompts: [
      { question: 'Does your family do Garba or Dandiya? Describe the experience.', suggestedTitle: 'Our Navratri Garba', suggestedCategory: 'Navratri' },
      { question: 'How does your family set up the Golu (doll display)?', suggestedTitle: 'Navratri Golu', suggestedCategory: 'Navratri' },
      { question: 'What special pujas or fasting does your family observe?', suggestedTitle: 'Navratri Pujas', suggestedCategory: 'Navratri' },
      { question: 'What is your most memorable Dussehra moment?', suggestedTitle: 'Dussehra Memories', suggestedCategory: 'Navratri' },
    ],
  },
  {
    id: 'karwa-chauth', festivalName: 'Karwa Chauth', emoji: '🌙',
    dates: ['10-15', '10-16', '10-17', '10-18', '10-19', '10-20', '10-21', '10-22', '10-23', '10-24', '10-25', '10-26', '10-27', '10-28', '10-29', '10-30'],
    religions: ['Hindu'], regions: ['Delhi', 'Punjab', 'Haryana', 'Rajasthan', 'Uttar Pradesh'],
    banner: 'Karwa Chauth — the beautiful fast of married love.',
    prompts: [
      { question: 'Does your family observe Karwa Chauth? Describe the rituals.', suggestedTitle: 'Karwa Chauth Fasting', suggestedCategory: 'Karwa Chauth' },
      { question: 'Share the story of your most special Karwa Chauth.', suggestedTitle: 'My Karwa Chauth', suggestedCategory: 'Karwa Chauth' },
      { question: 'What does the moon-sighting moment mean in your family?', suggestedTitle: 'Seeing the Moon', suggestedCategory: 'Karwa Chauth' },
    ],
  },
  {
    id: 'diwali', festivalName: 'Diwali', emoji: '🪔',
    dates: ['10-20', '10-21', '10-22', '10-23', '10-24', '10-25', '10-26', '10-27', '10-28', '10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04', '11-05', '11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14'],
    religions: ['Hindu', 'Jain', 'Sikh'],
    banner: "Diwali is around the corner! Capture your family's festival of lights traditions.",
    prompts: [
      { question: 'How does your family decorate the house for Diwali?', suggestedTitle: 'Our Diwali Decorations', suggestedCategory: 'Diwali' },
      { question: 'What sweets and snacks are made in your home for Diwali?', suggestedTitle: 'Diwali Treats', suggestedCategory: 'Diwali' },
      { question: 'Do you remember lighting your first Diwali diyas or crackers?', suggestedTitle: 'My First Diwali Memories', suggestedCategory: 'Diwali' },
      { question: 'How has Diwali celebration changed from your childhood to now?', suggestedTitle: 'Diwali Then and Now', suggestedCategory: 'Diwali' },
    ],
  },
  {
    id: 'chhath-puja', festivalName: 'Chhath Puja', emoji: '☀️',
    dates: ['10-28', '10-29', '10-30', '10-31', '11-01', '11-02', '11-03', '11-04', '11-05', '11-06', '11-07', '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19', '11-20'],
    religions: ['Hindu'], regions: ['Bihar', 'Jharkhand', 'Uttar Pradesh', 'Delhi'],
    banner: 'Chhath Puja — honour the Sun God with your family traditions.',
    prompts: [
      { question: 'How does your family prepare for Chhath Puja? Describe the ritual.', suggestedTitle: 'Chhath Preparations', suggestedCategory: 'Chhath Puja' },
      { question: 'Which river or water body does your family visit for the offering?', suggestedTitle: 'Chhath at the Ghat', suggestedCategory: 'Chhath Puja' },
      { question: 'What thekua or prasad recipes are special in your family?', suggestedTitle: 'Chhath Prasad', suggestedCategory: 'Chhath Puja' },
    ],
  },
];
