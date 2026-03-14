import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { PILLARS, QUIZ_QUESTIONS } from '../data/content';


// ── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\*\*(.+?)\*\*$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<div class="note-box">$1</div>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li><strong>$1.</strong> $2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hud]|<li|<div|<\/ul|<p|<\/p)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/https:\/\/x\.com\/RedotsClub/g, '<a href="https://x.com/RedotsClub" target="_blank" style="color:var(--gold-dark);text-decoration:underline;">https://x.com/RedotsClub</a>');
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'pillar' | 'quiz'
  const [activePillar, setActivePillar] = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [openPillars, setOpenPillars] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizStep, setQuizStep] = useState('intro'); // 'intro' | 'form' | 'questions' | 'done'
  const [quizAnswers, setQuizAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitterInfo, setSubmitterInfo] = useState({ name: '', country: '', email: '' });
  const [sending, setSending] = useState(false);
  const contentRef = useRef(null);

  const LANGS = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'zh', label: '廣東話', flag: '🇭🇰' },
  ];

  const t = (en, pt, es, zh) => {
    if (lang === 'pt') return pt || en;
    if (lang === 'es') return es || en;
    if (lang === 'zh') return zh || en;
    return en;
  };

  function goToPillar(pillar) {
    setActivePillar(pillar);
    setActiveArticle(pillar.articles[0]);
    setView('pillar');
    setSidebarOpen(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  function goToArticle(pillar, article) {
    setActivePillar(pillar);
    setActiveArticle(article);
    setView('pillar');
    setSidebarOpen(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

  function togglePillar(id) {
    setOpenPillars(p => ({ ...p, [id]: !p[id] }));
  }

  function handleAnswer(qId, value) {
    setQuizAnswers(a => ({ ...a, [qId]: value }));
  }

  function canProceed() {
    const q = QUIZ_QUESTIONS[currentQ];
    return quizAnswers[q.id] !== undefined && quizAnswers[q.id] !== '';
  }

  async function submitQuiz() {
    setSending(true);
    const score = QUIZ_QUESTIONS.filter(q =>
      q.type === 'multiple-choice' && quizAnswers[q.id] === q.correct
    ).length;

    const mcQuestions = QUIZ_QUESTIONS.filter(q => q.type === 'multiple-choice');
    const openQuestions = QUIZ_QUESTIONS.filter(q => q.type === 'open-ended');

    let emailBody = `RedotsClub Global Playbook — Quiz Submission\n`;
    emailBody += `=====================================\n\n`;
    emailBody += `Name: ${submitterInfo.name}\n`;
    emailBody += `Country: ${submitterInfo.country}\n`;
    emailBody += `Email: ${submitterInfo.email}\n`;
    emailBody += `Language: ${LANGS.find(l => l.code === lang)?.label || 'English'}\n`;
    emailBody += `Score (Multiple Choice): ${score}/${mcQuestions.length}\n\n`;
    emailBody += `MULTIPLE CHOICE ANSWERS\n`;
    emailBody += `------------------------\n`;
    mcQuestions.forEach(q => {
      const ans = quizAnswers[q.id];
      const correct = ans === q.correct;
      emailBody += `\nQ${q.id}: ${q.question}\n`;
      emailBody += `Answer: ${q.options[ans] || 'No answer'}\n`;
      emailBody += `Result: ${correct ? '✓ CORRECT' : '✗ WRONG (Correct: ' + q.options[q.correct] + ')'}\n`;
    });
    emailBody += `\nSCENARIO RESPONSES\n`;
    emailBody += `-------------------\n`;
    openQuestions.forEach(q => {
      emailBody += `\nQ${q.id}: ${q.question}\n`;
      emailBody += `Response:\n${quizAnswers[q.id] || '(No response)'}\n`;
    });

    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'redotsclub_quiz',
          template_id: 'quiz_results',
          user_id: 'redotsclub_public_key',
          template_params: {
            to_email: 'lucas@redotpay.com',
            from_name: submitterInfo.name,
            from_country: submitterInfo.country,
            reply_to: submitterInfo.email,
            score: `${score}/${mcQuestions.length}`,
            body: emailBody
          }
        })
      });
    } catch (e) { /* silent fail — results still shown */ }

    setSending(false);
    setQuizStep('done');
    const mcScore = score;
    window._quizScore = mcScore;
    window._quizTotal = mcQuestions.length;
  }

  const mcScore = QUIZ_QUESTIONS.filter(q =>
    q.type === 'multiple-choice' && quizAnswers[q.id] === q.correct
  ).length;

  return (
    <>
      <Head>
        <title>RedotsClub Global Playbook</title>
        <meta name="description" content="RedotsClub Global Community Playbook — Great People. Exclusive Access. Unforgettable Moments." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
      </Head>

      <button className="mobile-toggle" onClick={() => setSidebarOpen(o => !o)}>☰</button>

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <img src="/logo.png" alt="RedotsClub" />
            <div className="sidebar-tagline">Global Playbook</div>
          </div>

          <div className="lang-selector">
            <div className="lang-selected" onClick={() => setLangOpen(o => !o)}>
              <span className="lang-selected-text">
                <span className="lang-flag">{LANGS.find(l => l.code === lang)?.flag}</span>
                {LANGS.find(l => l.code === lang)?.label}
              </span>
              <span className={`lang-chevron${langOpen ? ' open' : ''}`}>▼</span>
            </div>
            {langOpen && (
              <div className="lang-dropdown">
                {LANGS.map(l => (
                  <button
                    key={l.code}
                    className={`lang-option${lang === l.code ? ' active' : ''}`}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                  >
                    <span className="lang-flag">{l.flag}</span>
                    {l.label}
                    <span className="lang-option-code">{l.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="sidebar-nav">
            {/* Home */}
            <div className="pillar-group">
              <button
                className={`pillar-label${view === 'home' ? ' active' : ''}`}
                onClick={() => { setView('home'); setSidebarOpen(false); }}
              >
                <span className="pillar-num" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>⌂</span>
                <span className="pillar-name">{t('Overview', 'Visão Geral', 'Resumen', '概覽')}</span>
              </button>
            </div>

            {PILLARS.map(p => (
              <div key={p.id} className="pillar-group">
                <button
                  className={`pillar-label${activePillar?.id === p.id ? ' active' : ''}${openPillars[p.id] ? ' open' : ''}`}
                  onClick={() => {
                    togglePillar(p.id);
                    goToPillar(p);
                  }}
                >
                  <span className="pillar-num">{p.num}</span>
                  <span className="pillar-name">{lang === 'pt' ? p.namePT : lang === 'es' ? (p.nameES || p.name) : lang === 'zh' ? (p.nameZH || p.name) : p.name}</span>
                  <span className="pillar-arrow">▶</span>
                </button>
                <div className={`article-list${openPillars[p.id] ? ' open' : ''}`}>
                  {p.articles.map(a => (
                    <a
                      key={a.id}
                      className={`article-link${activeArticle?.id === a.id ? ' active' : ''}`}
                      onClick={() => goToArticle(p, a)}
                    >
                      {lang==='pt'?a.titlePT:lang==='es'?(a.titleES||a.title):lang==='zh'?(a.titleZH||a.title):a.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <button
              className={`sidebar-quiz-btn${view === 'quiz' ? ' active' : ''}`}
              onClick={() => { setView('quiz'); setQuizStep('intro'); setSidebarOpen(false); }}
            >
              {t('📝 Take the Quiz', '📝 Fazer o Quiz', '📝 Tomar el Quiz', '📝 參加測驗')}
            </button>
          </nav>
        </aside>

        {/* ── MAIN ── */}
        <main className="main" ref={contentRef}>
          {/* HOME */}
          {view === 'home' && (
            <>
              <div className="hero">
                <div className="hero-eyebrow">RedotsClub — {t('Global Community Playbook', 'Playbook Global da Comunidade', 'Guía Global de Comunidad', '全球社群指南')}</div>
                <h1>{t(<>Great People.<br/>Exclusive Access.<br/><span>Unforgettable</span> Moments.</>, <>Grandes Pessoas.<br/>Acesso Exclusivo.<br/><span>Momentos</span> Inesquecíveis.</>)}</h1>
                <p className="hero-sub">{t('A first-draft proposal for the RedotsClub Global Community Model — inspired by Superteam, built for a lifestyle-first audience.', 'Uma proposta inicial para o Modelo Global de Comunidade do RedotsClub — inspirado no Superteam, construído para um público focado em estilo de vida.', 'Una propuesta inicial para el Modelo Global de Comunidad de RedotsClub — inspirado en Superteam, construido para una audiencia lifestyle.', 'RedotsClub全球社群模式初稿提案——以Superteam為靈感，為生活方式受眾而建。')}</p>
                <div className="hero-meta">
                  {[
                    { num: '5', label: t('Pillars', 'Pilares', 'Pilares', '支柱') },
                    { num: '17', label: t('Articles', 'Artigos', 'Artículos', '文章') },
                    { num: '20', label: t('Quiz Questions', 'Perguntas do Quiz', 'Preguntas del Quiz', '測驗題目') },
                    { num: '1000', label: t('Member Goal', 'Meta de Membros', 'Meta de Miembros', '會員目標') },
                  ].map(s => (
                    <div key={s.label} className="hero-stat">
                      <span className="hero-stat-num">{s.num}</span>
                      <span className="hero-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="content-area">
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: 'var(--green)', marginBottom: 8 }}>
                  {t('The Five Pillars', 'Os Cinco Pilares', 'Los Cinco Pilares', '五大支柱')}
                </h2>
                <p style={{ color: 'var(--gray)', marginBottom: 0, fontSize: 15 }}>
                  {t('Click any pillar to start reading.', 'Clique em qualquer pilar para começar a ler.', 'Haz clic en cualquier pilar para comenzar a leer.', '點擊任意支柱開始閱讀。')}
                </p>
                <div className="welcome-grid">
                  {PILLARS.map(p => (
                    <div key={p.id} className="welcome-card" onClick={() => goToPillar(p)}>
                      <div className="welcome-card-num">{lang==='pt'?`Pilar ${p.num}`:lang==='es'?`Pilar ${p.num}`:lang==='zh'?`支柱 ${p.num}`:`Pillar ${p.num}`} · {p.articles.length} {t('articles', 'artigos', 'artículos', '篇文章')}</div>
                      <h3>{lang==='pt'?p.namePT:lang==='es'?(p.nameES||p.name):lang==='zh'?(p.nameZH||p.name):p.name}</h3>
                      <p>{lang==='pt'?p.descriptionPT:lang==='es'?(p.descriptionES||p.description):lang==='zh'?(p.descriptionZH||p.description):p.description}</p>
                    </div>
                  ))}
                  <div className="welcome-card" onClick={() => { setView('quiz'); setQuizStep('intro'); }} style={{ borderLeft: '3px solid var(--green)' }}>
                    <div className="welcome-card-num">20 {t('Questions', 'Perguntas', 'Preguntas', '問題')}</div>
                    <h3>{t('Country Lead Quiz', 'Quiz do Líder de País', 'Quiz del Líder de País', '國家負責人測驗')}</h3>
                    <p>{t('Test your understanding of the playbook. Results sent to the RedotsClub global team.', 'Teste seu entendimento do playbook. Resultados enviados à equipe global do RedotsClub.', 'Pon a prueba tu comprensión del playbook. Resultados enviados al equipo global de RedotsClub.', '測試你對手冊的理解。結果將發送給RedotsClub全球團隊。')}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PILLAR VIEW */}
          {view === 'pillar' && activePillar && activeArticle && (
            <>
              <div className="hero" style={{ padding: '48px 72px' }}>
                <div className="hero-eyebrow">{lang==='pt'?`Pilar ${activePillar.num}`:lang==='es'?`Pilar ${activePillar.num}`:lang==='zh'?`支柱 ${activePillar.num}`:`Pillar ${activePillar.num}`} · {lang==='pt'?activePillar.namePT:lang==='es'?(activePillar.nameES||activePillar.name):lang==='zh'?(activePillar.nameZH||activePillar.name):activePillar.name}</div>
                <h1 style={{ fontSize: 38 }}>{lang==='pt'?activeArticle.titlePT:lang==='es'?(activeArticle.titleES||activeArticle.title):lang==='zh'?(activeArticle.titleZH||activeArticle.title):activeArticle.title}</h1>
              </div>

              <div className="content-area">
                {/* Article tabs */}
                <div className="article-tabs">
                  {activePillar.articles.map(a => (
                    <button
                      key={a.id}
                      className={`article-tab${activeArticle.id === a.id ? ' active' : ''}`}
                      onClick={() => { setActiveArticle(a); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                    >
                      {lang==='pt'?a.titlePT:lang==='es'?(a.titleES||a.title):lang==='zh'?(a.titleZH||a.title):a.title}
                    </button>
                  ))}
                </div>

                {/* Article content */}
                <div className="article-content">
                  <div className="article-meta">
                    <span className="article-pillar-tag">{lang==='pt'?activePillar.namePT:lang==='es'?(activePillar.nameES||activePillar.name):lang==='zh'?(activePillar.nameZH||activePillar.name):activePillar.name}</span>
                    <span className="article-author">{activeArticle.author}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{
                    __html: renderMarkdown(lang==='pt'?activeArticle.contentPT:lang==='es'?(activeArticle.contentES||activeArticle.content):lang==='zh'?(activeArticle.contentZH||activeArticle.content):activeArticle.content)
                  }} />
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--off-white)' }}>
                  {(() => {
                    const idx = activePillar.articles.findIndex(a => a.id === activeArticle.id);
                    const prev = activePillar.articles[idx - 1];
                    const next = activePillar.articles[idx + 1];
                    return (
                      <>
                        {prev ? (
                          <button className="quiz-btn quiz-btn-secondary" onClick={() => setActiveArticle(prev)}>
                            ← {t(prev.title, prev.titlePT)}
                          </button>
                        ) : <span />}
                        {next ? (
                          <button className="quiz-btn quiz-btn-primary" onClick={() => setActiveArticle(next)}>
                            {t(next.title, next.titlePT)} →
                          </button>
                        ) : (
                          <button className="quiz-btn quiz-btn-primary" onClick={() => { setView('quiz'); setQuizStep('intro'); }}>
                            {t('Take the Quiz →', 'Fazer o Quiz →', 'Tomar el Quiz →', '參加測驗 →')}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* QUIZ */}
          {view === 'quiz' && (
            <>
              <div className="hero" style={{ padding: '48px 72px' }}>
                <div className="hero-eyebrow">{t('Country Lead Assessment', 'Avaliação do Líder de País', 'Evaluación del Líder de País', '國家負責人評估')}</div>
                <h1 style={{ fontSize: 38 }}>{t('Playbook Quiz', 'Quiz do Playbook', 'Quiz del Playbook', '手冊測驗')}</h1>
              </div>

              <div className="content-area">
                <div className="quiz-container">

                  {/* INTRO */}
                  {quizStep === 'intro' && (
                    <>
                      <div className="quiz-hero">
                        <h2>{t('Ready to be tested?', 'Pronto para ser testado?', '¿Listo para ser evaluado?', '準備好接受測試了嗎？')}</h2>
                        <p>{t('20 questions — 15 multiple choice + 5 scenario responses. Your answers will be sent to the RedotsClub global team at lucas@redotpay.com.', '20 questões — 15 de múltipla escolha + 5 respostas de cenário. Suas respostas serão enviadas para a equipe global do RedotsClub em lucas@redotpay.com.', '20 preguntas — 15 de opción múltiple + 5 respuestas de escenario. Tus respuestas se enviarán al equipo global de RedotsClub en lucas@redotpay.com.', '20道題目——15道選擇題 + 5道情境回答。您的答案將發送至RedotsClub全球團隊lucas@redotpay.com。')}</p>
                      </div>
                      <div className="question-card">
                        <div className="question-type">{t('Before you begin', 'Antes de começar', 'Antes de comenzar', '開始之前')}</div>
                        <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6 }}>
                          {t('This quiz tests your understanding of the RedotsClub Global Playbook. There are no tricks — the answers are in the articles. The scenario questions have no single correct answer; they are assessed on quality of reasoning.', 'Este quiz testa seu entendimento do Playbook Global do RedotsClub. Não há pegadinhas — as respostas estão nos artigos. As questões de cenário não têm uma única resposta correta; são avaliadas com base na qualidade do raciocínio.', 'Este quiz evalúa tu comprensión del Playbook Global de RedotsClub. No hay trucos — las respuestas están en los artículos. Las preguntas de escenario no tienen una única respuesta correcta; se evalúan por la calidad del razonamiento.', '此測驗測試您對RedotsClub全球手冊的理解。沒有陷阱——答案就在文章中。情境問題沒有單一正確答案；以推理質量評估。')}
                        </p>
                        <ul style={{ margin: '16px 0 0 20px', fontSize: 14, color: 'var(--gray)', lineHeight: 1.8 }}>
                          <li>{t('15 Multiple choice questions', '15 Questões de múltipla escolha', '15 Preguntas de opción múltiple', '15道選擇題')}</li>
                          <li>{t('5 Scenario responses (open-ended)', '5 Respostas de cenário (abertas)', '5 Respuestas de escenario (abiertas)', '5道開放式情境回答')}</li>
                          <li>{t('Results sent to lucas@redotpay.com', 'Resultados enviados para lucas@redotpay.com', 'Resultados enviados a lucas@redotpay.com', '結果已發送至lucas@redotpay.com')}</li>
                        </ul>
                      </div>
                      <div className="quiz-nav">
                        <span />
                        <button className="quiz-btn quiz-btn-primary" onClick={() => setQuizStep('form')}>
                          {t('Start Quiz →', 'Iniciar Quiz →', 'Iniciar Quiz →', '開始測驗 →')}
                        </button>
                      </div>
                    </>
                  )}

                  {/* FORM */}
                  {quizStep === 'form' && (
                    <>
                      <div className="quiz-form">
                        <h3>{t('Your Details', 'Seus Dados', 'Tus Datos', '您的資料')}</h3>
                        <p>{t('This information will be sent with your quiz results.', 'Esta informação será enviada com seus resultados do quiz.', 'Esta información se enviará con tus resultados del quiz.', '此資訊將與您的測驗結果一併發送。')}</p>
                        <div className="form-group">
                          <label className="form-label">{t('Full Name', 'Nome Completo', 'Nombre Completo', '全名')}</label>
                          <input className="form-input" placeholder={t('Your name', 'Seu nome', 'Tu nombre', '您的姓名')} value={submitterInfo.name}
                            onChange={e => setSubmitterInfo(i => ({ ...i, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('Country / Region', 'País / Região', 'País / Región', '國家／地區')}</label>
                          <input className="form-input" placeholder={t('e.g. Brazil, Germany, Vietnam', 'ex. Brasil, Alemanha, Vietnã', 'ej. Brasil, Alemania, Vietnam', '例如：巴西、德國、越南')} value={submitterInfo.country}
                            onChange={e => setSubmitterInfo(i => ({ ...i, country: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('Email Address', 'Endereço de Email', 'Dirección de Email', '電郵地址')}</label>
                          <input className="form-input" type="email" placeholder={t('your@email.com', 'seu@email.com', 'tu@email.com', 'your@email.com')} value={submitterInfo.email}
                            onChange={e => setSubmitterInfo(i => ({ ...i, email: e.target.value }))} />
                        </div>
                      </div>
                      <div className="quiz-nav">
                        <button className="quiz-btn quiz-btn-secondary" onClick={() => setQuizStep('intro')}>{t('← Back', '← Voltar', '← Atrás', '← 返回')}</button>
                        <button
                          className="quiz-btn quiz-btn-primary"
                          disabled={!submitterInfo.name || !submitterInfo.country || !submitterInfo.email}
                          onClick={() => { setCurrentQ(0); setQuizStep('questions'); }}
                        >
                          {t('Begin Questions →', 'Iniciar Questões →', 'Comenzar Preguntas →', '開始答題 →')}
                        </button>
                      </div>
                    </>
                  )}

                  {/* QUESTIONS */}
                  {quizStep === 'questions' && (
                    <>
                      <div className="quiz-progress">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${((currentQ + 1) / QUIZ_QUESTIONS.length) * 100}%` }} />
                        </div>
                        <span className="progress-text">{currentQ + 1} / {QUIZ_QUESTIONS.length}</span>
                      </div>

                      {(() => {
                        const q = QUIZ_QUESTIONS[currentQ];
                        return (
                          <div className="question-card" key={q.id}>
                            <div className="question-type">
                              {lang==='pt'?q.typeLabelPT:lang==='es'?(q.typeLabelES||q.typeLabel):lang==='zh'?(q.typeLabelZH||q.typeLabel):q.typeLabel} · {t(`Question ${q.id}`, `Questão ${q.id}`)}
                            </div>
                            <div className="question-text">{lang==='pt'?q.questionPT:lang==='es'?(q.questionES||q.question):lang==='zh'?(q.questionZH||q.question):q.question}</div>

                            {q.type === 'multiple-choice' && (
                              <div className="options-grid">
                                {q.options.map((opt, i) => (
                                  <button
                                    key={i}
                                    className={`option-btn${quizAnswers[q.id] === i ? ' selected' : ''}`}
                                    onClick={() => handleAnswer(q.id, i)}
                                  >
                                    <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                    <span className="option-text">{lang==='pt'?q.optionsPT[i]:lang==='es'?(q.optionsES?q.optionsES[i]:opt):lang==='zh'?(q.optionsZH?q.optionsZH[i]:opt):opt}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {q.type === 'open-ended' && (
                              <textarea
                                className="textarea-answer"
                                placeholder={t('Write your response here... There is no single correct answer — focus on quality of reasoning and practical thinking.', 'Escreva sua resposta aqui... Não há uma única resposta correta — foque na qualidade do raciocínio e no pensamento prático.', 'Escribe tu respuesta aquí... No hay una única respuesta correcta — enfócate en la calidad del razonamiento y el pensamiento práctico.', '在此填寫您的回答……沒有單一正確答案——專注於推理質量和實際思考。')}
                                value={quizAnswers[q.id] || ''}
                                onChange={e => handleAnswer(q.id, e.target.value)}
                              />
                            )}
                          </div>
                        );
                      })()}

                      <div className="quiz-nav">
                        {currentQ > 0 ? (
                          <button className="quiz-btn quiz-btn-secondary" onClick={() => setCurrentQ(q => q - 1)}>
                            {t('← Previous', '← Anterior', '← Anterior', '← 上一題')}
                          </button>
                        ) : <span />}
                        {currentQ < QUIZ_QUESTIONS.length - 1 ? (
                          <button className="quiz-btn quiz-btn-primary" disabled={!canProceed()} onClick={() => setCurrentQ(q => q + 1)}>
                            {t('Next →', 'Próximo →', 'Siguiente →', '下一題 →')}
                          </button>
                        ) : (
                          <button className="quiz-btn quiz-btn-primary" disabled={!canProceed() || sending} onClick={submitQuiz}>
                            {sending ? t('Sending...', 'Enviando...', 'Enviando...', '發送中...') : t('Submit Quiz →', 'Enviar Quiz →', 'Enviar Quiz →', '提交測驗 →')}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* DONE */}
                  {quizStep === 'done' && (
                    <div className="score-screen">
                      <div className="score-circle">
                        <span className="score-num">{mcScore}/15</span>
                        <span className="score-label">{t('Score', 'Pontuação', 'Puntuación', '得分')}</span>
                      </div>
                      <h2>
                        {mcScore >= 12 ? t('Outstanding! 🏆', 'Excelente! 🏆', '¡Sobresaliente! 🏆', '出色！🏆') :
                         mcScore >= 9  ? t('Well done! 🎯', 'Muito bem! 🎯', '¡Bien hecho! 🎯', '做得好！🎯') :
                         mcScore >= 6  ? t('Good effort. 📚', 'Bom esforço. 📚', 'Buen esfuerzo. 📚', '繼續努力。📚') :
                                         t('Keep studying. 💪', 'Continue estudando. 💪', 'Sigue estudiando. 💪', '繼續學習。💪')}
                      </h2>
                      <p>
                        {t(
                          `You answered ${mcScore} out of 15 multiple choice questions correctly. Your scenario responses and full results have been sent to lucas@redotpay.com.`,
                          `Você acertou ${mcScore} das 15 questões de múltipla escolha. Suas respostas de cenário e resultados completos foram enviados para lucas@redotpay.com.`
                        )}
                      </p>
                      <div className="score-sent-badge">
                        ✓ {t('Results sent to lucas@redotpay.com', 'Resultados enviados para lucas@redotpay.com', 'Resultados enviados a lucas@redotpay.com', '結果已發送至lucas@redotpay.com')}
                      </div>
                      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="quiz-btn quiz-btn-secondary" onClick={() => { setView('home'); }}>
                          {t('← Back to Playbook', '← Voltar ao Playbook', '← Volver al Playbook', '← 返回手冊')}
                        </button>
                        <button className="quiz-btn quiz-btn-primary" onClick={() => { setQuizStep('intro'); setQuizAnswers({}); setCurrentQ(0); }}>
                          {t('Retake Quiz', 'Refazer Quiz', 'Repetir Quiz', '重新測驗')}
                        </button>
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
