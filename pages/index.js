import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { PILLARS, QUIZ_QUESTIONS } from '../data/content';

const LANGS = [
  { code:'en', label:'English',   flag:'🇬🇧' },
  { code:'pt', label:'Português', flag:'🇧🇷' },
  { code:'es', label:'Español',   flag:'🇪🇸' },
  { code:'zh', label:'廣東話',    flag:'🇭🇰' },
];

function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^> (.+)$/gm,'<div class="note-box">$1</div>')
    .replace(/^(\d+)\. \*\*(.+?)\*\* — (.+)$/gm,'<li><strong>$1. $2</strong> — $3</li>')
    .replace(/^(\d+)\. \*\*(.+?)\*\*(.*)$/gm,'<li><strong>$1. $2</strong>$3</li>')
    .replace(/^(\d+)\. (.+)$/gm,'<li>$1. $2</li>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g,m=>`<ul>${m}</ul>`)
    .replace(/\n\n/g,'</p><p>')
    .replace(/^(?!<[hud]|<li|<div|<\/ul|<p|<\/p)(.+)$/gm,'<p>$1</p>')
    .replace(/<p><\/p>/g,'');
}

// Scroll reveal hook
function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

// Animated counter
function Counter({ end, duration = 1500 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const isK = String(end).includes('k') || String(end).includes('K');
      const num = parseInt(String(end).replace(/[^0-9]/g,''));
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.floor(ease * num));
        if (p < 1) requestAnimationFrame(step);
        else setVal(num);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  const isK = String(end).includes('k') || String(end).includes('K');
  const hasSlash = String(end).includes('/');
  return <span ref={ref}>{hasSlash ? end : isK ? val.toLocaleString() : val.toLocaleString()}{isK && !hasSlash ? '+' : ''}</span>;
}

