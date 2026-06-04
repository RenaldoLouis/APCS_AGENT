// APCS Scoring Platform — clickable mid-fi prototype
// Single source of truth: App holds screen + participants + draft state.

const { useState, useMemo, useRef, useEffect, useCallback } = React;

// ============================================================
// ICON
// ============================================================
const Icon = ({ id, size = 14, style = {}, className = '' }) =>
<svg
  width={size} height={size}
  style={{ display: 'inline-block', verticalAlign: '-2px', flexShrink: 0, ...style }}
  className={className}
  aria-hidden="true">
    <use href={`#i-${id}`} />
  </svg>;


// ============================================================
// DATA
// ============================================================
const initials = (name) =>
name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// `sub` = when participant uploaded their performance · `u` = teacher's last update on the assessment
const SEED = [
{ id: 'p1', n: 'Andi Pratama', t: 'Individual', c: 'Primary', song: 'Für Elise', d: '3:24', s: 'Pending', sub: '07 May 2025, 16:42', u: null, data: null },
{ id: 'p2', n: 'Bela Nusantara', t: 'Individual', c: 'Junior', song: 'Clair de Lune', d: '5:12', s: 'Assessed', sub: '08 May 2025, 09:14', u: '12 May 2025, 10:31', data: { score: 86, minus: 2, feedback: 'Confident phrasing throughout. Tempo control in section B was particularly strong; watch dynamic shading at bar 32.', comments: 'Recommend for finals.' } },
{ id: 'p3', n: "Adi, Citra, Bayu", t: 'Group', c: 'Professional', song: 'Bohemian Rhapsody', d: '6:45', s: 'Pending', sub: '07 May 2025, 11:08', u: null, data: null, members: ['Adi Wirawan', 'Citra Lestari', 'Bayu Saputra', 'Maya Indah'] },
{ id: 'p4', n: 'Citra Dewi', t: 'Individual', c: 'Primary', song: 'Twinkle Twinkle', d: '2:10', s: 'Assessed', sub: '06 May 2025, 19:55', u: '11 May 2025, 14:20', data: { score: 78, minus: 0, feedback: 'Clean intonation, steady tempo. Could vary articulation more in repeated phrases.', comments: '' } },
{ id: 'p5', n: "Rini, Joko, Lina", t: 'Group', c: 'Junior', song: 'Canon in D', d: '4:33', s: 'Pending', sub: '08 May 2025, 14:30', u: null, data: null, members: ['Rini Pertiwi', 'Joko Saputra', 'Lina Hidayat'] },
{ id: 'p6', n: 'Dito Mahendra', t: 'Individual', c: 'Professional', song: 'Moonlight Sonata', d: '7:02', s: 'Assessed', sub: '05 May 2025, 10:02', u: '10 May 2025, 09:15', data: { score: 92, minus: 1, feedback: 'Outstanding control of dynamics in the third movement. Pedaling subtle and intentional.', comments: 'Top of the class for this cycle.' } },
{ id: 'p7', n: 'Putri Ayu', t: 'Individual', c: 'Others', song: 'My Heart Will Go On', d: '4:18', s: 'Pending', sub: '08 May 2025, 17:21', u: null, data: null },
{ id: 'p8', n: "Sinta, Eko, Dewi", t: 'Group', c: 'Primary', song: 'You Are My Sunshine', d: '3:55', s: 'Pending', sub: '06 May 2025, 13:09', u: null, data: null, members: ['Sinta Maharani', 'Eko Prasetyo', 'Dewi Anggraini'] },
{ id: 'p9', n: 'Rangga Adi', t: 'Individual', c: 'Junior', song: 'Prelude in C', d: '2:48', s: 'Pending', sub: '08 May 2025, 18:00', u: null, data: null },
{ id: 'p10', n: "Bagus, Nadia, Reza", t: 'Group', c: 'Others', song: 'Hallelujah', d: '5:30', s: 'Pending', sub: '07 May 2025, 21:14', u: null, data: null, members: ['Bagus Wicaksono', 'Nadia Putri', 'Reza Mahendra'] },
{ id: 'p11', n: 'Mira Anjani', t: 'Individual', c: 'Professional', song: 'La Campanella', d: '4:55', s: 'Assessed', sub: '04 May 2025, 09:48', u: '09 May 2025, 16:02', data: { score: 88, minus: 0, feedback: 'Technically secure throughout. Octave passages crisp; consider broader rubato in the central episode.', comments: '' } },
{ id: 'p12', n: 'Bayu Mahendra', t: 'Individual', c: 'Primary', song: 'Ode to Joy', d: '2:35', s: 'Pending', sub: '08 May 2025, 12:50', u: null, data: null },
{ id: 'p13', n: 'Kirana Sari', t: 'Individual', c: 'Junior', song: 'Arabesque No. 1', d: '4:10', s: 'Pending', sub: '07 May 2025, 15:33', u: null, data: null },
{ id: 'p14', n: "Ayu, Doni, Ines, Galang", t: 'Group', c: 'Junior', song: 'Lean on Me', d: '3:42', s: 'Pending', sub: '08 May 2025, 08:21', u: null, data: null, members: ['Ayu Lestari', 'Doni Saputra', 'Ines Hartono', 'Galang Pratama'] },
{ id: 'p15', n: 'Tegar Wibowo', t: 'Individual', c: 'Professional', song: 'Liebestraum No. 3', d: '4:48', s: 'Assessed', sub: '05 May 2025, 11:30', u: '10 May 2025, 17:48', data: { score: 81, minus: 1, feedback: 'Lovely singing tone in the opening. Voicing in the cadenza became muddied — practice voicing the inner melody.', comments: '' } }];


