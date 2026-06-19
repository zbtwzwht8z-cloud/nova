"use client";

import {
  ArrowRight,
  Check,
  Download,
  FileWarning,
  Layers,
  LockKeyhole,
  Search,
  Shield,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { QuestionMetrics } from "@/lib/types";

type StoaLandingProps = {
  questionMetrics: QuestionMetrics;
  loginName: string;
  loginPassword: string;
  authError: string;
  devLogin: null | { username: string; password: string };
  onLoginNameChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onLogin: (event: React.FormEvent) => void;
};

type ShowcaseMode = "study" | "exam" | "review";

const showcaseCopy: Record<
  ShowcaseMode,
  { label: string; title: string; detail: string; state: string }
> = {
  study: {
    label: "Study",
    title: "Answer, learn, move.",
    detail: "Instant feedback with preserved corrections and comments after the attempt.",
    state: "Feedback visible"
  },
  exam: {
    label: "Exam",
    title: "A quiet timed room.",
    detail: "Responses stay sealed until the session is finished, so recall stays honest.",
    state: "Feedback sealed"
  },
  review: {
    label: "Review",
    title: "Only the weak links.",
    detail: "Wrong, saved, and unanswered filters rebuild the queue around what matters.",
    state: "Mistakes prioritized"
  }
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function StoaLanding({
  questionMetrics,
  loginName,
  loginPassword,
  authError,
  devLogin,
  onLoginNameChange,
  onLoginPasswordChange,
  onLogin
}: StoaLandingProps) {
  const [showcaseMode, setShowcaseMode] = useState<ShowcaseMode>("study");
  const metrics = questionMetrics;

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18 }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  const activeShowcase = showcaseCopy[showcaseMode];

  return (
    <main className="stoa-page">
      <div className="stoa-ambient" aria-hidden="true">
        <div className="stoa-veil one" />
        <div className="stoa-veil two" />
        <div className="stoa-grid-lines" />
      </div>

      {/* Floating glass navbar */}
      <nav className="stoa-nav" aria-label="Stoa navigation">
        <a className="stoa-wordmark" href="#top" aria-label="Stoa home">
          <span className="stoa-mark">S</span>
          <strong>Stoa</strong>
        </a>
        <div className="stoa-nav-links">
          <a href="#method">Method</a>
          <a href="#features">System</a>
          <a href="#showcase">Demo</a>
          <a href="#access">Access</a>
        </div>
        <a className="stoa-nav-cta" href="#access">
          Enter
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </nav>

      {/* Hero with product mockup and animated glass object */}
      <section id="top" className="stoa-hero">
        <div className="stoa-shell stoa-hero-grid">
          <div className="stoa-hero-copy">
            <span className="stoa-eyebrow stoa-stagger-1">The modern digital space</span>
            <h1 className="stoa-stagger-2">Master exams with calm precision.</h1>
            <p className="stoa-hero-sub stoa-stagger-3">
              Stoa turns a dense medical question bank into a private, synced study
              environment with exam mode, review loops, preserved corrections, and a
              clean command center for your group.
            </p>

            <div className="stoa-hero-actions stoa-stagger-4">
              <a className="stoa-button primary" href="#access">
                Enter Stoa
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="stoa-button secondary" href="#showcase">
                See the system
              </a>
            </div>

            <div className="stoa-proof stoa-stagger-5" aria-label="Product proof">
              <span>{formatNumber(metrics.questions)} questions</span>
              <span>{metrics.subjects} subjects</span>
              <span>{formatNumber(metrics.notes)} preserved notes</span>
            </div>
          </div>

          <div className="stoa-hero-visual stoa-stagger-4">
            <div className="stoa-glass-object" aria-hidden="true">
              <div className="stoa-glass-s">S</div>
            </div>
            <div className="stoa-product-frame">
              <div className="stoa-product-top">
                <span />
                <span />
                <span />
                <strong>Stoa / Allgemeinmedizin</strong>
              </div>
              <div className="stoa-product-body">
                <aside>
                  <span className="active">Dashboard</span>
                  <span>Subjects</span>
                  <span>Trainer</span>
                  <span>Mistakes</span>
                </aside>
                <section>
                  <div className="stoa-mini-metrics">
                    <div>
                      <span>Answered</span>
                      <strong>1,284</strong>
                    </div>
                    <div>
                      <span>Accuracy</span>
                      <strong>78%</strong>
                    </div>
                    <div>
                      <span>Review</span>
                      <strong>142</strong>
                    </div>
                  </div>
                  <div className="stoa-question-preview">
                    <span>Exam mode</span>
                    <h3>Which next step fits this presentation?</h3>
                    <div className="stoa-answer-lines">
                      <i />
                      <i />
                      <i className="selected" />
                      <i />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / solution */}
      <section id="method" className="stoa-section stoa-shell" data-reveal>
        <div className="stoa-section-header">
          <span className="stoa-eyebrow">Problem / solution</span>
          <h2>Less friction. More recall.</h2>
        </div>
        <div className="stoa-compare">
          <article>
            <span className="stoa-column-line" />
            <h3>The old way</h3>
            <p>
              Question banks drift into clutter: ads, hidden corrections, lost comments,
              shared passwords, and progress trapped in one browser.
            </p>
          </article>
          <article className="glass">
            <span className="stoa-column-line gold" />
            <h3>The Stoa way</h3>
            <p>
              Private accounts, synced progress, focused sessions, preserved corrections,
              and an admin path for reports. The material stays dense. The interface does
              not.
            </p>
          </article>
        </div>
      </section>

      {/* Feature system */}
      <section id="features" className="stoa-section stoa-shell" data-reveal>
        <div className="stoa-section-header compact">
          <span className="stoa-eyebrow">System</span>
          <h2>Built around how you actually study.</h2>
        </div>
        <div className="stoa-feature-grid">
          <FeatureCard
            icon={<Timer size={20} />}
            title="Exam room"
            body="Timed sessions keep answers sealed until the end, then write results back into your review history."
          />
          <FeatureCard
            icon={<Search size={20} />}
            title="Dense search"
            body="Search stems, answer choices, subjects, exams, and preserved comments without leaving the trainer."
          />
          <FeatureCard
            icon={<Layers size={20} />}
            title="Subject atlas"
            body="Every subject gets completion, accuracy, topic breakdowns, and a direct path into targeted practice."
          />
          <FeatureCard
            icon={<FileWarning size={20} />}
            title="Report queue"
            body="Flag wrong answers, typos, or unclear stems. Admins get a clean review queue instead of chat chaos."
          />
          <FeatureCard
            icon={<Download size={20} />}
            title="Portable state"
            body="Export and import progress while synced accounts keep the group moving across devices."
          />
        </div>
      </section>

      {/* Interactive showcase */}
      <section id="showcase" className="stoa-section stoa-shell" data-reveal>
        <div className="stoa-showcase">
          <div className="stoa-showcase-copy">
            <span className="stoa-eyebrow">Interactive showcase</span>
            <h2>{activeShowcase.title}</h2>
            <p>{activeShowcase.detail}</p>
            <div className="stoa-mode-switch" aria-label="Showcase mode">
              {(Object.keys(showcaseCopy) as ShowcaseMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={showcaseMode === mode ? "active" : ""}
                  onClick={() => setShowcaseMode(mode)}
                >
                  {showcaseCopy[mode].label}
                </button>
              ))}
            </div>
          </div>
          <div className={`stoa-live-card ${showcaseMode}`}>
            <div className="stoa-live-header">
              <span>{activeShowcase.label}</span>
              <strong>{activeShowcase.state}</strong>
            </div>
            <div className="stoa-live-question">
              <p>Question 12 / 40</p>
              <h3>A correction exists in the comments. When should it appear?</h3>
              <button className={showcaseMode === "exam" ? "sealed" : "correct"}>
                After the attempt, not before.
              </button>
              <button>Always visible above the question.</button>
              <button>Only in the admin console.</button>
            </div>
            <div className="stoa-live-note">
              <Check size={16} aria-hidden="true" />
              <span>
                {showcaseMode === "exam"
                  ? "Feedback waits until finish."
                  : "Comment notes unlock after answering."}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="stoa-section stoa-shell" data-reveal>
        <div className="stoa-proof-grid">
          <ProofCard value={formatNumber(metrics.questions)} label="normalized MCQs" />
          <ProofCard value={formatNumber(metrics.notes)} label="comment notes kept" />
          <ProofCard value={`${metrics.subjects}`} label="medical subjects" />
          <ProofCard value={`${metrics.images}`} label="image questions proxied" />
        </div>
        <div className="stoa-testimonial glass">
          <Shield size={18} aria-hidden="true" />
          <p>
            Private by default: account sessions, group-scoped progress, local export,
            and a backend that can persist through Vercel KV.
          </p>
        </div>
      </section>

      {/* Pricing / CTA */}
      <section id="access" className="stoa-section stoa-shell" data-reveal>
        <div className="stoa-access">
          <div className="stoa-pricing glass">
            <span className="stoa-eyebrow">Private deployment</span>
            <h2>For your study group.</h2>
            <p>
              No ads. No public marketplace. Bring your own Vercel and keep the question
              bank in a private repo.
            </p>
            <ul>
              <li>
                <Check size={16} /> Individual friend accounts
              </li>
              <li>
                <Check size={16} /> Synced progress and leaderboard
              </li>
              <li>
                <Check size={16} /> Reports, imports, exports, and offline cache
              </li>
            </ul>
          </div>

          <form className="stoa-access-form glass" onSubmit={onLogin}>
            <div>
              <span className="stoa-eyebrow">Access Stoa</span>
              <h3>Sign in</h3>
            </div>
            <label>
              <span>Username</span>
              <input
                value={loginName}
                onChange={(event) => onLoginNameChange(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                value={loginPassword}
                onChange={(event) => onLoginPasswordChange(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>
            {authError ? <p className="stoa-error">{authError}</p> : null}
            {devLogin ? (
              <p className="stoa-dev">
                Local dev: {devLogin.username} / {devLogin.password}
              </p>
            ) : null}
            <button type="submit" className="stoa-button primary full">
              <LockKeyhole size={17} aria-hidden="true" />
              Enter Stoa
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="stoa-footer stoa-shell">
        <a className="stoa-wordmark" href="#top" aria-label="Stoa home">
          <span className="stoa-mark">S</span>
          <strong>Stoa</strong>
        </a>
        <p>The modern digital space for mastering your exams.</p>
        <div>
          <a href="#method">Method</a>
          <a href="#features">System</a>
          <a href="#access">Access</a>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="stoa-feature-card glass">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function ProofCard({ value, label }: { value: string; label: string }) {
  return (
    <article className="stoa-proof-card glass">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
