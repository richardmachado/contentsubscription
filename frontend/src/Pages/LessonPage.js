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

// register languages you'll likely use
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
      <div className="container">
        <p style={{ color: 'crimson' }}>{err}</p>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="container">
        <p>Loading…</p>
      </div>
    );
  }

  const isPremium = Number(item.price || 0) > 0;

  return (
    <div className="container lesson-container">
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
      </button>

      <article className="lesson-article">
        <header className="lesson-header">
          <h1 className="lesson-title">{item.title}</h1>
          {item.description ? <p className="lesson-desc">{item.description}</p> : null}
          {Number(item.price || 0) > 0 && !item.purchased && (
            <span className="pill premium-pill">Premium</span>
          )}
        </header>

        {isPremium && !item.purchased ? (
          <div className="paywall">
            <p>This is a premium lesson. Please purchase from the Explore tab.</p>
          </div>
        ) : (
          <div className="lesson-body markdown-body">
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
          </div>
        )}
      </article>
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
      </button>
    </div>
  );
}
