import type { FestivalPromptBundle } from './types';

export const REGIONAL_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'pongal', festivalName: 'Pongal', emoji: '🍚',
    dates: ['01-07', '01-08', '01-09', '01-10', '01-11', '01-12', '01-13', '01-14', '01-15', '01-16', '01-17', '01-18', '01-19', '01-20', '01-21'],
    religions: ['Hindu'], regions: ['Tamil Nadu'],
    banner: "Pongal is approaching! Record your family's harvest celebration.",
    prompts: [
      { question: 'How does your family cook the Pongal pot? Who leads the cooking?', suggestedTitle: 'Cooking Pongal Together', suggestedCategory: 'Pongal' },
      { question: 'What does Mattu Pongal mean to your family?', suggestedTitle: 'Mattu Pongal', suggestedCategory: 'Pongal' },
      { question: 'Do you have kolam (rangoli) traditions for Pongal?', suggestedTitle: 'Pongal Kolam', suggestedCategory: 'Pongal' },
      { question: 'Share a childhood memory of Pongal celebrations.', suggestedTitle: 'Pongal of My Childhood', suggestedCategory: 'Pongal' },
    ],
  },
  {
    id: 'onam', festivalName: 'Onam', emoji: '🌸',
    dates: ['08-15', '08-16', '08-17', '08-18', '08-19', '08-20', '08-21', '08-22', '08-23', '08-24', '08-25', '08-26', '08-27', '08-28', '08-29', '08-30', '08-31', '09-01', '09-02', '09-03', '09-04', '09-05', '09-06', '09-07', '09-08', '09-09', '09-10', '09-11', '09-12', '09-13', '09-14', '09-15'],
    religions: ['Hindu', 'Christian', 'Muslim'], regions: ['Kerala'],
    banner: "Onam is here! Capture your family's harvest festival traditions.",
    prompts: [
      { question: 'What does your family Onam Sadhya look like? How many dishes?', suggestedTitle: 'Our Onam Sadhya', suggestedCategory: 'Onam' },
      { question: 'Who makes the pookalam in your family? Describe it.', suggestedTitle: 'Our Pookalam', suggestedCategory: 'Onam' },
      { question: 'What Onakkodi (new clothes) tradition does your family follow?', suggestedTitle: 'Onakkodi Tradition', suggestedCategory: 'Onam' },
      { question: "How has Onam changed from your parents' time to now?", suggestedTitle: 'Onam Through the Years', suggestedCategory: 'Onam' },
    ],
  },
  {
    id: 'ugadi', festivalName: 'Ugadi', emoji: '🌿',
    dates: ['03-20', '03-21', '03-22', '03-23', '03-24', '03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31', '04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12', '04-13', '04-14', '04-15'],
    religions: ['Hindu'], regions: ['Andhra Pradesh', 'Telangana', 'Karnataka'],
    banner: 'Ugadi — the Telugu and Kannada New Year!',
    prompts: [
      { question: 'How does your family celebrate Ugadi? What ugadi pachadi flavors do you include?', suggestedTitle: 'Ugadi Celebrations', suggestedCategory: 'Ugadi' },
      { question: 'Does your family listen to the Panchanga Sravanam (almanac reading)?', suggestedTitle: 'Panchanga Reading', suggestedCategory: 'Ugadi' },
      { question: 'What special dishes does your family prepare for the New Year?', suggestedTitle: 'Ugadi Feast', suggestedCategory: 'Ugadi' },
    ],
  },
  {
    id: 'vishu', festivalName: 'Vishu', emoji: '🌻',
    dates: ['04-13', '04-14', '04-15'],
    religions: ['Hindu'], regions: ['Kerala'],
    banner: 'Vishu — the Kerala New Year with Vishukkani and Kaineettam!',
    prompts: [
      { question: 'How does your family set up the Vishukkani? What items are placed?', suggestedTitle: 'Our Vishukkani', suggestedCategory: 'Vishu' },
      { question: 'Who gives Kaineettam (money gifts) in your family?', suggestedTitle: 'Vishu Kaineettam', suggestedCategory: 'Vishu' },
      { question: 'What special Vishu Sadhya dishes does your family make?', suggestedTitle: 'Vishu Sadhya', suggestedCategory: 'Vishu' },
    ],
  },
  {
    id: 'bihu', festivalName: 'Bihu', emoji: '🎶',
    dates: ['04-13', '04-14', '04-15', '04-16', '04-17', '04-18', '04-19', '04-20', '04-21'],
    religions: ['Hindu'], regions: ['Assam'],
    banner: 'Bohag Bihu — celebrate the Assamese New Year!',
    prompts: [
      { question: 'How does your family celebrate Rongali Bihu?', suggestedTitle: 'Bihu Celebrations', suggestedCategory: 'Bihu' },
      { question: 'Does your family perform Bihu dance? Describe the experience.', suggestedTitle: 'Bihu Dance', suggestedCategory: 'Bihu' },
      { question: 'What pitha (rice cakes) or special foods does your family prepare?', suggestedTitle: 'Bihu Food', suggestedCategory: 'Bihu' },
    ],
  },
  {
    id: 'durga-puja', festivalName: 'Durga Puja', emoji: '🔔',
    dates: ['09-25', '09-26', '09-27', '09-28', '09-29', '09-30', '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-08', '10-09', '10-10', '10-11', '10-12', '10-13', '10-14', '10-15', '10-16', '10-17', '10-18', '10-19', '10-20'],
    religions: ['Hindu'], regions: ['West Bengal', 'Odisha', 'Assam', 'Jharkhand', 'Bihar'],
    banner: 'Durga Puja — the grandest festival of Bengal!',
    prompts: [
      { question: 'Does your family do pandal-hopping? Which pandals are your favorites?', suggestedTitle: 'Pandal Hopping', suggestedCategory: 'Durga Puja' },
      { question: 'What does Sindoor Khela or Vijaya Dashami mean in your family?', suggestedTitle: 'Vijaya Dashami', suggestedCategory: 'Durga Puja' },
      { question: 'What special food — luchi, kosha mangsho, mishti — does your family enjoy?', suggestedTitle: 'Durga Puja Feast', suggestedCategory: 'Durga Puja' },
      { question: 'Share your most memorable Durga Puja from childhood.', suggestedTitle: 'Childhood Durga Puja', suggestedCategory: 'Durga Puja' },
    ],
  },
  {
    id: 'rath-yatra', festivalName: 'Rath Yatra', emoji: '🛕',
    dates: ['06-20', '06-21', '06-22', '06-23', '06-24', '06-25', '06-26', '06-27', '06-28', '06-29', '06-30', '07-01', '07-02', '07-03', '07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10', '07-11', '07-12', '07-13', '07-14', '07-15'],
    religions: ['Hindu'], regions: ['Odisha', 'West Bengal', 'Gujarat'],
    banner: 'Rath Yatra — the grand chariot festival of Lord Jagannath!',
    prompts: [
      { question: 'Has your family attended the Rath Yatra in Puri or elsewhere?', suggestedTitle: 'Rath Yatra Experience', suggestedCategory: 'Rath Yatra' },
      { question: 'Does your family have a connection to the Jagannath tradition?', suggestedTitle: 'Jagannath Tradition', suggestedCategory: 'Rath Yatra' },
      { question: 'What does pulling the chariot rope mean to your family?', suggestedTitle: 'Pulling the Rath', suggestedCategory: 'Rath Yatra' },
    ],
  },
  {
    id: 'thrissur-pooram', festivalName: 'Thrissur Pooram', emoji: '🐘',
    dates: ['04-15', '04-16', '04-17', '04-18', '04-19', '04-20', '04-21', '04-22', '04-23', '04-24', '04-25', '04-26', '04-27', '04-28', '04-29', '04-30', '05-01', '05-02', '05-03', '05-04', '05-05', '05-06', '05-07', '05-08', '05-09', '05-10'],
    religions: ['Hindu'], regions: ['Kerala'],
    banner: 'Thrissur Pooram — the greatest temple festival of Kerala!',
    prompts: [
      { question: 'Has your family attended Thrissur Pooram? Describe the experience.', suggestedTitle: 'Pooram Experience', suggestedCategory: 'Thrissur Pooram' },
      { question: 'What does the Kudamattam (umbrella ceremony) mean to you?', suggestedTitle: 'Kudamattam', suggestedCategory: 'Thrissur Pooram' },
      { question: 'What is your most vivid memory of the Pooram fireworks?', suggestedTitle: 'Pooram Fireworks', suggestedCategory: 'Thrissur Pooram' },
    ],
  },
];
