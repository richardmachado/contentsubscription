import Login from '../Components/Login';
export default function LandingPageWithExistingLogin() {
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brandWrap}>
          <div style={styles.logo}>JS</div>
          <div style={styles.brand}>JavaScript Launchpad</div>
        </div>
        <nav className="landing-nav">
          <a href="#learn" style={styles.navLink}>
            Learn
          </a>
          <a href="#cheatsheets" style={styles.navLink}>
            Cheatsheets
          </a>
          <a href="#projects" style={styles.navLink}>
            Projects
          </a>
          <a href="#pricing" style={styles.navLink}>
            Pricing
          </a>
        </nav>
      </header>

      {/* Hero + Auth */}
      <section style={styles.heroSection}>
        <div style={styles.heroLeft}>
          <span style={styles.pill}>Welcome, future developer</span>
          <h1 style={styles.h1}>
            Learn JavaScript <span style={{ color: '#22d3ee' }}>the right way</span>
          </h1>
          <p style={styles.subhead}>
            Thanks for visiting and taking the first big step toward becoming a JavaScript
            developer. You’ll learn by reading, doing, and building — with step‑by‑step lessons,
            mini‑challenges, and projects that stick.
          </p>
          <ul style={styles.list}>
            <li>✔ Step‑by‑step tutorials with visuals</li>
            <li>✔ Mini‑challenges & answer keys</li>
            <li>✔ Premium cheatsheets & PDFs</li>
            <li>✔ Real projects, real skills</li>
          </ul>
          <div style={styles.ctaRow}>
            <a href="#learn" style={styles.primaryBtn}>
              Start Learning
            </a>
            <a href="#cheatsheets" style={styles.secondaryBtn}>
              View Cheatsheets
            </a>
          </div>
        </div>

        {/* Your existing Login component embedded on the right */}
        <div style={styles.heroRight}>
          {/* The Login component you pasted (src/Components/Login.jsx) renders its own cards and CSS */}
          <Login />
        </div>
      </section>

      {/* Learn Paths */}
      <section id="learn" style={styles.section}>
        <h2 style={styles.h2}>Choose your learning path</h2>
        <div style={styles.grid3}>
          {[
            {
              title: 'JavaScript Basics',
              desc: 'Variables, types, conditionals, loops — start here.',
              cta: 'Begin Basics',
            },
            {
              title: 'Arrays Deep Dive',
              desc: 'Map, filter, reduce, immutability, and performance.',
              cta: 'Master Arrays',
            },
            {
              title: 'Async/Await Mastery',
              desc: 'Promises, async/await, parallelism, and patterns.',
              cta: 'Go Async',
            },
          ].map((card) => (
            <article key={card.title} style={styles.card}>
              <h3 style={styles.h3}>{card.title}</h3>
              <p style={styles.cardDesc}>{card.desc}</p>
              <button style={styles.smallBtn}>{card.cta}</button>
            </article>
          ))}
        </div>
      </section>

      {/* Cheatsheets */}
      <section id="cheatsheets" style={styles.sectionAlt}>
        <h2 style={styles.h2}>Premium Cheatsheets & PDFs</h2>
        <p style={styles.lead}>
          Grab printable, high‑impact cheatsheets that condense what you’ve learned into one page.
          Perfect for quick review and interviews.
        </p>
        <div style={styles.row}>
          <a href="#" style={styles.chip}>
            JS Basics
          </a>
          <a href="#" style={styles.chip}>
            Arrays Deep Dive
          </a>
          <a href="#" style={styles.chip}>
            Async/Await
          </a>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" style={styles.section}>
        <h2 style={styles.h2}>Build real projects</h2>
        <div style={styles.grid3}>
          {[
            { title: 'Todo App', desc: 'State, events, localStorage.' },
            { title: 'Quiz Game', desc: 'Arrays, timers, DOM.' },
            { title: 'Weather Fetcher', desc: 'APIs, async/await, UX.' },
          ].map((p) => (
            <div key={p.title} style={styles.card}>
              <h3 style={styles.h3}>{p.title}</h3>
              <p style={styles.cardDesc}>{p.desc}</p>
              <button style={styles.smallBtn}>Open Project</button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer id="pricing" style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <h2 style={styles.h2}>Ready to dive in?</h2>
            <p style={styles.lead}>
              Create your free account to track progress, unlock challenges with answer keys, and
              access premium PDFs. Upgrade any time.
            </p>
          </div>
          <div>
            <a href="#" style={styles.primaryBtn}>
              Create your account
            </a>
          </div>
        </div>
        <div style={styles.copy}>
          © {new Date().getFullYear()} JavaScript Launchpad · All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg,#0f172a,#0b1220)',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  brandWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: {
    height: 36,
    width: 36,
    borderRadius: 12,
    background: 'rgba(34,211,238,0.15)',
    border: '1px solid rgba(103,232,249,0.3)',
    display: 'grid',
    placeItems: 'center',
    color: '#67e8f9',
    fontWeight: 700,
  },
  brand: { fontWeight: 600, letterSpacing: 0.2 },
  navLink: { color: '#94a3b8', marginLeft: 16, textDecoration: 'none' },
  heroSection: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 24,
    padding: '24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  heroLeft: {},
  heroRight: {},
  pill: {
    display: 'inline-block',
    border: '1px solid rgba(34,211,238,0.3)',
    background: 'rgba(34,211,238,0.1)',
    color: '#67e8f9',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    marginBottom: 12,
  },
  h1: { fontSize: 40, fontWeight: 800, lineHeight: 1.1, margin: 0 },
  subhead: { marginTop: 12, color: '#cbd5e1', maxWidth: 720 },
  list: { marginTop: 16, lineHeight: 1.8, listStyle: 'none', padding: 0 },
  ctaRow: { display: 'flex', gap: 12, marginTop: 18 },
  primaryBtn: {
    background: '#fff',
    color: '#0f172a',
    padding: '10px 16px',
    borderRadius: 12,
    fontWeight: 700,
    textDecoration: 'none',
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#e2e8f0',
    padding: '10px 16px',
    borderRadius: 12,
    textDecoration: 'none',
  },
  section: { maxWidth: 1200, margin: '0 auto', padding: '40px 24px' },
  sectionAlt: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 24px',
    background: 'rgba(255,255,255,0.03)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  h2: { fontSize: 28, fontWeight: 800, margin: '0 0 16px 0' },
  h3: { fontSize: 18, fontWeight: 700, margin: '0 0 6px 0' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 },
  card: {
    background: 'rgba(2,6,23,0.6)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
  },
  cardDesc: { color: '#cbd5e1' },
  smallBtn: {
    marginTop: 10,
    background: '#fff',
    color: '#0f172a',
    padding: '8px 12px',
    borderRadius: 12,
    fontWeight: 700,
    border: 'none',
  },
  row: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  chip: {
    display: 'inline-block',
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    textDecoration: 'none',
    color: '#e2e8f0',
  },
  footer: { borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 24 },
  footerInner: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 24px',
  },
  lead: { color: '#cbd5e1', maxWidth: 800 },
  copy: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px 24px',
    color: '#94a3b8',
    fontSize: 12,
  },
};
