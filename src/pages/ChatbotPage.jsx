import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import chatbotBrain from '../data/chatbotBrain.json';
import {
  MONITOR_EXPANSION_BUS_CAPACITY_MA,
  POWER_RECOMMENDATION_THRESHOLD_MA,
} from '../data/setupInventory.js';
import { firmwareWarnings, latestFirmware } from '../data/firmwareCatalog.js';

const SUPPORT_URL = 'https://abatementpartnersupport.freshdesk.com/support/home';
const DEFAULT_SUGGESTIONS = [
  'How does the Scrubber Selector choose a scrubber?',
  'Which scrubber should I choose?',
  'Should I choose H2KM or BD2K?',
  'How many scrubbers do I need?',
  'Do I need a pressure monitor with a scrubber?',
  'What scrubber can I use on 120V?',
  'How do I verify pressure readings to the cloud?',
  'When should I make a support ticket?',
];

const GUIDED_MODES = [
  { title: 'Scrubber selector', prompt: 'How does the Scrubber Selector choose a scrubber?', badge: 'Sizing' },
  { title: 'Choose scrubber', prompt: 'Which scrubber should I choose?', badge: 'Products' },
  { title: 'Pressure + scrubber', prompt: 'Do I need a pressure monitor with a scrubber?', badge: 'Containment' },
  { title: 'AT Connect', prompt: 'How do I verify pressure readings to the cloud and mobile app?', badge: 'Reporting' },
  { title: 'Make a ticket', prompt: 'When should I make a support ticket?', badge: 'Escalate' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pressure', label: 'Pressure Data' },
  { id: 'alarms', label: 'Alarms' },
  { id: 'cloud', label: 'Cloud/Mobile' },
  { id: 'display', label: 'Display' },
  { id: 'scrubbers', label: 'Scrubbers' },
  { id: 'selector', label: 'Selector' },
  { id: 'rpm', label: 'RPM' },
  { id: 'ppm4', label: 'PPM4' },
  { id: 'sensors', label: 'Sensors' },
  { id: 'firmware', label: 'Firmware' },
  { id: 'power', label: 'Power' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'cellular', label: 'Cellular' },
  { id: 'support', label: 'Support' },
  { id: 'ticket', label: 'Tickets' },
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'or', 'set', 'the', 'this', 'to', 'up', 'use', 'what', 'when', 'where', 'why', 'with',
  'should', 'choose', 'pick', 'need', 'needs', 'want', 'wants', 'best', 'better', 'one', 'ones', 'unit', 'units',
]);

const POWER_PARTS = [
  { label: 'Temp/RH', draw: 50, patterns: [/temp(?:erature)?(?:\s*&?\s*humidity)?s?/g, /temps?/g, /trhm/g] },
  { label: 'Pressure', draw: 65, patterns: [/pressure\s*sensors?/g, /pressure/g] },
  { label: 'ACH', draw: 100, patterns: [/(?:ach|velocity|airflow)\s*sensors?/g, /\bach\b/g, /velocity/g] },
  { label: 'Particle', draw: 120, patterns: [/particle\s*sensors?/g, /particle/g] },
  { label: 'Cellular', draw: 365, patterns: [/cell(?:ular)?\s*modules?/g, /cellular/g] },
];

const TICKET_TRIGGER_TERMS = [
  'urgent', 'emergency', 'failed', 'failure', 'not working', 'broken', 'inspection', 'hospital', 'patient',
  'isolation', 'infectious', 'out of pressure', 'pressure failed', 'alarm going off', 'alarm will not stop',
  'cannot validate', 'validate fails', 'cloud not updating', 'mobile not updating', 'not recording', 'data missing',
  'wifi failed', 'wi-fi failed', 'cellular failed', 'sensor not detected', 'wrong reading', 'unstable reading',
];

const TICKET_REASON_LABELS = [
  { test: (text) => /urgent|emergency|patient|infectious|isolation|inspection/.test(text), label: 'hospital/field escalation' },
  { test: (text) => /pressure failed|out of pressure|wrong reading|unstable reading|reading.*wrong|near zero/.test(text), label: 'pressure reading issue' },
  { test: (text) => /alarm going off|alarm will not stop|beeping|nuisance alarm|screen.*red/.test(text), label: 'alarm issue' },
  { test: (text) => /cloud.*not|mobile.*not|validate fail|cannot validate|wifi.*fail|cellular.*fail/.test(text), label: 'cloud/mobile connection issue' },
  { test: (text) => /not recording|data missing|history missing|usb.*not|download.*not/.test(text), label: 'recording/history issue' },
  { test: (text) => /sensor not detected|missing sensor|not detected/.test(text), label: 'sensor detection issue' },
];

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/wi-fi/g, 'wifi')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return normalize(value)
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildSearchText(entry) {
  return normalize([
    entry.title,
    entry.product,
    entry.category,
    entry.sourceTitle,
    entry.keywords?.join(' '),
    entry.questions?.join(' '),
    entry.answer,
    entry.notes,
  ].join(' '));
}

function entryMatchesFilter(entry, filter) {
  if (!filter || filter === 'all') return true;
  const text = buildSearchText(entry);
  if (filter === 'pressure') return /pressure|differential|inwc|pa|room reference|data log|recording|history|negative pressure|positive pressure/.test(text);
  if (filter === 'display') return /display|screen|timeout|screen saver|screensaver|always on/.test(text);
  if (filter === 'cloud') return /cloud|mobile app|web app|verify|validate|reporting|online|cellular|wifi/.test(text);
  if (filter === 'sensors') return /sensor|pressure|particle|temp|humidity|velocity|ach|cellular/.test(text);
  if (filter === 'firmware') return /firmware|version|update|upgrade|hex|usb/.test(text);
  if (filter === 'power') return /power|ma|charger|bus|chain/.test(text);
  if (filter === 'wifi') return /wifi|network|cloud|mobile app/.test(text);
  if (filter === 'alarms') return /alarm|threshold|limit|beep|audible|notification|setpoint|set point/.test(text);
  if (filter === 'scrubbers') return /scrubber|air filtration|negative air|hepa aire|hepa care|pred750|h2km|h2kma|bd2k|bulldog|pas2400|pas5000|hc800|carbon|vapor lock|ach|cfm/.test(text);
  if (filter === 'selector') return /selector|recommend|sizing|size|ach|cfm|room volume|project type|hazard|goal|which scrubber/.test(text);
  return text.includes(filter);
}