const fmtNow = () => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ============================================================
// SHARED CHROME
// ============================================================
const Brand = ({ onClick }) =>
<a className="brand" onClick={onClick}>
    <img src={window.__resources.apcLogo} alt="APC" className="brand-logo-img" />
  </a>;


const TopNav = ({ onSignOut, onBrand }) =>
<div className="nav">
    <Brand onClick={onBrand} />
    <div className="row" style={{ gap: 12 }}>
      <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.3 }}>
        <div style={{ fontWeight: 500 }}>Sari Rahayu</div>
        <div style={{ color: 'var(--ink-3)', fontSize: 11 }}>Adjudicator</div>
      </div>
      <div className="avatar">SR</div>
      <button className="btn sm ghost" onClick={onSignOut} title="Sign out">
        <Icon id="out" /> Sign out
      </button>
    </div>
  </div>;


// ============================================================
// LOGIN SCREEN
// ============================================================
const Login = ({ onSignIn }) => {
  const [email, setEmail] = useState('teacher@school.edu');
  const [pw, setPw] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e?.preventDefault();
    if (!email.trim() || !pw.trim()) {
      setErr('Please fill in all required fields.');
      return;
    }
    setErr('');
    onSignIn();
  };

  return (
    <div className="screen login">
      <div className="login-art">
        <img src={window.__resources.apcStage} alt="A Piano Concerto Series performance" />
      </div>

      <div className="login-form-wrap">
        <div>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <img
              src={window.__resources.apcLogo}
              alt="A Piano Concerto Series"
              style={{ width: 280, maxWidth: '90%', height: 'auto', display: 'block', margin: '0 auto' }} />
            <div className="label" style={{ marginTop: 14 }}>teacher portal · sign in</div>
          </div>

          <form className="box" style={{ padding: 22 }} onSubmit={submit}>
            {err &&
            <div className="banner err" style={{ marginBottom: 14 }}>
                <Icon id="warn" size={16} className="icon" />
                <div>{err}</div>
              </div>
            }

            <label className="label" style={{ marginBottom: 6 }}>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => {setEmail(e.target.value);if (err) setErr('');}}
              placeholder="you@school.edu"
              autoFocus />

            <label className="label" style={{ marginTop: 14, marginBottom: 6, display: 'block' }}>Password</label>
            <div className="input-group">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => {setPw(e.target.value);if (err) setErr('');}}
                placeholder="••••••••" />

              <button type="button" className="iconbtn" onClick={() => setShowPw((s) => !s)} title={showPw ? 'Hide' : 'Show'}>
                <Icon id={showPw ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>

            <button type="submit" className="btn primary lg" style={{ width: '100%', marginTop: 18 }}>
              Sign in <Icon id="arrow-r" size={14} />
            </button>

            <div className="row" style={{ margin: '16px 0 14px', gap: 10 }}>
              <div className="rule grow" style={{ margin: 0 }} />
              <span className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>or</span>
              <div className="rule grow" style={{ margin: 0 }} />
            </div>

            <button type="button" className="btn lg" style={{ width: '100%' }} onClick={onSignIn}>
              <Icon id="google" size={16} /> Continue with Google
            </button>
          </form>

          <div className="label" style={{ textAlign: 'center', marginTop: 16, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
            By signing in you agree to our terms · privacy
          </div>
        </div>
      </div>
    </div>);

};

// ============================================================
// DASHBOARD
// ============================================================
const StatCard = ({ label, value, tone, delta }) =>
<div className={`stat ${tone || ''}`}>
    <div className="label">{label}</div>
    <div className="num" style={{ marginTop: 8 }}>{value}</div>
    {delta && <div className="delta">{delta}</div>}
  </div>;


const PAGE_SIZE = 10;
const CATEGORIES = ['All', 'Primary', 'Junior', 'Professional', 'Others'];

const Dashboard = ({ participants, onOpen, onSignOut, deadline }) => {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [stat, setStat] = useState('All');
  const [page, setPage] = useState(1);

  const totals = useMemo(() => ({
    total: participants.length,
    pending: participants.filter((p) => p.s === 'Pending').length,
    assessed: participants.filter((p) => p.s === 'Assessed').length
  }), [participants]);

  // Pending count per category — drives the tab badges
  const pendingByCat = useMemo(() => {
    const out = { All: 0 };
    for (const c of CATEGORIES) out[c] = 0;
    for (const p of participants) {
      if (p.s !== 'Pending') continue;
      out.All += 1;
      out[p.c] = (out[p.c] || 0) + 1;
    }
    return out;
  }, [participants]);

  // Filter then sort: Pending first (by submission date asc — oldest waiting longest),
  // then Assessed (by last updated desc).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = participants.filter((p) => {
      if (q && !(p.n.toLowerCase().includes(q) || p.song.toLowerCase().includes(q))) return false;
      if (cat !== 'All' && p.c !== cat) return false;
      if (stat !== 'All' && p.s !== stat) return false;
      return true;
    });
    list.sort((a, b) => {
      if (a.s !== b.s) return a.s === 'Pending' ? -1 : 1;
      if (a.s === 'Pending') return (a.sub || '').localeCompare(b.sub || '');
      return (b.u || '').localeCompare(a.u || '');
    });
    return list;
  }, [participants, search, cat, stat]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp page when filters change
  useEffect(() => {if (page > pageCount) setPage(1);}, [pageCount, page]);
  // Reset to first page when filters change
  useEffect(() => {setPage(1);}, [search, cat, stat]);

  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <TopNav onSignOut={onSignOut} />

      <div style={{ padding: '20px 28px', maxWidth: 1400, width: '100%', margin: '0 auto', flex: 1 }}>
        {/* Header */}
        <div className="row between" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Assessments</div>
            <div className="label" style={{ marginTop: 4, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
              2026 spring cycle · {totals.total} participants
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {deadline === 'normal' &&
            <span className="pill" style={{ padding: '5px 10px', fontSize: 12 }}>
                <Icon id="clock" size={12} /> Deadline 18 May 2026 | 23:59
              </span>
            }
          </div>
        </div>

        {/* Deadline warning banners */}
        {deadline === 'h7' &&
        <div className="banner" style={{ marginBottom: 18 }}>
            <Icon id="warn" size={16} className="icon" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Scoring deadline is ending in 7 days.</div>
              <div style={{ fontSize: 12 }}>Deadline 18 May 2026, 23:59 · finish any remaining assessments before time runs out.</div>
            </div>
          </div>
        }
        {deadline === 'h1' &&
        <div className="banner" style={{ marginBottom: 18 }}>
            <Icon id="warn" size={16} className="icon" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Scoring deadline is ending in several hours.</div>
              <div style={{ fontSize: 12 }}>You won't be able to access or give any score after the deadline. Deadline today, 18 May 2026, 23:59.</div>
            </div>
          </div>
        }

        {/* Summary stats */}
        <div className="row" style={{ gap: 14, marginBottom: 18 }}>
          <StatCard label="Total Participants" value={totals.total} delta="across all categories" />
          <StatCard label="Pending Assessments" value={totals.pending} tone="warn" delta="needs your attention" />
          <StatCard label="Assessed" value={totals.assessed} tone="ok" delta="completed this cycle" />
        </div>

        {/* Category tabs */}
        <div className="tabs">
          {CATEGORIES.map((c) => {
            const count = pendingByCat[c] || 0;
            const active = cat === c;
            return (
              <button
                key={c}
                className={`tab ${active ? 'active' : ''}`}
                onClick={() => setCat(c)}>
                <span>{c}</span>
                {count > 0 && <span className={`tab-count ${active ? 'active' : ''}`}>{count}</span>}
              </button>);

          })}
        </div>

        {/* Filters row */}
        <div className="box" style={{ padding: 12, marginBottom: 14 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: '1 1 280px', maxWidth: 380 }}>
              <Icon id="search" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by participant or song…" />
              
              {search &&
              <button className="iconbtn" onClick={() => setSearch('')} title="Clear">
                  <Icon id="x" size={14} />
                </button>
              }
            </div>
            <select className="select" style={{ width: 160 }} value={stat} onChange={(e) => setStat(e.target.value)}>
              <option>All statuses</option>
              <option>Pending</option>
              <option>Assessed</option>
            </select>
            <div className="grow" />
            <span className="label" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
              {filtered.length === 0 ? 'no results' :
              filtered.length === participants.length ? `${filtered.length} results` :
              `${filtered.length} of ${participants.length}`}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Participant / Group</th>
                <th>Category</th>
                <th>Song</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Last updated</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 &&
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--ink-3)' }}>
                  No participants match your filters.
                </td></tr>
              }
              {pageRows.map((p) =>
              <tr key={p.id} className={p.s === 'Assessed' ? 'muted' : ''}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="avatar sm">{initials(p.n)}</span>
                      <div>
                        <div className="name" style={{ fontWeight: 600, fontSize: 13 }}>{p.n}</div>
                        <div className="label" style={{ fontSize: 10, marginTop: 2 }}>{p.t}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.c}</td>
                  <td><Icon id="music" size={11} style={{ color: 'var(--ink-3)', marginRight: 4 }} /> {p.song}</td>
                  <td><span style={{ fontFamily: 'var(--type)', fontSize: 12 }}>{p.d}</span></td>
                  <td>
                    <span className={`pill dot ${p.s === 'Pending' ? 'warn' : 'ok'}`}>{p.s}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--type)', fontSize: 11, color: 'var(--ink-3)' }}>{p.sub || '—'}</td>
                  <td style={{ fontFamily: 'var(--type)', fontSize: 11, color: 'var(--ink-3)' }}>{p.u || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.s === 'Pending' ?
                  <button className="btn sm primary" onClick={() => onOpen(p.id, 'edit')}>
                        Assess <Icon id="arrow-r" size={12} />
                      </button> :

                  <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn sm ghost" onClick={() => onOpen(p.id, 'view')}>View</button>
                        <button className="btn sm" onClick={() => onOpen(p.id, 'edit')} title="Edit assessment">
                          <Icon id="edit" size={12} /> Edit
                        </button>
                      </div>
                  }
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {filtered.length > 0 &&
          <div className="pagination">
              <span className="label" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn sm ghost" onClick={() => setPage(1)} disabled={page === 1} title="First">«</button>
                <button className="btn sm ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <Icon id="arrow-l" size={12} /> Prev
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) =>
              <button
                key={n}
                className={`btn sm ${page === n ? 'primary' : 'ghost'}`}
                style={{ minWidth: 32 }}
                onClick={() => setPage(n)}>
                    {n}
                  </button>
              )}
                <button className="btn sm ghost" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>
                  Next <Icon id="arrow-r" size={12} />
                </button>
                <button className="btn sm ghost" onClick={() => setPage(pageCount)} disabled={page === pageCount} title="Last">»</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>);

};

