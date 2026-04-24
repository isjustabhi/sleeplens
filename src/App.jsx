import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const DEFAULT_SLEEP_DATA = {
  bedtime: '23:00',
  wakeTime: '07:00',
  sleepDuration: 8,
  sleepLatency: 15,
  awakenings: 1,
  naps: '1 short <20min',
  caffeine: '1-2 cups',
  alcohol: 'Occasionally',
  screenTime: 60,
  exercise: '3-4x/week',
  stressLevel: 5,
  age: '',
  sex: 'Female',
  bmi: '',
  snoring: "Don't know",
  legRestlessness: 'Sometimes',
  morningHeadaches: 'Never',
};

const ANALYSIS_STEPS = [
  { percent: 8, message: 'Mapping your circadian rhythm...' },
  { percent: 18, message: 'Calculating sleep architecture...' },
  { percent: 28, message: 'Assessing sleep latency patterns...' },
  { percent: 38, message: 'Evaluating cardiovascular markers...' },
  { percent: 48, message: 'Analyzing cardiometabolic risk factors...' },
  { percent: 58, message: 'Computing chronotype alignment...' },
  { percent: 68, message: 'Cross-referencing clinical guidelines...' },
  { percent: 78, message: 'Generating sleep improvement protocol...' },
  { percent: 88, message: 'Building personalized weekly plan...' },
  { percent: 96, message: 'Finalizing your sleep intelligence report...' },
];

const SYSTEM_PROMPT = `You are SleepLens, a clinical sleep medicine AI analyst. You combine sleep medicine expertise with cardiometabolic risk assessment based on peer-reviewed research from the American Academy of Sleep Medicine (AASM), American Heart Association (AHA), and current clinical guidelines.

Given a patient's sleep profile, generate a comprehensive sleep health intelligence report. Be specific, evidence-based, and actionable. Reference clinical thresholds where appropriate (e.g., "Sleep latency >30 minutes suggests onset insomnia per ICSD-3 criteria").

CRITICAL: All assessments must be grounded in real clinical criteria. Do not hallucinate medical facts. Be precise with risk categorizations. Include disclaimers that this is educational, not medical advice.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "sleepScore": 0,
  "scoreLabel": "",
  "circadianAlignment": 0,
  "chronotype": "",
  "chronotypeDescription": "",
  "sleepArchitecture": {
    "estimatedTotalSleep": "",
    "estimatedSleepEfficiency": 0,
    "estimatedTimeInBed": "",
    "waso": "",
    "assessment": ""
  },
  "cardiometabolicRisk": {
    "overallRisk": "",
    "riskScore": 0,
    "factors": [
      { "name": "Hypertension Risk", "level": "", "score": 0, "detail": "" },
      { "name": "Type 2 Diabetes Risk", "level": "", "score": 0, "detail": "" },
      { "name": "Cardiovascular Event Risk", "level": "", "score": 0, "detail": "" },
      { "name": "Metabolic Syndrome Risk", "level": "", "score": 0, "detail": "" },
      { "name": "Cognitive Decline Risk", "level": "", "score": 0, "detail": "" },
      { "name": "Immune Dysfunction Risk", "level": "", "score": 0, "detail": "" }
    ]
  },
  "sleepDisorderScreening": [
    { "condition": "Obstructive Sleep Apnea", "likelihood": "", "reasoning": "" },
    { "condition": "Insomnia Disorder", "likelihood": "", "reasoning": "" },
    { "condition": "Restless Legs Syndrome", "likelihood": "", "reasoning": "" },
    { "condition": "Circadian Rhythm Disorder", "likelihood": "", "reasoning": "" }
  ],
  "recommendations": [
    { "priority": 1, "category": "Timing", "title": "", "detail": "", "impact": "High" },
    { "priority": 2, "category": "Hygiene", "title": "", "detail": "", "impact": "High" },
    { "priority": 3, "category": "Lifestyle", "title": "", "detail": "", "impact": "Medium" },
    { "priority": 4, "category": "Environment", "title": "", "detail": "", "impact": "Medium" },
    { "priority": 5, "category": "Clinical", "title": "", "detail": "", "impact": "High" }
  ],
  "weeklyPlan": [
    { "day": "Monday", "focus": "", "morning": "", "evening": "", "bedtime": "" },
    { "day": "Tuesday", "focus": "", "morning": "", "evening": "", "bedtime": "" },
    { "day": "Wednesday", "focus": "", "morning": "", "evening": "", "bedtime": "" },
    { "day": "Thursday", "focus": "", "morning": "", "evening": "", "bedtime": "" },
    { "day": "Friday", "focus": "", "morning": "", "evening": "", "bedtime": "" },
    { "day": "Saturday", "focus": "", "morning": "", "evening": "", "bedtime": "" },
    { "day": "Sunday", "focus": "", "morning": "", "evening": "", "bedtime": "" }
  ],
  "clinicalNote": "",
  "disclaimer": "This assessment is for educational purposes only and does not constitute medical advice. Consult a board-certified sleep medicine physician for diagnosis and treatment. If you experience persistent sleep difficulties, contact your healthcare provider."
}`;

const scoreTone = (value) => {
  if (value >= 80) return { label: 'Excellent', color: '#22C55E', glow: 'rgba(34,197,94,0.18)' };
  if (value >= 60) return { label: 'Good', color: '#FACC15', glow: 'rgba(250,204,21,0.18)' };
  if (value >= 40) return { label: 'Fair', color: '#F97316', glow: 'rgba(249,115,22,0.18)' };
  return { label: 'Poor', color: '#EF4444', glow: 'rgba(239,68,68,0.18)' };
};

