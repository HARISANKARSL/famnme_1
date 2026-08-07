/**
 * Interview Templates — guided question flows for elder memory capture
 */

export interface InterviewQuestion {
  id: string;
  question: string;
  answerModes: ('text' | 'voice' | 'photo')[];
  placeholder?: string;
}

export interface InterviewTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: InterviewQuestion[];
}

export const INTERVIEW_TEMPLATES: InterviewTemplate[] = [
  {
    id: 'childhood-home',
    title: 'My Childhood Home',
    description: 'Recall the sights, sounds, and smells of where you grew up.',
    icon: 'home',
    questions: [
      { id: 'ch1', question: 'Where did you grow up? Describe the place.', answerModes: ['text', 'voice', 'photo'], placeholder: 'A village, town, or city...' },
      { id: 'ch2', question: 'What did your house look like? How many rooms did it have?', answerModes: ['text', 'voice', 'photo'], placeholder: 'Paint a picture with words...' },
      { id: 'ch3', question: 'Who lived in the house with you?', answerModes: ['text', 'voice'], placeholder: 'Family members, relatives...' },
      { id: 'ch4', question: 'What is your fondest memory from that home?', answerModes: ['text', 'voice'], placeholder: 'A moment that stayed with you...' },
      { id: 'ch5', question: 'What sounds do you remember hearing? Birds, vendors, temple bells?', answerModes: ['text', 'voice'], placeholder: 'Close your eyes and listen...' },
      { id: 'ch6', question: 'Do you have a photo from that time? Or can you draw a sketch?', answerModes: ['photo', 'text'], placeholder: 'Upload a photo if you have one...' },
    ],
  },
  {
    id: 'how-we-met',
    title: 'How We Met',
    description: 'The story of how you met your life partner.',
    icon: 'heart',
    questions: [
      { id: 'hm1', question: 'How did you first meet your spouse? Was it arranged or by chance?', answerModes: ['text', 'voice'], placeholder: 'Tell the story...' },
      { id: 'hm2', question: 'What was your first impression of them?', answerModes: ['text', 'voice'], placeholder: 'What did you think?' },
      { id: 'hm3', question: 'How did the proposal or engagement happen?', answerModes: ['text', 'voice'], placeholder: 'The moment you decided...' },
      { id: 'hm4', question: 'What was the wedding like? Any memorable moments?', answerModes: ['text', 'voice', 'photo'], placeholder: 'Ceremonies, guests, emotions...' },
      { id: 'hm5', question: 'What advice about marriage would you give the younger generation?', answerModes: ['text', 'voice'], placeholder: 'Wisdom from experience...' },
    ],
  },
  {
    id: 'coming-to-city',
    title: 'Coming to the City',
    description: 'The journey from village or small town to urban life.',
    icon: 'train',
    questions: [
      { id: 'cc1', question: 'When and why did you leave your hometown?', answerModes: ['text', 'voice'], placeholder: 'For work, education, marriage...' },
      { id: 'cc2', question: 'How did you travel? What was the journey like?', answerModes: ['text', 'voice'], placeholder: 'By train, bus, on foot...' },
      { id: 'cc3', question: 'Where did you first stay in the city? What was it like?', answerModes: ['text', 'voice'], placeholder: 'A hostel, relative\'s house...' },
      { id: 'cc4', question: 'What surprised you most about city life?', answerModes: ['text', 'voice'], placeholder: 'The differences you noticed...' },
      { id: 'cc5', question: 'Do you still miss home? What do you miss most?', answerModes: ['text', 'voice'], placeholder: 'People, food, traditions...' },
    ],
  },
  {
    id: 'festival-memories',
    title: 'Festival Memories',
    description: 'How your family celebrated festivals through the years.',
    icon: 'sparkles',
    questions: [
      { id: 'fm1', question: 'What is your favourite festival? Why is it special to you?', answerModes: ['text', 'voice'], placeholder: 'Diwali, Onam, Eid, Christmas...' },
      { id: 'fm2', question: 'How did your family prepare for it? Any special rituals?', answerModes: ['text', 'voice'], placeholder: 'Cleaning, cooking, decorating...' },
      { id: 'fm3', question: 'What special food was made? Do you remember the recipe?', answerModes: ['text', 'voice'], placeholder: 'The dishes you loved...' },
      { id: 'fm4', question: 'Who came to celebrate? Any funny or memorable moments?', answerModes: ['text', 'voice', 'photo'], placeholder: 'Family, neighbours, friends...' },
      { id: 'fm5', question: 'Has the celebration changed over the years? How?', answerModes: ['text', 'voice'], placeholder: 'Then vs now...' },
    ],
  },
  {
    id: 'what-work-meant',
    title: 'What My Work Meant',
    description: 'Your career journey and what it meant to you.',
    icon: 'briefcase',
    questions: [
      { id: 'wm1', question: 'What was your first job? How did you get it?', answerModes: ['text', 'voice'], placeholder: 'Your first earning...' },
      { id: 'wm2', question: 'What work did you do for most of your life?', answerModes: ['text', 'voice'], placeholder: 'Your profession or trade...' },
      { id: 'wm3', question: 'What was the hardest part of your work?', answerModes: ['text', 'voice'], placeholder: 'Challenges you faced...' },
      { id: 'wm4', question: 'What achievement at work are you most proud of?', answerModes: ['text', 'voice', 'photo'], placeholder: 'A moment of pride...' },
      { id: 'wm5', question: 'What would you tell a young person starting their career today?', answerModes: ['text', 'voice'], placeholder: 'Your advice...' },
    ],
  },
  {
    id: 'my-parents',
    title: 'My Parents',
    description: 'Memories of your mother and father.',
    icon: 'users',
    questions: [
      { id: 'mp1', question: 'Tell me about your mother. What was she like?', answerModes: ['text', 'voice', 'photo'], placeholder: 'Her personality, habits...' },
      { id: 'mp2', question: 'Tell me about your father. What was he like?', answerModes: ['text', 'voice', 'photo'], placeholder: 'His personality, habits...' },
      { id: 'mp3', question: 'What did your parents do for a living?', answerModes: ['text', 'voice'], placeholder: 'Their work and daily life...' },
      { id: 'mp4', question: 'What is your favourite memory of your parents?', answerModes: ['text', 'voice'], placeholder: 'A moment you treasure...' },
      { id: 'mp5', question: 'What values did they teach you?', answerModes: ['text', 'voice'], placeholder: 'Lessons that stayed...' },
      { id: 'mp6', question: 'Is there something you wish you had asked them?', answerModes: ['text', 'voice'], placeholder: 'Questions left unasked...' },
    ],
  },
  {
    id: 'advice-next-gen',
    title: 'Advice for the Next Generation',
    description: 'Wisdom and guidance for your children and grandchildren.',
    icon: 'message-circle',
    questions: [
      { id: 'ag1', question: 'What is the most important lesson life has taught you?', answerModes: ['text', 'voice'], placeholder: 'Your greatest wisdom...' },
      { id: 'ag2', question: 'What do you wish you had done differently?', answerModes: ['text', 'voice'], placeholder: 'Reflections...' },
      { id: 'ag3', question: 'What family traditions do you hope will continue?', answerModes: ['text', 'voice'], placeholder: 'Customs worth keeping...' },
      { id: 'ag4', question: 'What makes you proud about your family?', answerModes: ['text', 'voice'], placeholder: 'Sources of pride...' },
      { id: 'ag5', question: 'What message would you leave for future generations?', answerModes: ['text', 'voice'], placeholder: 'Your lasting words...' },
    ],
  },
  {
    id: 'unforgettable-day',
    title: 'A Day I\'ll Never Forget',
    description: 'One day that changed everything or stayed with you forever.',
    icon: 'star',
    questions: [
      { id: 'ud1', question: 'What day stands out most in your life? When was it?', answerModes: ['text', 'voice'], placeholder: 'The date or time period...' },
      { id: 'ud2', question: 'What happened? Tell the story from the beginning.', answerModes: ['text', 'voice'], placeholder: 'Walk me through it...' },
      { id: 'ud3', question: 'How did you feel at the time?', answerModes: ['text', 'voice'], placeholder: 'Your emotions...' },
      { id: 'ud4', question: 'How did this day change your life?', answerModes: ['text', 'voice'], placeholder: 'What changed after...' },
      { id: 'ud5', question: 'Do you have a photo or memento from that day?', answerModes: ['photo', 'text'], placeholder: 'Upload if you have one...' },
    ],
  },
];
