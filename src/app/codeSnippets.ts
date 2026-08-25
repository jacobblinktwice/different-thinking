/* The brand code dialect — a custom language on JavaScript's bones: ALL CAPS,
   `//` comments, no arrows, no API wordiness. The rules and the full set live in
   `Misc/brand-code-snippets.md` (Drive); this is the site-side copy so a snippet
   can be dropped into a layout by name.

   Grouped the same way as the source doc. Add new ones here, not inline. */
export const SNIPPETS = {
  /* the joke, taken seriously */
  bugIsFeature: 'CONST BUG = "FEATURE";\n// WE TAKE THE JOKE SERIOUSLY',
  workingAsIntended: "FUNCTION WORKING_AS_INTENDED() {\n  RETURN TRUE; // WE ARE THE BUGS\n}",
  deviation: "// DEVIATION FROM SPEC\n// BEHAVIOUR NOBODY ASKED FOR\nKEEP_RUNNING = TRUE;",

  /* the mismatch, not the mind */
  mismatch: 'IF (MIND !== TEMPLATE) {\n  // NOT A BROKEN BRAIN\n  THROW "THE SYSTEM, NOT THE BRAIN";\n}',
  debuggingYourself: "WHILE (DEBUGGING_YOURSELF) {\n  // YOUR BEST YEARS ON THE WRONG BUG\n  BREAK;\n}\nSHIP_SOMETHING();",
  template: 'CONST TEMPLATE = "ONE WAY TO SIT, PAY ATTENTION, BE MOTIVATED";\n// RUNS CLEANLY FOR MOST\n// THROWS ERRORS FOR THE REST',

  /* the features, running in the background */
  hyperfocus: "TRY {\n  HYPERFOCUS();\n} CATCH (HOURS) {\n  RETURN BREAKTHROUGHS;\n}",
  pattern: "IF (PATTERN_IN(A) === PATTERN_IN(B)) {\n  // LOGGED AS A SYMPTOM\n  // RUNNING AS A FEATURE\n  RETURN THE_LEAP;\n}",
  group: "CONST GROUP = [SCANNER, OBSESSIVE, DREAMER];\n// RAN UNEXPECTED_BEHAVIOUR\n// SURVIVED TOGETHER",

  /* the refusals */
  refuse: "REFUSE({\n  GUILT_MECHANICS: NULL,\n  BROKEN_STREAKS: NULL,\n  SHAME: NULL,\n});",
  baseline: "CONST BASELINE = YOUR_OWN;\n// NOT A NEUROTYPICAL IDEAL",
  deficitModel: "DELETE DEFICIT_MODEL;\n// KEPT: THE MINDS",

  /* the trails (About) — the dots trail further each line, as before */
  followTrails:
    "FOLLOW(THE_TRAILS)...\n" +
    "FOLLOW(THE_TRAILS).......\n" +
    "FOLLOW(THE_TRAILS)..............\n" +
    "FOLLOW(THE_TRAILS).....................\n" +
    "FOLLOW(THE_TRAILS).............................",

  /* the mission */
  oneInFive: "CONST MINDS = 1 / 5;\n// FILED UNDER BUGS FOR A CENTURY",
  findNameBuild: "FIND(HOW_YOUR_MIND_CREATES_VALUE);\nNAME(IT);\nBUILD(A_LIFE_AROUND_IT);",
  awaitEventually: "AWAIT EVENTUALLY;\n// AN AI COACH FOR ADHD\n// IT WILL NOT BE THE LAST",
  deploy: "STOP_APOLOGISING();\nDEPLOY(MIND);",
} as const;

export type SnippetKey = keyof typeof SNIPPETS;
