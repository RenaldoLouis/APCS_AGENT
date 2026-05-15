// APCS Scoring Platform — sketchy wireframes
// 5 screens × 2 variants, laid out in a DesignCanvas

const { useState, useMemo } = React;

// ---- shared helpers ----
const Icon = ({id, size=14, style={}}) => (
  <svg width={size} height={size} style={{display:'inline-block', verticalAlign:'-2px', ...style}} aria-hidden="true">
    <use href={`#i-${id}`} />
  </svg>
);

const Annot = ({children, top, left, right, bottom, w=160, rotate=-2, arrow=null}) => (
  <div className="annot" style={{top, left, right, bottom, width:w, transform:`rotate(${rotate}deg)`}}>
    {arrow}
    <div>{children}</div>
  </div>
);

// curved arrow svg from a point. Placed inside an Annot.
const CurveArrow = ({d, w=120, h=60, dx=0, dy=0}) => (
  <svg width={w} height={h} style={{position:'absolute', left:dx, top:dy, overflow:'visible'}}>
    <path d={d} fill="none" stroke="#b14a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M -6 -4 L 0 0 L -6 4" transform={`translate(${0},${0})`} fill="none" stroke="#b14a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'none'}}/>
  </svg>
);

// ---- screen frame chrome ----
const Brand = () => (
  <div className="brand">
    <span className="logo hand">A</span>
    <span>APCS Scoring</span>
  </div>
);

const TopNav = ({onSignOut}) => (
  <div className="nav">
    <Brand/>
    <div className="row" style={{gap:10}}>
      <span className="hand" style={{fontSize:14}}>Sari Rahayu</span>
      <span className="sk-avatar sm">SR</span>
      <button className="sk-btn small ghost" onClick={onSignOut}>Sign out</button>
    </div>
  </div>
);

// ============================================================
// SCREEN 1 — LOGIN
// ============================================================

// Variant A — classic centered card
const LoginA = () => {
  const [pw, setPw] = useState(true);
  return (
    <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--paper)', padding:24, position:'relative'}}>
      <div style={{width:340}}>
        <div style={{textAlign:'center', marginBottom:20}}>
          <div style={{
            width:48, height:48, background:'var(--ink)', color:'var(--paper)',
            borderRadius:10,
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:22, fontWeight:700, letterSpacing:'-0.02em',
          }}>A</div>
          <div className="hand" style={{fontSize:20, marginTop:10, fontWeight:600, letterSpacing:'-0.01em'}}>APCS Scoring Platform</div>
          <div className="label" style={{marginTop:4}}>teacher portal · sign in</div>
        </div>

        <div className="sk-box" style={{padding:20}}>
          <div className="label" style={{marginBottom:6}}>Email</div>
          <div className="sk-input">teacher@school.edu</div>

          <div className="label" style={{marginTop:14, marginBottom:6}}>Password</div>
          <div className="sk-input" style={{justifyContent:'space-between'}}>
            <span>{pw ? '••••••••••' : 'password123'}</span>
            <Icon id={pw ? 'eye' : 'eye-off'} size={14} />
          </div>
          <div style={{textAlign:'right', marginTop:6}}>
            <span className="label" style={{textDecoration:'underline', cursor:'pointer'}}>Forgot password?</span>
          </div>

          <button className="sk-btn primary" style={{width:'100%', marginTop:16}}>Sign in →</button>

          <div className="row" style={{margin:'14px 0', gap:8}}>
            <div className="sk-line thin grow"></div>
            <span className="label">or</span>
            <div className="sk-line thin grow"></div>
          </div>

          <button className="sk-btn" style={{width:'100%'}}>
            <Icon id="google" size={14} /> Continue with Google
          </button>
        </div>

        <div className="label" style={{textAlign:'center', marginTop:14, color:'var(--ink-3)'}}>
          By signing in you agree to terms · privacy
        </div>
      </div>

      <Annot top={28} right={28} w={170} rotate={3}>
        Centered card. Familiar &amp;<br/>safe — fastest to ship.
      </Annot>
    </div>
  );
};

