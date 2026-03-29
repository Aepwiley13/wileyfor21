// Call scripts keyed by stage — only "connect" exists now.
// Each stage is call-only; text/email scripts are separate.
export const callScripts = {
  connect: [
    {
      id: "opening",
      stepLabel: "OPENING",
      title: "Introduction",
      script:
        "Hi, is this [Delegate Name]? Great! My name is [Your Name] and I'm a volunteer with Aaron Wiley's campaign for House District 21. Aaron is running for the Utah House and the Democratic convention is coming up on April 11th. Do you have just a few minutes to chat?",
      tips: [
        "Smile — they can hear it",
        "If they say no, ask when is a better time",
        "Confirm they are a registered delegate for HD21",
      ],
      notesPlaceholder: "Notes on how they responded...",
    },
    {
      id: "rapport",
      stepLabel: "BUILD RAPPORT",
      title: "Why did you want to be a delegate?",
      script:
        "I'd love to hear a little about you first — what made you want to become a delegate this year? What inspired you to get involved?",
      tips: [
        "Listen more than you talk here",
        "Note themes: community, specific issues, party loyalty, first time",
        "Affirm their answer warmly before moving on",
      ],
      notesPlaceholder: "Why they became a delegate...",
    },
    {
      id: "issues",
      stepLabel: "ISSUES",
      title: "What issues do you care about most?",
      script:
        "That's really meaningful — thank you for sharing that. So what are the issues that matter most to you right now? What do you most want to see action on from your state rep?",
      tips: [
        "Common answers: housing, education, healthcare, immigration, environment",
        "Connect their issues to Aaron's platform when you can",
        "Don't argue — just listen and affirm",
      ],
      notesPlaceholder: "Issues they mentioned...",
    },
    {
      id: "their_questions",
      stepLabel: "THEIR QUESTIONS",
      title: "What questions do you have?",
      script:
        "Aaron has been deeply involved in this community for over 20 years — from coaching youth sports in Rose Park and Glendale to building strong relationships across the district. He's not new to this — he's worked on campaigns for years, including serving as Utah's field and political director for Barack Obama's first presidential campaign, where he helped lead efforts across the state. He's also been on the ballot before, running against Todd Weiler and proving that a Democrat can compete and build real momentum in this district. Now, Aaron is stepping up again to continue the work and progress that leaders like Representative Hollins have started — and he's spent years preparing for this moment. Do you have any questions about Aaron or the race that I can answer for you?",
      tips: [
        'If you don\'t know the answer, say "Great question — let me get that to you"',
        "You can direct them to wileyfor21.com for more info",
        "Note any tough questions so the team can follow up",
      ],
      notesPlaceholder: "Questions they asked, concerns raised...",
    },
    {
      id: "the_ask",
      stepLabel: "THE ASK",
      title: "Do you know who you're voting for?",
      script:
        "I really appreciate you taking the time to talk with me. As we get closer to the April 11th convention, can I ask — do you have a sense of who you're planning to support? We'd love to count on your vote for Aaron Wiley.",
      tips: [
        'Soft commit: "Leaning toward Aaron" is a win — note it',
        "Undecided: offer to send more info, ask what would help",
        "Already supporting: ask if they'd be willing to talk to other delegates",
      ],
      notesPlaceholder: "Their response — committed, undecided, supporting someone else...",
    },
    {
      id: "close",
      stepLabel: "CLOSE",
      title: "Closing the call",
      script:
        "Thank you so much, [Name] — this really means a lot to Aaron and to our whole team. The convention is April 11th and we'll make sure you have everything you need. Is it okay if someone from our team follows up with you before then?",
      tips: [
        "Confirm their contact info if they agree to follow-up",
        "Mention wileyfor21.com one more time",
        "End warmly — even undecideds can be won over",
      ],
      notesPlaceholder: "Follow-up agreed? Contact info? Final impressions...",
    },
  ],
  // Future stages: persuade, commit, gotv
};

export const delegateSurveyQuestions = [
  {
    id: "q1",
    label: "What are your top 3 priorities for District 21?",
    type: "multiselect",
    maxSelect: 3,
    options: [
      "Housing affordability",
      "Public safety & policing",
      "Transit & infrastructure",
      "Education & youth programs",
      "Economic development & jobs",
      "Homelessness & mental health",
      "Environmental quality",
    ],
    allowOther: true,
  },
  {
    id: "q2",
    label: "What is the biggest challenge your constituents are raising with you right now?",
    type: "textarea",
  },
  {
    id: "q3",
    label: "How familiar are you with Aaron Wiley's platform for District 21?",
    type: "scale",
    min: 1,
    max: 5,
    minLabel: "Not at all",
    maxLabel: "Very familiar",
  },
  {
    id: "q4",
    label: "Have you had a conversation with Aaron or his team?",
    type: "radio",
    options: ["Yes", "No", "I would welcome one"],
  },
  {
    id: "q5",
    label: "What would be most useful from a candidate reaching out?",
    type: "radio",
    options: [
      "Policy brief / position paper",
      "In-person meeting",
      "Community event invite",
      "Just keep me informed",
    ],
  },
  {
    id: "q6",
    label: "Are there specific community issues you feel are being overlooked this cycle?",
    type: "textarea",
  },
  {
    id: "q7",
    label: "What is the best way to follow up with you?",
    type: "radio",
    options: ["Email", "Phone call", "Text", "No follow-up needed"],
  },
  {
    id: "q8",
    label: "Your name and contact (optional but appreciated)",
    type: "contact",
    fields: ["name", "email", "phone"],
  },
];

export const volunteerSurveyQuestions = [
  {
    id: "q1",
    label: "What issues brought you to support Aaron?",
    type: "multiselect",
    options: [
      "Housing affordability",
      "Public safety & policing",
      "Transit & infrastructure",
      "Education & youth programs",
      "Economic development & jobs",
      "Homelessness & mental health",
      "Environmental quality",
    ],
    allowOther: true,
  },
  {
    id: "q2",
    label: "How strongly do you support Aaron right now?",
    type: "radio",
    options: [
      "Fully committed",
      "Leaning his way",
      "Still deciding",
      "Supporting someone else",
    ],
  },
  {
    id: "q3",
    label: "Do you personally know any District 21 delegates?",
    type: "radio",
    options: ["Yes", "No"],
    followUp: { trigger: "Yes", type: "text", label: "Who?" },
  },
  {
    id: "q4",
    label: "How did you hear about this campaign?",
    type: "radio",
    options: ["Friend / family", "Social media", "Event", "News"],
    allowOther: true,
  },
  {
    id: "q5",
    label: "What is your biggest concern for your neighborhood right now?",
    type: "textarea",
  },
  {
    id: "q6",
    label: "How much time can you contribute per week?",
    type: "radio",
    options: ["Under 1 hour", "1-3 hours", "3-5 hours", "5+ hours"],
  },
  {
    id: "q7",
    label: "What are you willing to do?",
    type: "multiselect",
    options: [
      "Make phone calls",
      "Send texts and emails",
      "Attend events",
      "Knock on doors",
      "Recruit others",
      "Make a donation",
    ],
  },
  {
    id: "q8",
    label: "Do you have connections to any community orgs, churches, unions, or businesses?",
    type: "radio",
    options: ["Yes", "No"],
    followUp: { trigger: "Yes", type: "text", label: "Tell us:" },
  },
  {
    id: "q9",
    label: "Preferred contact method for campaign updates:",
    type: "radio",
    options: ["Email", "Text", "Phone call"],
  },
  {
    id: "q10",
    label: "Anything else you want Aaron to know?",
    type: "textarea",
  },
];