const INTENT_GROUPS = {
  alarm: ['alarm', 'alarms', 'alarming', 'alert', 'alerts', 'beep', 'beeping', 'audible', 'notification', 'notifications'],
  alarmSilence: ['silence', 'silent', 'mute', 'stop alarm', 'stop the alarm', 'turn off sound', 'turn off alarm', 'beeping', 'quiet'],
  alarmSettings: ['settings', 'preferences', 'configure', 'change', 'set', 'setup', 'threshold', 'thresholds', 'limit', 'limits', 'delay', 'duration', 'audible', 'enable', 'disable'],
  troubleshooting: ['not working', 'error', 'issue', 'problem', 'fails', 'failed', 'troubleshoot', 'why', 'red', 'alarming'],
  downloads: ['download', 'manual', 'doc', 'guide', 'instructions'],
  pressure: ['pressure', 'differential', 'negative pressure', 'positive pressure', 'room pressure', 'inwc', 'pa', 'pascal', 'pascals'],
  display: ['screen saver', 'screensaver', 'screen timeout', 'timeout', 'always on', 'stay on', 'turning off', 'screen stay on'],
  pressureRecord: ['record', 'recording', 'records', 'history', 'data log', 'log', 'archive', 'csv', 'download history'],
  pressureMaintain: ['maintain', 'holding', 'hold', 'keep', 'stable', 'stabilize', 'dropping', 'losing pressure', 'negative pressure', 'containment'],
  pressureVerify: ['verify', 'validate', 'cloud', 'mobile', 'app', 'web app', 'reporting', 'online', 'connected', 'connect'],
  pressureAlarmPoints: ['alarm point', 'alarm points', 'setpoint', 'set point', 'set points', 'threshold', 'thresholds', 'limit', 'limits', 'high limit', 'low limit'],
  scrubber: ['scrubber', 'scrubbers', 'air scrubber', 'negative air', 'negative air machine', 'air filtration', 'afd', 'hepa aire', 'hepa care'],
  scrubberSizing: ['how many', 'size', 'sizing', 'calculate', 'ach', 'cfm', 'air changes', 'room volume', 'flow rate', 'airflow'],
  scrubberSelection: ['which scrubber', 'choose scrubber', 'pick scrubber', 'recommend scrubber', 'best scrubber', 'h2km or bd2k', 'pas2400 or h2km'],
  scrubberFilters: ['filter', 'filters', 'hepa', 'carbon', 'vapor lock', 'voc', 'odor', 'smell', 'ovg'],
  scrubberDucting: ['duct', 'ducting', 'flex duct', 'bends', 'inlet', 'outlet', 'collar', 'adapter', 'manifold'],
};

const PRODUCT_WORDS = {
  rpm: ['rpm', 'room pressure monitor'],
  ppm4: ['ppm4', 'portable pressure monitor'],
  cellular: ['cellular', 'cell', 'modem', 'sim'],
  ach: ['ach', 'velocity', 'airflow'],
  particle: ['particle'],
  pressure: ['pressure', 'differential pressure', 'negative pressure', 'positive pressure', 'room pressure'],
  scrubber: ['scrubber', 'air scrubber', 'negative air', 'air filtration', 'afd'],
  pred750: ['pred750', 'predator'],
  h2km: ['h2km', 'h2kma'],
  bd2k: ['bd2k', 'bulldog', 'xhp', 'xhpa'],
  pas2400: ['pas2400'],
  pas5000: ['pas5000'],
  hc800: ['hc800', 'hc800fd', 'hc800fduv', 'hepa care'],
};

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function analyzeQuery(query) {
  const text = normalize(query);
  const words = tokenize(query);
  const products = Object.entries(PRODUCT_WORDS)
    .filter(([, variants]) => includesAny(text, variants))
    .map(([key]) => key);

  return {
    text,
    words,
    products,
    wantsAlarm: includesAny(text, INTENT_GROUPS.alarm),
    wantsAlarmSilence: includesAny(text, INTENT_GROUPS.alarmSilence),
    wantsAlarmSettings: includesAny(text, INTENT_GROUPS.alarmSettings),
    wantsTroubleshooting: includesAny(text, INTENT_GROUPS.troubleshooting),
    wantsDownload: includesAny(text, INTENT_GROUPS.downloads),
    wantsPressure: includesAny(text, INTENT_GROUPS.pressure),
    wantsDisplay: includesAny(text, INTENT_GROUPS.display),
    wantsPressureRecord: includesAny(text, INTENT_GROUPS.pressureRecord),
    wantsPressureMaintain: includesAny(text, INTENT_GROUPS.pressureMaintain),
    wantsPressureVerify: includesAny(text, INTENT_GROUPS.pressureVerify),
    wantsPressureAlarmPoints: includesAny(text, INTENT_GROUPS.pressureAlarmPoints),
    wantsScrubber: includesAny(text, INTENT_GROUPS.scrubber) || /pred750|h2km|h2kma|bd2k|bulldog|pas2400|pas5000|hc800/.test(text),
    wantsScrubberSizing: includesAny(text, INTENT_GROUPS.scrubberSizing),
    wantsScrubberSelection: includesAny(text, INTENT_GROUPS.scrubberSelection),
    wantsScrubberFilters: includesAny(text, INTENT_GROUPS.scrubberFilters),
    wantsScrubberDucting: includesAny(text, INTENT_GROUPS.scrubberDucting),
  };
}

function productAlignmentBonus(entry, profile) {
  if (!profile.products.length) return 0;
  const entryText = buildSearchText(entry);
  let bonus = 0;
  profile.products.forEach((product) => {
    if (entryText.includes(product)) bonus += 38;
  });
  if (bonus === 0) bonus -= 26;
  return bonus;
}

