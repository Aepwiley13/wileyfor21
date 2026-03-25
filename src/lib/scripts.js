// GOTV Field Guide — verbatim content. Do not alter these words.

export const CALL_SCRIPTS = {
  firstContact: {
    label: "Script 1 \u2014 First Contact",
    useWhen: "First time reaching this delegate. Goal: warm intro, learn priorities.",
    lines: [
      "Hi, is this [NAME]?",
      "[Yes] \u2014 Great! My name is [YOUR NAME], and I'm a volunteer with Aaron Wiley's",
      "campaign for House District 21. Aaron is running in the Democratic convention on April 11th.",
      "Do you have just two or three minutes?",
      "[If they engage] \u2014 Aaron is a Rose Park dad and coach who's been organizing on the",
      "West Side for 20 years. He was the first paid employee on Barack Obama's campaign in Utah.",
      "His focus is housing affordability, healthcare access, and making sure we control what",
      "the west side becomes. What issues are you most focused on?",
      "[LISTEN \u2014 take notes \u2014 ask a follow-up based on what they say]",
      "That's exactly the kind of thing Aaron is fighting for. Would you be open to learning more?",
      "I can send you something, or Aaron's happy to connect directly.",
    ],
  },
  followUp: {
    label: "Script 2 \u2014 Follow-Up Call",
    useWhen: "Already spoken once, they were positive. Goal: share platform, move to Leaning.",
    lines: [
      "Hi [NAME], this is [YOUR NAME] \u2014 we spoke last week about the District 21 race.",
      "I wanted to follow up and see if you'd had a chance to look at Aaron's materials.",
      "[If yes] \u2014 Great! Any questions? Happy to answer anything or connect you with Aaron directly.",
      "[If no] \u2014 No worries. I can send you something short \u2014 what would be most useful?",
      "The convention is April 11th. Is there anything that would help you feel confident",
      "about supporting Aaron?",
    ],
  },
  commitmentAsk: {
    label: "Script 3 \u2014 Commitment Ask",
    useWhen: "They're at Leaning \u2014 they like Aaron but haven't committed.",
    lines: [
      "Hi [NAME], this is [YOUR NAME] again. The convention is April 11th.",
      "Based on our conversations, it sounds like Aaron's positions on [THEIR ISSUE]",
      "really resonate with you. Can Aaron count on your vote on April 11th?",
      "[Yes] \u2014 Fantastic. Is there anything that might change between now and then?",
      "[Maybe] \u2014 What would help you get there? More info? A direct call with Aaron?",
      "[No] \u2014 I appreciate your honesty. Who are you leaning toward?",
      "[Log the name. One more follow-up only.]",
    ],
  },
  voicemail: {
    label: "Script 4 \u2014 Voicemail",
    useWhen: "No answer. Keep under 30 seconds. Sound warm, not scripted.",
    lines: [
      "Hi [NAME], this is [YOUR NAME] calling on behalf of Aaron Wiley,",
      "running for House District 21 in the April 11th Democratic convention.",
      "Aaron was the first paid employee on Barack Obama's campaign in Utah.",
      "He's a Rose Park youth coach running to make sure the west side finally gets",
      "the investment it deserves \u2014 in housing, healthcare, and our future.",
      "Reach me at [YOUR NUMBER] or visit wileyfor21.com. Thanks!",
    ],
  },
};

export const OBJECTIONS = [
  {
    question: "I don't know much about Aaron.",
    response:
      "That's exactly why I'm calling. In 2007, Aaron was the first paid employee on Barack Obama's campaign in Utah. He's been coaching kids in Rose Park for 20 years. He brought Michelle Obama and Erin Brockovich to Salt Lake City. He shut down a facility poisoning our air. He's not a newcomer \u2014 he just hasn't needed a title to do the work.",
  },
  {
    question: "I'm supporting another candidate.",
    response:
      "I respect that \u2014 there are strong candidates in this race. I'd just love to share one or two things about Aaron that might be worth knowing before April 11th. Would you be open to hearing what makes him different on [THEIR ISSUE]? [Don't push. Log who they named. One more follow-up only.]",
  },
  {
    question: "Has he actually won anything?",
    response:
      "Yes \u2014 specifically. He was the first paid employee on Barack Obama's campaign in Utah in 2007. He organized the shutdown of Stericycle \u2014 a facility poisoning air above North Salt Lake \u2014 and won. He brought Erin Brockovich and Michelle Obama to Salt Lake City. He's currently on the Salt Lake PNUT Board fighting for West Side investment. This is someone with a 20-year record of organizing and winning.",
  },
  {
    question: "I was supporting James Ord.",
    response:
      "James Ord was a great candidate and we respect his choice to withdraw. Now that he's out, Aaron is the candidate with the deepest West Side roots still in this race. Everything Ord supporters cared about, Aaron is running on. Can I tell you more? [Flag wasOrdSupporter = true in the contact log \u2014 these are your warmest leads.]",
  },
  {
    question: "Why a community organizer over someone with legislative experience?",
    response:
      "The West Side doesn't have a problem with political insiders \u2014 it has a problem with people who've never had to live with the consequences of their decisions. Aaron has a political science degree. He organized at the national level \u2014 Obama 2007, Michelle Obama, Susan Rice. He knows how the systems work. And he knows what it costs when those systems fail this neighborhood.",
  },
];

export const TEXT_TEMPLATES = {
  firstOutreach:
    "Hi [NAME], this is [YOUR NAME] \u2014 volunteer for Aaron Wiley (HD21 convention, April 11). Aaron was the first paid Obama employee in Utah, Rose Park coach for 20 years, fighting for housing & healthcare on the West Side. hub.wileyfor21.com",
  followUp:
    "Hi [NAME] \u2014 following up from our call. Convention is April 11 and Aaron would love your support. Any questions? Happy to connect you directly with him.",
  finalPush:
    "Hi [NAME] \u2014 one week until the District 21 convention (April 11)! Aaron Wiley is the West Side's candidate \u2014 with the record and the relationships to back it up. Can we count on your vote?",
};

export function getRecommendedScript(stage, wasOrdSupporter) {
  if (wasOrdSupporter) {
    return {
      ...CALL_SCRIPTS.firstContact,
      prepend:
        "\u2B50 Was an Ord supporter \u2014 lead with: 'James Ord was a great candidate. Everything he stood for, Aaron is running on.'",
    };
  }
  switch (stage) {
    case "unknown":
      return CALL_SCRIPTS.firstContact;
    case "identified":
      return CALL_SCRIPTS.firstContact;
    case "engaged":
      return CALL_SCRIPTS.followUp;
    case "leaning":
      return CALL_SCRIPTS.commitmentAsk;
    default:
      return CALL_SCRIPTS.firstContact;
  }
}
