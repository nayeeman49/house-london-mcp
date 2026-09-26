import Image from "next/image";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { MotionItem, MotionStagger } from "@/components/Motion";
import { CASES } from "@/lib/cases";

const PRIMARY_OPTIONS = [
  {
    href: "/map",
    num: "01",
    title: "Planning map",
    description: "Interactive London map with borough metrics, filters, and live MCP data.",
  },
  {
    href: "/chat",
    num: "02",
    title: "Ask the data",
    description: "Freeform questions answered with live MCP statistics.",
  },
  {
    href: "/desk",
    num: "03",
    title: "Evidence desk",
    description: "Preset questions, evidence cards, and pitch export.",
  },
  {
    href: "/problems",
    num: "04",
    title: "Problem tables",
    description: "Tables A–G with solutions, map deep links, and further reading.",
  },
];

export default function HomePage() {
  return (
    <div className="landing-shell">
      <div className="app-grid-overlay" aria-hidden />
      <div className="app-vignette" aria-hidden />
      <div className="landing-accent-tr" aria-hidden />
      <div className="landing-accent-bl" aria-hidden />

      <MotionStagger className="relative z-10 max-w-5xl mx-auto w-full px-6">
        <MotionItem>
          <AppNav />
        </MotionItem>
      </MotionStagger>

      <main id="main-content" className="landing-hero relative z-10">
        <MotionStagger>
          <MotionItem>
            <div className="landing-hero-title">
              <div className="landing-hero-image-wrap" aria-hidden>
                <Image
                  src="/images/london-skyline.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 92vw, 680px"
                  className="landing-hero-image"
                />
                <div className="landing-hero-image-fade" />
              </div>

              <div className="landing-hero-text">
                <h1 className="landing-title">
                  <span className="landing-title-main">
                    <span className="landing-sparkle landing-sparkle-1" aria-hidden />
                    <span className="landing-sparkle landing-sparkle-2" aria-hidden />
                    <span className="landing-sparkle landing-sparkle-3" aria-hidden />
                    <span className="landing-sparkle landing-sparkle-4" aria-hidden />
                    <span className="landing-sparkle landing-sparkle-5" aria-hidden />
                    <span className="landing-sparkle landing-sparkle-6" aria-hidden />
                    HouseData <em>Engine</em>
                  </span>
                </h1>
              </div>
            </div>
          </MotionItem>

          <MotionItem>
            <p className="landing-subtitle">
              London planning data from 182,000 applications.
              Choose how you want to explore it.
            </p>
          </MotionItem>

          <MotionItem>
            <div className="landing-options motion-stagger-grid">
              {PRIMARY_OPTIONS.map((opt) => (
                <Link key={opt.href} href={opt.href} className="landing-option group motion-grid-item">
                  <span className="landing-option-num">{opt.num}</span>
                  <span className="landing-option-title">{opt.title}</span>
                  <span className="landing-option-desc">{opt.description}</span>
                  <span className="landing-option-arrow" aria-hidden>
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          </MotionItem>

          <MotionItem>
            <div className="landing-stories">
              <p className="section-label">Jump to a story</p>
              <div className="landing-story-list">
                <Link href="/problems" className="landing-story-link landing-story-link-accent">
                  Problem tables A–G
                </Link>
                <Link href="/desk?case=repeat" className="landing-story-link">
                  Judge tour · repeat applications
                </Link>
                {CASES.map((c) => (
                  <Link
                    key={c.id}
                    href={`/desk?case=${c.id}`}
                    className="landing-story-link"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          </MotionItem>
        </MotionStagger>
      </main>

      <footer className="landing-footer relative z-10 motion-footer-enter">
        <p>
          Powered by{" "}
          <a
            href="https://foreman.house-london.uk/"
            target="_blank"
            rel="noreferrer"
          >
            Foundations
          </a>
          {" · "}
          Housing Intent Engine MCP
        </p>
      </footer>
    </div>
  );
}