function alarmIntentAdjustment(entry, profile) {
  if (!profile.wantsAlarm) return 0;

  const text = buildSearchText(entry);
  const title = normalize(entry.title);
  let adjustment = 0;

  if (!text.includes('alarm')) return -18;

  // The old bot over-selected "silence alarm" any time the word alarm appeared.
  // Only prefer that answer when the user clearly asks to silence/mute/stop an alarm.
  const isSilenceAnswer = title.includes('silence alarm') || text.includes('stop alarm button') || text.includes('silences the audible alarm');
  if (isSilenceAnswer && !profile.wantsAlarmSilence) adjustment -= 95;
  if (isSilenceAnswer && profile.wantsAlarmSilence) adjustment += 95;

  const isSettingsAnswer = text.includes('alarm preferences') || text.includes('threshold') || text.includes('limit') || text.includes('delay') || text.includes('audible alarm') || title.includes('preferences alarms');
  if (profile.wantsAlarmSettings && isSettingsAnswer) adjustment += 115;
  if (profile.wantsAlarmSettings && isSilenceAnswer) adjustment -= 80;

  const isTroubleshootingAnswer = title.includes('screen is alarming') || text.includes('correct the condition') || text.includes('outside limits') || text.includes('communication error alarm');
  if (profile.wantsTroubleshooting && isTroubleshootingAnswer) adjustment += 80;

  const isGenericAlarmDoc = title.includes('alarm preference') || title.includes('preferences alarms') || title.includes('screen is alarming');
  if (!profile.wantsAlarmSilence && !profile.wantsAlarmSettings && isGenericAlarmDoc) adjustment += 60;

  return adjustment;
}

function pressureIntentAdjustment(entry, profile) {
  const text = buildSearchText(entry);
  const title = normalize(entry.title);
  const category = normalize(entry.category);
  let adjustment = 0;

  const pressureLikeQuestion = profile.wantsPressure || profile.wantsDisplay || profile.wantsPressureRecord || profile.wantsPressureMaintain || profile.wantsPressureVerify || profile.wantsPressureAlarmPoints;
  if (!pressureLikeQuestion) return 0;

  const isPressureCore = /pressure|differential|room reference|inwc|pa|data log|recording|history/.test(text);
  const isPowerAnswer = category.includes('power') || title.includes('power') || text.includes('ma') || text.includes('charger');
  if (isPressureCore) adjustment += 38;
  if (isPowerAnswer && !profile.text.includes('power') && !profile.text.includes('ma') && !profile.text.includes('bus')) adjustment -= 82;

  if (profile.wantsDisplay) {
    if (/display|screen timeout|screen saver|screensaver|always on/.test(text)) adjustment += 170;
    if (/firmware|power|charger|bus/.test(category)) adjustment -= 45;
  }

  if (profile.wantsPressureRecord) {
    if (/record|recording|history|data log|archive|csv|usb download|job number/.test(text)) adjustment += 155;
    if (/silence alarm|power draw|charger/.test(text)) adjustment -= 70;
  }

  if (profile.wantsPressureMaintain) {
    if (/maintain|required pressure|negative pressure|containment|leak|door|filter|fan|airflow/.test(text)) adjustment += 175;
    if (/firmware|download|charger|power draw/.test(text)) adjustment -= 60;
  }

  if (profile.wantsPressureVerify) {
    if (/cloud|mobile app|web app|verify|validate|reporting|online|wifi|cellular/.test(text)) adjustment += 165;
    if (/firmware|silence alarm|power draw/.test(text)) adjustment -= 60;
  }

  if (profile.wantsPressureAlarmPoints) {
    if (/alarm point|alarm points|setpoint|set point|threshold|limit|pressure alarm/.test(text)) adjustment += 175;
    if (/silence alarm|stop alarm/.test(text) && !profile.wantsAlarmSilence) adjustment -= 95;
  }

  return adjustment;
}

function scrubberIntentAdjustment(entry, profile) {
  const text = buildSearchText(entry);
  const title = normalize(entry.title);
  const category = normalize(entry.category);
  let adjustment = 0;

  const scrubberLikeQuestion = profile.wantsScrubber || profile.wantsScrubberSizing || profile.wantsScrubberSelection || profile.wantsScrubberFilters || profile.wantsScrubberDucting;
  if (!scrubberLikeQuestion) return 0;

  const isScrubberAnswer = /scrubber|air filtration|negative air|pred750|h2km|h2kma|bd2k|bulldog|pas2400|pas5000|hc800|hepa aire|hepa care|ach|cfm|vapor lock|carbon/.test(text);
  if (isScrubberAnswer) adjustment += 85;
  if (!isScrubberAnswer && !/pressure monitor|negative pressure|positive pressure/.test(text)) adjustment -= 55;

  if (profile.wantsScrubberSelection) {
    if (/choose|selection|lineup|h2km|bd2k|pas2400|pas5000|pred750|hc800|real scrubber/.test(text)) adjustment += 150;
    if (/firmware|wifi|cellular|sensor power/.test(category)) adjustment -= 80;
  }

  if (profile.wantsScrubberSizing) {
    if (/ach|cfm|room volume|sizing|quantity|required airflow|design cfm|air changes/.test(text)) adjustment += 165;
    if (/firmware|alarm points|screen timeout/.test(text)) adjustment -= 65;
  }

  if (profile.wantsScrubberFilters) {
    if (/hepa|carbon|vapor lock|voc|odor|ovg|filter/.test(text)) adjustment += 150;
  }

  if (profile.wantsScrubberDucting) {
    if (/duct|ducting|inlet|outlet|collar|adapter|manifold|derating|airflow loss|bends/.test(text)) adjustment += 145;
  }

  if (profile.text.includes('h2km') && profile.text.includes('bd2k')) {
    if (title.includes('h2km vs bd2k') || text.includes('plastic cabinet') || text.includes('metal cabinet')) adjustment += 240;
  }
  if ((profile.text.includes('residential') || profile.text.includes('wet') || profile.text.includes('plastic') || profile.text.includes('scratch')) && /bd2k|plastic cabinet|h2km vs bd2k/.test(text)) adjustment += 190;
  if (profile.text.includes('pas5000') || profile.text.includes('4000 cfm') || profile.text.includes('230v') || profile.text.includes('30a')) {
    if (/pas5000|230v|30a|4000 cfm/.test(text)) adjustment += 180;
  }
  if (profile.text.includes('pas2400') || profile.text.includes('stairs') || profile.text.includes('mobility')) {
    if (/pas2400|stair|mobility|2100 cfm/.test(text)) adjustment += 170;
  }
  if (profile.text.includes('pred750') || profile.text.includes('750 cfm')) {
    if (/pred750|predator|750 cfm/.test(text)) adjustment += 170;
  }

  return adjustment;
}

