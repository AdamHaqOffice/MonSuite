import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import chatbotBrain from '../data/chatbotBrain.json';

const SUPPORT_URL = 'https://abatementpartnersupport.freshdesk.com/support/home';
const DEFAULT_SUGGESTIONS = [
  'How do I set job number on RPM?',
  'PPM4 firmware below 1.8 what do I do?',
  'How many sensors can RPM support?',
  'Why am I getting a power warning?',
  'How do I connect PPM4 to Wi-Fi?',
  'What does the ACH probe do?',
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'how', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'or', 'set', 'the', 'this', 'to', 'up', 'use', 'what', 'when', 'where', 'why', 'with',
]);

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
  ].join(' '));
}

function scoreEntry(entry, query) {
  const normalizedQuery = normalize(query);
  const terms = tokenize(query);
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

  if (title === normalizedQuery) score += 180;
  if (questions.some((question) => question === normalizedQuery)) score += 220;
  if (title.includes(normalizedQuery)) score += 90;
  if (questions.some((question) => question.includes(normalizedQuery))) score += 120;
  if (answer.includes(normalizedQuery)) score += 60;

  terms.forEach((term) => {
    if (term.length < 2) return;
    if (title.includes(term)) score += 26;
    if (product.includes(term)) score += 20;
    if (category.includes(term)) score += 12;
    if (sourceTitle.includes(term)) score += 10;
    if (keywords.some((keyword) => keyword.includes(term))) score += 24;
    if (questions.some((question) => question.includes(term))) score += 18;
    if (answer.includes(term)) score += 4;
    if (searchText.includes(term)) score += 2;
  });

  const productTerms = ['ppm4', 'rpm', 'cellular', 'particle', 'pressure', 'ach', 'velocity', 'temp', 'humidity', 'power', 'firmware'];
  productTerms.forEach((term) => {
    if (normalizedQuery.includes(term) && product.includes(term)) score += 28;
  });

  const queryBigramBonus = terms.slice(0, -1).reduce((bonus, term, index) => {
    const phrase = `${term} ${terms[index + 1]}`;
    return bonus + (searchText.includes(phrase) ? 18 : 0);
  }, 0);

  score += queryBigramBonus;

  if (entry.confidence === 'grounded') score += 6;
  if (entry.sourceUrl) score += 3;

  return score;
}

function findFirmwareWarning(query) {
  const normalized = normalize(query);
  const mentionsPpm4 = normalized.includes('ppm4') || normalized.includes('portable pressure monitor');
  const mentionsFirmware = ['firmware', 'version', 'update', 'upgrade', '1.8', '2.2', 'legacy'].some((term) => normalized.includes(term));
  if (!mentionsPpm4 || !mentionsFirmware) return null;
  return chatbotBrain.find((entry) => entry.id === 'ppm4-firmware-firmware-ppm4-firmware-update-warning');
}

function searchBrain(query, limit = 5) {
  const scored = chatbotBrain
    .map((entry) => ({ ...entry, __score: scoreEntry(entry, query) }))
    .filter((entry) => entry.__score > 0)
    .sort((a, b) => b.__score - a.__score)
    .slice(0, limit);

  const firmwareWarning = findFirmwareWarning(query);
  if (firmwareWarning && !scored.some((entry) => entry.id === firmwareWarning.id)) {
    scored.unshift({ ...firmwareWarning, __score: 9999, __forcedWarning: true });
  }

  return scored.slice(0, limit);
}

function confidenceLabel(score) {
  if (score >= 130) return 'Strong match';
  if (score >= 70) return 'Possible match';
  return 'Low confidence';
}

function ResultSource({ entry }) {
  if (!entry?.sourceUrl) {
    return <span className="source-chip muted">No source link yet</span>;
  }

  return (
    <a className="source-chip" href={entry.sourceUrl} target="_blank" rel="noreferrer">
      Open source: {entry.sourceTitle || 'Source'} ↗
    </a>
  );
}

