import type { FestivalPromptBundle } from './types';

export const CHRISTIAN_FESTIVALS: FestivalPromptBundle[] = [
  {
    id: 'easter', festivalName: 'Easter', emoji: '✝️',
    dates: ['03-20', '03-21', '03-22', '03-23', '03-24', '03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31', '04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12', '04-13', '04-14', '04-15', '04-16', '04-17', '04-18', '04-19', '04-20', '04-21', '04-22', '04-23', '04-24', '04-25'],
    religions: ['Christian'],
    banner: 'Easter — celebrate the resurrection with your family traditions.',
    prompts: [
      { question: 'How does your family celebrate Easter? Any special church services?', suggestedTitle: 'Our Easter', suggestedCategory: 'Easter' },
      { question: 'Do you have Easter egg hunts or other fun traditions?', suggestedTitle: 'Easter Traditions', suggestedCategory: 'Easter' },
      { question: 'What special meals does your family prepare for Easter?', suggestedTitle: 'Easter Feast', suggestedCategory: 'Easter' },
      { question: 'What does the message of Easter mean to your family?', suggestedTitle: 'The Meaning of Easter', suggestedCategory: 'Easter' },
    ],
  },
  {
    id: 'christmas', festivalName: 'Christmas', emoji: '🎄',
    dates: ['12-18', '12-19', '12-20', '12-21', '12-22', '12-23', '12-24', '12-25', '12-26', '12-27', '12-28', '12-29', '12-30', '12-31', '01-01'],
    religions: ['Christian'],
    banner: "Christmas is here! Capture your family's holiday traditions.",
    prompts: [
      { question: 'How does your family celebrate Christmas?', suggestedTitle: 'Our Christmas', suggestedCategory: 'Christmas' },
      { question: 'What is the most memorable Christmas gift you received?', suggestedTitle: 'Best Christmas Gift', suggestedCategory: 'Christmas' },
      { question: 'Describe your family Christmas dinner.', suggestedTitle: 'Christmas Dinner', suggestedCategory: 'Christmas' },
      { question: 'How did you celebrate Christmas as a child?', suggestedTitle: 'Christmas Childhood', suggestedCategory: 'Christmas' },
      { question: 'What Christmas carol or tradition is special to your family?', suggestedTitle: 'Our Christmas Tradition', suggestedCategory: 'Christmas' },
    ],
  },
  {
    id: 'feast-st-thomas', festivalName: 'Feast of St. Thomas', emoji: '⛪',
    dates: ['07-01', '07-02', '07-03', '07-04', '07-05'],
    religions: ['Christian'], regions: ['Kerala'],
    banner: 'Feast of St. Thomas — honour the apostle of India.',
    prompts: [
      { question: 'Does your family have a connection to the St. Thomas Christian tradition?', suggestedTitle: 'St. Thomas Heritage', suggestedCategory: 'Feast of St. Thomas' },
      { question: 'Which church does your family attend for this feast?', suggestedTitle: 'Our Parish Feast', suggestedCategory: 'Feast of St. Thomas' },
      { question: 'What special foods or traditions mark this day in your family?', suggestedTitle: 'Feast Day Traditions', suggestedCategory: 'Feast of St. Thomas' },
    ],
  },
  {
    id: 'all-saints', festivalName: "All Saints' Day", emoji: '🕯️',
    dates: ['10-31', '11-01', '11-02'],
    religions: ['Christian'],
    banner: "All Saints' Day — remember and honour the faithful departed.",
    prompts: [
      { question: 'Does your family visit the cemetery to honour departed souls?', suggestedTitle: 'Remembering the Departed', suggestedCategory: "All Saints' Day" },
      { question: 'What prayers or rituals does your family observe on this day?', suggestedTitle: "All Saints' Prayers", suggestedCategory: "All Saints' Day" },
      { question: 'Share a memory of a family member who has passed.', suggestedTitle: 'In Loving Memory', suggestedCategory: "All Saints' Day" },
    ],
  },
];