function sourceQualityAdjustment(entry, query) {
  let adjustment = 0;
  const category = normalize(entry.category);
  const title = normalize(entry.title);
  const normalizedQuery = normalize(query);

  if (entry.confidence === 'grounded') adjustment += 14;
  if (category.includes('document reference')) adjustment -= 32;
  if (title.includes('reference chunk') && !normalizedQuery.includes('manual') && !normalizedQuery.includes('document')) adjustment -= 28;
  if (entry.answer?.length > 700 && !normalizedQuery.includes('detail')) adjustment -= 8;

  return adjustment;
}

function exactPhraseScore(entry, profile) {
  const text = buildSearchText(entry);
  const meaningful = profile.words.filter((word) => word.length > 2);
  let score = 0;

  meaningful.slice(0, -1).forEach((word, index) => {
    const phrase = `${word} ${meaningful[index + 1]}`;
    if (text.includes(phrase)) score += 24;
  });

  if (meaningful.length >= 3) {
    for (let index = 0; index < meaningful.length - 2; index += 1) {
      const phrase = meaningful.slice(index, index + 3).join(' ');
      if (text.includes(phrase)) score += 32;
    }
  }

  return score;
}

function scoreEntry(entry, query) {
  const profile = analyzeQuery(query);
  const normalizedQuery = profile.text;
  const terms = profile.words;
  if (!normalizedQuery || !terms.length) return 0;

  const title = normalize(entry.title);
  const product = normalize(entry.product);
  const category = normalize(entry.category);
  const sourceTitle = normalize(entry.sourceTitle);
  const answer = normalize(entry.answer);
  const keywords = (entry.keywords || []).map(normalize);
  const questions = (entry.questions || []).map(normalize);
  const searchText = entry.__searchText || buildSearchText(entry);

  let score = 0;

  if (title === normalizedQuery) score += 210;
  if (questions.some((question) => question === normalizedQuery)) score += 260;
  if (title.includes(normalizedQuery)) score += 105;
  if (questions.some((question) => question.includes(normalizedQuery))) score += 135;
  if (answer.includes(normalizedQuery)) score += 45;

  terms.forEach((term) => {
    if (term.length < 2) return;
    if (title.includes(term)) score += 24;
    if (product.includes(term)) score += 22;
    if (category.includes(term)) score += 14;
    if (sourceTitle.includes(term)) score += 10;
    if (keywords.some((keyword) => keyword === term)) score += 34;
    else if (keywords.some((keyword) => keyword.includes(term))) score += 20;
    if (questions.some((question) => question.includes(term))) score += 16;
    if (answer.includes(term)) score += 3;
    if (searchText.includes(term)) score += 1;
  });

  score += exactPhraseScore(entry, profile);
  score += productAlignmentBonus(entry, profile);
  score += alarmIntentAdjustment(entry, profile);
  score += pressureIntentAdjustment(entry, profile);
  score += scrubberIntentAdjustment(entry, profile);
  score += sourceQualityAdjustment(entry, query);

  return Math.max(0, score);
}
function confidenceMeta(score) {
  if (score >= 170) return { label: 'Strong match', pct: 96 };
  if (score >= 110) return { label: 'High confidence', pct: 88 };
  if (score >= 70) return { label: 'Possible match', pct: 73 };
  return { label: 'Low confidence', pct: 58 };
}

function parsePowerCount(query, patterns) {
  let total = 0;
  patterns.forEach((pattern) => {
    const expression = new RegExp(`(\\d+)\\s*(?:x\\s*)?${pattern.source}`, 'gi');
    let match;
    while ((match = expression.exec(query)) !== null) {
      total += Number(match[1] || 0);
    }
  });
  return total;
}


function ticketReasonsFor(query, entry = null) {
  const text = normalize([query, entry?.title, entry?.product, entry?.category, entry?.answer].join(' '));
  const reasons = TICKET_REASON_LABELS.filter((item) => item.test(text)).map((item) => item.label);
  return unique(reasons);
}

function shouldRecommendTicket(query, entry = null) {
  const text = normalize([query, entry?.title, entry?.product, entry?.category, entry?.answer].join(' '));
  if (!text) return false;
  if (TICKET_TRIGGER_TERMS.some((term) => text.includes(normalize(term)))) return true;
  if (/pressure/.test(text) && /(alarm|failed|wrong|unstable|verify|cloud|mobile|record|history|hospital|isolation)/.test(text)) return true;
  if (/support|ticket|freshdesk|escalat/.test(text)) return true;
  return false;
}

function buildTicketRoutingAnswer(query) {
  const text = normalize(query);
  const asksForTicket = /ticket|support|freshdesk|escalat|help desk|helpdesk|contact/.test(text);
  const issueLike = shouldRecommendTicket(query);
  if (!asksForTicket && !issueLike) return null;

  const reasons = ticketReasonsFor(query);
  const reasonText = reasons.length ? `This sounds like a ${reasons.join(', ')}.` : 'This may need hands-on support or engineering review.';

  return {
    id: 'rule-make-support-ticket',
    title: asksForTicket ? 'Make a support ticket' : 'This may need a support ticket',
    product: 'MonSuite',
    category: 'Support',
    sourceTitle: 'Abatement Partner Support',
    sourceUrl: SUPPORT_URL,
    confidence: 'rule',
    keywords: ['support', 'ticket', 'freshdesk', 'escalation', 'hospital', 'pressure'],
    questions: ['When should I make a support ticket?', 'How do I make a ticket?', 'Where do I get support?'],
    answer: `${reasonText} Open an Abatement Partner Support ticket when the issue affects a live hospital job, pressure readings look wrong, pressure alarms will not clear, cloud/mobile verification fails, history is missing, or the documentation does not answer the question clearly. Include the product, serial number if available, job/site name, firmware version, current pressure reading, alarm points, network type, screenshots/photos, and what troubleshooting has already been tried.`,
    steps: [
      'Open the Abatement Partner Support portal.',
      'Create a new ticket with the product name: RPM, PPM4, pressure sensor, cellular module, or other device.',
      'Include the job/site name, device serial number if available, firmware version, current reading, alarm points, and screenshots/photos.',
      'For pressure issues, include Room/Reference tubing setup and whether the room should be positive or negative.',
      'For cloud/mobile issues, include Wi-Fi or cellular details and the last time the app/cloud updated.',
    ],
    relatedQuestions: [
      'How do I verify pressure readings to the cloud?',
      'Why is my pressure alarm going off?',
      'How do I maintain negative pressure?',
      'How do I record pressure history?',
    ],
    __score: 9996,
    __forcedRule: true,
    __severity: issueLike ? 'warning' : 'success',
    __ticketRecommended: true,
  };
}

