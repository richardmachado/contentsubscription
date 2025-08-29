import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './adminContent.css';

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

  const load = async () => {
    try {
      const { data } = await api.get('/api/content');
      setItems(data);
    } catch (e) {
      setError('Failed to load content');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onEdit = (it) => {
    setForm({
      id: it.id,
      slug: it.slug || '',
      title: it.title || '',
      description: it.description || '',
      body_md: it.body_md || '',
      price: Number(it.price || 0),
      published: !!it.published,
      sort_order: Number(it.sort_order || 100),
      thumbnail_url: it.thumbnail_url || '',
      duration_min: it.duration_min ?? '',
      level: it.level || '',
      tags: Array.isArray(it.tags) ? it.tags.join(',') : it.tags || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      if (form.id) {
        await api.patch(`/api/content/${form.id}`, payload);
      } else {
        await api.post('/api/content', payload);
      }

      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => setForm(emptyForm);

  return (
    <div className="admin-wrap">
      <h1>Content Admin</h1>

      <form className="admin-form" onSubmit={submit}>
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
            rows={10}
            value={form.body_md}
            onChange={(e) => setForm({ ...form, body_md: e.target.value })}
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
          <div className="row">
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
            <label>Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
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
        </div>
      </form>

      <h2 style={{ marginTop: 32 }}>Existing Lessons</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Price</th>
            <th>Published</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.title}</td>
              <td>{it.slug}</td>
              <td>{Number(it.price || 0)}</td>
              <td>{it.published ? 'Yes' : 'No'}</td>
              <td>{new Date(it.updated_at || it.created_at).toLocaleString()}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button onClick={() => onEdit(it)}>Edit</button>{' '}
                <button onClick={() => onDelete(it.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>
                No lessons yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
