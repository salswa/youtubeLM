// Hardcoded content for the hackathon demo pages (/demo, /demo/pitch,
// /demo/video). Kept in one place so copy edits live together.

/** Demo video — swap this URL once the recording is ready. */
export const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=NOlOw03qBfw";

export const PRODUCT = {
  name: "YouTubeLM",
  tagline: "Turn YouTube into structured, AI-powered courses.",
  blurb:
    "YouTubeLM turns curated YouTube videos into real courses — Course → Units → Chapters — then lets AI read each video and generate a summary, a quiz, a final exam, and a tutor you can chat with. The best teaching on the internet, finally given structure.",
  liveUrl: "/",
};

/** The six judging criteria, answered for YouTubeLM. */
export const CRITERIA: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Originality",
    body: "Not another chat wrapper. We treat a video's transcript as a knowledge base and build an entire course experience — structure, assessment, and tutoring — on top of it.",
  },
  {
    n: "02",
    title: "Impact",
    body: "Anyone learning from YouTube feels the pain: great videos, no path, no retention. Creators and teams get a way to package what they already know into a course in minutes.",
  },
  {
    n: "03",
    title: "AI fluency",
    body: "Gemini watches each video, transcribes once, and every tool reads from that source: summaries, quizzes, a final exam, and a tutor grounded in the actual content — with authors able to review and approve.",
  },
  {
    n: "04",
    title: "Prototype",
    body: "A live product you can poke today: sign in with Google, build a course from real YouTube videos, generate AI study tools, publish, and learn — end to end.",
  },
  {
    n: "05",
    title: "Demo",
    body: "Three minutes: the problem with learning on YouTube, the product turning videos into a course, and the payoff — summaries, quizzes, and a tutor that knows the material.",
  },
  {
    n: "06",
    title: "Creativity",
    body: "An editorial, distraction-free interface; a snapshot publishing model so learners never see half-finished edits; and answer-safe quizzes graded on the server.",
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
    kicker: "Hackathon Demo",
    title: "YouTubeLM",
    subtitle: "Turn YouTube into structured courses — with an AI tutor that knows every video.",
    footer: "The world's biggest classroom, finally organized.",
  },
  {
    kicker: "01 · The problem",
    title: "YouTube is the world's largest classroom — and its messiest.",
    points: [
      "Billions of hours of world-class teaching, with zero structure.",
      "Learners binge videos but don't retain — no path, no checks.",
      "No way to ask, mid-video, \"wait — what did that actually mean?\"",
    ],
  },
  {
    kicker: "02 · The product",
    title: "We turn curated videos into real courses.",
    points: [
      "Authors build a tree: Course → Units → Chapters, one great video each.",
      "AI reads every transcript and generates a summary and a quiz per chapter.",
      "Plus a final course exam and a chat tutor grounded in the videos.",
    ],
  },
  {
    kicker: "03 · AI at the core",
    title: "The model isn't bolted on — it is the product.",
    points: [
      "Gemini watches each video and builds a transcript knowledge base once.",
      "Every study tool reads from that source, so answers stay grounded and cheap.",
      "Authors stay in control: edit, approve, and mark any AI content reviewed.",
    ],
  },
  {
    kicker: "04 · Impact & market",
    title: "Who feels this — and why now.",
    points: [
      "Self-learners who want a real path, not an endless watch-later list.",
      "Creators & educators who already have the videos, and want a course.",
      "Teams onboarding people on curated, trusted content.",
    ],
    footer: "Online learning and the creator economy are both scaling fast — the videos already exist; we give them structure.",
  },
  {
    kicker: "05 · What's next",
    title: "Live today. Here's the road ahead.",
    points: [
      "Now: build a course from real videos in minutes — free.",
      "Next: certificates, cohorts, multi-language transcripts, recommendations.",
      "Try it live and build your first course today.",
    ],
    footer: "YouTubeLM — learn anything, the smart way.",
  },
];