function buildPowerCalculatorAnswer(query) {
  const normalized = normalize(query);
  const looksLikePowerQuestion = ['power', 'ma', 'chain', 'bus', 'run', 'off an', 'warning', 'limit', 'charger'].some((term) => normalized.includes(term));
  if (!looksLikePowerQuestion) return null;

  const parts = POWER_PARTS.map((part) => ({ ...part, qty: parsePowerCount(query, part.patterns) })).filter((part) => part.qty > 0);
  if (!parts.length) return null;

  let sourceCount = 0;
  sourceCount += parsePowerCount(query, [/ppm4s?/g, /portable pressure monitors?/g]);
  sourceCount += parsePowerCount(query, [/rpms?/g]);

  if (!sourceCount && (normalized.includes(' off an rpm') || normalized.includes(' on rpm') || normalized.includes(' off a rpm') || normalized.includes(' off an ppm4') || normalized.includes(' off a ppm4') || normalized.includes(' off the rpm') || normalized.includes(' off the ppm4'))) {
    sourceCount = 1;
  }
  if (!sourceCount) sourceCount = 1;

  const totalDraw = parts.reduce((sum, part) => sum + (part.qty * part.draw), 0);
  const capacity = sourceCount * MONITOR_EXPANSION_BUS_CAPACITY_MA;
  const overBy = totalDraw - capacity;
  const highDraw = parts.filter((part) => part.draw > POWER_RECOMMENDATION_THRESHOLD_MA);
  const summary = parts.map((part) => `${part.label} x${part.qty} = ${part.qty * part.draw}mA`).join(' · ');

  const steps = [
    ...parts.map((part) => `${part.label} x${part.qty} = ${part.qty * part.draw}mA`),
    `Monitor bus capacity: ${sourceCount} source ${sourceCount === 1 ? 'unit' : 'units'} × ${MONITOR_EXPANSION_BUS_CAPACITY_MA}mA = ${capacity}mA`,
    `Total requested bus load: ${totalDraw}mA`,
  ];

  const changes = [];
  if (overBy > 0) {
    changes.push(`This exceeds available bus capacity by ${overBy}mA.`);
  } else {
    changes.push(`This is within the available bus capacity with ${capacity - totalDraw}mA remaining.`);
  }
  if (highDraw.length) {
    changes.push(`Recommended dedicated power: ${highDraw.map((part) => `${part.label} (${part.draw}mA each)`).join(', ')}.`);
  }
  changes.push('Use a PPM4 charger to locally power one device, or use a Power Bus for the heavy branch of the chain.');

  return {
    id: `rule-power-${Date.now()}`,
    title: 'Power calculation for requested chain',
    product: 'System Builder',
    category: 'Power rules',
    sourceTitle: 'System Builder',
    sourceUrl: '/system-builder',
    confidence: 'rule',
    keywords: ['power', 'bus', 'ma', 'chain', 'charger', 'system builder'],
    questions: [],
    answer: `${summary}. ${changes.join(' ')}`,
    steps,
    relatedQuestions: [
      'Why am I getting a power warning?',
      'What does the Power Bus do?',
      'What needs dedicated power?',
    ],
    __score: 9997,
    __forcedRule: true,
    __severity: overBy > 0 ? 'warning' : 'success',
  };
}

function buildPpm4FirmwareRule(query) {
  const normalized = normalize(query);
  const mentionsPpm4 = normalized.includes('ppm4') || normalized.includes('portable pressure monitor');
  const mentionsFirmware = ['firmware', 'version', 'update', 'upgrade', '1.8', '2.2', 'legacy'].some((term) => normalized.includes(term));
  if (!mentionsPpm4 || !mentionsFirmware) return null;

  const warning = firmwareWarnings.find((item) => item.id === 'ppm4-below-1-8');
  const latest = latestFirmware.find((item) => item.shortProduct === 'PPM4');

  return {
    id: 'rule-ppm4-firmware',
    title: warning?.title || 'PPM4 firmware update path',
    product: 'PPM4',
    category: 'Firmware',
    sourceTitle: 'PPM4 Firmware Update Instructions',
    sourceUrl: latest?.instructionsUrl || '',
    confidence: 'rule',
    keywords: ['ppm4', 'firmware', '1.8', '2.2'],
    questions: [],
    answer: warning?.message || 'If the PPM4 is below v1.8, update to v1.8 first. Then install the latest v2.2 package.',
    steps: warning?.steps || [],
    relatedQuestions: ['Where do I download PPM4 v2.2?', 'Where do I get the v1.8 migration package?', 'How do I check PPM4 firmware version?'],
    downloads: [
      { label: 'PPM4 v1.8 migration package', url: latest?.migrationUrl || '' },
      { label: 'PPM4 latest v2.2 package', url: latest?.downloadUrl || '' },
    ],
    __score: 9998,
    __forcedWarning: true,
    __severity: 'critical',
  };
}