const levelTone = (level) => {
  if (level === 'Low') return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30';
  if (level === 'Moderate' || level === 'Elevated') return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30';
  return 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30';
};

const impactTone = (impact) =>
  impact === 'High'
    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25'
    : 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25';

const formatTimeLabel = (time) => {
  if (!time) return '--';
  const [hourString, minuteString] = time.split(':');
  const hour = Number(hourString);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${minuteString} ${suffix}`;
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToDuration = (minutes) => {
  const normalized = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours} hours ${mins} minutes`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const extractJson = (raw) => {
  if (!raw) throw new Error('The AI response was empty.');
  const direct = raw.trim();
  try {
    return JSON.parse(direct);
  } catch {
    const match = direct.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('The AI response did not contain valid JSON.');
    }
    return JSON.parse(match[0]);
  }
};

const buildDemoReport = (sleepData) => {
  const timeInBedMinutes = (() => {
    const bedtimeMinutes = toMinutes(sleepData.bedtime);
    const wakeMinutes = toMinutes(sleepData.wakeTime);
    const diff = wakeMinutes >= bedtimeMinutes ? wakeMinutes - bedtimeMinutes : 24 * 60 - bedtimeMinutes + wakeMinutes;
    return diff || 8 * 60;
  })();
  const awakeningsPenalty = sleepData.awakenings * 12;
  const latencyPenalty = sleepData.sleepLatency;
  const screenPenalty = sleepData.screenTime * 0.12;
  const stressPenalty = sleepData.stressLevel * 3.4;
  const estimatedSleepMinutes = clamp(timeInBedMinutes - latencyPenalty - awakeningsPenalty, 240, 600);
  const efficiency = clamp((estimatedSleepMinutes / timeInBedMinutes) * 100, 50, 98);
  const circadianAlignment =
    sleepData.bedtime >= '22:00' && sleepData.bedtime <= '23:45' && sleepData.wakeTime >= '06:00' && sleepData.wakeTime <= '08:00'
      ? 84
      : sleepData.bedtime > '00:30'
        ? 52
        : 68;
  const bmi = Number(sleepData.bmi || 24);
  const snoreRisk = ['Often', 'Every night / Don\'t know'].includes(sleepData.snoring) ? 18 : sleepData.snoring === 'Sometimes' ? 10 : 3;
  const headacheRisk = sleepData.morningHeadaches === 'Often' ? 14 : sleepData.morningHeadaches === 'Sometimes' ? 7 : 1;
  const legsRisk = sleepData.legRestlessness === 'Often' ? 16 : sleepData.legRestlessness === 'Sometimes' ? 8 : 2;
  const metabolicLoad = (bmi - 22) * 3.5 + (sleepData.caffeine === '5+ cups' ? 8 : sleepData.caffeine === '3-4 cups' ? 4 : 1);
  const sleepScore = clamp(100 - latencyPenalty * 0.9 - awakeningsPenalty * 0.9 - screenPenalty - stressPenalty - Math.max(0, bmi - 25) * 2, 27, 95);
  const scoreLabel = scoreTone(sleepScore).label;
  const chronotype =
    sleepData.bedtime >= '00:30'
      ? 'Definite Evening'
      : sleepData.bedtime >= '23:30'
        ? 'Moderate Evening'
        : sleepData.bedtime <= '21:45'
          ? 'Moderate Morning'
          : 'Intermediate';
  const riskScore = clamp(100 - sleepScore + metabolicLoad + snoreRisk + headacheRisk, 18, 88);
  const overallRisk = riskScore >= 70 ? 'High' : riskScore >= 55 ? 'Elevated' : riskScore >= 35 ? 'Moderate' : 'Low';
  const factorScores = [
    {
      name: 'Hypertension Risk',
      score: clamp(riskScore + stressPenalty * 0.8, 12, 92),
      detail: 'Shortened sleep, frequent arousals, and higher stress can increase sympathetic activation and blood pressure burden.',
    },
    {
      name: 'Type 2 Diabetes Risk',
      score: clamp(riskScore + metabolicLoad * 0.8, 10, 90),
      detail: 'Fragmented sleep and irregular timing can reduce insulin sensitivity and worsen glucose regulation.',
    },
    {
      name: 'Cardiovascular Event Risk',
      score: clamp(riskScore + snoreRisk * 1.1, 10, 94),
      detail: 'Snoring burden, poor recovery sleep, and circadian misalignment can compound cardiovascular strain over time.',
    },
    {
      name: 'Metabolic Syndrome Risk',
      score: clamp(riskScore + Math.max(0, bmi - 24) * 4, 10, 92),
      detail: 'Sleep loss and elevated BMI often cluster with adverse metabolic markers and lower cardiometabolic resilience.',
    },
    {
      name: 'Cognitive Decline Risk',
      score: clamp(100 - sleepScore + sleepData.stressLevel * 4, 10, 86),
      detail: 'Poor sleep continuity may impair attention, memory consolidation, and executive function over time.',
    },
    {
      name: 'Immune Dysfunction Risk',
      score: clamp(100 - sleepScore + sleepData.screenTime * 0.18, 10, 82),
      detail: 'Insufficient restorative sleep can weaken immune recovery and amplify inflammatory signaling.',
    },
  ].map((factor) => ({
    ...factor,
    level: factor.score >= 70 ? 'High' : factor.score >= 40 ? 'Moderate' : 'Low',
  }));

  return {
    sleepScore,
    scoreLabel,
    circadianAlignment,
    chronotype,
    chronotypeDescription:
      chronotype.includes('Evening')
        ? 'Your body clock trends later than average, which can make social schedules feel misaligned. Consistency and early light exposure can help anchor your rhythm.'
        : 'Your sleep timing is relatively balanced, suggesting a fairly adaptable circadian pattern. Keeping a stable wake time should preserve alignment.',
    sleepArchitecture: {
      estimatedTotalSleep: minutesToDuration(estimatedSleepMinutes),
      estimatedSleepEfficiency: Math.round(efficiency),
      estimatedTimeInBed: minutesToDuration(timeInBedMinutes),
      waso: `${sleepData.awakenings * 12} minutes`,
      assessment:
        efficiency < 85
          ? 'Estimated sleep efficiency is below the commonly used 85% threshold, which can be consistent with fragmented or non-restorative sleep. The combination of sleep latency, awakenings, and pre-bed stimulation likely reduces overall sleep continuity.'
          : 'Estimated sleep efficiency is within a broadly acceptable range, although there is still room to reduce latency and improve sleep continuity. Tightening evening routines may further improve recovery quality.',
    },
    cardiometabolicRisk: {
      overallRisk,
      riskScore: Math.round(riskScore),
      factors: factorScores,
    },
    sleepDisorderScreening: [
      {
        condition: 'Obstructive Sleep Apnea',
        likelihood: bmi >= 30 || sleepData.snoring === 'Often' || sleepData.morningHeadaches === 'Often' ? 'High' : bmi >= 26 || sleepData.snoring === 'Sometimes' ? 'Moderate' : 'Low',
        reasoning:
          'Snoring frequency, elevated BMI, and morning headaches can increase concern for sleep-disordered breathing, though formal testing is needed for diagnosis.',
      },
      {
        condition: 'Insomnia Disorder',
        likelihood: sleepData.sleepLatency > 30 || sleepData.awakenings >= 3 ? 'High' : sleepData.sleepLatency > 20 || sleepData.awakenings >= 2 ? 'Moderate' : 'Low',
        reasoning:
          'Sleep latency above 30 minutes and repeated awakenings are commonly used warning signs for insomnia-type symptoms and reduced sleep efficiency.',
      },
      {
        condition: 'Restless Legs Syndrome',
        likelihood: sleepData.legRestlessness === 'Often' ? 'High' : sleepData.legRestlessness === 'Sometimes' ? 'Moderate' : 'Low',
        reasoning:
          'Evening leg discomfort or restlessness can interfere with sleep initiation and may warrant review for restless legs symptoms if persistent.',
      },
      {
        condition: 'Circadian Rhythm Disorder',
        likelihood: sleepData.bedtime >= '01:00' || sleepData.wakeTime <= '05:00' ? 'High' : sleepData.bedtime >= '00:00' ? 'Moderate' : 'Low',
        reasoning:
          'A later bedtime pattern may indicate circadian delay when it conflicts with work, school, or desired wake times.',
      },
    ],
    recommendations: [
      {
        priority: 1,
        category: 'Timing',
        title: 'Lock in a stable wake time',
        detail:
          'Keep your wake time within a 30-minute window every day, including weekends. Anchoring morning timing is one of the strongest ways to improve circadian alignment and sleep drive.',
        impact: 'High',
      },
      {
        priority: 2,
        category: 'Hygiene',
        title: 'Reduce stimulating screen exposure',
        detail:
          'Aim to cut screen use during the final 45 to 60 minutes before bed. Replacing bright screens with dim light and a wind-down routine may lower arousal and shorten sleep latency.',
        impact: 'High',
      },
      {
        priority: 3,
        category: 'Lifestyle',
        title: 'Shift caffeine earlier',
        detail:
          'Keep caffeine to the morning or early afternoon and avoid escalating intake on high-stress days. Late caffeine can delay sleep onset and reduce sleep depth even when you feel able to fall asleep.',
        impact: 'Medium',
      },
      {
        priority: 4,
        category: 'Environment',
        title: 'Cool and darken the sleep setting',
        detail:
          'A cooler, darker, and quieter bedroom can reduce nighttime awakenings and support deeper sleep continuity. Small changes such as blackout curtains or a sound machine can be enough to help.',
        impact: 'Medium',
      },
      {
        priority: 5,
        category: 'Clinical',
        title: 'Seek evaluation if snoring or insomnia symptoms persist',
        detail:
          'If loud snoring, morning headaches, or prolonged sleep latency remain frequent, consider discussing a sleep medicine evaluation with your clinician. Symptoms that persist despite behavior changes may justify formal screening for sleep apnea or chronic insomnia.',
        impact: 'High',
      },
    ],
    weeklyPlan: [
      { day: 'Monday', focus: 'Circadian reset', morning: 'Get outdoor light within 30 minutes of waking.', evening: 'Dim lights after dinner and stop work screens early.', bedtime: formatTimeLabel(sleepData.bedtime) },
      { day: 'Tuesday', focus: 'Sleep continuity', morning: 'Keep wake time consistent and hydrate early.', evening: 'Avoid alcohol near bedtime and journal stressors.', bedtime: formatTimeLabel(sleepData.bedtime) },
      { day: 'Wednesday', focus: 'Stress regulation', morning: 'Take a 10-minute walk after breakfast.', evening: 'Use breath work or stretching for 10 minutes.', bedtime: formatTimeLabel(sleepData.bedtime) },
      { day: 'Thursday', focus: 'Cardiometabolic support', morning: 'Choose a protein-forward breakfast and daylight exposure.', evening: 'Finish your last caffeinated drink by early afternoon.', bedtime: formatTimeLabel(sleepData.bedtime) },
      { day: 'Friday', focus: 'Social schedule protection', morning: 'Hold the same wake time even if tired.', evening: 'Limit bedtime drift to under 45 minutes.', bedtime: formatTimeLabel(sleepData.bedtime) },
      { day: 'Saturday', focus: 'Recovery', morning: 'Light activity instead of sleeping in far later.', evening: 'Create a low-light, low-noise wind-down ritual.', bedtime: formatTimeLabel(sleepData.bedtime) },
      { day: 'Sunday', focus: 'Week preparation', morning: 'Set alarms and meal timing for the week ahead.', evening: 'Pack devices away before bed and prep for Monday.', bedtime: formatTimeLabel(sleepData.bedtime) },
    ],
    clinicalNote:
      'SleepLens estimates reduced sleep continuity with cardiometabolic vulnerability driven by sleep fragmentation, circadian strain, and lifestyle contributors. Sleep latency and wake after sleep onset suggest behavioral targets first, while snoring history may justify structured apnea screening if symptoms continue. In line with AASM-style sleep efficiency thresholds and AHA emphasis on sleep as a cardiovascular health factor, consistency, light timing, and symptom-directed evaluation are reasonable next steps.',
    disclaimer:
      'This assessment is for educational purposes only and does not constitute medical advice. Consult a board-certified sleep medicine physician for diagnosis and treatment. If you experience persistent sleep difficulties, contact your healthcare provider.',
  };
};