// ============================================================
// ASSESSMENT FORM (Variant B — focus mode w/ hero slider)
// ============================================================
const ScoreSlider = ({ value, onChange, disabled }) => {
  const ref = useRef(null);
  const setFromX = useCallback((clientX) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(pct * 100));
  }, [onChange, disabled]);

  const onMouseDown = (e) => {
    if (disabled) return;
    setFromX(e.clientX);
    const move = (ev) => setFromX(ev.clientX);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const onKey = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {e.preventDefault();onChange(Math.min(100, value + 1));}
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {e.preventDefault();onChange(Math.max(0, value - 1));}
    if (e.key === 'PageUp') {e.preventDefault();onChange(Math.min(100, value + 10));}
    if (e.key === 'PageDown') {e.preventDefault();onChange(Math.max(0, value - 10));}
    if (e.key === 'Home') {e.preventDefault();onChange(0);}
    if (e.key === 'End') {e.preventDefault();onChange(100);}
  };

  return (
    <div>
      <div
        ref={ref}
        className="scoreslider"
        onMouseDown={onMouseDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}
        onKeyDown={onKey}
        style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <div className="fill" style={{ width: `${value}%` }} />
        <div className="handle" style={{ left: `${value}%` }} />
      </div>
      <div className="row between" style={{ marginTop: 6, fontFamily: 'var(--type)', fontSize: 10, color: 'var(--ink-4)' }}>
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </div>);

};

