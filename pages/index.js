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

  const t = (en, pt) => lang === 'pt' ? pt : en;

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
    emailBody += `Language: ${lang === 'pt' ? 'Portuguese' : 'English'}\n`;
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

          <div className="lang-toggle">
            <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button className={`lang-btn${lang === 'pt' ? ' active' : ''}`} onClick={() => setLang('pt')}>PT</button>
          </div>

          <nav className="sidebar-nav">
            {/* Home */}
            <div className="pillar-group">
              <button
                className={`pillar-label${view === 'home' ? ' active' : ''}`}
                onClick={() => { setView('home'); setSidebarOpen(false); }}
              >
                <span className="pillar-num" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>⌂</span>
                <span className="pillar-name">{t('Overview', 'Visão Geral')}</span>
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
                  <span className="pillar-name">{t(p.name, p.namePT)}</span>
                  <span className="pillar-arrow">▶</span>
                </button>
                <div className={`article-list${openPillars[p.id] ? ' open' : ''}`}>
                  {p.articles.map(a => (
                    <a
                      key={a.id}
                      className={`article-link${activeArticle?.id === a.id ? ' active' : ''}`}
                      onClick={() => goToArticle(p, a)}
                    >
                      {t(a.title, a.titlePT)}
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <button
              className={`sidebar-quiz-btn${view === 'quiz' ? ' active' : ''}`}
              onClick={() => { setView('quiz'); setQuizStep('intro'); setSidebarOpen(false); }}
            >
              {t('📝 Take the Quiz', '📝 Fazer o Quiz')}
            </button>
          </nav>
        </aside>

        {/* ── MAIN ── */}
        <main className="main" ref={contentRef}>
          {/* HOME */}
          {view === 'home' && (
            <>
              <div className="hero">
                <div className="hero-eyebrow">RedotsClub — {t('Global Community Playbook', 'Playbook Global da Comunidade')}</div>
                <h1>{t(<>Great People.<br/>Exclusive Access.<br/><span>Unforgettable</span> Moments.</>, <>Grandes Pessoas.<br/>Acesso Exclusivo.<br/><span>Momentos</span> Inesquecíveis.</>)}</h1>
                <p className="hero-sub">{t('A first-draft proposal for the RedotsClub Global Community Model — inspired by Superteam, built for a lifestyle-first audience.', 'Uma proposta inicial para o Modelo Global de Comunidade do RedotsClub — inspirado no Superteam, construído para um público focado em estilo de vida.')}</p>
                <div className="hero-meta">
                  {[
                    { num: '5', label: t('Pillars', 'Pilares') },
                    { num: '17', label: t('Articles', 'Artigos') },
                    { num: '20', label: t('Quiz Questions', 'Perguntas do Quiz') },
                    { num: '1000', label: t('Member Goal', 'Meta de Membros') },
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
                  {t('The Five Pillars', 'Os Cinco Pilares')}
                </h2>
                <p style={{ color: 'var(--gray)', marginBottom: 0, fontSize: 15 }}>
                  {t('Click any pillar to start reading.', 'Clique em qualquer pilar para começar a ler.')}
                </p>
                <div className="welcome-grid">
                  {PILLARS.map(p => (
                    <div key={p.id} className="welcome-card" onClick={() => goToPillar(p)}>
                      <div className="welcome-card-num">{t(`Pillar ${p.num}`, `Pilar ${p.num}`)} · {p.articles.length} {t('articles', 'artigos')}</div>
                      <h3>{t(p.name, p.namePT)}</h3>
                      <p>{t(p.description, p.descriptionPT)}</p>
                    </div>
                  ))}
                  <div className="welcome-card" onClick={() => { setView('quiz'); setQuizStep('intro'); }} style={{ borderLeft: '3px solid var(--green)' }}>
                    <div className="welcome-card-num">20 {t('Questions', 'Perguntas')}</div>
                    <h3>{t('Country Lead Quiz', 'Quiz do Líder de País')}</h3>
                    <p>{t('Test your understanding of the playbook. Results sent to the RedotsClub global team.', 'Teste seu entendimento do playbook. Resultados enviados à equipe global do RedotsClub.')}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PILLAR VIEW */}
          {view === 'pillar' && activePillar && activeArticle && (
            <>
              <div className="hero" style={{ padding: '48px 72px' }}>
                <div className="hero-eyebrow">{t(`Pillar ${activePillar.num}`, `Pilar ${activePillar.num}`)} · {t(activePillar.name, activePillar.namePT)}</div>
                <h1 style={{ fontSize: 38 }}>{t(activeArticle.title, activeArticle.titlePT)}</h1>
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
                      {t(a.title, a.titlePT)}
                    </button>
                  ))}
                </div>

                {/* Article content */}
                <div className="article-content">
                  <div className="article-meta">
                    <span className="article-pillar-tag">{t(activePillar.name, activePillar.namePT)}</span>
                    <span className="article-author">{activeArticle.author}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{
                    __html: renderMarkdown(t(activeArticle.content, activeArticle.contentPT))
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
                            {t('Take the Quiz →', 'Fazer o Quiz →')}
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
                <div className="hero-eyebrow">{t('Country Lead Assessment', 'Avaliação do Líder de País')}</div>
                <h1 style={{ fontSize: 38 }}>{t('Playbook Quiz', 'Quiz do Playbook')}</h1>
              </div>

              <div className="content-area">
                <div className="quiz-container">

                  {/* INTRO */}
                  {quizStep === 'intro' && (
                    <>
                      <div className="quiz-hero">
                        <h2>{t('Ready to be tested?', 'Pronto para ser testado?')}</h2>
                        <p>{t('20 questions — 15 multiple choice + 5 scenario responses. Your answers will be sent to the RedotsClub global team at lucas@redotpay.com.', '20 questões — 15 de múltipla escolha + 5 respostas de cenário. Suas respostas serão enviadas para a equipe global do RedotsClub em lucas@redotpay.com.')}</p>
                      </div>
                      <div className="question-card">
                        <div className="question-type">{t('Before you begin', 'Antes de começar')}</div>
                        <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6 }}>
                          {t('This quiz tests your understanding of the RedotsClub Global Playbook. There are no tricks — the answers are in the articles. The scenario questions have no single correct answer; they are assessed on quality of reasoning.', 'Este quiz testa seu entendimento do Playbook Global do RedotsClub. Não há pegadinhas — as respostas estão nos artigos. As questões de cenário não têm uma única resposta correta; são avaliadas com base na qualidade do raciocínio.')}
                        </p>
                        <ul style={{ margin: '16px 0 0 20px', fontSize: 14, color: 'var(--gray)', lineHeight: 1.8 }}>
                          <li>{t('15 Multiple choice questions', '15 Questões de múltipla escolha')}</li>
                          <li>{t('5 Scenario responses (open-ended)', '5 Respostas de cenário (abertas)')}</li>
                          <li>{t('Results sent to lucas@redotpay.com', 'Resultados enviados para lucas@redotpay.com')}</li>
                        </ul>
                      </div>
                      <div className="quiz-nav">
                        <span />
                        <button className="quiz-btn quiz-btn-primary" onClick={() => setQuizStep('form')}>
                          {t('Start Quiz →', 'Iniciar Quiz →')}
                        </button>
                      </div>
                    </>
                  )}

                  {/* FORM */}
                  {quizStep === 'form' && (
                    <>
                      <div className="quiz-form">
                        <h3>{t('Your Details', 'Seus Dados')}</h3>
                        <p>{t('This information will be sent with your quiz results.', 'Esta informação será enviada com seus resultados do quiz.')}</p>
                        <div className="form-group">
                          <label className="form-label">{t('Full Name', 'Nome Completo')}</label>
                          <input className="form-input" placeholder={t('Your name', 'Seu nome')} value={submitterInfo.name}
                            onChange={e => setSubmitterInfo(i => ({ ...i, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('Country / Region', 'País / Região')}</label>
                          <input className="form-input" placeholder={t('e.g. Brazil, Germany, Vietnam', 'ex. Brasil, Alemanha, Vietnã')} value={submitterInfo.country}
                            onChange={e => setSubmitterInfo(i => ({ ...i, country: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">{t('Email Address', 'Endereço de Email')}</label>
                          <input className="form-input" type="email" placeholder={t('your@email.com', 'seu@email.com')} value={submitterInfo.email}
                            onChange={e => setSubmitterInfo(i => ({ ...i, email: e.target.value }))} />
                        </div>
                      </div>
                      <div className="quiz-nav">
                        <button className="quiz-btn quiz-btn-secondary" onClick={() => setQuizStep('intro')}>{t('← Back', '← Voltar')}</button>
                        <button
                          className="quiz-btn quiz-btn-primary"
                          disabled={!submitterInfo.name || !submitterInfo.country || !submitterInfo.email}
                          onClick={() => { setCurrentQ(0); setQuizStep('questions'); }}
                        >
                          {t('Begin Questions →', 'Iniciar Questões →')}
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
                              {t(q.typeLabel, q.typeLabelPT)} · {t(`Question ${q.id}`, `Questão ${q.id}`)}
                            </div>
                            <div className="question-text">{t(q.question, q.questionPT)}</div>

                            {q.type === 'multiple-choice' && (
                              <div className="options-grid">
                                {q.options.map((opt, i) => (
                                  <button
                                    key={i}
                                    className={`option-btn${quizAnswers[q.id] === i ? ' selected' : ''}`}
                                    onClick={() => handleAnswer(q.id, i)}
                                  >
                                    <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                    <span className="option-text">{lang === 'pt' ? q.optionsPT[i] : opt}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {q.type === 'open-ended' && (
                              <textarea
                                className="textarea-answer"
                                placeholder={t('Write your response here... There is no single correct answer — focus on quality of reasoning and practical thinking.', 'Escreva sua resposta aqui... Não há uma única resposta correta — foque na qualidade do raciocínio e no pensamento prático.')}
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
                            {t('← Previous', '← Anterior')}
                          </button>
                        ) : <span />}
                        {currentQ < QUIZ_QUESTIONS.length - 1 ? (
                          <button className="quiz-btn quiz-btn-primary" disabled={!canProceed()} onClick={() => setCurrentQ(q => q + 1)}>
                            {t('Next →', 'Próximo →')}
                          </button>
                        ) : (
                          <button className="quiz-btn quiz-btn-primary" disabled={!canProceed() || sending} onClick={submitQuiz}>
                            {sending ? t('Sending...', 'Enviando...') : t('Submit Quiz →', 'Enviar Quiz →')}
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
                        <span className="score-label">{t('Score', 'Pontuação')}</span>
                      </div>
                      <h2>
                        {mcScore >= 12 ? t('Outstanding! 🏆', 'Excelente! 🏆') :
                         mcScore >= 9  ? t('Well done! 🎯', 'Muito bem! 🎯') :
                         mcScore >= 6  ? t('Good effort. 📚', 'Bom esforço. 📚') :
                                         t('Keep studying. 💪', 'Continue estudando. 💪')}
                      </h2>
                      <p>
                        {t(
                          `You answered ${mcScore} out of 15 multiple choice questions correctly. Your scenario responses and full results have been sent to lucas@redotpay.com.`,
                          `Você acertou ${mcScore} das 15 questões de múltipla escolha. Suas respostas de cenário e resultados completos foram enviados para lucas@redotpay.com.`
                        )}
                      </p>
                      <div className="score-sent-badge">
                        ✓ {t('Results sent to lucas@redotpay.com', 'Resultados enviados para lucas@redotpay.com')}
                      </div>
                      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="quiz-btn quiz-btn-secondary" onClick={() => { setView('home'); }}>
                          {t('← Back to Playbook', '← Voltar ao Playbook')}
                        </button>
                        <button className="quiz-btn quiz-btn-primary" onClick={() => { setQuizStep('intro'); setQuizAnswers({}); setCurrentQ(0); }}>
                          {t('Retake Quiz', 'Refazer Quiz')}
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