const sanitizeReport = (report, sleepData) => {
  const fallback = buildDemoReport(sleepData);
  return {
    sleepScore: Number(report?.sleepScore ?? fallback.sleepScore),
    scoreLabel: report?.scoreLabel || fallback.scoreLabel,
    circadianAlignment: Number(report?.circadianAlignment ?? fallback.circadianAlignment),
    chronotype: report?.chronotype || fallback.chronotype,
    chronotypeDescription: report?.chronotypeDescription || fallback.chronotypeDescription,
    sleepArchitecture: {
      estimatedTotalSleep: report?.sleepArchitecture?.estimatedTotalSleep || fallback.sleepArchitecture.estimatedTotalSleep,
      estimatedSleepEfficiency: Number(
        report?.sleepArchitecture?.estimatedSleepEfficiency ?? fallback.sleepArchitecture.estimatedSleepEfficiency,
      ),
      estimatedTimeInBed: report?.sleepArchitecture?.estimatedTimeInBed || fallback.sleepArchitecture.estimatedTimeInBed,
      waso: report?.sleepArchitecture?.waso || fallback.sleepArchitecture.waso,
      assessment: report?.sleepArchitecture?.assessment || fallback.sleepArchitecture.assessment,
    },
    cardiometabolicRisk: {
      overallRisk: report?.cardiometabolicRisk?.overallRisk || fallback.cardiometabolicRisk.overallRisk,
      riskScore: Number(report?.cardiometabolicRisk?.riskScore ?? fallback.cardiometabolicRisk.riskScore),
      factors: Array.isArray(report?.cardiometabolicRisk?.factors) && report.cardiometabolicRisk.factors.length
        ? report.cardiometabolicRisk.factors.map((factor, index) => ({
            name: factor.name || fallback.cardiometabolicRisk.factors[index]?.name || `Risk Factor ${index + 1}`,
            level: factor.level || fallback.cardiometabolicRisk.factors[index]?.level || 'Moderate',
            score: Number(factor.score ?? fallback.cardiometabolicRisk.factors[index]?.score ?? 50),
            detail: factor.detail || fallback.cardiometabolicRisk.factors[index]?.detail || '',
          }))
        : fallback.cardiometabolicRisk.factors,
    },
    sleepDisorderScreening:
      Array.isArray(report?.sleepDisorderScreening) && report.sleepDisorderScreening.length
        ? report.sleepDisorderScreening
        : fallback.sleepDisorderScreening,
    recommendations:
      Array.isArray(report?.recommendations) && report.recommendations.length ? report.recommendations : fallback.recommendations,
    weeklyPlan: Array.isArray(report?.weeklyPlan) && report.weeklyPlan.length ? report.weeklyPlan : fallback.weeklyPlan,
    clinicalNote: report?.clinicalNote || fallback.clinicalNote,
    disclaimer: report?.disclaimer || fallback.disclaimer,
  };
};