// ============================================================
// MEDIA MODAL (sheet music / performance video)
// ============================================================
const MediaModal = ({ kind, participant, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {if (e.key === 'Escape') onClose();};
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isSheet = kind === 'sheet';
  const title = isSheet ? 'Sheet music' : 'Watch Performance';
  const subtitle = `${participant.song} · ${participant.n}`;

  return (
    <div className="ovl" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
        style={{
          background: 'var(--paper-3)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
          width: 'min(880px, 92vw)',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,.18), 0 4px 12px rgba(0,0,0,.06)',
          animation: 'pop .18s cubic-bezier(.2,.8,.3,1.1)'
        }}>
        {/* Header */}
        <div className="row between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 6,
              background: 'var(--paper-2)', color: 'var(--ink-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon id={isSheet ? 'pdf' : 'play'} size={16} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{subtitle}</div>
            </div>
          </div>
          <button className="iconbtn-bare" onClick={onClose} title="Close" aria-label="Close">
            <Icon id="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflow: 'auto', flex: 1, background: 'var(--paper-2)' }}>
          {isSheet ?
          <div
            className="box"
            style={{
              width: 'min(560px, 100%)',
              aspectRatio: '8.5 / 11',
              margin: '0 auto',
              position: 'relative',
              background: 'var(--paper-3)',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', inset: 0, padding: '12% 12%' }}>
                <div style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', letterSpacing: '-0.01em' }}>
                  {participant.song}
                </div>
                <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--ink-3)', marginTop: 4, marginBottom: 26 }}>
                  arr. for performance · APCS 2026
                </div>
                {Array.from({ length: 7 }).map((_, i) =>
              <div key={i} style={{ marginBottom: 22 }}>
                    {[0, 1, 2, 3, 4].map((j) =>
                <div key={j} style={{ height: 1, background: 'var(--ink-3)', opacity: .55, marginTop: j === 0 ? 0 : 5 }} />
                )}
                  </div>
              )}
              </div>
              <div className="pill" style={{ position: 'absolute', top: 10, right: 10 }}>Page 1 / 4</div>
            </div> :

          <div
            style={{
              aspectRatio: '16 / 9',
              background: '#101113',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
              position: 'absolute', inset: 0,
              background:
              'radial-gradient(circle at 30% 40%, rgba(255,255,255,.06), transparent 50%),' +
              'radial-gradient(circle at 70% 70%, rgba(255,255,255,.04), transparent 60%)'
            }} />
              <div style={{ textAlign: 'center', color: '#e6e7ea', position: 'relative' }}>
                <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,.12)',
                border: '1px solid rgba(255,255,255,.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12, cursor: 'pointer'
              }}>
                  <Icon id="play" size={28} style={{ color: '#fff', marginLeft: 4 }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{participant.song}</div>
                <div style={{ fontSize: 12, opacity: .65, marginTop: 4 }}>
                  {participant.n} · {participant.d}
                </div>
              </div>
              <div className="pill" style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,.5)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>
                <Icon id="clock" size={11} /> {participant.d}
              </div>
            </div>
          }
        </div>

        {/* Footer */}
        <div className="row" style={{ padding: '12px 18px', borderTop: '1px solid var(--rule)', background: 'var(--paper-3)', justifyContent: 'flex-end', gap: 8 }}>
            {isSheet ?
          <button className="btn sm"><Icon id="pdf" size={12} /> Open PDF</button> :
          <button className="btn sm"><Icon id="out" size={12} /> Open in new tab</button>}
            <button className="btn sm primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>);

};