function buildAlarmRoutingAnswer(query) {
  const profile = analyzeQuery(query);
  if (!profile.wantsAlarm) return null;
  if (profile.wantsAlarmSilence) return null;
  if (profile.wantsAlarmSettings || profile.wantsTroubleshooting) return null;

  const productLabel = profile.products.includes('rpm') ? 'RPM' : profile.products.includes('ppm4') ? 'PPM4' : 'RPM / PPM4';

  return {
    id: 'rule-alarm-router',
    title: 'Alarm help: choose the right alarm path',
    product: productLabel,
    category: 'Alarms',
    sourceTitle: 'MonSuite alarm guidance',
    sourceUrl: '',
    confidence: 'rule',
    keywords: ['alarm', 'alarms', 'settings', 'thresholds', 'silence', 'troubleshooting'],
    questions: [],
    answer: 'Alarm questions can mean a few different things: setting alarm thresholds, changing alarm preferences, silencing the audible alarm, or troubleshooting why the monitor is alarming. AbateBot will show the general alarm paths first instead of jumping straight to STOP ALARM unless you ask to silence or mute the alarm.',
    steps: [
      'For alarm limits or thresholds, open Settings → Preferences → Alarms or the room/sensor alarm settings area.',
      'For an active alarm, review the room or sensor reading and correct the condition that is outside the selected range.',
      'Use STOP ALARM only when you want to silence the audible alert. The screen can stay red until the readings return within limits.',
      'For cloud or mobile alarm notifications, check that the device is connected and cloud reporting is configured.',
    ],
    relatedQuestions: [
      `How do I change ${productLabel} alarm settings?`,
      `Why is my ${productLabel} screen alarming?`,
      `How do I silence an alarm on ${productLabel}?`,
      `How do alarm thresholds work on ${productLabel}?`,
    ],
    __score: 9996,
    __forcedRule: true,
    __severity: 'info',
  };
}


function cloneKnowledgeRule(id, overrides = {}) {
  const entry = chatbotBrain.find((item) => item.id === id);
  if (!entry) return null;
  return {
    ...entry,
    ...overrides,
    __score: overrides.__score || 9995,
    __forcedRule: true,
    __severity: overrides.__severity || 'info',
  };
}

function buildPressureMonitoringRule(query) {
  const profile = analyzeQuery(query);
  const text = profile.text;
  const pressureContext = profile.wantsPressure || profile.wantsDisplay || profile.wantsPressureRecord || profile.wantsPressureMaintain || profile.wantsPressureVerify || profile.wantsPressureAlarmPoints || (profile.wantsAlarm && profile.wantsTroubleshooting);
  if (!pressureContext) return null;

  if (profile.wantsDisplay) {
    return cloneKnowledgeRule('pressure-display-screen-timeout-always-on', {
      relatedQuestions: [
        'How do I display and record pressure data?',
        'How do I set pressure alarm points?',
        'How do I verify pressure readings to the cloud?',
      ],
    });
  }

  if (profile.wantsPressureAlarmPoints || (profile.wantsAlarm && profile.wantsAlarmSettings)) {
    return cloneKnowledgeRule('pressure-alarms-set-pressure-alarm-points', {
      relatedQuestions: [
        'Why is my pressure alarm going off?',
        'How do I maintain negative pressure?',
        'How do I keep the display always on?',
      ],
    });
  }

  if (profile.wantsAlarm && profile.wantsTroubleshooting) {
    return cloneKnowledgeRule('pressure-alarms-active-pressure-alarm-troubleshooting', {
      __severity: 'warning',
      relatedQuestions: [
        'How do I set pressure alarm points?',
        'How do I check Room and Reference tubing?',
        'How do I maintain negative pressure?',
      ],
    });
  }

  if (profile.wantsPressureMaintain) {
    return cloneKnowledgeRule('pressure-maintain-required-pressure', {
      relatedQuestions: [
        'How do I check Room and Reference tubing?',
        'Why is my pressure alarm going off?',
        'How do I record pressure history?',
      ],
    });
  }

  if (profile.wantsPressureVerify) {
    if ((text.includes('cloud') || text.includes('web app')) && (text.includes('mobile') || text.includes('phone') || text.includes('app'))) {
      return cloneKnowledgeRule('pressure-cloud-mobile-verify-pressure-reporting', {
        relatedQuestions: [
          'How do I verify pressure readings to the cloud?',
          'How do I verify pressure readings in the mobile app?',
          'How do I connect cellular?',
        ],
      });
    }
    if (text.includes('mobile') || text.includes('phone') || text.includes('app')) {
      return cloneKnowledgeRule('pressure-mobile-verify-pressure-in-mobile-app', {
        relatedQuestions: [
          'How do I verify pressure readings to the cloud?',
          'How do I connect PPM4 to Wi-Fi?',
          'How do I connect cellular?',
        ],
      });
    }
    return cloneKnowledgeRule('pressure-cloud-verify-pressure-to-cloud', {
      relatedQuestions: [
        'How do I verify pressure readings in the mobile app?',
        'How do I connect PPM4 to Wi-Fi?',
        'How do I connect cellular?',
      ],
    });
  }

  if (profile.wantsPressureRecord) {
    return cloneKnowledgeRule('pressure-recording-history-and-usb-export', {
      relatedQuestions: [
        'How do I set job number on RPM?',
        'How do I set job number on PPM4?',
        'How do I keep the display always on?',
      ],
    });
  }

  if (text.includes('tubing') || text.includes('hose') || text.includes('room') || text.includes('reference') || text.includes('ref')) {
    return cloneKnowledgeRule('pressure-tubing-room-reference-check', {
      relatedQuestions: [
        'Why is pressure reading wrong?',
        'How do I zero pressure?',
        'How do I maintain negative pressure?',
      ],
    });
  }

  if (text.includes('calibrate') || text.includes('zero') || text.includes('offset')) {
    return cloneKnowledgeRule('pressure-calibration-zero-pressure', {
      relatedQuestions: [
        'How do I check Room and Reference tubing?',
        'Why is pressure reading wrong?',
        'How do I record pressure history?',
      ],
    });
  }

  return cloneKnowledgeRule('pressure-core-display-and-record-pressure-data', {
    relatedQuestions: [
      'How do I keep the display always on?',
      'How do I set pressure alarm points?',
      'How do I verify pressure readings to the cloud?',
      'How do I record pressure history?',
    ],
  });
}