// Variant B — split-screen brand left, form right
const LoginB = () => (
  <div style={{height:'100%', display:'grid', gridTemplateColumns:'1.1fr 1fr', background:'var(--paper)', position:'relative'}}>
    {/* Left brand panel */}
    <div style={{padding:'40px 44px', borderRight:'1.5px dashed var(--ink)', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
      <Brand/>
      <div>
        <div className="hand" style={{fontSize:38, lineHeight:1.05, fontWeight:700, letterSpacing:'-0.5px'}}>
          Score with<br/>
          <span className="hi">clarity.</span><br/>
          Submit with<br/>confidence.
        </div>
        <div className="sub" style={{fontFamily:'var(--print)', fontSize:13, marginTop:14, color:'var(--ink-2)', maxWidth:300}}>
          Daily-use platform for music adjudicators. Built for the APCS event cycle.
        </div>
      </div>
      <div className="label">v1.0 · 2026 cycle</div>
    </div>

    {/* Right form */}
    <div style={{padding:'48px 56px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div className="label">welcome back</div>
      <div className="hand" style={{fontSize:30, fontWeight:700, marginTop:6, marginBottom:18}}>Sign in to your account</div>

      <div className="label" style={{marginBottom:6}}>Email address</div>
      <div className="sk-input" style={{marginBottom:14}}>teacher@school.edu</div>

      <div className="row between" style={{marginBottom:6}}>
        <span className="label">Password</span>
        <span className="label" style={{textDecoration:'underline', cursor:'pointer'}}>Forgot?</span>
      </div>
      <div className="sk-input" style={{justifyContent:'space-between', marginBottom:18}}>
        <span>••••••••••</span><Icon id="eye"/>
      </div>

      <button className="sk-btn primary" style={{width:'100%'}}>Sign in →</button>

      <div className="row" style={{margin:'18px 0', gap:8}}>
        <div className="sk-line thin grow"></div>
        <span className="label">or continue with</span>
        <div className="sk-line thin grow"></div>
      </div>
      <button className="sk-btn" style={{width:'100%'}}><Icon id="google"/> Google</button>

      <Annot bottom={36} right={36} w={170} rotate={-3}>
        Split layout — room for<br/>brand voice + future<br/>announcements.
      </Annot>
    </div>
  </div>
);

// ============================================================
// SCREEN 2 — DASHBOARD
// ============================================================

const PARTICIPANTS = [
  {n:'Andi Pratama',     t:'Individual', c:'Primary',      song:'Für Elise',          d:'3:24', s:'Pending'},
  {n:'Bela Nusantara',   t:'Individual', c:'Junior',       song:'Clair de Lune',      d:'5:12', s:'Submitted', u:'12 May 2025, 10:31'},
  {n:'Harmoni Ensemble', t:'Group',      c:'Professional', song:'Bohemian Rhapsody',  d:'6:45', s:'Pending'},
  {n:'Citra Dewi',       t:'Individual', c:'Primary',      song:'Twinkle Twinkle',    d:'2:10', s:'Submitted', u:'11 May 2025, 14:20'},
  {n:'Gema Suara Group', t:'Group',      c:'Junior',       song:'Canon in D',         d:'4:33', s:'Pending'},
  {n:'Dito Mahendra',    t:'Individual', c:'Professional', song:'Moonlight Sonata',   d:'7:02', s:'Submitted', u:'10 May 2025, 09:15'},
  {n:'Putri Ayu',        t:'Individual', c:'Others',       song:'My Heart Will Go On',d:'4:18', s:'Pending'},
  {n:'Nada Bersama',     t:'Group',      c:'Primary',      song:'You Are My Sunshine',d:'3:55', s:'Pending'},
];

const SummaryCard = ({label, value, accent}) => (
  <div className="sk-box" style={{padding:'14px 16px', flex:'1 1 0', minWidth:0}}>
    <div className="label">{label}</div>
    <div className="row" style={{alignItems:'baseline', gap:8, marginTop:4}}>
      <div className="hand" style={{fontSize:38, fontWeight:700, lineHeight:1}}>{value}</div>
      {accent && <span className={`sk-pill dot ${accent.tone}`}>{accent.text}</span>}
    </div>
  </div>
);

// Variant A — summary cards on top, dense table
const DashboardA = () => (
  <div style={{height:'100%', overflow:'hidden', display:'flex', flexDirection:'column', background:'var(--paper)', position:'relative'}}>
    <TopNav/>
    <div style={{padding:'18px 24px', overflow:'auto'}}>

      <div className="row between" style={{marginBottom:14}}>
        <div>
          <div className="hand" style={{fontSize:26, fontWeight:700}}>Assessments</div>
          <div className="label">2026 spring cycle · all participants</div>
        </div>
        <div className="row" style={{gap:8}}>
          <span className="sk-pill"><Icon id="clock"/> Deadline 18 May</span>
        </div>
      </div>

      <div className="row" style={{gap:14, marginBottom:18}}>
        <SummaryCard label="Total Participants" value="8" />
        <SummaryCard label="Pending"  value="5" accent={{tone:'warn', text:'needs you'}} />
        <SummaryCard label="Submitted" value="3" accent={{tone:'ok', text:'done'}} />
      </div>

      {/* Filter bar */}
      <div className="sk-box" style={{padding:10, marginBottom:14}}>
        <div className="row" style={{gap:10}}>
          <div className="sk-input grow" style={{maxWidth:340}}>
            <Icon id="search"/>
            <span className="ph">Search by participant or group…</span>
          </div>
          <div className="sk-input" style={{width:170, justifyContent:'space-between'}}>
            <span><span className="label" style={{marginRight:6}}>Category</span> All</span>
            <Icon id="chev"/>
          </div>
          <div className="sk-input" style={{width:160, justifyContent:'space-between'}}>
            <span><span className="label" style={{marginRight:6}}>Status</span> All</span>
            <Icon id="chev"/>
          </div>
          <div className="grow"/>
          <span className="label">8 results</span>
        </div>
      </div>

      <div className="sk-box" style={{padding:'4px 12px 8px'}}>
        <table className="sk-table">
          <thead>
            <tr>
              <th>Participant / Group</th>
              <th>Category</th>
              <th>Song</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Last updated</th>
              <th style={{textAlign:'right'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {PARTICIPANTS.map((p,i)=>(
              <tr key={i} className={p.s==='Submitted' ? 'muted' : ''}>
                <td>
                  <div className="row" style={{gap:8}}>
                    <span className="sk-avatar sm">{p.n.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>
                    <div>
                      <div style={{fontWeight:600}}>{p.n}</div>
                      <div className="label" style={{fontSize:10}}>{p.t}</div>
                    </div>
                  </div>
                </td>
                <td>{p.c}</td>
                <td>{p.song}</td>
                <td><Icon id="clock" size={11}/> {p.d}</td>
                <td>
                  <span className={`sk-pill dot ${p.s==='Pending'?'warn':'ok'}`}>{p.s}</span>
                </td>
                <td className="label" style={{fontFamily:'var(--type)', fontSize:11}}>{p.u || '—'}</td>
                <td style={{textAlign:'right'}}>
                  {p.s==='Pending'
                    ? <button className="sk-btn small primary">Assess →</button>
                    : <button className="sk-btn small ghost">View</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <Annot top={130} right={28} w={170} rotate={3}>
      Familiar table. Filters live<br/>on top — straightforward.
    </Annot>
  </div>
);

// Variant B — Kanban-ish: Pending column / Submitted column, no table
const DashboardB = () => {
  const pending   = PARTICIPANTS.filter(p=>p.s==='Pending');
  const submitted = PARTICIPANTS.filter(p=>p.s==='Submitted');

  const Card = ({p}) => (
    <div className="sk-box" style={{padding:12}}>
      <div className="row between" style={{marginBottom:6}}>
        <div className="row" style={{gap:8}}>
          <span className="sk-avatar sm">{p.n.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>
          <div>
            <div style={{fontWeight:600, fontSize:13}}>{p.n}</div>
            <div className="label" style={{fontSize:10}}>{p.t} · {p.c}</div>
          </div>
        </div>
        <span className={`sk-pill dot ${p.s==='Pending'?'warn':'ok'}`} style={{fontSize:10}}>{p.s}</span>
      </div>
      <div className="row between" style={{fontSize:12, color:'var(--ink-2)', marginTop:8}}>
        <span><Icon id="music" size={11}/> {p.song}</span>
        <span><Icon id="clock" size={11}/> {p.d}</span>
      </div>
      <div className="sk-line thin dash"></div>
      <div className="row between">
        <span className="label" style={{fontFamily:'var(--type)', fontSize:10}}>{p.u || 'not submitted'}</span>
        {p.s==='Pending'
          ? <button className="sk-btn small primary">Assess →</button>
          : <button className="sk-btn small ghost">View</button>}
      </div>
    </div>
  );

  return (
    <div style={{height:'100%', overflow:'hidden', display:'flex', flexDirection:'column', background:'var(--paper)', position:'relative'}}>
      <TopNav/>
      <div style={{padding:'18px 24px', overflow:'auto'}}>

        {/* Inline counters in the title row instead of cards */}
        <div className="row between" style={{marginBottom:14}}>
          <div>
            <div className="hand" style={{fontSize:28, fontWeight:700}}>
              <span className="hi">5</span> assessments waiting · <span style={{color:'var(--ink-3)'}}>3 done</span>
            </div>
            <div className="label">8 participants · 2026 spring cycle</div>
          </div>
          <div className="row" style={{gap:8}}>
            <div className="sk-input" style={{width:240}}><Icon id="search"/><span className="ph">Search…</span></div>
            <div className="sk-input" style={{width:130, justifyContent:'space-between'}}>All cats <Icon id="chev"/></div>
          </div>
        </div>

        <div className="row" style={{alignItems:'flex-start', gap:18}}>
          {/* Pending column */}
          <div style={{flex:'1 1 0'}}>
            <div className="row between" style={{marginBottom:10}}>
              <div className="row" style={{gap:8}}>
                <span className="sk-pill warn dot">Pending</span>
                <span className="hand" style={{fontSize:18, fontWeight:700}}>{pending.length}</span>
              </div>
              <span className="label">sort: deadline ↓</span>
            </div>
            <div className="col">{pending.map((p,i)=> <Card key={i} p={p}/>)}</div>
          </div>

          {/* Submitted column */}
          <div style={{flex:'1 1 0'}}>
            <div className="row between" style={{marginBottom:10}}>
              <div className="row" style={{gap:8}}>
                <span className="sk-pill ok dot">Submitted</span>
                <span className="hand" style={{fontSize:18, fontWeight:700}}>{submitted.length}</span>
              </div>
              <span className="label">sort: date ↓</span>
            </div>
            <div className="col">{submitted.map((p,i)=> <Card key={i} p={p}/>)}</div>
          </div>
        </div>
      </div>

      <Annot top={94} right={28} w={170} rotate={-3}>
        Two columns mirror the<br/>teacher's mental model:<br/><i>todo → done</i>.
      </Annot>
    </div>
  );
};

// ============================================================
// SCREEN 3 — ASSESSMENT FORM (editable)
// ============================================================

// Variant A — classic 2-col (form left, info sidebar right)
const FormA = ({score=82, minus=3, locked=false, showSuccess=false}) => {
  const final = Math.max(0, score - minus);
  const fillW = score; // 0-100
  return (
    <div style={{height:'100%', overflow:'hidden', display:'flex', flexDirection:'column', background:'var(--paper)', position:'relative'}}>
      <TopNav/>
      <div className="row between" style={{padding:'10px 24px', borderBottom:'1.5px dashed var(--ink)'}}>
        <div className="label">
          <span style={{textDecoration:'underline'}}>Dashboard</span> &nbsp;/&nbsp; Bela Nusantara
        </div>
        <div className="row" style={{gap:8}}>
          <button className="sk-btn small ghost"><Icon id="arrow-l"/> Back</button>
          {!locked && <button className="sk-btn small">Next participant →</button>}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18, padding:18, overflow:'auto', flex:1}}>
        {/* LEFT — form */}
        <div className="col" style={{gap:14}}>
          {locked && (
            <div className="sk-box" style={{background:'#fdeac8', padding:'10px 14px', borderColor:'var(--warn)'}}>
              <div className="row" style={{gap:10}}>
                <Icon id="lock"/>
                <div>
                  <div style={{fontWeight:700, fontSize:13}}>This assessment is view-only.</div>
                  <div className="label">The event deadline has passed. Submitted 12 May 2025, 10:31.</div>
                </div>
              </div>
            </div>
          )}

          <div className="sk-box" style={{padding:18}}>
            <div className="row" style={{gap:14}}>
              <span className="sk-avatar lg">BN</span>
              <div className="grow">
                <div className="hand" style={{fontSize:24, fontWeight:700}}>Bela Nusantara</div>
                <div className="row" style={{gap:6, marginTop:4}}>
                  <span className="sk-pill"><Icon id="user" size={11}/> Individual</span>
                  <span className="sk-pill">Junior</span>
                </div>
              </div>
            </div>

            <div className="sk-line dash"></div>

            <div className="row" style={{gap:14, alignItems:'flex-start'}}>
              <div style={{flex:'1 1 0'}}>
                <div className="label">Score (0–100)</div>
                <div className="row" style={{gap:10, alignItems:'baseline', marginTop:4}}>
                  <div className="hand" style={{fontSize:54, fontWeight:700, lineHeight:1, color: locked?'var(--ink-3)':'var(--ink)'}}>{score}</div>
                  <span className="label">/ 100</span>
                </div>
                {/* Progress bar */}
                <div className="sk-box tight" style={{height:12, padding:0, marginTop:8, borderRadius:'8px 6px 8px 6px / 6px 8px 6px 8px', overflow:'hidden'}}>
                  <div style={{
                    width:`${fillW}%`, height:'100%',
                    background:'repeating-linear-gradient(135deg, var(--ink) 0 6px, transparent 6px 9px)',
                  }}/>
                </div>
              </div>

              <div style={{width:140}}>
                <div className="label">Minus points</div>
                <div className="sk-input" style={{justifyContent:'space-between', marginTop:4}}>
                  <span style={{fontFamily:'var(--hand)', fontSize:18, fontWeight:700}}>{minus}</span>
                  <div className="col" style={{gap:0}}>
                    <span style={{fontSize:9}}>▲</span>
                    <span style={{fontSize:9}}>▼</span>
                  </div>
                </div>
                <div className="label" style={{marginTop:6}}>deduction (e.g. overtime)</div>
              </div>

              <div style={{width:130, textAlign:'right', borderLeft:'1.5px dashed var(--ink-3)', paddingLeft:14}}>
                <div className="label">Final</div>
                <div className="hand" style={{fontSize:54, fontWeight:700, lineHeight:1}}>{final}</div>
                <div className="label note" style={{textTransform:'none', fontSize:13}}>= score − minus</div>
              </div>
            </div>

            <div className="sk-line dash"></div>

            <div className="label">Performance feedback</div>
            <div className="sk-box muted" style={{padding:'10px 12px', minHeight:64, marginTop:4, fontFamily:'var(--type)', fontSize:12, color:'var(--ink-2)'}}>
              {locked
                ? 'Confident phrasing throughout. Tempo control in section B was particularly strong; watch dynamic shading at bar 32.'
                : <span className="ph" style={{color:'var(--ink-3)'}}>Notes on tone, dynamics, expression…<span className="caret"/></span>}
            </div>

            <div className="label" style={{marginTop:12}}>Comments</div>
            <div className="sk-box muted" style={{padding:'10px 12px', minHeight:48, marginTop:4, fontFamily:'var(--type)', fontSize:12, color:'var(--ink-2)'}}>
              {locked ? 'Recommend for finals.' : <span className="ph" style={{color:'var(--ink-3)'}}>Other comments for the panel…</span>}
            </div>
          </div>

          {/* Action bar */}
          {!locked && (
            <div className="row between sk-box" style={{padding:'10px 14px'}}>
              <button className="sk-btn ghost"><Icon id="arrow-l"/> Back</button>
              <div className="row" style={{gap:8}}>
                <button className="sk-btn">Next participant →</button>
                <button className="sk-btn primary">Save assessment</button>
              </div>
            </div>
          )}
          {locked && (
            <div className="row between sk-box" style={{padding:'10px 14px'}}>
              <button className="sk-btn ghost"><Icon id="arrow-l"/> Back to dashboard</button>
              <span className="label">read only</span>
            </div>
          )}
        </div>

        {/* RIGHT — info sidebar */}
        <div className="col" style={{gap:14}}>
          <div className="sk-box" style={{padding:14}}>
            <div className="label">Repertoire</div>
            <div className="row" style={{gap:10, marginTop:6}}>
              <Icon id="music"/>
              <div>
                <div style={{fontWeight:600}}>Clair de Lune</div>
                <div className="label">C. Debussy · Suite bergamasque</div>
              </div>
            </div>
            <div className="sk-line dash"></div>
            <div className="row between">
              <span className="label">Duration</span>
              <span><Icon id="clock" size={11}/> 5:12</span>
            </div>
            <div className="row between" style={{marginTop:6}}>
              <span className="label">Sheet music</span>
              <span style={{textDecoration:'underline'}}><Icon id="pdf" size={12}/> View PDF</span>
            </div>
            <div className="row between" style={{marginTop:6}}>
              <span className="label">Performance</span>
              <span style={{textDecoration:'underline'}}><Icon id="play" size={12}/> Watch on YouTube</span>
            </div>
          </div>

          <div className="sk-box" style={{padding:14}}>
            <div className="label">Participant</div>
            <div className="row" style={{gap:10, marginTop:6}}>
              <span className="sk-avatar">BN</span>
              <div>
                <div style={{fontWeight:600}}>Bela Nusantara</div>
                <div className="label">Junior · Individual</div>
              </div>
            </div>
          </div>

          <div className="sk-box dash" style={{padding:14}}>
            <div className="label">If a group:</div>
            <div className="col" style={{gap:6, marginTop:6, fontSize:12}}>
              {['Adi Wirawan','Citra Lestari','Bayu Saputra','Maya Indah'].map((m,i)=>(
                <div key={i} className="row" style={{gap:8}}>
                  <span className="sk-avatar sm">{m.split(' ').map(x=>x[0]).join('')}</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="ovl">
          <div className="sk-box" style={{padding:'28px 32px', width:340, textAlign:'center', background:'var(--paper)'}}>
            <div style={{
              width:64, height:64, borderRadius:'50%', border:'1.5px solid var(--ink)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              background:'#d8e6d2', marginBottom:10
            }}>
              <Icon id="check" size={32} style={{color:'var(--ok)'}}/>
            </div>
            <div className="hand" style={{fontSize:24, fontWeight:700}}>Assessment saved!</div>
            <div className="label" style={{marginTop:6, textTransform:'none', fontSize:13}}>This assessment has been submitted successfully.</div>
            <button className="sk-btn primary" style={{marginTop:14, width:'100%'}}>Back to dashboard →</button>
          </div>
        </div>
      )}

      {!locked && !showSuccess && (
        <Annot top={120} right={24} w={180} rotate={2}>
          Score + minus + final on<br/>one row → quick mental<br/>math while listening.
        </Annot>
      )}
    </div>
  );
};

// Variant B — focus mode: full-width, info collapses to a thin top strip
const FormB = ({score=78, minus=2}) => {
  const final = score - minus;
  return (
    <div style={{height:'100%', overflow:'hidden', display:'flex', flexDirection:'column', background:'var(--paper)', position:'relative'}}>
      <TopNav/>

      {/* Compact info strip instead of a whole sidebar */}
      <div className="row between" style={{padding:'10px 24px', borderBottom:'1.5px solid var(--ink)', gap:18, flexWrap:'wrap'}}>
        <div className="row" style={{gap:12}}>
          <span className="sk-avatar">HE</span>
          <div>
            <div style={{fontWeight:700, fontSize:15}}>Harmoni Ensemble</div>
            <div className="row" style={{gap:6, marginTop:2}}>
              <span className="sk-pill"><Icon id="people" size={11}/> Group · 4 members</span>
              <span className="sk-pill">Professional</span>
            </div>
          </div>
        </div>
        <div className="row" style={{gap:14, fontSize:12}}>
          <span><Icon id="music" size={12}/> Bohemian Rhapsody</span>
          <span><Icon id="clock" size={12}/> 6:45</span>
          <span style={{textDecoration:'underline'}}><Icon id="pdf" size={12}/> Sheet PDF</span>
          <span style={{textDecoration:'underline'}}><Icon id="play" size={12}/> Video</span>
          <button className="sk-btn small ghost">View members ▾</button>
        </div>
      </div>

      <div style={{padding:'24px 32px', overflow:'auto', flex:1, maxWidth:980, margin:'0 auto', width:'100%'}}>
        {/* Scoring panel */}
        <div className="sk-box" style={{padding:24}}>
          <div className="row between" style={{alignItems:'flex-end'}}>
            <div>
              <div className="label">Overall score</div>
              <div className="row" style={{alignItems:'baseline', gap:10, marginTop:4}}>
                <div className="hand" style={{fontSize:96, fontWeight:700, lineHeight:.9}}>{score}</div>
                <span className="hand" style={{fontSize:32, color:'var(--ink-3)'}}>/ 100</span>
              </div>
            </div>
            <div className="row" style={{gap:8}}>
              {[0,5,10,15,20].map(n=>(
                <div key={n} className="sk-box tight" style={{padding:'4px 10px', fontSize:12}}>+{n||'reset'}</div>
              ))}
            </div>
          </div>

          {/* Big horizontal slider/progress */}
          <div className="sk-box tight" style={{height:18, padding:0, marginTop:14, position:'relative', overflow:'hidden'}}>
            <div style={{
              width:`${score}%`, height:'100%',
              background:'repeating-linear-gradient(135deg, var(--ink) 0 7px, transparent 7px 11px)',
            }}/>
            {/* drag handle */}
            <div style={{
              position:'absolute', top:-6, left:`calc(${score}% - 12px)`,
              width:24, height:30, border:'1.5px solid var(--ink)', background:'var(--paper)',
              borderRadius:'6px 4px 6px 4px / 4px 6px 4px 6px',
            }}/>
          </div>
          <div className="row between" style={{marginTop:6, fontFamily:'var(--type)', fontSize:10, color:'var(--ink-3)'}}>
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>

          <div className="sk-line dash"></div>

          <div className="row" style={{gap:24}}>
            <div style={{flex:1}}>
              <div className="label">Minus points <span className="note" style={{textTransform:'none'}}>· deduction</span></div>
              <div className="row" style={{gap:8, marginTop:6}}>
                <button className="sk-btn small">−</button>
                <div className="hand" style={{fontSize:30, fontWeight:700, minWidth:40, textAlign:'center'}}>{minus}</div>
                <button className="sk-btn small">+</button>
                <span className="label" style={{marginLeft:8}}>presets:</span>
                {[0,1,2,5].map(n=> <span key={n} className="sk-pill" style={{cursor:'pointer'}}>{n}</span>)}
              </div>
            </div>
            <div style={{width:1, background:'var(--ink-3)', opacity:.4}}/>
            <div style={{flex:1, textAlign:'right'}}>
              <div className="label">Final score</div>
              <div className="hand" style={{fontSize:60, fontWeight:700, lineHeight:1, marginTop:2}}>
                <span className="hi">{final}</span>
              </div>
              <div className="label note" style={{textTransform:'none', fontSize:13}}>{score} − {minus} = {final}</div>
            </div>
          </div>
        </div>

        <div className="row" style={{gap:14, marginTop:14, alignItems:'stretch'}}>
          <div className="sk-box grow" style={{padding:14}}>
            <div className="row between"><span className="label">Performance feedback</span><span className="label">0 / 600</span></div>
            <div className="sk-line thin"></div>
            <div style={{minHeight:88, fontFamily:'var(--type)', fontSize:12, color:'var(--ink-3)'}}>
              <span className="ph">Tone, dynamics, expression, technical accuracy…<span className="caret"/></span>
            </div>
          </div>
          <div className="sk-box grow" style={{padding:14}}>
            <div className="row between"><span className="label">Comments</span><span className="label">optional</span></div>
            <div className="sk-line thin"></div>
            <div style={{minHeight:88, fontFamily:'var(--type)', fontSize:12, color:'var(--ink-3)'}}>
              <span className="ph">Anything else for the panel…</span>
            </div>
          </div>
        </div>

        {/* Sticky-ish action bar */}
        <div className="row between sk-box" style={{padding:'10px 14px', marginTop:14, background:'var(--paper-2)'}}>
          <button className="sk-btn ghost"><Icon id="arrow-l"/> Back</button>
          <div className="row" style={{gap:8}}>
            <span className="label">2 of 5 pending</span>
            <button className="sk-btn">Next participant →</button>
            <button className="sk-btn primary">Save assessment</button>
          </div>
        </div>
      </div>

      <Annot top={130} right={20} w={180} rotate={-3}>
        Focus mode — info hides<br/>in a strip up top. Score<br/>becomes the hero.
      </Annot>
    </div>
  );
};

// ============================================================
// SCREEN 4 — VIEW-ONLY (one variant, since it's a state of #3)
// ============================================================
// Use FormA with locked=true.

// ============================================================
// SCREEN 5 — SUCCESS STATE
// ============================================================

// Variant A — modal overlay on top of Form (small card)
const SuccessA = () => <FormA showSuccess={true} score={82} minus={3}/>;

// Variant B — full-takeover confirmation page
const SuccessB = () => (
  <div style={{height:'100%', overflow:'hidden', display:'flex', flexDirection:'column', background:'var(--paper)', position:'relative'}}>
    <TopNav/>
    <div style={{flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:0}}>
      <div style={{padding:'48px 56px', display:'flex', flexDirection:'column', justifyContent:'center', borderRight:'1.5px dashed var(--ink)'}}>
        <div style={{
          width:80, height:80, borderRadius:'50%', border:'1.5px solid var(--ink)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          background:'#d8e6d2'
        }}>
          <Icon id="check" size={42} style={{color:'var(--ok)'}}/>
        </div>
        <div className="hand" style={{fontSize:48, fontWeight:700, marginTop:16, lineHeight:1.05}}>
          <span className="hi">Saved.</span><br/>
          On to the next.
        </div>
        <div className="sub" style={{fontFamily:'var(--print)', fontSize:14, color:'var(--ink-2)', marginTop:10, maxWidth:380}}>
          Bela Nusantara's assessment was submitted successfully and is now visible to the panel.
        </div>
        <div className="row" style={{gap:10, marginTop:22}}>
          <button className="sk-btn primary">Next pending →</button>
          <button className="sk-btn ghost"><Icon id="arrow-l"/> Back to dashboard</button>
        </div>
      </div>

      <div style={{padding:'48px 56px', background:'var(--paper-2)', display:'flex', flexDirection:'column', justifyContent:'center'}}>
        <div className="label">Your submission</div>
        <div className="sk-box" style={{padding:18, marginTop:8, background:'var(--paper)'}}>
          <div className="row between">
            <div className="row" style={{gap:10}}>
              <span className="sk-avatar">BN</span>
              <div>
                <div style={{fontWeight:700}}>Bela Nusantara</div>
                <div className="label">Junior · Individual · Clair de Lune</div>
              </div>
            </div>
            <span className="sk-pill ok dot">Submitted</span>
          </div>
          <div className="sk-line dash"></div>
          <div className="row between">
            <div>
              <div className="label">Score</div>
              <div className="hand" style={{fontSize:32, fontWeight:700}}>82</div>
            </div>
            <div>
              <div className="label">Minus</div>
              <div className="hand" style={{fontSize:32, fontWeight:700}}>3</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="label">Final</div>
              <div className="hand" style={{fontSize:32, fontWeight:700}}><span className="hi">79</span></div>
            </div>
          </div>
        </div>
        <div className="label" style={{marginTop:16}}>up next</div>
        <div className="sk-box dash" style={{padding:14, marginTop:6, background:'transparent'}}>
          <div className="row between">
            <div className="row" style={{gap:10}}>
              <span className="sk-avatar sm">HE</span>
              <div>
                <div style={{fontWeight:600, fontSize:13}}>Harmoni Ensemble</div>
                <div className="label">Professional · Group</div>
              </div>
            </div>
            <button className="sk-btn small primary">Assess →</button>
          </div>
        </div>
      </div>
    </div>

    <Annot top={28} right={28} w={170} rotate={3}>
      Full-page version — sells<br/>momentum. "Next pending"<br/>keeps teachers moving.
    </Annot>
  </div>
);

// ============================================================
// "Unsaved changes" mini-overlay variant on FormA
// ============================================================
const UnsavedDialog = () => (
  <div style={{height:'100%', overflow:'hidden', position:'relative'}}>
    <FormA score={64} minus={1}/>
    <div className="ovl">
      <div className="sk-box" style={{padding:'24px 28px', width:360, background:'var(--paper)'}}>
        <div className="row" style={{gap:10}}>
          <Icon id="warn" size={22} style={{color:'var(--warn)'}}/>
          <div className="hand" style={{fontSize:20, fontWeight:700}}>Unsaved changes</div>
        </div>
        <div className="label" style={{marginTop:8, textTransform:'none', fontSize:13}}>
          You have unsaved changes on this assessment. Leave anyway?
        </div>
        <div className="row" style={{gap:10, marginTop:18, justifyContent:'flex-end'}}>
          <button className="sk-btn ghost">Cancel</button>
          <button className="sk-btn">Leave</button>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// CANVAS LAYOUT
// ============================================================

const App = () => (
  <DesignCanvas>
    <DCSection id="login" title="01 · Teacher login" subtitle="Two distinct framings for the entry screen">
      <DCArtboard id="login-a" label="A · Centered card (classic)" width={1200} height={760}>
        <LoginA/>
      </DCArtboard>
      <DCArtboard id="login-b" label="B · Split brand panel" width={1200} height={760}>
        <LoginB/>
      </DCArtboard>
    </DCSection>

    <DCSection id="dashboard" title="02 · Assessment dashboard" subtitle="Same data, two information architectures">
      <DCArtboard id="dash-a" label="A · Cards + dense table" width={1400} height={900}>
        <DashboardA/>
      </DCArtboard>
      <DCArtboard id="dash-b" label="B · Pending / Submitted columns" width={1400} height={900}>
        <DashboardB/>
      </DCArtboard>
    </DCSection>

    <DCSection id="form" title="03 · Assessment form (editable)" subtitle="Where teachers spend most of their time">
      <DCArtboard id="form-a" label="A · 2-column with sidebar" width={1400} height={900}>
        <FormA score={82} minus={3}/>
      </DCArtboard>
      <DCArtboard id="form-b" label="B · Focus mode · large slider" width={1400} height={900}>
        <FormB score={78} minus={2}/>
      </DCArtboard>
    </DCSection>

    <DCSection id="viewonly" title="04 · View-only (post-deadline)" subtitle="Locked state of #3 — same layout, different affordances">
      <DCArtboard id="vo-a" label="A · Inline lock banner" width={1400} height={900}>
        <FormA locked={true} score={86} minus={2}/>
      </DCArtboard>
      <DCArtboard id="vo-b" label="B · Unsaved-changes guard (related state)" width={1400} height={900}>
        <UnsavedDialog/>
      </DCArtboard>
    </DCSection>

    <DCSection id="success" title="05 · Save success" subtitle="Modal vs. takeover — does the moment deserve a page?">
      <DCArtboard id="ok-a" label="A · Modal overlay (lighter)" width={1400} height={900}>
        <SuccessA/>
      </DCArtboard>
      <DCArtboard id="ok-b" label="B · Full-page takeover (next-up)" width={1400} height={900}>
        <SuccessB/>
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
