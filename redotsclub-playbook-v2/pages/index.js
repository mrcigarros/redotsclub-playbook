import { useState, useRef } from 'react';
import Head from 'next/head';
import { PILLARS, QUIZ_QUESTIONS } from '../data/content';

const LANGS = [
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'zh', label: '廣東話',    flag: '🇭🇰' },
];

function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<div class="note-box">$1</div>')
    .replace(/^(\d+)\. \*\*(.+?)\*\* — (.+)$/gm, '<li><strong>$1. $2</strong> — $3</li>')
    .replace(/^(\d+)\. \*\*(.+?)\*\*(.*)$/gm, '<li><strong>$1. $2</strong>$3</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$1. $2</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hud]|<li|<div|<\/ul|<p|<\/p)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
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

  const tl = (en, pt, es, zh) => {
    if (lang==='pt') return pt||en;
    if (lang==='es') return es||en;
    if (lang==='zh') return zh||en;
    return en;
  };
  const pName  = p => lang==='pt'?p.namePT:lang==='es'?(p.nameES||p.name):lang==='zh'?(p.nameZH||p.name):p.name;
  const pDesc  = p => lang==='pt'?p.descriptionPT:lang==='es'?(p.descriptionES||p.description):lang==='zh'?(p.descriptionZH||p.description):p.description;
  const aTitle = a => lang==='pt'?a.titlePT:lang==='es'?(a.titleES||a.title):lang==='zh'?(a.titleZH||a.title):a.title;
  const aContent = a => lang==='pt'?a.contentPT:lang==='es'?(a.contentES||a.content):lang==='zh'?(a.contentZH||a.content):a.content;
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
    body += `MULTIPLE CHOICE\n---------------\n`;
    mc.forEach(q=>{
      const ans=quizAnswers[q.id]; const ok=ans===q.correct;
      body+=`\nQ${q.id}: ${q.question}\nAnswer: ${q.options?q.options[ans]:'—'}\nResult: ${ok?'✓ CORRECT':'✗ WRONG (Correct: '+(q.options?q.options[q.correct]:'')+')' }\n`;
    });
    body += `\nSCENARIO RESPONSES\n------------------\n`;
    oe.forEach(q=>{ body+=`\nQ${q.id}: ${q.question}\nResponse:\n${quizAnswers[q.id]||'(No response)'}\n`; });

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
    } catch(e) { /* silent fail */ }
    setSending(false); setQuizStep('done');
  }

  const pillarNum = p => lang==='pt'?`Pilar ${p.num}`:lang==='es'?`Pilar ${p.num}`:lang==='zh'?`支柱 ${p.num}`:`Pillar ${p.num}`;

  return (
    <>
      <Head>
        <title>RedotsClub Global Playbook</title>
        <meta name="description" content="RedotsClub Global Community Playbook" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <button className="mobile-toggle" onClick={()=>setSidebarOpen(o=>!o)}>☰</button>

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <aside className={`sidebar${sidebarOpen?' open':''}`}>
          <div className="sidebar-logo">
            <img src="/logo.png" alt="RedotsClub" />
            <div className="sidebar-tagline">Global Playbook</div>
          </div>

          {/* Language selector */}
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
                    onClick={()=>{setLang(l.code);setLangOpen(false);}}>
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
                onClick={()=>{setView('home');setSidebarOpen(false);}}>
                <span className="pillar-num" style={{background:'rgba(255,255,255,0.1)'}}>⌂</span>
                <span className="pillar-name">{tl('Overview','Visão Geral','Resumen','概覽')}</span>
              </button>
            </div>

            {PILLARS.map(p=>(
              <div key={p.id} className="pillar-group">
                <button className={`pillar-label${activePillar?.id===p.id?' active':''}${openPillars[p.id]?' open':''}`}
                  onClick={()=>{setOpenPillars(o=>({...o,[p.id]:!o[p.id]}));goToPillar(p);}}>
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
              onClick={()=>{setView('quiz');setQuizStep('intro');setSidebarOpen(false);}}>
              {tl('📝 Take the Quiz','📝 Fazer o Quiz','📝 Tomar el Quiz','📝 參加測驗')}
            </button>
          </nav>
        </aside>

        {/* ── MAIN ── */}
        <main className="main" ref={mainRef}>

          {/* HOME */}
          {view==='home' && (
            <>
              <div className="hero">
                <div className="hero-pattern" />
                <div className="hero-eyebrow">RedotsClub — {tl('Global Community Playbook','Playbook Global da Comunidade','Guía Global de Comunidad','全球社群指南')}</div>
                <h1>
                  {tl(<>Great People.<br/>Exclusive Access.<br/><span>Unforgettable</span> Moments.</>,
                      <>Grandes Pessoas.<br/>Acesso Exclusivo.<br/><span>Momentos</span> Inesquecíveis.</>,
                      <>Grandes Personas.<br/>Acceso Exclusivo.<br/><span>Momentos</span> Inolvidables.</>,
                      <>優秀的人。<br/>獨家訪問。<br/><span>難忘</span>的時刻。</>)}
                </h1>
                <p className="hero-sub">
                  {tl('A first-draft proposal for the RedotsClub Global Community Model — inspired by Superteam, built for a lifestyle-first audience.',
                      'Uma proposta inicial para o Modelo Global de Comunidade do RedotsClub — inspirado no Superteam, construído para um público focado em estilo de vida.',
                      'Una propuesta inicial para el Modelo Global de Comunidad de RedotsClub.',
                      'RedotsClub全球社群模式初稿提案。')}
                </p>
                <div className="hero-meta">
                  {[
                    {num:'5', label: tl('Pillars','Pilares','Pilares','支柱')},
                    {num:'17', label: tl('Articles','Artigos','Artículos','文章')},
                    {num:'20', label: tl('Quiz Questions','Perguntas do Quiz','Preguntas del Quiz','測驗題目')},
                    {num:'1000', label: tl('Member Goal','Meta de Membros','Meta de Miembros','會員目標')},
                  ].map(s=>(
                    <div key={s.label} className="hero-stat">
                      <span className="hero-stat-num">{s.num}</span>
                      <span className="hero-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="content-area">
                <h2 style={{fontWeight:900,fontSize:22,marginBottom:6,fontFamily:'Montserrat,sans-serif'}}>
                  {tl('The Five Pillars','Os Cinco Pilares','Los Cinco Pilares','五大支柱')}
                </h2>
                <p style={{color:'#999',fontSize:14,fontWeight:500}}>
                  {tl('Click any pillar to start reading.','Clique em qualquer pilar para começar a ler.','Haz clic en cualquier pilar para comenzar.','點擊任意支柱開始閱讀。')}
                </p>
                <div className="welcome-grid">
                  {PILLARS.map(p=>(
                    <div key={p.id} className="welcome-card" onClick={()=>goToPillar(p)}>
                      <div className="welcome-card-num">{pillarNum(p)} · {p.articles.length} {tl('articles','artigos','artículos','篇文章')}</div>
                      <h3>{pName(p)}</h3>
                      <p>{pDesc(p)}</p>
                    </div>
                  ))}
                  <div className="welcome-card" onClick={()=>{setView('quiz');setQuizStep('intro');}}
                    style={{borderLeft:'4px solid #000'}}>
                    <div className="welcome-card-num">20 {tl('Questions','Perguntas','Preguntas','問題')}</div>
                    <h3>{tl('Country Lead Quiz','Quiz do Líder de País','Quiz del Líder de País','國家負責人測驗')}</h3>
                    <p>{tl('Test your understanding of the playbook. Results sent to the RedotsClub global team.',
                            'Teste seu entendimento do playbook. Resultados enviados à equipe global do RedotsClub.',
                            'Pon a prueba tu comprensión del playbook.',
                            '測試你對手冊的理解。結果將發送給RedotsClub全球團隊。')}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PILLAR / ARTICLE */}
          {view==='pillar' && activePillar && activeArticle && (
            <>
              <div className="hero" style={{padding:'48px 64px'}}>
                <div className="hero-pattern" />
                <div className="hero-eyebrow">{pillarNum(activePillar)} · {pName(activePillar)}</div>
                <h1 style={{fontSize:36}}>{aTitle(activeArticle)}</h1>
              </div>
              <div className="content-area">
                <div className="article-tabs">
                  {activePillar.articles.map(a=>(
                    <button key={a.id} className={`article-tab${activeArticle.id===a.id?' active':''}`}
                      onClick={()=>{setActiveArticle(a);if(mainRef.current)mainRef.current.scrollTop=0;}}>
                      {aTitle(a)}
                    </button>
                  ))}
                </div>
                <div className="article-content">
                  <div className="article-meta">
                    <span className="article-pillar-tag">{pName(activePillar)}</span>
                    <span className="article-author">{activeArticle.author}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{__html: renderMd(aContent(activeArticle))}} />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:48,paddingTop:20,borderTop:'2px solid #eee'}}>
                  {(()=>{
                    const idx=activePillar.articles.findIndex(a=>a.id===activeArticle.id);
                    const prev=activePillar.articles[idx-1];
                    const next=activePillar.articles[idx+1];
                    return (<>
                      {prev?<button className="quiz-btn quiz-btn-secondary" onClick={()=>setActiveArticle(prev)}>← {aTitle(prev)}</button>:<span/>}
                      {next?<button className="quiz-btn quiz-btn-primary" onClick={()=>setActiveArticle(next)}>{aTitle(next)} →</button>
                           :<button className="quiz-btn quiz-btn-primary" onClick={()=>{setView('quiz');setQuizStep('intro');}}>
                              {tl('Take the Quiz →','Fazer o Quiz →','Tomar el Quiz →','參加測驗 →')}
                            </button>}
                    </>);
                  })()}
                </div>
              </div>
            </>
          )}

          {/* QUIZ */}
          {view==='quiz' && (
            <>
              <div className="hero" style={{padding:'48px 64px'}}>
                <div className="hero-pattern" />
                <div className="hero-eyebrow">{tl('Country Lead Assessment','Avaliação do Líder de País','Evaluación del Líder de País','國家負責人評估')}</div>
                <h1 style={{fontSize:36}}>{tl('Playbook Quiz','Quiz do Playbook','Quiz del Playbook','手冊測驗')}</h1>
              </div>
              <div className="content-area">
                <div className="quiz-container">

                  {quizStep==='intro' && (
                    <>
                      <div className="quiz-hero">
                        <h2>{tl('Ready to be tested?','Pronto para ser testado?','¿Listo para ser evaluado?','準備好接受測試了嗎？')}</h2>
                        <p>{tl('20 questions — 15 multiple choice + 5 scenario responses. Your answers will be sent to lucas@redotpay.com.',
                                '20 questões — 15 de múltipla escolha + 5 respostas de cenário. Suas respostas serão enviadas para lucas@redotpay.com.',
                                '20 preguntas — 15 de opción múltiple + 5 respuestas de escenario.',
                                '20道題目——15道選擇題 + 5道情境回答。答案將發送至lucas@redotpay.com。')}</p>
                      </div>
                      <div className="question-card">
                        <div className="question-type">{tl('Before you begin','Antes de começar','Antes de comenzar','開始之前')}</div>
                        <p style={{fontSize:14,color:'#555',lineHeight:1.65,fontWeight:500,marginBottom:16}}>
                          {tl('This quiz tests your understanding of the RedotsClub Global Playbook. The answers are in the articles. Scenario questions have no single correct answer — they are assessed on quality of reasoning.',
                              'Este quiz testa seu entendimento do Playbook Global do RedotsClub. As respostas estão nos artigos. As questões de cenário não têm uma única resposta correta.',
                              'Este quiz evalúa tu comprensión del Playbook Global de RedotsClub.',
                              '此測驗測試您對RedotsClub全球手冊的理解。情境問題以推理質量評估。')}
                        </p>
                        <ul style={{margin:'0 0 0 20px',fontSize:13,color:'#999',lineHeight:2,fontWeight:500}}>
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
                          {key:'name', label:tl('Full Name','Nome Completo','Nombre Completo','全名'), ph:tl('Your name','Seu nome','Tu nombre','您的姓名')},
                          {key:'country', label:tl('Country / Region','País / Região','País / Región','國家／地區'), ph:tl('e.g. Brazil','ex. Brasil','ej. Brasil','例如：巴西')},
                          {key:'email', label:tl('Email Address','Endereço de Email','Dirección de Email','電郵地址'), ph:'your@email.com'},
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
                          onClick={()=>{setCurrentQ(0);setQuizStep('questions');}}>
                          {tl('Begin Questions →','Iniciar Questões →','Comenzar Preguntas →','開始答題 →')}
                        </button>
                      </div>
                    </>
                  )}

                  {quizStep==='questions' && (()=>{
                    const q=QUIZ_QUESTIONS[currentQ];
                    const answered=quizAnswers[q.id]!==undefined&&quizAnswers[q.id]!=='';
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
                              {q.options.map((opt,i)=>(
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
                              placeholder={tl('Write your response here... Focus on quality of reasoning and practical thinking.',
                                              'Escreva sua resposta aqui... Foque na qualidade do raciocínio e no pensamento prático.',
                                              'Escribe tu respuesta aquí...',
                                              '在此填寫您的回答……')}
                              value={quizAnswers[q.id]||''}
                              onChange={e=>setQuizAnswers(a=>({...a,[q.id]:e.target.value}))}/>
                          )}
                        </div>
                        <div className="quiz-nav">
                          {currentQ>0
                            ?<button className="quiz-btn quiz-btn-secondary" onClick={()=>setCurrentQ(q=>q-1)}>{tl('← Previous','← Anterior','← Anterior','← 上一題')}</button>
                            :<span/>}
                          {currentQ<QUIZ_QUESTIONS.length-1
                            ?<button className="quiz-btn quiz-btn-primary" disabled={!answered} onClick={()=>setCurrentQ(q=>q+1)}>{tl('Next →','Próximo →','Siguiente →','下一題 →')}</button>
                            :<button className="quiz-btn quiz-btn-primary" disabled={!answered||sending} onClick={submitQuiz}>
                               {sending?tl('Sending...','Enviando...','Enviando...','發送中...'):tl('Submit Quiz →','Enviar Quiz →','Enviar Quiz →','提交測驗 →')}
                             </button>}
                        </div>
                      </>
                    );
                  })()}

                  {quizStep==='done' && (
                    <div className="score-screen">
                      <div className="score-circle">
                        <span className="score-num">{mcScore}/15</span>
                        <span className="score-label">{tl('Score','Pontuação','Puntuación','得分')}</span>
                      </div>
                      <h2>
                        {mcScore>=12?tl('Outstanding! 🏆','Excelente! 🏆','¡Sobresaliente! 🏆','出色！🏆'):
                         mcScore>=9 ?tl('Well done! 🎯','Muito bem! 🎯','¡Bien hecho! 🎯','做得好！🎯'):
                         mcScore>=6 ?tl('Good effort. 📚','Bom esforço. 📚','Buen esfuerzo. 📚','繼續努力。📚'):
                                     tl('Keep studying. 💪','Continue estudando. 💪','Sigue estudiando. 💪','繼續學習。💪')}
                      </h2>
                      <p>{tl(
                        `You answered ${mcScore} out of 15 multiple choice questions correctly. Your full results have been sent to lucas@redotpay.com.`,
                        `Você acertou ${mcScore} das 15 questões de múltipla escolha. Seus resultados completos foram enviados para lucas@redotpay.com.`,
                        `Respondiste correctamente ${mcScore} de 15 preguntas.`,
                        `您在15道選擇題中答對了${mcScore}道。完整結果已發送至lucas@redotpay.com。`
                      )}</p>
                      <div className="score-sent-badge">✓ {tl('Results sent to lucas@redotpay.com','Resultados enviados para lucas@redotpay.com','Resultados enviados a lucas@redotpay.com','結果已發送至lucas@redotpay.com')}</div>
                      <div style={{marginTop:28,display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                        <button className="quiz-btn quiz-btn-secondary" onClick={()=>setView('home')}>{tl('← Back to Playbook','← Voltar ao Playbook','← Volver al Playbook','← 返回手冊')}</button>
                        <button className="quiz-btn quiz-btn-primary" onClick={()=>{setQuizStep('intro');setQuizAnswers({});setCurrentQ(0);}}>{tl('Retake Quiz','Refazer Quiz','Repetir Quiz','重新測驗')}</button>
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
