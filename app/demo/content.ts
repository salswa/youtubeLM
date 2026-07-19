// Hardcoded content for the hackathon demo pages (/demo, /demo/pitch,
// /demo/video). Kept in one place so copy edits live together.

/** Demo video — swap this URL once the recording is ready. */
export const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=5Y-OUZxn0DU";

export const PRODUCT = {
  name: "YouTubeLM",
  tagline: "Human-curated videos. AI-built courses.",
  blurb:
    "YouTubeLM keeps one decision firmly human — choosing the single best video that explains a concept — and lets AI do everything else. A person builds the course tree and hand-picks each video; AI then reads that video and generates the summary, quiz, final exam, and chat tutor. In an era flooded with AI-generated content, the human touch is the feature.",
  liveUrl: "/",
};

/** The six judging criteria, answered for YouTubeLM. */
export const CRITERIA: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Originality",
    body: "Most tools race to automate everything. We do the opposite: the one high-judgment step — choosing the best video for a concept — is deliberately kept human, and AI builds the course around that choice. Human-curated, AI-amplified.",
  },
  {
    n: "02",
    title: "Impact",
    body: "Anyone learning from YouTube feels the pain: great videos, no path, no retention. Creators and teams get a way to package what they already know into a course in minutes.",
  },
  {
    n: "03",
    title: "AI fluency",
    body: "Gemini watches each human-chosen video, transcribes once, and every tool reads from that source: summaries, quizzes, a final exam, and a tutor grounded in the actual content. The model is used with intent — to amplify a human's pick, not to replace their judgment.",
  },
  {
    n: "04",
    title: "Prototype",
    body: "A live product you can poke today: sign in with Google, build a course from real YouTube videos, generate AI study tools, publish, and learn — end to end.",
  },
  // {
  //   n: "05",
  //   title: "Demo",
  //   body: "Three minutes: the problem with learning on YouTube, the product turning videos into a course, and the payoff — summaries, quizzes, and a tutor that knows the material.",
  // },
  {
    n: "06",
    title: "Creativity",
    body: "A deliberate design philosophy — human curation at the core, AI as the amplifier — expressed through an editorial, distraction-free interface, a snapshot publishing model, and answer-safe quizzes graded on the server.",
  },
];

export interface Slide {
  kicker: string;
  title: string;
  subtitle?: string;
  points?: string[];
  footer?: string;
}

/** 6-slide pitch deck: idea → problem → product → AI → market → what's next. */
export const SLIDES: Slide[] = [
  {
    kicker: "Presenting",
    title: "YouTubeLM",
    subtitle: "Human-curated videos. AI-built courses.",
    footer:
      "In an era flooded with AI content, the human touch is the feature.",
  },
  {
    kicker: "01 · The problem",
    title: "YouTube is the world's largest classroom — and its messiest.",
    points: [
      "Billions of hours of world-class teaching, with zero structure.",
      "Learners binge videos but don't retain — no path, no checks.",
      "And the feed is drowning in auto-generated, low-signal content.",
    ],
  },
  {
    kicker: "02 · Our belief",
    title: "Keep the judgment human. Let AI do the rest.",
    points: [
      "Judging which video truly explains a concept is human taste — so we never automate it.",
      "A person hand-picks the single best video for each chapter; that choice anchors the whole course.",
      "AI amplifies that pick into summaries, quizzes, and a tutor — it never overrides it.",
    ],
  },
  {
    kicker: "03 · The product",
    title: "We turn human-picked videos into real courses.",
    points: [
      "Authors build a tree: Course → Units → Chapters, one great video each.",
      "AI reads every transcript and generates a summary and a quiz per chapter.",
      "Plus a final course exam and a chat tutor grounded in the videos.",
    ],
  },
  {
    kicker: "04 · AI as amplifier",
    title: "The model scales the teaching — not the taste.",
    points: [
      "Gemini watches each chosen video and builds a transcript knowledge base once.",
      "Every study tool reads from that source, so answers stay grounded and cheap.",
      "Authors stay in control: edit, approve, and mark any AI content reviewed.",
    ],
  },
  {
    kicker: "05 · Impact & market",
    title: "Who feels this — and why now.",
    points: [
      "Self-learners who want a real path, not an endless watch-later list.",
      "Creators & educators who already have the videos, and want a course.",
      "Teams onboarding people on curated, trusted content.",
    ],
    footer:
      "Online learning and the creator economy are both scaling fast — the videos already exist; we give them structure.",
  },
  {
    kicker: "06 · What's next",
    title: "Live today. Here's the road ahead.",
    points: [
      "Better experience: smoother builder, polished flows, mobile-friendly.",
      "Learner-focused features: notes, bookmarks, certificates.",
      "Smarter AI: sharper summaries and quizzes, plus multi-language support.",
    ],
    footer: "YouTubeLM — learn anything, the smart way.",
  },
];