async function generateAiReport(sleepData) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    return buildDemoReport(sleepData);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this sleep profile and produce the required JSON report:\n${JSON.stringify(sleepData, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}). ${details || 'Please verify your API key and model access.'}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return sanitizeReport(extractJson(content), sleepData);
}

function App() {
  const [currentView, setCurrentView] = useState('intake');
  const [sleepData, setSleepData] = useState(DEFAULT_SLEEP_DATA);
  const [aiReport, setAiReport] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: 'Preparing intake analysis...' });
  const [error, setError] = useState(null);
  const [bmiHelper, setBmiHelper] = useState({ heightCm: '', weightKg: '' });
  const progressIndexRef = useRef(0);

  useEffect(() => {
    if (!isProcessing) return undefined;

    progressIndexRef.current = 0;
    setProgress(ANALYSIS_STEPS[0]);
    const interval = window.setInterval(() => {
      progressIndexRef.current += 1;
      const nextStep = ANALYSIS_STEPS[Math.min(progressIndexRef.current, ANALYSIS_STEPS.length - 1)];
      setProgress(nextStep);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  const fieldErrors = useMemo(() => {
    const nextErrors = {};
    if (!sleepData.age) nextErrors.age = 'Age is required.';
    if (!sleepData.bedtime) nextErrors.bedtime = 'Bedtime is required.';
    if (!sleepData.wakeTime) nextErrors.wakeTime = 'Wake time is required.';
    return nextErrors;
  }, [sleepData.age, sleepData.bedtime, sleepData.wakeTime]);

  const riskRadarData = useMemo(
    () =>
      aiReport?.cardiometabolicRisk?.factors?.map((factor) => ({
        subject: factor.name
          .replace(' Risk', '')
          .replace('Type 2 ', '')
          .replace('Cardiovascular Event', 'Cardiovascular')
          .replace('Immune Dysfunction', 'Immune'),
        score: factor.score,
      })) || [],
    [aiReport],
  );

  const sleepTrendData = useMemo(() => {
    if (!aiReport) return [];
    const efficiency = aiReport.sleepArchitecture.estimatedSleepEfficiency;
    const score = aiReport.sleepScore;
    return [
      { name: 'Baseline', value: clamp(score - 14, 0, 100) },
      { name: 'Week 2', value: clamp(score - 7, 0, 100) },
      { name: 'Week 4', value: score },
      { name: 'Target', value: clamp(efficiency + 8, 0, 100) },
    ];
  }, [aiReport]);

  const lifestyleBurden = useMemo(() => {
    const caffeineValue =
      sleepData.caffeine === 'None' ? 6 : sleepData.caffeine === '1-2 cups' ? 28 : sleepData.caffeine === '3-4 cups' ? 62 : 88;
    const alcoholValue =
      sleepData.alcohol === 'Never' ? 12 : sleepData.alcohol === 'Occasionally' ? 34 : sleepData.alcohol === 'Frequently' ? 66 : 84;
    return [
      { name: 'Caffeine', value: caffeineValue },
      { name: 'Screen', value: clamp(Number(sleepData.screenTime), 0, 100) },
      { name: 'Stress', value: clamp(Number(sleepData.stressLevel) * 10, 0, 100) },
      { name: 'Alcohol', value: alcoholValue },
    ];
  }, [sleepData]);

  const sleepComposition = useMemo(() => {
    if (!aiReport) return [];
    const efficiency = aiReport.sleepArchitecture.estimatedSleepEfficiency;
    const rem = clamp(18 + (100 - efficiency) * 0.08, 12, 26);
    const deep = clamp(16 + efficiency * 0.08, 14, 28);
    const light = clamp(100 - rem - deep - 8, 40, 65);
    const awake = clamp(100 - rem - deep - light, 4, 16);
    return [
      { name: 'Deep', value: Math.round(deep), color: '#44D4F5' },
      { name: 'REM', value: Math.round(rem), color: '#7DD3FC' },
      { name: 'Light', value: Math.round(light), color: '#1E3A8A' },
      { name: 'Awake', value: Math.round(awake), color: '#F97316' },
    ];
  }, [aiReport]);

  const handleInputChange = (field, value) => {
    setSleepData((current) => ({ ...current, [field]: value }));
  };

  const handleCalculateBmi = () => {
    const heightMeters = Number(bmiHelper.heightCm) / 100;
    const weightKg = Number(bmiHelper.weightKg);
    if (!heightMeters || !weightKg) return;
    const bmi = (weightKg / (heightMeters * heightMeters)).toFixed(1);
    handleInputChange('bmi', bmi);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.keys(fieldErrors).length) {
      setError('Please complete the required fields to continue.');
      return;
    }

    setError(null);
    setCurrentView('analyzing');
    setIsProcessing(true);

    try {
      const report = await generateAiReport(sleepData);
      setAiReport(report);
      setProgress({ percent: 100, message: 'Sleep intelligence report complete.' });
      setCurrentView('dashboard');
    } catch (submitError) {
      setError(submitError.message || 'Sleep analysis failed. Please try again.');
      setCurrentView('intake');
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentView === 'analyzing') {
    return <AnalyzingView progress={progress} />;
  }

  if (currentView === 'dashboard' && aiReport) {
    return (
      <DashboardView
        aiReport={aiReport}
        riskRadarData={riskRadarData}
        sleepTrendData={sleepTrendData}
        lifestyleBurden={lifestyleBurden}
        sleepComposition={sleepComposition}
        sleepData={sleepData}
        onReset={() => {
          setCurrentView('intake');
          setAiReport(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <IntakeView
      bmiHelper={bmiHelper}
      error={error}
      fieldErrors={fieldErrors}
      onBmiHelperChange={setBmiHelper}
      onCalculateBmi={handleCalculateBmi}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      sleepData={sleepData}
    />
  );
}

function IntakeView({
  bmiHelper,
  error,
  fieldErrors,
  onBmiHelperChange,
  onCalculateBmi,
  onInputChange,
  onSubmit,
  sleepData,
}) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-4 rounded-full border border-cyan-400/20 bg-white/5 px-5 py-3 backdrop-blur">
            <MoonIcon className="h-8 w-8 text-cyan-300" />
            <div className="text-left">
              <div className="text-xl font-semibold tracking-tight text-white">SleepLens</div>
              <div className="text-xs uppercase tracking-[0.32em] text-sky-200/70">AI-Powered Sleep Health Intelligence</div>
            </div>
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Sleep Profile Assessment
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Complete your sleep profile for a personalized cardiometabolic risk assessment grounded in clinical-style sleep medicine reasoning.
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass-panel rounded-[2rem] p-5 shadow-glow sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Sleep Timing" subtitle="Map your nightly sleep window and continuity patterns.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bedtime" error={fieldErrors.bedtime}>
                  <input
                    type="time"
                    value={sleepData.bedtime}
                    onChange={(event) => onInputChange('bedtime', event.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Wake time" error={fieldErrors.wakeTime}>
                  <input
                    type="time"
                    value={sleepData.wakeTime}
                    onChange={(event) => onInputChange('wakeTime', event.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="How long to fall asleep (minutes)">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={sleepData.sleepLatency}
                    onChange={(event) => onInputChange('sleepLatency', Number(event.target.value))}
                    className="input"
                  />
                </Field>
                <Field label="Night awakenings">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={sleepData.awakenings}
                    onChange={(event) => onInputChange('awakenings', Number(event.target.value))}
                    className="input"
                  />
                </Field>
                <Field label="Naps per day" className="sm:col-span-2">
                  <select value={sleepData.naps} onChange={(event) => onInputChange('naps', event.target.value)} className="input">
                    <option>None</option>
                    <option>1 short &lt;20min</option>
                    <option>1 long &gt;30min</option>
                    <option>Multiple</option>
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Lifestyle Factors" subtitle="Capture behaviors that can influence sleep quality and metabolic load.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Daily caffeine">
                  <select value={sleepData.caffeine} onChange={(event) => onInputChange('caffeine', event.target.value)} className="input">
                    <option>None</option>
                    <option>1-2 cups</option>
                    <option>3-4 cups</option>
                    <option>5+ cups</option>
                  </select>
                </Field>
                <Field label="Alcohol before bed">
                  <select value={sleepData.alcohol} onChange={(event) => onInputChange('alcohol', event.target.value)} className="input">
                    <option>Never</option>
                    <option>Occasionally</option>
                    <option>Frequently</option>
                    <option>Daily</option>
                  </select>
                </Field>
                <Field label="Screen time before bed (minutes)">
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={sleepData.screenTime}
                    onChange={(event) => onInputChange('screenTime', Number(event.target.value))}
                    className="input"
                  />
                </Field>
                <Field label="Exercise frequency">
                  <select value={sleepData.exercise} onChange={(event) => onInputChange('exercise', event.target.value)} className="input">
                    <option>None</option>
                    <option>1-2x/week</option>
                    <option>3-4x/week</option>
                    <option>Daily</option>
                  </select>
                </Field>
                <Field label={`Stress level: ${sleepData.stressLevel}`} className="sm:col-span-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sleepData.stressLevel}
                    onChange={(event) => onInputChange('stressLevel', Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Health Profile" subtitle="Provide screening inputs that affect sleep disorder and risk interpretation." className="lg:col-span-2">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Age" error={fieldErrors.age}>
                  <input
                    type="number"
                    min="18"
                    max="120"
                    value={sleepData.age}
                    onChange={(event) => onInputChange('age', event.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Sex">
                  <select value={sleepData.sex} onChange={(event) => onInputChange('sex', event.target.value)} className="input">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="BMI">
                  <input
                    type="number"
                    min="10"
                    max="60"
                    step="0.1"
                    value={sleepData.bmi}
                    onChange={(event) => onInputChange('bmi', event.target.value)}
                    className="input"
                  />
                </Field>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 md:col-span-2 xl:col-span-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Field label="Height (cm)" className="flex-1">
                      <input
                        type="number"
                        value={bmiHelper.heightCm}
                        onChange={(event) => onBmiHelperChange((current) => ({ ...current, heightCm: event.target.value }))}
                        className="input"
                      />
                    </Field>
                    <Field label="Weight (kg)" className="flex-1">
                      <input
                        type="number"
                        value={bmiHelper.weightKg}
                        onChange={(event) => onBmiHelperChange((current) => ({ ...current, weightKg: event.target.value }))}
                        className="input"
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={onCalculateBmi}
                      className="rounded-2xl bg-sky-500/15 px-4 py-3 text-sm font-medium text-sky-200 transition hover:bg-sky-500/25"
                    >
                      Calculate BMI
                    </button>
                  </div>
                </div>
                <Field label="Do you snore?">
                  <select value={sleepData.snoring} onChange={(event) => onInputChange('snoring', event.target.value)} className="input">
                    <option>No</option>
                    <option>Sometimes</option>
                    <option>Often</option>
                    <option>Every night / Don't know</option>
                  </select>
                </Field>
                <Field label="Restless legs at night?">
                  <select
                    value={sleepData.legRestlessness}
                    onChange={(event) => onInputChange('legRestlessness', event.target.value)}
                    className="input"
                  >
                    <option>Never</option>
                    <option>Sometimes</option>
                    <option>Often</option>
                  </select>
                </Field>
                <Field label="Morning headaches?">
                  <select
                    value={sleepData.morningHeadaches}
                    onChange={(event) => onInputChange('morningHeadaches', event.target.value)}
                    className="input"
                  >
                    <option>Never</option>
                    <option>Sometimes</option>
                    <option>Often</option>
                  </select>
                </Field>
              </div>
            </SectionCard>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-300">Your data stays in-memory for this session only. No local storage is used.</p>
              {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-700 via-cyan-500 to-teal-400 px-6 py-4 text-base font-semibold text-slate-950 shadow-teal transition hover:scale-[1.01] hover:shadow-glow"
            >
              Analyze My Sleep
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(15, 23, 42, 0.65);
          padding: 0.875rem 1rem;
          color: white;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
        }
        .input:focus {
          border-color: rgba(68, 212, 245, 0.6);
          box-shadow: 0 0 0 3px rgba(68, 212, 245, 0.15);
        }
      `}</style>
    </main>
  );
}

function AnalyzingView({ progress }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel relative w-full max-w-2xl overflow-hidden rounded-[2rem] p-8 shadow-glow sm:p-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-2xl" />
            <div className="relative rounded-full border border-cyan-300/20 bg-slate-950/60 p-8">
              <MoonIcon className="h-16 w-16 animate-pulseSlow text-cyan-300" />
            </div>
          </div>
          <div className="font-mono text-5xl font-semibold text-cyan-200">{progress.percent}%</div>
          <h2 className="mt-4 text-3xl font-semibold text-white">Building Your Sleep Intelligence Report</h2>
          <p className="mt-3 text-base text-slate-300">{progress.message}</p>
          <div className="mt-8 w-full rounded-full bg-white/5 p-1">
            <div className="relative h-4 overflow-hidden rounded-full bg-slate-900/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-800 via-teal-400 to-cyan-300 transition-all duration-700"
                style={{ width: `${progress.percent}%` }}
              />
              <div className="absolute inset-y-0 left-0 w-28 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
          <p className="mt-6 max-w-lg text-sm leading-6 text-slate-400">
            SleepLens is evaluating circadian rhythm timing, sleep efficiency, disorder screening signals, and cardiometabolic pattern risk.
          </p>
        </div>
      </div>
    </main>
  );
}

function DashboardView({
  aiReport,
  lifestyleBurden,
  onReset,
  riskRadarData,
  sleepComposition,
  sleepData,
  sleepTrendData,
}) {
  const sleepTone = scoreTone(aiReport.sleepScore);
  const riskTone = levelTone(aiReport.cardiometabolicRisk.overallRisk);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-[2rem] p-6 shadow-glow">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 text-sm text-cyan-100 ring-1 ring-white/10">
                <MoonIcon className="h-5 w-5 text-cyan-300" />
                SleepLens Clinical-Style Summary
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Sleep Intelligence Report</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                {aiReport.clinicalNote}
              </p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-fit items-center justify-center rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Start New Assessment
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <MetricShell title="Sleep Score" subtitle={aiReport.scoreLabel}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={[{ name: 'score', value: aiReport.sleepScore, fill: sleepTone.color }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar cornerRadius={18} dataKey="value" />
                  <text x="50%" y="46%" textAnchor="middle" fill="#fff" className="recharts-text recharts-label">
                    <tspan fontSize="44" fontWeight="700">{aiReport.sleepScore}</tspan>
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" fill="#A5B4FC">
                    <tspan fontSize="14">{aiReport.scoreLabel}</tspan>
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </MetricShell>

          <MetricShell title="Circadian Alignment" subtitle="Natural rhythm fit">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="58%"
                  outerRadius="100%"
                  data={[{ name: 'alignment', value: aiReport.circadianAlignment, fill: '#44D4F5' }]}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar background clockWise dataKey="value" cornerRadius={18} />
                  <text x="50%" y="58%" textAnchor="middle" fill="#fff">
                    <tspan fontSize="42" fontWeight="700">{aiReport.circadianAlignment}%</tspan>
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Bedtime {formatTimeLabel(sleepData.bedtime)} and wake time {formatTimeLabel(sleepData.wakeTime)} drive your alignment score.
            </p>
          </MetricShell>

          <MetricShell title="Cardiometabolic Risk" subtitle="Composite risk signal">
            <div
              className="rounded-[1.5rem] border border-white/10 p-6"
              style={{ background: `linear-gradient(180deg, ${sleepTone.glow}, rgba(255,255,255,0.02))` }}
            >
              <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${riskTone}`}>
                {aiReport.cardiometabolicRisk.overallRisk}
              </div>
              <div className="mt-6 font-mono text-6xl font-semibold text-white">{aiReport.cardiometabolicRisk.riskScore}</div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Composite score derived from sleep quality, timing, and symptom-associated risk markers.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5">
              <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Your Chronotype</div>
              <div className="mt-3 text-xl font-semibold text-white">{aiReport.chronotype}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{aiReport.chronotypeDescription}</p>
            </div>
          </MetricShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="metric-card">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Cardiometabolic Risk Profile</h2>
                <p className="mt-2 text-sm text-slate-300">Risk weighting across six domains connected to sleep health.</p>
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={riskRadarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#CBD5E1', fontSize: 12 }} />
                  <Radar dataKey="score" stroke="#44D4F5" fill="#44D4F5" fillOpacity={0.35} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(5, 10, 22, 0.96)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      color: '#fff',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {aiReport.cardiometabolicRisk.factors.map((factor) => (
                <div key={factor.name} className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{factor.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${levelTone(factor.level)}`}>{factor.level}</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-300"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <div className="mt-2 font-mono text-xs text-slate-400">{factor.score}/100</div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{factor.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="metric-card">
              <h2 className="text-2xl font-semibold text-white">Sleep Architecture Analysis</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MiniMetric label="Total Sleep" value={aiReport.sleepArchitecture.estimatedTotalSleep} />
                <MiniMetric label="Sleep Efficiency" value={`${aiReport.sleepArchitecture.estimatedSleepEfficiency}%`} />
                <MiniMetric label="Time in Bed" value={aiReport.sleepArchitecture.estimatedTimeInBed} />
                <MiniMetric label="WASO" value={aiReport.sleepArchitecture.waso} />
              </div>
              <div className="mt-5 rounded-[1.5rem] border border-cyan-400/10 bg-sky-500/5 p-4">
                <p className="text-sm leading-7 text-slate-300">{aiReport.sleepArchitecture.assessment}</p>
              </div>
            </div>

            <div className="metric-card">
              <h2 className="text-2xl font-semibold text-white">Projected Recovery Trend</h2>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sleepTrendData}>
                    <defs>
                      <linearGradient id="sleepTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#44D4F5" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#44D4F5" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(5, 10, 22, 0.96)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#44D4F5" fill="url(#sleepTrend)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="metric-card">
            <h2 className="text-2xl font-semibold text-white">Sleep Disorder Screening</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {aiReport.sleepDisorderScreening.map((item) => (
                <div key={item.condition} className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{item.condition}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${levelTone(item.likelihood)}`}>
                      {item.likelihood}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.reasoning}</p>
                  {item.likelihood === 'High' ? (
                    <div className="mt-4 rounded-2xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-300/20">
                      Consider evaluation with a sleep specialist.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="metric-card">
              <h2 className="text-2xl font-semibold text-white">Behavioral Load Snapshot</h2>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lifestyleBurden}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(5, 10, 22, 0.96)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                      }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {lifestyleBurden.map((entry) => (
                        <Cell key={entry.name} fill={entry.value > 70 ? '#F97316' : entry.value > 40 ? '#38BDF8' : '#22C55E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="metric-card">
              <h2 className="text-2xl font-semibold text-white">Estimated Sleep Composition</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sleepComposition} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={3}>
                      {sleepComposition.map((segment) => (
                        <Cell key={segment.name} fill={segment.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(5, 10, 22, 0.96)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {sleepComposition.map((segment) => (
                  <div key={segment.name} className="flex items-center justify-between rounded-2xl bg-slate-950/35 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="text-sm text-slate-200">{segment.name}</span>
                    </div>
                    <span className="font-mono text-sm text-slate-300">{segment.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="metric-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Your Sleep Improvement Protocol</h2>
              <p className="mt-2 text-sm text-slate-300">Priority-ranked behavioral, environmental, and clinical next steps.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {aiReport.recommendations
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((recommendation, index) => (
                <div
                  key={recommendation.priority}
                  className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5 opacity-0 animate-[fadeIn_0.5s_ease_forwards]"
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 font-mono text-sm font-semibold text-cyan-200">
                        {recommendation.priority}
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{recommendation.category}</div>
                        <h3 className="mt-1 text-lg font-semibold text-white">{recommendation.title}</h3>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${impactTone(recommendation.impact)}`}>
                      {recommendation.impact}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{recommendation.detail}</p>
                </div>
              ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div className="metric-card">
            <h2 className="text-2xl font-semibold text-white">7-Day Weekly Plan</h2>
            <div className="mt-5 space-y-3">
              {aiReport.weeklyPlan.map((day) => (
                <div key={day.day} className="rounded-[1.5rem] border border-white/10 bg-slate-950/25 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white">{day.day}</div>
                      <div className="text-sm text-cyan-200">{day.focus}</div>
                    </div>
                    <div className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-slate-300">{day.bedtime}</div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-sky-500/5 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Morning</div>
                      <p className="mt-2 text-sm text-slate-200">{day.morning}</p>
                    </div>
                    <div className="rounded-2xl bg-cyan-500/5 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Evening</div>
                      <p className="mt-2 text-sm text-slate-200">{day.evening}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="metric-card">
            <h2 className="text-2xl font-semibold text-white">Clinical Notice</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">{aiReport.disclaimer}</p>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5">
              <h3 className="text-sm uppercase tracking-[0.24em] text-slate-400">Intake Snapshot</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SnapshotItem label="Bedtime" value={formatTimeLabel(sleepData.bedtime)} />
                <SnapshotItem label="Wake time" value={formatTimeLabel(sleepData.wakeTime)} />
                <SnapshotItem label="Sleep latency" value={`${sleepData.sleepLatency} min`} />
                <SnapshotItem label="Awakenings" value={`${sleepData.awakenings}`} />
                <SnapshotItem label="Stress level" value={`${sleepData.stressLevel}/10`} />
                <SnapshotItem label="BMI" value={sleepData.bmi || 'Not provided'} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function SectionCard({ children, className = '', subtitle, title }) {
  return (
    <section className={`rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 ${className}`}>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ children, className = '', error, label }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

function MetricShell({ children, subtitle, title }) {
  return (
    <div className="metric-card">
      <div className="mb-4">
        <div className="text-sm uppercase tracking-[0.24em] text-slate-400">{title}</div>
        <div className="mt-2 text-lg font-semibold text-white">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/35 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 font-mono text-lg text-white">{value}</div>
    </div>
  );
}

function SnapshotItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-100">{value}</div>
    </div>
  );
}

function MoonIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <path
        d="M39.6 8.4C29.5 11 22 20.1 22 31.1c0 13 10.5 23.5 23.5 23.5 6.2 0 11.9-2.4 16.1-6.2-3 .7-6.4.8-9.7.1C39.2 45.8 30 34.2 30 21.1c0-4.8 1.2-9.2 3.3-13.1 2-3.7 4.4-6 6.3-7.3Z"
        fill="currentColor"
      />
      <path d="M17 17l1.5 3.6L22 22l-3.5 1.4L17 27l-1.5-3.6L12 22l3.5-1.4L17 17Z" fill="#CFFAFE" />
      <path d="M47 18l1 2.5 2.5 1-2.5 1L47 25l-1-2.5-2.5-1 2.5-1L47 18Z" fill="#93C5FD" />
    </svg>
  );
}

export default App;