const AssessmentForm = ({ participant, locked, pendingQueue, onBack, onSave, onNext }) => {
  // initial values: from saved data if present, else empty (placeholder shows '0')
  const init = participant.data || { score: '', feedback: '', comments: '' };
  const [score, setScore] = useState(init.score);
  const [feedback, setFeedback] = useState(init.feedback);
  const [comments, setComments] = useState(init.comments);

  // reset when participant changes
  useEffect(() => {
    const i = participant.data || { score: '', feedback: '', comments: '' };
    setScore(i.score);setFeedback(i.feedback);setComments(i.comments);
  }, [participant.id]);

  // numeric view for save — empty string treated as 0
  const scoreN = score === '' ? 0 : Number(score);
  const dirty = !locked && (
  score !== init.score ||
  feedback !== init.feedback || comments !== init.comments);


  const [confirmLeave, setConfirmLeave] = useState(false);
  const [media, setMedia] = useState(null); // 'sheet' | 'video' | null
  const handleBack = () => {
    if (dirty) setConfirmLeave(true);else
    onBack();
  };

  const handleNext = () => {
    if (!pendingQueue) return;
    if (dirty) {
      // For prototype simplicity: just discard and move on after warning
      if (!window.confirm('You have unsaved changes. Move to next without saving?')) return;
    }
    onNext();
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <TopNav onSignOut={() => {/* handled by host */}} onBrand={handleBack} />

      {/* Breadcrumb */}
      <div className="crumbs">
        <a onClick={handleBack}>Dashboard</a>
        <span className="sep">/</span>
        <span className="current">{participant.n}</span>
        <div className="grow" />
        {locked && <span className="pill ok dot">Assessed {participant.u}</span>}
      </div>

      {/* Compact info strip */}
      <div className="row between" style={{ padding: '14px 28px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-3)', gap: 18, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="avatar lg">{initials(participant.n)}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>{participant.n}</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <span className="pill">
                <Icon id={participant.t === 'Group' ? 'people' : 'user'} size={11} />
                {participant.t}{participant.t === 'Group' && participant.members ? ` · ${participant.members.length} members` : ''}
              </span>
              <span className="pill">{participant.c}</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 16, fontSize: 13, color: 'var(--ink-2)', flexWrap: 'wrap' }}>
          <span><Icon id="music" size={13} style={{ color: 'var(--ink-3)' }} /> {participant.song}</span>
          <span><Icon id="clock" size={13} style={{ color: 'var(--ink-3)' }} /> {participant.d}</span>
          <a className="link" onClick={() => setMedia('sheet')}><Icon id="pdf" size={13} /> Sheet music</a>
          <a className="link" onClick={() => setMedia('video')}><Icon id="play" size={13} /> Watch Performance</a>
          {participant.t === 'Group' && participant.members &&
          <details style={{ position: 'relative' }}>
              <summary className="btn sm ghost" style={{ listStyle: 'none' }}>
                Members ({participant.members.length}) <Icon id="chev-d" size={12} />
              </summary>
              <div className="box" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', padding: 12, minWidth: 200, zIndex: 4, boxShadow: '0 8px 20px rgba(0,0,0,.08)' }}>
                {participant.members.map((m, i) =>
              <div key={i} className="row" style={{ gap: 8, padding: '4px 0', fontSize: 12 }}>
                    <span className="avatar sm">{initials(m)}</span>
                    {m}
                  </div>
              )}
              </div>
            </details>
          }
        </div>
      </div>

      {/* Form body */}
      <div style={{ padding: '24px 32px', maxWidth: 980, margin: '0 auto', width: '100%', flex: 1 }}>
        {locked &&
        <div className="banner" style={{ marginBottom: 18 }}>
            <Icon id="lock" size={16} className="icon" />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>This assessment is view-only.</div>
              <div style={{ fontSize: 12 }}>The event deadline has passed. Submitted on {participant.u}.</div>
            </div>
          </div>
        }

        {/* Scoring */}
        <div className="box" style={{ padding: 24 }}>
          <div className="row" style={{ gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label className="label" htmlFor="score-input">Overall score</label>
              <div className="row" style={{ alignItems: 'center', gap: 10, marginTop: 8 }}>
                <input
                  id="score-input"
                  type="number"
                  className="input score-input"
                  min={0} max={100} step={1}
                  value={score}
                  placeholder="0"
                  disabled={locked}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {setScore('');return;}
                    const v = parseInt(raw, 10);
                    if (!isNaN(v)) setScore(Math.max(0, Math.min(100, v)));
                  }}
                  style={{ width: 120, fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />

                <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>/ 100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 14, marginTop: 14, alignItems: 'stretch' }}>
          <div className="box grow" style={{ padding: 16 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="label">Performance feedback</span>
              <span className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>{feedback.length} / 600</span>
            </div>
            <textarea
              className="textarea"
              value={feedback}
              disabled={locked}
              maxLength={600}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Notes on tone, dynamics, expression, technical accuracy…"
              style={{ minHeight: 100, border: 'none', padding: 0, background: 'transparent' }} />
            
          </div>
          <div className="box grow" style={{ padding: 16 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="label">Notes for APCS team</span>
              <span className="label" style={{ textTransform: 'none', letterSpacing: 0 }}>optional</span>
            </div>
            <textarea
              className="textarea"
              value={comments}
              disabled={locked}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Anything else for the APCS team…"
              style={{ minHeight: 100, border: 'none', padding: 0, background: 'transparent' }} />
            
          </div>
        </div>

        {/* Action bar */}
        <div className="row between box" style={{ padding: '12px 16px', marginTop: 16, background: 'var(--paper-2)' }}>
          <button className="btn ghost" onClick={handleBack}>
            <Icon id="arrow-l" size={13} /> {locked ? 'Back to dashboard' : 'Back'}
          </button>
          <div className="row" style={{ gap: 10 }}>
            {!locked && pendingQueue &&
            <span className="label" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                {pendingQueue.position} of {pendingQueue.total} pending
              </span>
            }
            {!locked &&
            <button
              className="btn"
              onClick={handleNext}
              disabled={!pendingQueue || pendingQueue.position === pendingQueue.total}>
                Next participant <Icon id="arrow-r" size={13} />
              </button>
            }
            {!locked &&
            <button className="btn primary" onClick={() => onSave({ score: scoreN, feedback, comments })}>
                <Icon id="check" size={14} /> Save assessment
              </button>
            }
          </div>
        </div>
      </div>

      {/* Media modal (sheet music / performance video) */}
      {media &&
      <MediaModal kind={media} participant={participant} onClose={() => setMedia(null)} />
      }

      {/* Unsaved changes confirm dialog */}
      {confirmLeave &&
      <div className="ovl" onClick={() => setConfirmLeave(false)}>
          <div className="modal left" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--warn-bg)', color: 'var(--warn)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <Icon id="warn" size={18} />
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  You have unsaved changes
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>
                  Leaving this page now will discard your draft assessment for {participant.n}.
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button className="btn" onClick={() => setConfirmLeave(false)}>Cancel</button>
              <button className="btn danger" onClick={() => {setConfirmLeave(false);onBack();}}>Leave anyway</button>
            </div>
          </div>
        </div>
      }
    </div>);

};

// ============================================================
// SUCCESS MODAL (Variant A — overlay on form card)
// ============================================================
const SuccessModal = ({ participant, score, onBack }) =>
<div className="ovl">
    <div className="modal">
      <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: 'var(--ok-bg)', color: 'var(--ok)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 14
    }}>
        <Icon id="check" size={32} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
        Assessment saved!
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>
        {participant.n}'s assessment has been submitted successfully.
        {score != null && <> Score: <b>{score}</b>.</>}
      </div>
      <button className="btn primary lg" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
        Back to dashboard <Icon id="arrow-r" size={13} />
      </button>
    </div>
  </div>;


// ============================================================
// APP — ROUTER + STATE
// ============================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "deadlineState": "normal"
} /*EDITMODE-END*/;

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('login'); // 'login' | 'dashboard' | 'form'
  const [participants, setParticipants] = useState(SEED);
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('edit'); // 'edit' | 'view'
  const [success, setSuccess] = useState(null); // { participantId, score } | null

  const active = useMemo(() => participants.find((p) => p.id === activeId), [participants, activeId]);

  const pendingIds = useMemo(() => participants.filter((p) => p.s === 'Pending').map((p) => p.id), [participants]);
  const pendingQueue = useMemo(() => {
    if (!active || mode !== 'edit') return null;
    const idx = pendingIds.indexOf(active.id);
    if (idx === -1) return null;
    return { position: idx + 1, total: pendingIds.length };
  }, [active, mode, pendingIds]);

  const goTo = (s) => setScreen(s);
  const open = (id, m) => {setActiveId(id);setMode(m);setScreen('form');};

  const save = ({ score, feedback, comments }) => {
    setParticipants((prev) => prev.map((p) =>
    p.id === activeId ?
    { ...p, s: 'Assessed', u: fmtNow(), data: { score, feedback, comments } } :
    p
    ));
    setSuccess({ participantId: activeId, score });
  };

  const dismissSuccess = () => {
    setSuccess(null);
    setActiveId(null);
    setScreen('dashboard');
  };

  const goNext = () => {
    if (!active) return;
    const idx = pendingIds.indexOf(active.id);
    if (idx === -1 || idx >= pendingIds.length - 1) return;
    setActiveId(pendingIds[idx + 1]);
    setMode('edit');
  };

  return (
    <>
      {screen === 'login' &&
      <Login onSignIn={() => goTo('dashboard')} />
      }
      {screen === 'dashboard' &&
      <Dashboard
        participants={participants}
        onOpen={open}
        onSignOut={() => goTo('login')}
        deadline={t.deadlineState} />

      }
      {screen === 'form' && active &&
      <AssessmentForm
        key={active.id}
        participant={active}
        locked={mode === 'view'}
        pendingQueue={pendingQueue}
        onBack={() => {setActiveId(null);goTo('dashboard');}}
        onSave={save}
        onNext={goNext} />

      }

      {success && active &&
      <SuccessModal
        participant={active}
        score={success.score}
        onBack={dismissSuccess} />

      }

      <TweaksPanel title="Tweaks">
        <TweakSection label="Scenarios">
          <TweakRadio
            label="Deadline state"
            value={t.deadlineState}
            options={[
            { value: 'normal', label: 'Normal' },
            { value: 'h7', label: 'H−7' },
            { value: 'h1', label: 'H−1' }]
            }
            onChange={(v) => setTweak('deadlineState', v)} />
        </TweakSection>
      </TweaksPanel>
    </>);

};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);