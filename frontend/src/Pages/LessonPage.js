// // src/Pages/LessonPage.jsx
// import { useEffect, useMemo, useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { fetchContent, api } from '../utils/api';
// import { toast } from 'react-toastify';

// export default function LessonPage() {
//   const { slug } = useParams();
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [redirected, setRedirected] = useState(false);

//   useEffect(() => {
//     (async () => {
//       try {
//         const list = await fetchContent(); // returns content with .purchased flag
//         setItems(list);
//       } catch (e) {
//         toast.error('Could not load content.');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   const item = useMemo(() => {
//     if (!slug) return null;
//     const bySlug = items.find((x) => x.slug === slug);
//     if (bySlug) return bySlug;
//     // allow /content/:id as fallback
//     return items.find((x) => x.id === slug) || null;
//   }, [items, slug]);

//   useEffect(() => {
//     if (!item || redirected) return;
//     // If lesson_url is a full URL and user has access, just redirect to it
//     const hasAccess = !item.is_premium || item.purchased;
//     if (hasAccess && item.lesson_url && /^https?:\/\//i.test(item.lesson_url)) {
//       setRedirected(true);
//       window.location.assign(item.lesson_url);
//     }
//   }, [item, redirected]);

//   if (loading) return <div className="container">Loading…</div>;
//   if (!item)
//     return (
//       <div className="container">
//         Not found. <Link to="/">Go back</Link>
//       </div>
//     );

//   const unlocked = !item.is_premium || item.purchased;

//   const startCheckout = async () => {
//     try {
//       const { data } = await api.post(`/api/buy/${item.id}`);
//       if (data?.url) {
//         window.location.assign(data.url);
//       } else {
//         toast.error('Could not start checkout.');
//       }
//     } catch (e) {
//       toast.error('Checkout failed.');
//     }
//   };

//   return (
//     <div className="container lesson-page">
//       <div className="header">
//         <h2>{item.title}</h2>
//         <Link to="/">← Back</Link>
//       </div>

//       {!unlocked && (
//         <div className="locked">
//           <p>This lesson is part of Premium.</p>
//           <button onClick={startCheckout}>Buy access</button>
//         </div>
//       )}

//       {unlocked && (
//         <div className="lesson-body">
//           {/* 1) If lesson_url is a full URL and NOT auto-redirected yet, offer link */}
//           {item.lesson_url && /^https?:\/\//i.test(item.lesson_url) && !redirected && (
//             <p>
//               Opening your lesson… If nothing happens,&nbsp;
//               <a href={item.lesson_url} target="_blank" rel="noreferrer">
//                 click here
//               </a>
//               .
//             </p>
//           )}

//           {/* 2) If lesson_url is an internal asset (e.g., /assets/guide.pdf), embed */}
//           {item.lesson_url && item.lesson_url.startsWith('/') && (
//             <iframe
//               title={item.title}
//               src={item.lesson_url}
//               style={{ width: '100%', height: '80vh', border: 0 }}
//             />
//           )}

//           {/* 3) If no lesson_url configured, route known slugs to existing pages */}
//           {!item.lesson_url && (
//             <>
//               {item.slug === 'welcome-video' && (
//                 <div>
//                   <h3>Welcome</h3>
//                   <p>
//                     Intro video coming here. (Set <code>lesson_url</code> to a video link to
//                     auto-open.)
//                   </p>
//                 </div>
//               )}
//               {item.slug === 'learn-node' && (
//                 <div>
//                   <p>Go to the free guide:</p>
//                   <Link className="btn" to="/learn-node">
//                     Open “Getting Started with Node.js”
//                   </Link>
//                 </div>
//               )}
//               {item.slug === 'data-types' && (
//                 <div>
//                   <p>Go to the free guide:</p>
//                   <Link className="btn" to="/data-types">
//                     Open “JavaScript Data Types”
//                   </Link>
//                 </div>
//               )}
//               {!['welcome-video', 'learn-node', 'data-types'].includes(item.slug) && (
//                 <p>
//                   No lesson URL configured yet for <strong>{item.slug}</strong>. Add one in the
//                   content table.
//                 </p>
//               )}
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// src/Pages/LessonPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchContentBySlug } from '../utils/api';
import ReactMarkdown from 'react-markdown';
import './LessonPage.css';

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

  if (err) return <div className="container"><p style={{ color: 'crimson' }}>{err}</p></div>;
  if (!item) return <div className="container"><p>Loading…</p></div>;

  const isPremium = Number(item.price || 0) > 0;

  return (
    <div className="container lesson-container">
      <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
      <h1>{item.title}</h1>
      <p className="desc">{item.description}</p>

      {isPremium && !item.purchased ? (
        <div className="paywall">
          <p>This is a premium lesson. Please purchase from the Explore tab.</p>
        </div>
      ) : (
        <div className="lesson-body">
          {item.body_md ? (
            <ReactMarkdown>{item.body_md}</ReactMarkdown>
          ) : (
            <h3>Lesson content coming soon…</h3>
          )}
        </div>
      )}
    </div>
  );
}