function buildScrubberSelectorRule(query) {
  const profile = analyzeQuery(query);
  const text = profile.text;
  const scrubberContext = profile.wantsScrubber || profile.wantsScrubberSizing || profile.wantsScrubberSelection || profile.wantsScrubberFilters || profile.wantsScrubberDucting;
  if (!scrubberContext) return null;

  if (/ticket|support|freshdesk|quote review|review.*setup|send.*team/.test(text)) return cloneKnowledgeRule('scrubber-support-ticket-info', { __ticketRecommended: true, __severity: 'warning' });
  if (/fake|demo|mock|not real/.test(text)) return cloneKnowledgeRule('scrubber-fake-demo-labels');
  if ((text.includes('h2km') && text.includes('bd2k')) || /residential|finished|scratch|plastic|wet|damp|metal cabinet/.test(text)) return cloneKnowledgeRule('scrubber-h2km-vs-bd2k-cabinet-choice');
  if (/pas5000|4000 cfm|230v|30a|large containment|biggest/.test(text)) return cloneKnowledgeRule('scrubber-pas5000-power-warning-large-containment', { __severity: /120v|15a/.test(text) ? 'warning' : 'info' });
  if (/pas2400|2100 cfm|stair|stairs|mobility|tight access/.test(text)) return cloneKnowledgeRule('scrubber-pas2400-when-to-choose-v31');
  if (/pred750|predator|750 cfm|small room|small scrubber/.test(text)) return cloneKnowledgeRule('scrubber-pred750-when-to-choose');
  if (/carbon|voc|odor|smell|ovg|vapor lock|gas|vapou?r/.test(text)) return cloneKnowledgeRule('scrubber-carbon-voc-filter-selection');
  if (/duct|ducting|flex|bend|bends|derat|airflow loss|inlet|outlet|collar|adapter|manifold/.test(text)) return cloneKnowledgeRule('scrubber-ducting-derating-airflow-loss');
  if (/how many|size|sizing|calculate|ach|cfm|air changes|room volume|required airflow/.test(text)) return cloneKnowledgeRule('scrubber-sizing-ach-cfm-calculation');
  if (/pressure monitor|negative pressure|positive pressure|containment|prove|verify pressure|monitor/.test(text)) return cloneKnowledgeRule('scrubber-pressure-monitor-recommendation');
  if (/120v|230v|240v|15a|20a|30a|power|circuit|amps/.test(text)) return cloneKnowledgeRule('scrubber-120v-vs-230v-power-selection');
  if (/what.*real|list|lineup|main scrubber|all scrubbers|real scrubbers/.test(text)) return cloneKnowledgeRule('scrubber-real-main-lineup-summary');

  return cloneKnowledgeRule('scrubber-selector-how-it-works-v31');
}

function searchBrain(query, filter = 'all', limit = 5) {
  const specialRule = buildScrubberSelectorRule(query) || buildTicketRoutingAnswer(query) || buildPowerCalculatorAnswer(query) || buildPpm4FirmwareRule(query) || buildPressureMonitoringRule(query) || buildAlarmRoutingAnswer(query);

  const scored = chatbotBrain
    .filter((entry) => entryMatchesFilter(entry, filter))
    .map((entry) => ({ ...entry, __score: scoreEntry(entry, query) }))
    .filter((entry) => entry.__score > 0)
    .sort((a, b) => b.__score - a.__score)
    .slice(0, limit);

  if (specialRule) {
    return [specialRule, ...scored.filter((entry) => entry.id !== specialRule.id)].slice(0, limit);
  }

  return scored;
}


