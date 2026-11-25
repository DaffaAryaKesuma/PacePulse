// Sports Science Knowledge Base for PacePulse AI Coach

export interface ScienceFramework {
  author: string;
  bookOrPaper: string;
  year?: string;
  coreConcepts: string[];
  practicalRules: string[];
}

export const SPORTS_SCIENCE_KNOWLEDGE_BASE: Record<string, ScienceFramework> = {
  jackDaniels: {
    author: "Jack Daniels, Ph.D.",
    bookOrPaper: "Daniels' Running Formula (VDOT System)",
    year: "1998/2014",
    coreConcepts: [
      "VDOT physiological scoring system linking race performance directly to individualized training paces.",
      "Easy/Long (E) pace: 65–78% Max HR, primary for mitochondrial biogenesis, cardiac stroke volume expansion, and capillarization.",
      "Threshold (T) pace: ~88–90% Max HR, lactate threshold / steady state where blood lactate accumulation matches clearance (~4.0 mmol/L reference or personal LT2).",
      "Interval (I) pace: 97–100% VO2Max (~95–100% Max HR), hard 3–5 min work bouts for VO2Max power.",
    ],
    practicalRules: [
      "10% Weekly Rule: Never increase total weekly mileage by more than 10% in a single week to prevent overuse injuries.",
      "Keep Easy runs truly easy: pushing into moderate pace during recovery days degrades the quality of subsequent Threshold and Interval sessions.",
    ],
  },
  seiler8020: {
    author: "Stephen Seiler, Ph.D. & Matt Fitzgerald",
    bookOrPaper: "Polarized Training / 80/20 Running",
    year: "2010/2014",
    coreConcepts: [
      "Polarized Training Distribution: 80% of total training volume/time should be performed strictly below Ventilatory Threshold 1 (VT1 / LT1) in Zone 1/2.",
      "Remaining 20% dedicated to high-quality Zone 4/5 efforts (Threshold, VO2Max, Speed).",
      "The 'Grey Zone' Trap: Training moderately hard (Zone 3 / Marathon Pace) too frequently produces chronic sympathetic fatigue without triggering maximal aerobic or lactate adaptations.",
    ],
    practicalRules: [
      "Strict heart rate discipline on easy days: If HR drifts beyond Zone 2 cap, decelerate immediately or take walk breaks.",
      "Quality over quantity on hard days: High intensity bouts must be completed with pristine biomechanics.",
    ],
  },
  pfitzinger: {
    author: "Pete Pfitzinger & Scott Douglas",
    bookOrPaper: "Advanced Marathoning & Faster Road Racing",
    year: "2001/2019",
    coreConcepts: [
      "Aerobic Decoupling (Cardiac Drift): The percentage shift between pace and heart rate during steady runs. Decoupling > 5% on steady runs reveals insufficient aerobic base or dehydration/hyperthermia.",
      "Lactate Threshold Runs: The single most potent predictor of distance running success from 10K to Marathon.",
      "Reverse Taper Protocol: 10–14 days of gradual reloading post-race to prevent post-race immune suppression and soft tissue relapse.",
    ],
    practicalRules: [
      "Long Run Pace Progression: Start long runs 20% slower than goal race pace and finish the last 5 km near goal pace if aerobic decoupling remains under 5%.",
      "Medium-Long Run (MLR): 14–20 km midweek runs to maintain high glycogen depletion stimulus without weekend long run exhaustion.",
    ],
  },
  mariusBakken: {
    author: "Marius Bakken & The Norwegian System",
    bookOrPaper: "The Norwegian Double Threshold Method",
    year: "2018",
    coreConcepts: [
      "Controlled Sub-Threshold Intensity: Practicing double threshold workouts (morning and afternoon) capped strictly below 3.5 mmol/L (often 2.5–3.0 mmol/L).",
      "High volume of threshold intervals (e.g. 5x2km, 10x1km, 20x400m) with short recoveries (45–60s) to train lactate shuttle mechanisms.",
      "High frequency threshold exposure with low mechanical destruction compared to all-out VO2Max intervals.",
    ],
    practicalRules: [
      "Never race the intervals: Stop 1–2 reps before failure; interval consistency is superior to peak velocity.",
      "Rigid HR ceilings: Athlete must know their personal LT2 HR (e.g. 173 bpm) and terminate high-intensity efforts if HR drifts above threshold.",
    ],
  },
  biomechanicsAndShoes: {
    author: "Malisoux et al. (2015) & Lieberman (Harvard)",
    bookOrPaper: "Shoe Rotation in Distance Runners / Cadence Mechanics",
    year: "2015",
    coreConcepts: [
      "Rotating between multiple running shoe models (e.g., maximum cushion daily trainer vs stiff carbon-plated racer) distributes musculoskeletal stress across different tendon-muscle units, reducing running injury risk by 39%.",
      "Optimal Cadence (170–185 SPM): Higher stride rate reduces ground contact time, minimizes tibial shock, and dampens overstriding/braking forces.",
    ],
    practicalRules: [
      "Daily Base/Long runs: High cushion, neutral geometry (e.g., ASICS Novablast 5).",
      "Threshold/Race sessions: Responsive, carbon-infused or plate rocker geometry (e.g., ASICS Magic Speed 4).",
    ],
  },
};

/**
 * Returns formatted text of all sports science guidelines for AI system prompt context
 */
export function getSportsScienceSystemContext(): string {
  return `
### EVIDENCE-BASED SPORTS SCIENCE KNOWLEDGE BASE (Mandatory Frameworks):
1. **Jack Daniels' Running Formula (VDOT & 10% Mileage Rule)**:
   - Easy (E): 65–78% Max HR (mitochondrial biogenesis).
   - Threshold (T): ~88–90% Max HR (lactate steady state).
   - Weekly volume must not grow by >10%/week.

2. **Stephen Seiler & Matt Fitzgerald (80/20 Polarized Model)**:
   - 80% of weekly volume strictly below LT1 (Zone 1/2).
   - 20% high intensity (Zone 4/5).
   - Avoid the "Grey Zone" (Zone 3 tempo fatigue trap).

3. **Pete Pfitzinger (Advanced Marathoning & Cardiac Drift)**:
   - Aerobic Decoupling / Cardiac Drift > 5% on steady aerobic runs indicates insufficient aerobic base or fatigue.
   - Post-race reverse taper of 10–14 days.

4. **Marius Bakken (Norwegian Sub-Threshold Methodology)**:
   - Controlled sub-threshold intervals (2.5–3.5 mmol/L blood lactate, strictly at or below LT2 HR).
   - Fast recovery, high quality volume without neuromuscular exhaustion.

5. **Biomechanics & Shoe Rotation (Malisoux et al., 2015)**:
   - Cadence target: 170–185 SPM reduces tibial shock and braking force.
   - Shoe rotation (daily trainer vs carbon plated) provides a 39% reduction in overuse injuries.
`;
}