export default function App() {
  const [lang, setLang]               = useState('en');
  const [langOpen, setLangOpen]       = useState(false);
  const [view, setView]               = useState('home');
  const [activePillar, setActivePillar]   = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [openPillars, setOpenPillars] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizStep, setQuizStep]       = useState('intro');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [currentQ, setCurrentQ]       = useState(0);
  const [submitterInfo, setSubmitterInfo] = useState({ name:'', country:'', email:'' });
  const [sending, setSending]         = useState(false);
  const mainRef = useRef(null);

  useReveal();

  const tl = (en,pt,es,zh) => {
    if (lang==='pt') return pt||en;
    if (lang==='es') return es||en;
    if (lang==='zh') return zh||en;
    return en;
  };
  const pName  = p => lang==='pt'?p.namePT:lang==='es'?(p.nameES||p.name):lang==='zh'?(p.nameZH||p.name):p.name;
  const pDesc  = p => lang==='pt'?p.descriptionPT:lang==='es'?(p.descriptionES||p.description):lang==='zh'?(p.descriptionZH||p.description):p.description;
  const aTitle = a => lang==='pt'?a.titlePT:lang==='es'?(a.titleES||a.title):lang==='zh'?(a.titleZH||a.title):a.title;
  const aContent=a => lang==='pt'?a.contentPT:lang==='es'?(a.contentES||a.content):lang==='zh'?(a.contentZH||a.content):a.content;
  const qText  = q => lang==='pt'?q.questionPT:q.question;
  const qOpts  = (q,i) => lang==='pt'&&q.optionsPT?q.optionsPT[i]:q.options?q.options[i]:'';
  const qType  = q => lang==='pt'?q.typeLabelPT:q.typeLabel;

  function goToPillar(p) {
    setActivePillar(p); setActiveArticle(p.articles[0]); setView('pillar');
    setOpenPillars(o=>({...o,[p.id]:true})); setSidebarOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }
  function goToArticle(p,a) {
    setActivePillar(p); setActiveArticle(a); setView('pillar');
    setSidebarOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }

  const mcScore = QUIZ_QUESTIONS.filter(q=>q.type==='multiple-choice'&&quizAnswers[q.id]===q.correct).length;

  async function submitQuiz() {
    setSending(true);
    const mc = QUIZ_QUESTIONS.filter(q=>q.type==='multiple-choice');
    const oe = QUIZ_QUESTIONS.filter(q=>q.type==='open-ended');
    let body = `RedotsClub Global Playbook — Quiz Submission\n========================================\n\n`;
    body += `Name: ${submitterInfo.name}\nCountry: ${submitterInfo.country}\nEmail: ${submitterInfo.email}\n`;
    body += `Language: ${LANGS.find(l=>l.code===lang)?.label}\nScore: ${mcScore}/${mc.length}\n\n`;
    mc.forEach(q => {
      const ans=quizAnswers[q.id]; const ok=ans===q.correct;
      body+=`\nQ${q.id}: ${q.question}\nAnswer: ${q.options?q.options[ans]:'—'}\nResult: ${ok?'✓ CORRECT':'✗ WRONG'}\n`;
    });
    oe.forEach(q => { body+=`\nQ${q.id}: ${q.question}\nResponse:\n${quizAnswers[q.id]||'(No response)'}\n`; });
    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          service_id:'redotsclub_quiz', template_id:'quiz_results', user_id:'redotsclub_public_key',
          template_params:{ to_email:'lucas@redotpay.com', from_name:submitterInfo.name,
            from_country:submitterInfo.country, reply_to:submitterInfo.email,
            score:`${mcScore}/${mc.length}`, body }
        })
      });
    } catch(e) {}
    setSending(false); setQuizStep('done');
  }

  const pillarNum = p => lang==='pt'?`Pilar ${p.num}`:lang==='es'?`Pilar ${p.num}`:lang==='zh'?`支柱 ${p.num}`:`Pillar ${p.num}`;

  // Inline SVG logo
  const Logo = () => (
    <svg width="140" viewBox="0 0 666 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M125.129 0H62.5635V62.5H125.129V0Z" fill="white"/>
      <path d="M125.129 125H62.5635V187.5H125.129V125Z" fill="white"/>
      <path d="M62.565 0H0V62.5H62.565Z" fill="white"/>
      <path d="M62.565 62.5H0V125H62.565V62.5Z" fill="white"/>
      <path d="M62.565 125H0V187.5H62.565V125Z" fill="white"/>
      <path d="M62.565 187.5H0V250H62.565V187.5Z" fill="white"/>
      <path d="M187.698 0H125.133V62.5H187.698V0Z" fill="white"/>
      <path d="M187.565 125H125V187.5H187.565V125Z" fill="white"/>
      <path d="M250 62.5H187.436V125H250V62.5Z" fill="white"/>
      <path d="M187.436 62.5H250C250 27.98 221.953 0 187.436 0V62.5Z" fill="white"/>
      <path d="M250 187.241H187.436V249.742H250V187.241Z" fill="#FF1B64"/>
      <path d="M187.565 187.241H125V249.742H187.565V187.241Z" fill="#FF1B64"/>
      <path d="M308.3 131V61H338.2C347.9 61 355.5 63.3 360.9 67.8C366.3 72.3 369 78.5 369 86.4C369 91.6 367.8 96.1 365.3 99.9C362.8 103.6 359.3 106.5 354.8 108.5C350.3 110.5 344.9 111.5 338.6 111.5H317.3L324.5 104.4V131H308.3ZM352.8 131L335.3 105.6H352.6L370.3 131H352.8ZM324.5 106.2L317.3 98.6H337.7C342.7 98.6 346.4 97.5 348.9 95.4C351.4 93.2 352.6 90.2 352.6 86.4C352.6 82.5 351.4 79.5 348.9 77.4C346.4 75.3 342.7 74.2 337.7 74.2H317.3L324.5 66.5V106.2ZM537.2 131.8C531.4 131.8 526.3 130.6 521.9 128.2C517.5 125.8 514 122.5 511.4 118.4C508.8 114.2 507.6 109.4 507.6 104.1C507.6 98.7 508.8 93.9 511.4 89.8C514 85.6 517.5 82.3 521.9 80C526.3 77.6 531.4 76.4 537.2 76.4C542.8 76.4 547.9 77.6 552.4 80C556.8 82.3 560.3 85.6 562.9 89.7C565.4 93.8 566.7 98.6 566.7 104.1C566.7 109.4 565.4 114.2 562.9 118.4C560.3 122.5 556.8 125.8 552.4 128.2C547.9 130.6 542.8 131.8 537.2 131.8ZM537.2 119C539.8 119 542.1 118.4 544.2 117.2C546.2 116 547.9 114.3 549.1 112.1C550.3 109.8 550.9 107.2 550.9 104.1C550.9 101 550.3 98.3 549.1 96.1C547.9 93.9 546.2 92.2 544.2 91C542.1 89.8 539.8 89.2 537.2 89.2C534.6 89.2 532.2 89.8 530.2 91C528.1 92.2 526.4 93.9 525.2 96.1C524 98.3 523.4 101 523.4 104.1C523.4 107.2 524 109.8 525.2 112.1C526.4 114.3 528.1 116 530.2 117.2C532.2 118.4 534.6 119 537.2 119ZM341.8 237.2C336.4 237.2 331.4 236.3 326.7 234.6C322.1 232.8 318.1 230.3 314.7 227C311.3 223.7 308.6 219.9 306.7 215.5C304.8 211.1 303.9 206.3 303.9 201C303.9 195.7 304.8 190.9 306.7 186.5C308.6 182.1 311.3 178.3 314.7 175C318.2 171.7 322.2 169.2 326.8 167.5C331.4 165.7 336.4 164.8 341.9 164.8C348 164.8 353.4 165.9 358.3 168C363.2 170.1 367.4 173.1 370.7 177.2L360.3 186.8C357.9 184.1 355.2 182 352.3 180.7C349.4 179.3 346.2 178.6 342.7 178.6C339.4 178.6 336.4 179.1 333.7 180.2C331 181.3 328.6 182.8 326.6 184.8C324.6 186.8 323 189.2 321.9 191.9C320.8 194.6 320.3 197.7 320.3 201C320.3 204.3 320.8 207.4 321.9 210.1C323 212.8 324.6 215.2 326.6 217.2C328.6 219.2 331 220.7 333.7 221.8C336.4 222.9 339.4 223.4 342.7 223.4C346.2 223.4 349.4 222.7 352.3 221.4C355.2 220 357.9 217.9 360.3 215.1L370.7 224.7C367.4 228.8 363.2 231.9 358.3 234C353.4 236.1 347.9 237.2 341.8 237.2ZM508.6 236.8C503.9 236.8 499.8 235.8 496.4 233.8C493 231.8 490.4 228.8 488.6 224.7C486.8 220.6 485.9 215.4 485.9 209.1C485.9 202.8 486.8 197.6 488.7 193.5C490.6 189.4 493.3 186.4 496.7 184.4C500.1 182.4 504.1 181.4 508.6 181.4C513.7 181.4 518.2 182.5 522.2 184.8C526.3 187.1 529.5 190.3 531.8 194.4C534.2 198.5 535.4 203.4 535.4 209.1C535.4 214.7 534.2 219.6 531.8 223.7C529.5 227.8 526.3 231.1 522.2 233.4C518.2 235.7 513.7 236.8 508.6 236.8ZM476.8 236V161.8H492.4V193.1L491.4 209L491.7 225V236H476.8ZM505.9 224C508.5 224 510.8 223.4 512.8 222.2C514.9 221 516.5 219.3 517.7 217.1C519 214.8 519.6 212.2 519.6 209.1C519.6 206 519 203.3 517.7 201.1C516.5 198.9 514.9 197.2 512.8 196C510.8 194.8 508.5 194.2 505.9 194.2C503.3 194.2 501 194.8 498.9 196C496.8 197.2 495.2 198.9 494 201.1C492.8 203.3 492.2 206 492.2 209.1C492.2 212.2 492.8 214.8 494 217.1C495.2 219.3 496.8 221 498.9 222.2C501 223.4 503.3 224 505.9 224Z" fill="white"/>
    </svg>
  );

  return (
    <>
      <Head>
        <title>RedotsClub Global Playbook</title>
        <meta name="description" content="RedotsClub Global Community Playbook" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.svg" />
      </Head>

      <button className="mobile-toggle" onClick={()=>setSidebarOpen(o=>!o)}>☰</button>

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <aside className={`sidebar${sidebarOpen?' open':''}`}>
          <div className="sidebar-logo" onClick={()=>{setView('home');setSidebarOpen(false)}}>
            <Logo />
            <div className="sidebar-tagline">Global Playbook</div>
          </div>

          <div className="lang-selector">
            <div className="lang-selected" onClick={()=>setLangOpen(o=>!o)}>
              <span className="lang-selected-text">
                <span className="lang-flag">{LANGS.find(l=>l.code===lang)?.flag}</span>
                {LANGS.find(l=>l.code===lang)?.label}
              </span>
              <span className={`lang-chevron${langOpen?' open':''}`}>▼</span>
            </div>
            {langOpen && (
              <div className="lang-dropdown">
                {LANGS.map(l=>(
                  <button key={l.code} className={`lang-option${lang===l.code?' active':''}`}
                    onClick={()=>{setLang(l.code);setLangOpen(false)}}>
                    <span className="lang-flag">{l.flag}</span>
                    {l.label}
                    <span className="lang-option-code">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="sidebar-nav">
            <div className="pillar-group">
              <button className={`pillar-label${view==='home'?' active':''}`}
                onClick={()=>{setView('home');setSidebarOpen(false)}}>
                <span className="pillar-num" style={{background:'rgba(255,255,255,0.1)',boxShadow:'none'}}>⌂</span>
                <span className="pillar-name">{tl('Overview','Visão Geral','Resumen','概覽')}</span>
              </button>
            </div>

            {PILLARS.map(p=>(
              <div key={p.id} className="pillar-group">
                <button
                  className={`pillar-label${activePillar?.id===p.id?' active':''}${openPillars[p.id]?' open':''}`}
                  onClick={()=>{setOpenPillars(o=>({...o,[p.id]:!o[p.id]}));goToPillar(p)}}>
                  <span className="pillar-num">{p.num}</span>
                  <span className="pillar-name">{pName(p)}</span>
                  <span className="pillar-arrow">▶</span>
                </button>
                <div className={`article-list${openPillars[p.id]?' open':''}`}>
                  {p.articles.map(a=>(
                    <a key={a.id} className={`article-link${activeArticle?.id===a.id?' active':''}`}
                      onClick={()=>goToArticle(p,a)}>
                      {aTitle(a)}
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <button className="sidebar-quiz-btn"
              onClick={()=>{setView('quiz');setQuizStep('intro');setSidebarOpen(false)}}>
              <span>{tl('📝 Take the Quiz','📝 Fazer o Quiz','📝 Tomar el Quiz','📝 參加測驗')}</span>
            </button>
          </nav>
        </aside>

        {/* ── MAIN ── */}
        <main className="main" ref={mainRef}>

          {/* HOME */}
          {view==='home' && (
            <>
              <div className="hero">
                <div className="hero-grid" />
                <div className="hero-eyebrow">
                  RedotsClub — {tl('Global Community Playbook','Playbook Global da Comunidade','Guía Global de Comunidad','全球社群指南')}
                </div>
                <h1>
                  {tl(
                    <><span>Great People.</span><br/>Exclusive Access.<br/>Unforgettable Moments.</>,
                    <><span>Grandes Pessoas.</span><br/>Acesso Exclusivo.<br/>Momentos Inesquecíveis.</>,
                    <><span>Grandes Personas.</span><br/>Acceso Exclusivo.<br/>Momentos Inolvidables.</>,
                    <><span>優秀的人。</span><br/>獨家訪問。<br/>難忘的時刻。</>
                  )}
                </h1>
                <p className="hero-sub">
                  {tl(
                    'The operational manual for RedotsClub country leads and regional leads — inspired by Superteam, built for a lifestyle-first audience.',
                    'O manual operacional para líderes de país e regionais do RedotsClub.',
                    'El manual operacional para líderes de país y regionales de RedotsClub.',
                    'RedotsClub國家負責人及地區負責人的運營手冊。'
                  )}
                </p>
                <div className="hero-stats">
                  {[
                    {num:'5',    label: tl('Pillars','Pilares','Pilares','支柱')},
                    {num:'17',   label: tl('Articles','Artigos','Artículos','文章')},
                    {num:'100',  label: tl('Guests / Chapter','Convidados / Cap.','Huéspedes / Cap.','訪客/分部')},
                    {num:'500',  label: tl('Members Goal','Meta de Membros','Meta de Miembros','會員目標')},
                  ].map(s=>(
                    <div key={s.label} className="hero-stat">
                      <span className="hero-stat-num"><Counter end={parseInt(s.num)} /></span>
                      <span className="hero-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="content-area">
                <p className="section-label reveal">{tl('Five Pillars of Excellence','Cinco Pilares de Excelência','Cinco Pilares de Excelencia','五大卓越支柱')}</p>
                <h2 className="section-title reveal">{tl('The Framework','O Framework','El Marco','框架體系')}</h2>

                <div className="pillar-grid">
                  {PILLARS.map((p,i)=>(
                    <div key={p.id}
                      className={`pillar-card reveal reveal-delay-${Math.min(i%2+1,3)}`}
                      onClick={()=>goToPillar(p)}>
                      <div className="pillar-card-num">
                        <span className="pillar-card-dot" />
                        {pillarNum(p)} · {p.articles.length} {tl('articles','artigos','artículos','篇文章')}
                      </div>
                      <h3>{pName(p)}</h3>
                      <p>{pDesc(p)}</p>
                      <span className="pillar-card-arrow">→</span>
                    </div>
                  ))}
                  <div className="pillar-card reveal reveal-delay-2"
                    onClick={()=>{setView('quiz');setQuizStep('intro')}}
                    style={{borderTop:'1px solid var(--border)'}}>
                    <div className="pillar-card-num">
                      <span className="pillar-card-dot" />
                      20 {tl('Questions','Perguntas','Preguntas','問題')}
                    </div>
                    <h3>{tl('Country Lead Quiz','Quiz do Líder de País','Quiz del Líder de País','國家負責人測驗')}</h3>
                    <p>{tl('Test your understanding of the playbook. Results sent to the RedotsClub global team.',
                            'Teste seu entendimento do playbook. Resultados enviados à equipe global do RedotsClub.',
                            'Pon a prueba tu comprensión del playbook.',
                            '測試你對手冊的理解。結果將發送給RedotsClub全球團隊。')}</p>
                    <span className="pillar-card-arrow">→</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PILLAR / ARTICLE */}
          {view==='pillar' && activePillar && activeArticle && (
            <>
              <div className="article-hero">
                <div className="article-eyebrow">{pillarNum(activePillar)} · {pName(activePillar)}</div>
                <h1>{aTitle(activeArticle)}</h1>
              </div>
              <div className="content-area">
                <div className="article-tabs">
                  {activePillar.articles.map(a=>(
                    <button key={a.id}
                      className={`article-tab${activeArticle.id===a.id?' active':''}`}
                      onClick={()=>{setActiveArticle(a);if(mainRef.current)mainRef.current.scrollTop=0}}>
                      {aTitle(a)}
                    </button>
                  ))}
                </div>
                <div className="article-content">
                  <div className="article-meta">
                    <span className="article-tag">{pName(activePillar)}</span>
                    <span className="article-author">{activeArticle.author}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{__html: renderMd(aContent(activeArticle))}} />
                </div>
                <div className="article-nav">
                  {(()=>{
                    const idx = activePillar.articles.findIndex(a=>a.id===activeArticle.id);
                    const prev = activePillar.articles[idx-1];
                    const next = activePillar.articles[idx+1];
                    return (
                      <>
                        {prev
                          ? <button className="quiz-btn quiz-btn-secondary" onClick={()=>setActiveArticle(prev)}>← {aTitle(prev)}</button>
                          : <span/>}
                        {next
                          ? <button className="quiz-btn quiz-btn-primary" onClick={()=>setActiveArticle(next)}>{aTitle(next)} →</button>
                          : <button className="quiz-btn quiz-btn-primary" onClick={()=>{setView('quiz');setQuizStep('intro')}}>
                              {tl('Take the Quiz →','Fazer o Quiz →','Tomar el Quiz →','參加測驗 →')}
                            </button>}
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* QUIZ */}
          {view==='quiz' && (
            <>
              <div className="article-hero">
                <div className="article-eyebrow">{tl('Country Lead Assessment','Avaliação do Líder de País','Evaluación del Líder de País','國家負責人評估')}</div>
                <h1>{tl('Playbook Quiz','Quiz do Playbook','Quiz del Playbook','手冊測驗')}</h1>
              </div>
              <div className="content-area">
                <div className="quiz-container">

                  {quizStep==='intro' && (
                    <>
                      <div className="quiz-hero">
                        <h2>{tl('Ready to be tested?','Pronto para ser testado?','¿Listo para ser evaluado?','準備好接受測試了嗎？')}</h2>
                        <p>{tl('20 questions — 15 multiple choice + 5 scenario responses. Your answers will be sent to the RedotsClub global team.',
                                '20 questões — 15 de múltipla escolha + 5 respostas de cenário. Suas respostas serão enviadas para a equipe global.',
                                '20 preguntas — 15 de opción múltiple + 5 respuestas de escenario.',
                                '20道題目——15道選擇題 + 5道情境回答。')}</p>
                      </div>
                      <div className="question-card">
                        <div className="question-type">{tl('Before you begin','Antes de começar','Antes de comenzar','開始之前')}</div>
                        <p style={{fontSize:14,color:'var(--gray-2)',lineHeight:1.7,marginBottom:16}}>
                          {tl('This quiz tests your understanding of the RedotsClub Global Playbook. Scenario questions have no single correct answer — they are assessed on quality of reasoning.',
                              'Este quiz testa seu entendimento do Playbook Global do RedotsClub. Questões de cenário são avaliadas pela qualidade do raciocínio.',
                              'Este quiz evalúa tu comprensión del Playbook Global de RedotsClub.',
                              '此測驗測試您對RedotsClub全球手冊的理解。')}
                        </p>
                        <ul style={{margin:'0 0 0 20px',fontSize:13,color:'var(--gray-3)',lineHeight:2,fontWeight:500}}>
                          <li>{tl('15 Multiple choice questions','15 Questões de múltipla escolha','15 Preguntas de opción múltiple','15道選擇題')}</li>
                          <li>{tl('5 Scenario responses (open-ended)','5 Respostas de cenário (abertas)','5 Respuestas de escenario','5道開放式情境回答')}</li>
                          <li>{tl('Results sent to lucas@redotpay.com','Resultados enviados para lucas@redotpay.com','Resultados enviados a lucas@redotpay.com','結果已發送至lucas@redotpay.com')}</li>
                        </ul>
                      </div>
                      <div className="quiz-nav">
                        <span/>
                        <button className="quiz-btn quiz-btn-primary" onClick={()=>setQuizStep('form')}>
                          {tl('Start Quiz →','Iniciar Quiz →','Iniciar Quiz →','開始測驗 →')}
                        </button>
                      </div>
                    </>
                  )}

                  {quizStep==='form' && (
                    <>
                      <div className="quiz-form">
                        <h3>{tl('Your Details','Seus Dados','Tus Datos','您的資料')}</h3>
                        <p>{tl('This information will be sent with your quiz results.','Esta informação será enviada com seus resultados.','Esta información se enviará con tus resultados.','此資訊將與您的測驗結果一併發送。')}</p>
                        {[
                          {key:'name',    label:tl('Full Name','Nome Completo','Nombre Completo','全名'),          ph:tl('Your name','Seu nome','Tu nombre','您的姓名')},
                          {key:'country', label:tl('Country / Region','País / Região','País / Región','國家／地區'), ph:tl('e.g. Brazil','ex. Brasil','ej. Brasil','例如：巴西')},
                          {key:'email',   label:tl('Email Address','Endereço de Email','Dirección de Email','電郵地址'), ph:'your@email.com'},
                        ].map(f=>(
                          <div key={f.key} className="form-group">
                            <label className="form-label">{f.label}</label>
                            <input className="form-input" placeholder={f.ph} value={submitterInfo[f.key]}
                              onChange={e=>setSubmitterInfo(i=>({...i,[f.key]:e.target.value}))} />
                          </div>
                        ))}
                      </div>
                      <div className="quiz-nav">
                        <button className="quiz-btn quiz-btn-secondary" onClick={()=>setQuizStep('intro')}>
                          {tl('← Back','← Voltar','← Atrás','← 返回')}
                        </button>
                        <button className="quiz-btn quiz-btn-primary"
                          disabled={!submitterInfo.name||!submitterInfo.country||!submitterInfo.email}
                          onClick={()=>{setCurrentQ(0);setQuizStep('questions')}}>
                          {tl('Begin Questions →','Iniciar Questões →','Comenzar Preguntas →','開始答題 →')}
                        </button>
                      </div>
                    </>
                  )}

                  {quizStep==='questions' && (()=>{
                    const q = QUIZ_QUESTIONS[currentQ];
                    const answered = quizAnswers[q.id]!==undefined && quizAnswers[q.id]!=='';
                    return (
                      <>
                        <div className="quiz-progress">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{width:`${((currentQ+1)/QUIZ_QUESTIONS.length)*100}%`}}/>
                          </div>
                          <span className="progress-text">{currentQ+1} / {QUIZ_QUESTIONS.length}</span>
                        </div>
                        <div className="question-card" key={q.id}>
                          <div className="question-type">{qType(q)} · {tl(`Question ${q.id}`,`Questão ${q.id}`,`Pregunta ${q.id}`,`第${q.id}題`)}</div>
                          <div className="question-text">{qText(q)}</div>
                          {q.type==='multiple-choice' && (
                            <div className="options-grid">
                              {q.options.map((_,i)=>(
                                <button key={i} className={`option-btn${quizAnswers[q.id]===i?' selected':''}`}
                                  onClick={()=>setQuizAnswers(a=>({...a,[q.id]:i}))}>
                                  <span className="option-letter">{['A','B','C','D'][i]}</span>
                                  <span className="option-text">{qOpts(q,i)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {q.type==='open-ended' && (
                            <textarea className="textarea-answer"
                              placeholder={tl('Write your response here…','Escreva sua resposta aqui…','Escribe tu respuesta aquí…','在此填寫您的回答……')}
                              value={quizAnswers[q.id]||''}
                              onChange={e=>setQuizAnswers(a=>({...a,[q.id]:e.target.value}))}/>
                          )}
                        </div>
                        <div className="quiz-nav">
                          {currentQ > 0
                            ? <button className="quiz-btn quiz-btn-secondary" onClick={()=>setCurrentQ(q=>q-1)}>{tl('← Previous','← Anterior','← Anterior','← 上一題')}</button>
                            : <span/>}
                          {currentQ < QUIZ_QUESTIONS.length-1
                            ? <button className="quiz-btn quiz-btn-primary" disabled={!answered} onClick={()=>setCurrentQ(q=>q+1)}>{tl('Next →','Próximo →','Siguiente →','下一題 →')}</button>
                            : <button className="quiz-btn quiz-btn-primary" disabled={!answered||sending} onClick={submitQuiz}>
                                {sending ? tl('Sending…','Enviando…','Enviando…','發送中…') : tl('Submit Quiz →','Enviar Quiz →','Enviar Quiz →','提交測驗 →')}
                              </button>}
                        </div>
                      </>
                    );
                  })()}

                  {quizStep==='done' && (
                    <div className="score-screen">
                      <div className="score-ring">
                        <span className="score-num">{mcScore}/15</span>
                        <span className="score-label">{tl('Score','Pontuação','Puntuación','得分')}</span>
                      </div>
                      <h2>
                        {mcScore>=12 ? tl('Outstanding! 🏆','Excelente! 🏆','¡Sobresaliente! 🏆','出色！🏆')
                         : mcScore>=9 ? tl('Well done! 🎯','Muito bem! 🎯','¡Bien hecho! 🎯','做得好！🎯')
                         : mcScore>=6 ? tl('Good effort. 📚','Bom esforço. 📚','Buen esfuerzo. 📚','繼續努力。📚')
                         :              tl('Keep studying. 💪','Continue estudando. 💪','Sigue estudiando. 💪','繼續學習。💪')}
                      </h2>
                      <p>{tl(
                        `You answered ${mcScore} out of 15 multiple choice questions correctly. Your full results have been sent to the RedotsClub global team.`,
                        `Você acertou ${mcScore} das 15 questões. Seus resultados completos foram enviados para a equipe global.`,
                        `Respondiste correctamente ${mcScore} de 15 preguntas.`,
                        `您在15道選擇題中答對了${mcScore}道。`
                      )}</p>
                      <div className="score-badge">✓ {tl('Results sent to lucas@redotpay.com','Resultados enviados para lucas@redotpay.com','Resultados enviados a lucas@redotpay.com','結果已發送至lucas@redotpay.com')}</div>
                      <div style={{marginTop:32,display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                        <button className="quiz-btn quiz-btn-secondary" onClick={()=>setView('home')}>{tl('← Back to Playbook','← Voltar ao Playbook','← Volver al Playbook','← 返回手冊')}</button>
                        <button className="quiz-btn quiz-btn-primary" onClick={()=>{setQuizStep('intro');setQuizAnswers({});setCurrentQ(0)}}>{tl('Retake Quiz','Refazer Quiz','Repetir Quiz','重新測驗')}</button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
