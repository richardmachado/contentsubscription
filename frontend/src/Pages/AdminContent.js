// src/Pages/AdminContent.jsx
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './adminContent.css';

import Quiz from './LessonComponents/Quiz';
import CodePlayground from './LessonComponents/CodePlayground';

function parseCustomBlocks(md) {
  const lines = md.split('\n');
  const parts = [];
  let buffer = [];
  let mode = null;
  let meta = {};

  const flushText = () => {
    if (buffer.length) {
      parts.push({ type: 'markdown', content: buffer.join('\n') });
      buffer = [];
    }
  };

  for (const line of lines) {
    const playMatch = line.match(/^:::playground(.*)/);
    const quizMatch = line.match(/^:::quiz(.*)/);

    if (playMatch) {
      flushText();
      mode = 'playground';
      meta = {};
      continue;
    }
    if (quizMatch) {
      flushText();
      mode = 'quiz';
      meta = {};
      continue;
    }
    if (line.trim() === ':::') {
      if (mode && buffer.length) {
        const content = buffer.join('\n');
        parts.push({ type: mode, content, meta });
      }
      buffer = [];
      mode = null;
      meta = {};
      continue;
    }
    buffer.push(line);
  }
  flushText();
  return parts;
}

// empty form used to reset UI
const emptyForm = {
  id: null,
  slug: '',
  title: '',
  description: '',
  body_md: '',
  price: 0,
  published: true,
  sort_order: 100,
  thumbnail_url: '',
  duration_min: '',
  level: '',
  tags: '',
};

export default function AdminContent() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('edit');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/content');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // fetch full record before editing
  const onEdit = async (it) => {
    try {
      setError('');
      const { data: full } = await api.get(`/api/content/${it.id}`);
      setForm({
        id: full.id,
        slug: full.slug || '',
        title: full.title || '',
        description: full.description || '',
        body_md: full.body_md || '',
        price: Number(full.price || 0),
        published: !!full.published,
        sort_order: Number(full.sort_order || 100),
        thumbnail_url: full.thumbnail_url || '',
        duration_min: full.duration_min ?? '',
        level: full.level || '',
        tags: Array.isArray(full.tags) ? full.tags.join(',') : full.tags || '',
      });
      setTab('edit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Could not load full content for editing.');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await api.delete(`/api/content/${id}`);
    await load();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description,
        body_md: form.body_md,
        price: Number(form.price || 0),
        published: !!form.published,
        sort_order: Number(form.sort_order || 100),
        thumbnail_url: form.thumbnail_url || null,
        duration_min: form.duration_min === '' ? null : Number(form.duration_min),
        level: form.level || null,
        tags: (form.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      form.id
        ? await api.patch(`/api/content/${form.id}`, payload)
        : await api.post('/api/content', payload);

      setForm(emptyForm);
      await load();
      setTab('edit');
    } catch (e) {
      setError(e?.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setError('');
    setTab('edit');
  };

  // timestamp converter for postgres format
  function parsePostgresTimestamp(ts) {
    if (!ts) return null;
    const iso = ts.replace(' ', 'T').replace(/\.\d+/, '').replace(/\+00$/, 'Z');
    return new Date(iso);
  }

  return (
    <div className="admin-wrap">
      <h1>Content Admin</h1>

      {/* ─────────── FORM / EDITOR ─────────── */}
      <div className="editor-card">
        <div className="tabs">
          <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>
            ✏️ Edit
          </button>
          <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
            👁 Preview
          </button>
        </div>

        <form
          className={`admin-form two-col ${tab === 'edit' ? 'show-edit' : 'show-preview'}`}
          onSubmit={submit}
        >
          {/* LEFT PANEL — EDIT MODE */}
          <div className="pane edit-pane">
            <div className="row">
              <label>Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
              />
            </div>
            <div className="row">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="row">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="row">
              <label>Body (Markdown)</label>
              <textarea
                className="mono"
                rows={14}
                value={form.body_md}
                onChange={(e) => setForm({ ...form, body_md: e.target.value })}
                placeholder="# Heading\n\nWrite Markdown here…"
              />
            </div>

            <div className="grid">
              <div className="row">
                <label>Price (cents)</label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="row checkbox">
                <label>Published</label>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
              </div>
              <div className="row">
                <label>Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div className="row">
                <label>Duration (min)</label>
                <input
                  type="number"
                  min="0"
                  value={form.duration_min}
                  onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                />
              </div>
              <div className="row">
                <label>Level</label>
                <input
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  placeholder="beginner | intermediate | advanced"
                />
              </div>
              <div className="row">
                <label>Tags</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
              <div className="row">
                <label>Thumbnail URL</label>
                <input
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="err">{error}</p>}

            <div className="actions">
              <button type="submit" disabled={saving}>
                {form.id ? 'Update' : 'Create'}
              </button>
              {form.id && (
                <button type="button" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => setTab(tab === 'edit' ? 'preview' : 'edit')}
                style={{ marginLeft: 'auto' }}
              >
                {tab === 'edit' ? 'Show Preview →' : '← Back to Edit'}
              </button>
            </div>
          </div>

          {/* RIGHT PANEL — LIVE MARKDOWN PREVIEW */}
          <div className="pane preview-pane">
            <div className="preview-header">
              <div>
                <div className="preview-title">{form.title || 'Untitled Lesson'}</div>
                <div className="preview-sub">{form.description || 'No description yet.'}</div>
              </div>
              {Number(form.price || 0) > 0 && <span className="pill">Premium</span>}
            </div>

            <div className="markdown-preview markdown-body">
              {form.body_md ? (
                parseCustomBlocks(form.body_md).map((block, idx) => {
                  if (block.type === 'markdown') {
                    return (
                      <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>
                        {block.content}
                      </ReactMarkdown>
                    );
                  }

                  if (block.type === 'playground') {
                    return <CodePlayground key={idx} initialCode={block.content} />;
                  }

                  if (block.type === 'quiz') {
                    const lines = block.content.split('\n').filter(Boolean);
                    const qLine = lines.find((l) => l.startsWith('question:')) || '';
                    const oLine = lines.find((l) => l.startsWith('options:')) || '';
                    const aLine = lines.find((l) => l.startsWith('answer:')) || '';

                    const question = qLine.replace('question:', '').trim();
                    const options = oLine
                      .replace('options:', '')
                      .split('|')
                      .map((s) => s.trim());
                    const correctIndex = parseInt(aLine.replace('answer:', '').trim(), 10);

                    return (
                      <Quiz
                        key={idx}
                        question={question}
                        options={options}
                        correctIndex={correctIndex}
                      />
                    );
                  }

                  return null;
                })
              ) : (
                <div className="placeholder">Start typing Markdown to preview…</div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ─────────────── EXISTING LESSONS TABLE ─────────────── */}
      <h2 style={{ marginTop: 32 }}>Existing Lessons</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Sort Order</th>
              <th>Title</th>
              <th>Slug</th>
              <th>Price</th>

              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const rawDate = it.updated_at;
              const created_date = it.created_at;

              return (
                <tr key={it.id}>
                  <td>{parsePostgresTimestamp(created_date)?.toLocaleString() || 'No date'}</td>
                  <td>{it.sort_order}</td>
                  <td>{it.title}</td>
                  <td>{it.slug}</td>
                  <td>{Number(it.price || 0)}</td>
                  {/* <td>{it.published ? 'Yes' : 'No'}</td> */}
                  <td>{parsePostgresTimestamp(rawDate)?.toLocaleString() || 'No date'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button onClick={() => onEdit(it)}>Edit</button>
                    <button onClick={() => onDelete(it.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>
                  No lessons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
