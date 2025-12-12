import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchContentBySlug } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import ts from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import shell from 'react-syntax-highlighter/dist/esm/languages/hljs/shell';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import cssLang from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import htmlLang from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import theme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import './LessonPage.css';

// register languages
SyntaxHighlighter.registerLanguage('js', js);
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('ts', ts);
SyntaxHighlighter.registerLanguage('typescript', ts);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('sh', shell);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('css', cssLang);
SyntaxHighlighter.registerLanguage('html', htmlLang);
SyntaxHighlighter.registerLanguage('xml', htmlLang);

export default function LessonPage() {
  const { slugOrId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchContentBySlug(slugOrId);
        setItem(data);
      } catch (e) {
        setErr('Could not load lesson.');
      }
    })();
  }, [slugOrId]);

  if (err) {
    return (
      <div className="lesson-page-root">
        <div className="lesson-centered">
          <p className="lesson-error">{err}</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="lesson-page-root">
        <div className="lesson-centered">
          <div className="lesson-skeleton" />
          <p className="lesson-meta-text">Loading lesson…</p>
        </div>
      </div>
    );
  }

  const isPremium = Number(item.price || 0) > 0;

  return (
    <div className="lesson-page-root">
      <header className="lesson-topbar">
        <div className="lesson-topbar-inner">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <div className="lesson-topbar-meta">
            {isPremium && <span className="pill premium-pill">Premium</span>}
            {item.read_time && <span className="pill meta-pill">{item.read_time} min read</span>}
          </div>
        </div>
      </header>

      <main className="lesson-main">
        <article className="lesson-article">
          <header className="lesson-header">
            <h1 className="lesson-title">{item.title}</h1>
            {item.description ? <p className="lesson-desc">{item.description}</p> : null}

            <div className="lesson-header-meta">
              {item.level && <span className="pill meta-pill">Level: {item.level}</span>}
              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="lesson-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="pill tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {isPremium && !item.purchased ? (
            <section className="paywall">
              <div className="paywall-icon">🔒</div>
              <h2 className="paywall-title">Premium lesson</h2>
              <p className="paywall-copy">
                This lesson is part of the premium library. Purchase it from the
                <strong> Explore </strong>
                tab to unlock full content and code examples.
              </p>
              <button type="button" className="paywall-cta" onClick={() => navigate('/explore')}>
                Go to Explore
              </button>
            </section>
          ) : (
            <section className="lesson-body markdown-body">
              {item.body_md ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match?.[1];
                      if (!inline) {
                        return (
                          <SyntaxHighlighter
                            style={theme}
                            language={lang || 'plaintext'}
                            PreTag="div"
                            customStyle={{ borderRadius: 8, margin: '12px 0' }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        );
                      }
                      return (
                        <code className="inline-code" {...props}>
                          {children}
                        </code>
                      );
                    },
                    a({ children, href, ...props }) {
                      const isExternal = href && /^https?:\/\//i.test(href);
                      return (
                        <a
                          href={href}
                          {...props}
                          target={isExternal ? '_blank' : undefined}
                          rel={isExternal ? 'noopener noreferrer' : undefined}
                        >
                          {children}
                        </a>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="table-wrap">
                          <table>{children}</table>
                        </div>
                      );
                    },
                  }}
                >
                  {item.body_md}
                </ReactMarkdown>
              ) : (
                <h3>Lesson content coming soon…</h3>
              )}
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
