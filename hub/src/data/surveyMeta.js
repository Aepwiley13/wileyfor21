// Survey metadata used to decode stored matrix/agreement answers in the admin view.
// Keys mirror the key format used in HD21Survey.jsx: `${sectionId}_${groupIndex}_${itemIndex}`

export const RANK_ITEMS = [
  "Affordability & cost of living",
  "Healthcare access",
  "Westside development & investment",
];

export const SECTION4_GROUPS = [
  {
    title: "Housing & Affordability",
    items: [
      "Expanding affordable housing options on the Westside",
      "Preventing displacement of longtime Westside residents",
      "Tenant opportunity to purchase — renters buying their buildings",
      "Property tax relief to keep seniors in their homes",
      "Expanding cooperative housing programs",
    ],
  },
  {
    title: "Supporting Seniors",
    items: [
      "Expanding and protecting affordable senior housing",
      "Strengthening the property tax deferral program for seniors",
      "Access to in-home care and aging services on the Westside",
      "Protecting Medicaid and Medicare from cuts",
      "Dedicated senior resource centers on the Westside",
    ],
  },
  {
    title: "Violence Against Women & Domestic Safety",
    items: [
      "Increasing funding for domestic violence shelters and crisis services",
      "Stronger legal protections and faster court response for DV survivors",
      "Mandatory DV training for law enforcement and schools",
      "Support services for survivors — housing, counseling, employment",
      "Addressing the backlog of untested sexual assault evidence kits",
    ],
  },
  {
    title: "Water — Great Salt Lake & Water Rights",
    items: [
      "Leasing water shares to restore flow to the Great Salt Lake",
      "Mandating water conservation across agricultural and urban users",
      "Holding industrial users accountable for overconsumption",
      "Investing in water infrastructure and pipe upgrades on the Westside",
      "Stopping further depletion of the lake's tributaries",
    ],
  },
];

export const SECTION5_GROUPS = [
  {
    title: "Crime Prevention & Community Safety",
    items: [
      "Community-based crime prevention programs (youth, mentorship, intervention)",
      "Improved street lighting and infrastructure in high-crime areas",
      "Better coordination between SLCPD and Westside community organizations",
      "Addressing property crime — vehicle theft, break-ins, vandalism",
      "Civilian oversight boards for police accountability",
      "Requiring body cameras for all law enforcement officers",
      "Community policing — officers known by the neighborhood",
      "Addressing root causes of crime: poverty, mental health, addiction",
    ],
  },
  {
    title: "Investing in Nonprofits & Community Organizations",
    items: [
      "Dedicated state funding stream for Westside community nonprofits",
      "Multi-year grant commitments — not one-time awards — so orgs can plan",
      "Supporting nonprofits providing food security, shelter, and job training",
      "Funding organizations that serve immigrant and refugee communities",
      "Investing in youth programs, after-school activities, and mentorship orgs",
      "Supporting arts, culture, and community enrichment organizations",
      "Reducing bureaucratic barriers for small nonprofits accessing grants",
    ],
  },
  {
    title: "Disability Services & Accessibility",
    items: [
      "Protecting disability services funding (tied to progressive tax structure)",
      "Hiring more full-time paraprofessionals in public schools",
      "Improving physical accessibility across Westside neighborhoods",
      "Expanding mental health and developmental disability support programs",
      "Ensuring school vouchers don't defund special education",
    ],
  },
  {
    title: "Environment & Clean Energy",
    items: [
      "Transitioning to 100% renewable energy for Salt Lake City by 2030",
      "Expanding rooftop solar access for Westside homes and small businesses",
      "Scaling fines for industrial polluters affecting Westside air quality",
      "Stopping Inland Port expansion threatening neighborhood health",
      "Opposing the new state tax on wind and solar energy facilities",
    ],
  },
];

export const SECTION6_GROUPS = [
  {
    title: "Education",
    items: [
      "Increasing per-pupil school funding (Utah is 49th in the nation)",
      "Opposing private school vouchers that pull funds from public schools",
      "Free school meals for all students",
      "More paraprofessionals and smaller class sizes",
      "Repeal book bans in public schools",
    ],
  },
  {
    title: "Healthcare",
    items: [
      "Expanding access to mental healthcare",
      "Restoring reproductive healthcare access",
      "Protecting gender-affirming care",
      "Expanding postpartum support and maternal health services",
    ],
  },
  {
    title: "Transportation",
    items: [
      "Advancing the Rio Grande Plan (burying rails, connecting the Westside)",
      "Expanding and increasing frequency of UTA routes on the Westside",
      "Fighting state preemption of local transit planning (SB 242)",
      "Accessible transit options for seniors and people with disabilities",
    ],
  },
  {
    title: "Labor & Economy",
    items: [
      "Raising the state minimum wage (no increase since 2009)",
      "Strengthening union and collective bargaining rights",
      "Bringing living-wage jobs to the Westside",
      "Establishing minimum wage for prison labor",
    ],
  },
  {
    title: "Community & Immigration",
    items: [
      "Opposing expanded ICE enforcement in our neighborhoods",
      "Protecting immigrants and diaspora communities from profiling",
      "Community-centered approach to homelessness and addiction",
    ],
  },
];

export const AGREEMENT_ITEMS = [
  "Utah should adopt a progressive tax structure to better fund education and disability services",
  "Crime prevention requires investing in communities, not just policing",
  "Westside nonprofits need sustained, multi-year state funding — not just private grants",
  "The state should take immediate action to restore Great Salt Lake water levels",
  "Domestic violence is a public health crisis that requires dedicated state funding",
  "The Westside deserves the same infrastructure and energy investment as the Eastside",
  "Housing decisions — including rent stabilization — should be made locally",
  "ICE enforcement is making our community less safe, not more",
  "Tenants should have the first right to purchase when a landlord sells",
  "The state should support Salt Lake City's 2030 renewable energy goal, not undermine it",
  "Healthcare decisions should be made by patients and doctors, not politicians",
  "Seniors on fixed incomes need stronger protections from rising housing costs",
  "School voucher programs that divert funds from special education must be opposed",
];

export const MATRIX_3COL = ["Very important", "Somewhat important", "Not a priority"];
export const AGREEMENT_COLS = ["Strongly agree", "Agree", "Disagree", "Strongly disagree"];

// Build a lookup map: matrixKey → { groupTitle, itemLabel }
export function buildMatrixLookup() {
  const lookup = {};
  const sections = [
    { id: "4", groups: SECTION4_GROUPS },
    { id: "5", groups: SECTION5_GROUPS },
    { id: "6", groups: SECTION6_GROUPS },
  ];
  for (const { id, groups } of sections) {
    groups.forEach((group, gi) => {
      group.items.forEach((item, ii) => {
        lookup[`${id}_${gi}_${ii}`] = { groupTitle: group.title, itemLabel: item, sectionId: id };
      });
    });
  }
  return lookup;
}