function AssistantAnswer({ answer }) {
  if (!answer) return null;

  if (!answer.results.length) {
    return (
      <div className="assistant-response no-match">
        <div className="assistant-bubble">
          <strong>I could not find a strong answer in the MonSuite brain.</strong>
          <p>
            Try using product names like RPM, PPM4, pressure sensor, firmware, Wi-Fi, cellular, or power.
            If this is urgent, open a support ticket.
          </p>
          <a className="button primary small" href={SUPPORT_URL} target="_blank" rel="noreferrer">Open support portal</a>
        </div>
      </div>
    );
  }

  const [best, ...related] = answer.results;
  const strongEnough = best.__score >= 45 || best.__forcedWarning;

  return (
    <div className="assistant-response">
      <div className={`assistant-bubble ${best.__forcedWarning ? 'critical' : ''} ${strongEnough ? '' : 'low-confidence'}`}>
        <div className="answer-topline">
          <span>{best.product || 'MonSuite'} · {best.category || 'Knowledge'}</span>
          <strong>{best.__forcedWarning ? 'Critical firmware note' : confidenceLabel(best.__score)}</strong>
        </div>

        <h2>{best.title}</h2>
        <p>{best.answer}</p>

        {!strongEnough && (
          <div className="status-callout warning compact-callout">
            <strong>Check this answer before using it.</strong>
            <p>This was a lower-confidence match. Use the source link or support portal if the answer does not fit the question.</p>
          </div>
        )}

        <div className="answer-actions">
          <ResultSource entry={best} />
          <a className="source-chip secondary" href={SUPPORT_URL} target="_blank" rel="noreferrer">Support ticket ↗</a>
        </div>
      </div>

      {related.length > 0 && (
        <div className="related-results">
          <h3>Related matches</h3>
          {related.map((entry) => (
            <details className="related-card" key={entry.id}>
              <summary>
                <span>{entry.title}</span>
                <small>{entry.product} · {confidenceLabel(entry.__score)}</small>
              </summary>
              <p>{entry.answer}</p>
              <ResultSource entry={entry} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatbotPage({ user, onLogout }) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);

  const stats = useMemo(() => ({
    entries: chatbotBrain.length,
    variants: chatbotBrain.reduce((sum, entry) => sum + (entry.questions?.length || 0), 0),
    products: unique(chatbotBrain.map((entry) => entry.product)).length,
  }), []);

  function askQuestion(questionText = query) {
    const cleanQuestion = questionText.trim();
    if (!cleanQuestion) return;

    const results = searchBrain(cleanQuestion, 5);
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question: cleanQuestion,
      results,
    };

    setHistory((current) => [item, ...current].slice(0, 12));
    setQuery('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion();
  }

  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap chatbot-page">
        <section className="hero-card chatbot-hero">
          <div>
            <p className="eyebrow">Ask the AbateBot</p>
            <h1>Ask AbateBot instead of opening every manual.</h1>
            <p>
              AbateBot searches the MonSuite brain built from product docs, setup rules, firmware notes,
              troubleshooting entries, and source links. It answers from that knowledge base and links back to the source.
            </p>
          </div>
          <div className="hero-panel assistant-stats abatebot-panel">
            <div className="abatebot-avatar" aria-hidden="true">
              <span className="bot-antenna" />
              <span className="bot-eye left" />
              <span className="bot-eye right" />
              <span className="bot-mouth" />
            </div>
            <span>Knowledge base</span>
            <strong>{stats.entries} entries</strong>
            <small>{stats.variants.toLocaleString()} question variants · {stats.products} products/topics</small>
          </div>
        </section>

        <section className="chatbot-shell">
          <section className="chatbot-main">
            <form className="assistant-search" onSubmit={handleSubmit}>
              <label htmlFor="assistant-question">Ask AbateBot a product or setup question</label>
              <div className="assistant-input-row">
                <input
                  id="assistant-question"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Example: how do I set job number on RPM?"
                />
                <button className="button primary" type="submit">Ask AbateBot</button>
              </div>
              <small>
                AbateBot is using local search right now, so answers are limited to the MonSuite knowledge brain.
              </small>
            </form>

            <div className="suggestion-list">
              {DEFAULT_SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} onClick={() => askQuestion(suggestion)}>{suggestion}</button>
              ))}
            </div>

            {history.length ? (
              <div className="chat-history">
                {history.map((item) => (
                  <article className="chat-turn" key={item.id}>
                    <div className="user-question">
                      <span>You asked</span>
                      <strong>{item.question}</strong>
                    </div>
                    <AssistantAnswer answer={item} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="assistant-empty-state">
                <strong>Hi, I’m AbateBot. Try asking about RPM, PPM4, firmware, Wi-Fi, cellular, power, sensors, alarms, or setup rules.</strong>
                <p>
                  Good first test: “How do I set job number on RPM?” The assistant should return the RPM job number answer and link to the RPM manual.
                </p>
              </div>
            )}
          </section>

          <aside className="chatbot-sidebar">
            <div className="assistant-side-card">
              <strong>Best uses</strong>
              <ul>
                <li>Quick answers from manuals</li>
                <li>Firmware warnings and links</li>
                <li>Power rule explanations</li>
                <li>Finding the right Google Doc</li>
              </ul>
            </div>
            <div className="assistant-side-card warning-card">
              <strong>Not full AI yet</strong>
              <p>
                This version searches the knowledge base and returns the best matching answer. Later, we can add a real AI layer through a Netlify Function if needed.
              </p>
            </div>
            <div className="assistant-side-card">
              <strong>Escalation</strong>
              <p>If the answer looks wrong or incomplete, open a Freshdesk ticket.</p>
              <a className="button secondary small full" href={SUPPORT_URL} target="_blank" rel="noreferrer">Open support</a>
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}