function AbateBotRobot({ compact = false }) {
  return (
    <div className={`abatebot-robot-graphic ${compact ? 'compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 220 220" role="img">
        <defs>
          <linearGradient id="botStroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#0b6fc6" />
            <stop offset="1" stopColor="#27a7ff" />
          </linearGradient>
          <linearGradient id="botFill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,.98)" />
            <stop offset="1" stopColor="rgba(221,239,255,.92)" />
          </linearGradient>
        </defs>
        <path d="M110 28v24" className="bot-line" />
        <circle cx="110" cy="23" r="7" className="bot-dot" />
        <rect x="48" y="54" width="124" height="100" rx="34" className="bot-head" />
        <path d="M43 96h-18c-7 0-12 5-12 12v16c0 7 5 12 12 12h18" className="bot-line" />
        <path d="M177 96h18c7 0 12 5 12 12v16c0 7-5 12-12 12h-18" className="bot-line" />
        <circle cx="83" cy="106" r="10" className="bot-eye-svg" />
        <circle cx="137" cy="106" r="10" className="bot-eye-svg" />
        <path d="M86 132c14 11 34 11 48 0" className="bot-smile" />
        <path d="M74 170h72" className="bot-line soft" />
        <path d="M89 170v20" className="bot-line soft" />
        <path d="M131 170v20" className="bot-line soft" />
        <path d="M74 190h72" className="bot-line soft" />
      </svg>
    </div>
  );
}

function ResultSource({ entry }) {
  if (!entry?.sourceUrl) {
    return <span className="source-chip muted">No source link yet</span>;
  }

  const internal = entry.sourceUrl.startsWith('/');

  return (
    <a className="source-chip" href={entry.sourceUrl} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noreferrer'}>
      {internal ? `Open ${entry.sourceTitle || 'source'} →` : `Open source: ${entry.sourceTitle || 'Source'} ↗`}
    </a>
  );
}


function TicketRecommendation({ question, entry, always = false }) {
  const recommended = always || shouldRecommendTicket(question, entry) || entry?.__ticketRecommended;
  if (!recommended) return null;
  const reasons = ticketReasonsFor(question, entry);
  return (
    <div className="ticket-recommendation-card">
      <div>
        <strong>{entry?.__ticketRecommended ? 'Support ticket recommended' : 'Need help on a live job?'}</strong>
        <p>
          {reasons.length
            ? `This looks like a ${reasons.join(', ')}. If the answer does not solve it quickly, make a support ticket.`
            : 'If this affects a customer, hospital room, pressure record, alarm, cloud/mobile reporting, or active job, make a support ticket.'}
        </p>
      </div>
      <a className="button primary small" href={SUPPORT_URL} target="_blank" rel="noreferrer">Make a ticket</a>
    </div>
  );
}

function buildStepList(entry) {
  if (entry.steps?.length) return entry.steps;
  const sentences = String(entry.answer || '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length >= 2 && sentences.length <= 5) return sentences;
  return [];
}

function FeedbackRow({ value, onChange }) {
  return (
    <div className="feedback-row">
      <span>Was this helpful?</span>
      <div>
        <button type="button" className={value === 'up' ? 'active' : ''} onClick={() => onChange(value === 'up' ? null : 'up')}>👍 Helpful</button>
        <button type="button" className={value === 'down' ? 'active' : ''} onClick={() => onChange(value === 'down' ? null : 'down')}>👎 Not helpful</button>
      </div>
    </div>
  );
}

function AssistantAnswer({ answer, onAskSuggestion, feedback, onFeedbackChange }) {
  if (!answer) return null;

  if (!answer.results.length) {
    return (
      <div className="assistant-response no-match">
        <div className="assistant-bubble sleek no-match-card">
          <strong>I could not find a strong answer in the MonSuite brain.</strong>
          <p>
            Try using product names like RPM, PPM4, pressure sensor, firmware, Wi-Fi, cellular, or power.
            If this is a live job, hospital room, alarm issue, cloud/mobile issue, or missing recording, make a support ticket.
          </p>
          <div className="answer-actions">
            <a className="button primary small" href={SUPPORT_URL} target="_blank" rel="noreferrer">Make a ticket</a>
          </div>
        </div>
      </div>
    );
  }

  const [best, ...related] = answer.results;
  const strongEnough = best.__score >= 45 || best.__forcedWarning || best.__forcedRule;
  const confidence = confidenceMeta(best.__score || 0);
  const steps = buildStepList(best);
  const relatedQuestions = unique([...(best.relatedQuestions || []), ...((best.questions || []).slice(0, 6))])
    .filter((question) => normalize(question) !== normalize(answer.question))
    .slice(0, 4);

  return (
    <div className="assistant-response">
      <div className={`assistant-bubble sleek ${best.__severity || ''} ${best.__forcedWarning ? 'critical' : ''} ${strongEnough ? '' : 'low-confidence'}`}>
        <div className="answer-topline">
          <span>{best.product || 'MonSuite'} · {best.category || 'Knowledge'}</span>
          <div className="confidence-stack">
            <strong>{best.__forcedWarning ? 'Critical firmware note' : best.__forcedRule ? 'Rule-based answer' : confidence.label}</strong>
            <small>{best.__forcedWarning ? 'Required update path' : `${confidence.pct}% match confidence`}</small>
          </div>
        </div>

        <h2>{best.title}</h2>
        <p className="direct-answer">{best.answer}</p>

        {steps.length > 0 && (
          <div className="step-block">
            <h3>Quick steps</h3>
            <ol>
              {steps.map((step, index) => (
                <li key={`${best.id}-step-${index}`}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {!strongEnough && (
          <div className="status-callout warning compact-callout">
            <strong>Check this answer before using it.</strong>
            <p>This was a lower-confidence match. Use the source link or support portal if the answer does not fit the question.</p>
          </div>
        )}

        {best.downloads?.length ? (
          <div className="download-chip-row">
            {best.downloads.filter((item) => item.url).map((item) => (
              <a key={item.label} className="source-chip secondary" href={item.url} target="_blank" rel="noreferrer">{item.label} ↗</a>
            ))}
          </div>
        ) : null}

        <div className="answer-actions">
          <ResultSource entry={best} />
          <a className={shouldRecommendTicket(answer.question, best) || best.__ticketRecommended ? 'source-chip ticket-primary' : 'source-chip secondary'} href={SUPPORT_URL} target="_blank" rel="noreferrer">Make a ticket ↗</a>
        </div>

        <TicketRecommendation question={answer.question} entry={best} />

      </div>
    </div>
  );
}

export default function ChatbotPage({ user, onLogout, theme, onToggleTheme }) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [feedback, setFeedback] = useState({});

  const stats = useMemo(() => ({
    entries: chatbotBrain.length,
    variants: chatbotBrain.reduce((sum, entry) => sum + (entry.questions?.length || 0), 0),
    products: unique(chatbotBrain.map((entry) => entry.product)).length,
  }), []);

  function askQuestion(questionText = query) {
    const cleanQuestion = questionText.trim();
    if (!cleanQuestion) return;

    const results = searchBrain(cleanQuestion, activeFilter, 4);
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question: cleanQuestion,
      results,
      filter: activeFilter,
    };

    setHistory((current) => [...current, item].slice(-12));
    setQuery('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion();
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap chatbot-page chatbot-page-clean">
        <section className="hero-card chatbot-hero clean-chatbot-hero">
          <div>
            <p className="eyebrow">Ask AbateBot</p>
            <h1>Technical answers without the clutter.</h1>
            <p>
              Ask about scrubber sizing, pressure monitoring, alarm setup, AT Connect, PPM4, RPM, sensors, firmware, cloud reporting, or support tickets. AbateBot searches the MonSuite brain and returns the best answer with a source link when available.
            </p>
          </div>
          <div className="clean-bot-showcase">
            <AbateBotRobot />
            <strong>AbateBot</strong>
            <small>{stats.entries} knowledge entries · {stats.variants.toLocaleString()} question variants</small>
          </div>
        </section>

        <section className="clean-chat-shell">
          <div className="chat-window-card">
            <div className="chat-window-header">
              <div>
                <strong>AbateBot</strong>
                <small>MonSuite product assistant</small>
              </div>
              <span>Online</span>
            </div>

            <div className="chat-message-list">
              {!history.length && (
                <div className="bot-message-row welcome-message">
                  <AbateBotRobot compact />
                  <div className="bot-message-bubble">
                    <strong>Hi, I’m AbateBot.</strong>
                    <p>
                      Ask me things like “Which scrubber should I choose?”, “Do I need a pressure monitor?”, “How many scrubbers do I need?”, “How do I set pressure alarms?”, or “How do I connect AT Connect for push notifications?”
                    </p>
                  </div>
                </div>
              )}

              {history.map((item) => (
                <article className="chat-turn clean-chat-turn" key={item.id}>
                  <div className="user-message-row">
                    <div className="user-message-bubble">{item.question}</div>
                  </div>
                  <div className="bot-message-row">
                    <AbateBotRobot compact />
                    <AssistantAnswer
                      answer={item}
                      onAskSuggestion={askQuestion}
                      feedback={feedback[item.id] || null}
                      onFeedbackChange={(value) => setFeedback((current) => ({ ...current, [item.id]: value }))}
                    />
                  </div>
                </article>
              ))}
            </div>

            <form className="clean-chat-input" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="assistant-question">Ask AbateBot</label>
              <input
                id="assistant-question"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask AbateBot a question..."
              />
              <button className="button primary" type="submit">Send</button>
            </form>

            <div className="clean-chat-footer-note">
              <span>For live hospital jobs, failed pressure readings, missing records, or cloud/mobile issues, AbateBot may recommend making a ticket.</span>
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer">Make a ticket ↗</a>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}