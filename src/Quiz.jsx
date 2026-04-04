import { useState, useEffect, useRef } from "react";

// ─── RADAR SCANNER ──────────────────────────────────────────────────────────
function RadarScanner({ total, active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const SIZE = canvas.width;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const R = SIZE * 0.41;
    const TICKS = 4;

    const activeIndices = new Set();
    if (active > 0) {
      const step = total / active;
      for (let i = 0; i < active; i++) {
        activeIndices.add(Math.round(i * step) % total);
      }
    }

    const state = {
      scanAngle: -Math.PI / 2,
      activated: new Set(),
      pings: [],
      phase: "scanning",
      speed: 0.022,
      rotations: 0,
      startAngle: -Math.PI / 2,
    };

    const getPos = (idx) => {
      const a = (idx / total) * Math.PI * 2 - Math.PI / 2;
      return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R, a };
    };

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      for (let t = 1; t <= TICKS; t++) {
        ctx.beginPath();
        ctx.arc(CX, CY, (R * t) / TICKS, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(212,175,55,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let i = 0; i < total; i++) {
        const { x, y } = getPos(i);
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "rgba(212,175,55,0.10)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (state.activated.size > 1) {
        const pts = [...state.activated].sort((a, b) => a - b).map(i => getPos(i));
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = "rgba(184,134,90,0.10)";
        ctx.fill();
        ctx.strokeStyle = "rgba(212,160,112,0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      state.pings = state.pings.filter(p => p.alpha > 0);
      state.pings.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,160,112,${p.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        p.r += 2.8;
        p.alpha -= 0.028;
      });

      const sweepLen = Math.PI * 0.5;
      const steps = 28;
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const a = state.scanAngle - sweepLen * ratio;
        const opacity = (1 - ratio) * (state.phase === "scanning" ? 0.5 : 0.18);
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
        ctx.strokeStyle = `rgba(212,160,112,${opacity})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(state.scanAngle) * R, CY + Math.sin(state.scanAngle) * R);
      ctx.strokeStyle = state.phase === "scanning" ? "rgba(255,205,150,0.95)" : "rgba(212,160,112,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < total; i++) {
        const { x, y } = getPos(i);
        const on = state.activated.has(i);
        if (on) {
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(212,160,112,0.12)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(x, y, on ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = on ? "#d4a070" : "rgba(184,134,90,0.18)";
        ctx.fill();
        if (on) {
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "#fff5e8";
          ctx.fill();
        }
      }

      ctx.beginPath();
      ctx.arc(CX, CY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(212,160,112,0.5)";
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(SIZE * 0.115)}px Georgia, serif`;
      ctx.fillStyle = "#C5A059";
      ctx.fillText(String(active), CX, CY - SIZE * 0.038);
      ctx.font = `${Math.round(SIZE * 0.052)}px Georgia, serif`;
      ctx.fillStyle = "rgba(212,175,55,0.45)";
      ctx.fillText(`DE ${total}`, CX, CY + SIZE * 0.068);
    };

    const tick = () => {
      state.scanAngle += state.speed;
      const swept = state.scanAngle - state.startAngle;

      for (let i = 0; i < total; i++) {
        if (!activeIndices.has(i)) continue;
        if (state.activated.has(i)) continue;
        const pointAngle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const pointSwept = ((pointAngle - state.startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const currentSwept = ((swept) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (currentSwept >= pointSwept && currentSwept - pointSwept < 0.15) {
          state.activated.add(i);
          const { x, y } = getPos(i);
          state.pings.push({ x, y, r: 5, alpha: 0.85 });
        }
      }

      if (swept >= Math.PI * 2 && state.phase === "scanning") {
        state.phase = "monitoring";
        state.speed = 0.004;
        activeIndices.forEach(i => state.activated.add(i));
      }

      draw();
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, total]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 0 56px 0" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#94A3B8", marginBottom: "20px" }}>
        Mapeamento de padrões
      </div>
      <canvas ref={canvasRef} width={300} height={300} style={{ display: "block" }} />
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#D4AF37", marginTop: "16px" }}>
        {active} padrão{active !== 1 ? "s" : ""} identificado{active !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────

const quizData = {
  title: "Esse teste revela um padrão que a maioria das mulheres não sabe que tem.",
  intro: "São 10 situações. Parece simples. Mas o resultado muda a forma como você enxerga decisões que você tomou — e o motivo não é o que você pensa.",
  bullets: ["Menos de 2 minutos", "Sem email. Sem dados", "Totalmente anônimo"],
  statements: [
    "Você já preferiu não falar sobre algo que te incomodou porque achou que ia virar uma briga maior do que valia a pena.",
    "Depois de uma briga ou conversa difícil, você já ficou repassando tudo na cabeça — no banho, antes de dormir, no trânsito — tentando descobrir onde as coisas saíram do controle.",
    "Você já pensou \"talvez eu tenha exagerado\" logo depois de uma situação que, na hora, claramente pareceu injusta pra você.",
    "Você já se convenceu de que o comportamento de alguém que te magoou tinha uma boa explicação — \"ele deve estar passando por algo difícil\".",
    "Você já ouviu alguém desabafar por um bom tempo e, quando tentou falar sobre algo seu, a conversa mudou de assunto rapidinho.",
    "Você já sentiu um cansaço estranho depois de certas conversas — não era raiva nem tristeza, mas uma sensação pesada que ficava em você.",
    "Você já foi a pessoa que voltou a falar sobre uma briga para tentar resolver — enquanto a outra pessoa esperava em silêncio ou ficou no canto dela.",
    "Você já explicou como se sentiu mais de uma vez pra mesma pessoa — e mesmo assim tudo aconteceu de novo.",
    "Em alguma relação, você já sentiu que precisava se segurar na conversa porque sabia que, se falasse mais direto, as coisas iam piorar.",
    "Você já teve aquele pensamento silencioso de: \"por que sempre sou eu que estou tentando fazer tudo funcionar?\""
  ],
  results: [
    {
      scoreMin: 0,
      scoreMax: 2,
      name: "O padrão ainda é sutil — e é exatamente por isso que ele é perigoso.",
      text: "Você se identificou com pouca coisa. A maioria das mulheres nesse resultado acha que está tudo bem — e é exatamente aí que o padrão se instala sem ser percebido.\n\nEle nunca começa grande. Começa com uma situação que parece pequena demais pra se preocupar. Uma conversa que ficou estranha. Um plano que foi adiado sem um motivo claro. Uma pergunta que ficou na sua cabeça mais do que deveria.\n\nSe alguma das perguntas desse teste ficou com você depois de responder — presta atenção nisso. Pesquisadores de psicologia comportamental descobriram que esse padrão é mais comum do que qualquer mulher imagina. E ele se fortalece justamente quando não é visto.",
      cta: "Descobrir como esse padrão começa"
    },
    {
      scoreMin: 3,
      scoreMax: 5,
      name: "Existe um padrão se formando — e ele não para sozinho.",
      text: "Você se identificou com situações que a maioria das pessoas normaliza. Medir palavras. Repassar conversas na cabeça. Engolir o que incomoda pra não criar clima. Parecem pequenas. Mas quando se repetem, são os primeiros sinais de algo que vai crescendo.\n\nA maioria das mulheres que vive isso hoje olha pra trás daqui a dois anos e diz: 'eu já sabia que algo não tava certo, mas achei que era pequeno demais pra me preocupar.' Esse é o momento em que ainda dá pra interromper antes que ele defina como você vive suas relações.\n\nO que esse teste mostra é onde você está. O que ele não mostra é por que isso acontece — e o que faz esse padrão se repetir sem você perceber.",
      cta: "Entender por que esse padrão se repete"
    },
    {
      scoreMin: 6,
      scoreMax: 8,
      name: "Esse padrão já está ativo nas suas relações.",
      text: "Você se identificou com a maioria das situações. Você já se acostumou a ser a pessoa que cede pra manter a paz. E faz isso tão no automático que nem percebe mais.\n\nVocê provavelmente já tentou mudar. Já tentou falar, se posicionar, colocar um limite. Mas na hora que a reação veio — o silêncio, a cara fechada, a culpa — você voltou atrás. Não porque é fraca. Porque ninguém te explicou o que está acontecendo de verdade.\n\nExiste um nome pra isso. Existe um mecanismo. E ele pode ser interrompido.",
      cta: "Ver como interromper esse padrão"
    },
    {
      scoreMin: 9,
      scoreMax: 10,
      name: "Suas decisões não estão sendo só suas.",
      text: "Você se identificou com quase tudo. Isso não é coincidência — é um padrão que já mudou a forma como você vive, como você fala, como você decide.\n\nIsso acontece porque o padrão não afeta só como você se sente, mas como você se comporta. Você parou de ser a pessoa que decide e passou a ser a pessoa que reage à reação dos outros. E quanto mais você tenta resolver, mais o padrão se alimenta.\n\nA boa notícia é que, quando você entende o mecanismo, ele perde a força. Você não precisa de anos de terapia pra isso — você precisa das ferramentas certas para o momento em que o padrão tenta se ativar.",
      cta: "Acessar as ferramentas agora"
    }
  ]
};


const getResult = (score) => quizData.results.find(r => score >= r.scoreMin && score <= r.scoreMax) || quizData.results[quizData.results.length - 1];

const G = "linear-gradient(135deg, #8A6D3B 0%, #C5A059 20%, #F7D774 45%, #FFFFFF 50%, #F7D774 55%, #C5A059 80%, #8A6D3B 100%)";

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#FFFFFF",
    borderRadius: "24px",
    padding: "18px",
    border: "1px solid rgba(0,0,0,0.05)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    ...style
  }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{
    fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em",
    textTransform: "uppercase", color: "#D4AF37", marginBottom: "10px"
  }}>
    {children}
  </div>
);


const PROCESSING_STEPS = [
  { label: "Padrões de comunicação...", time: 500 },
  { label: "Gatilhos emocionais...", time: 1600 },
  { label: "Protocolos psicológicos...", time: 2200 },
  { label: "Sinais de reciprocidade...", time: 3200 },
  { label: "Dinâmicas de poder...", time: 4600 },
  { label: "Leitura personalizada...", time: 5200 },
];
const PROCESSING_TOTAL = 6500;

export default function Quiz() {
  const [phase, setPhase] = useState("intro");
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(null);
  const [animating, setAnimating] = useState(false);

  const [imagesReady, setImagesReady] = useState(false);
  const [imgExt, setImgExt] = useState('.png');

  useEffect(() => {
    // Detect WebP support
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp').indexOf('data:image/webp') === 0;
    const ext = supportsWebP ? '.webp' : '.png';
    setImgExt(ext);

    // Priority: intro first, then first 3 questions, then rest
    const priority = [
      `/intro${ext}`,
      `/1${ext}`, `/2${ext}`, `/3${ext}`
    ];
    const rest = [
      `/cta${ext}`,
      ...Array.from({ length: 12 }, (_, i) => `/${i + 4}${ext}`)
    ];

    const preload = (src) => new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = src;
      if (img.decode) img.decode().catch(() => {});
    });

    // Load priority images first (sequentially to avoid bandwidth competition)
    (async () => {
      for (const src of priority) {
        await preload(src);
      }
      setImagesReady(true);
      // Then load rest in parallel (user is still on intro or early questions)
      await Promise.all(rest.map(preload));
    })();
  }, []);

  // ── Processing screen state ──
  const [procStepsDone, setProcStepsDone] = useState(new Set());
  const [procActiveStep, setProcActiveStep] = useState(null);
  const procStartRef = useRef(null);
  const procRafRef = useRef(null);
  const procBarRef = useRef(null);
  const procPctRef = useRef(null);

  // ── RASTREADOR DO FACEBOOK (CÉREBRO) ──
  useEffect(() => {
    if (phase === "result") {
      // Avisa o Facebook que ela terminou o quiz
      if (window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_name: 'Resultado do Quiz',
          content_category: 'Funil ClaraMente'
        });
      }
    }
  }, [phase]);

  const handleAnswer = (val) => {
    if (animating) return;
    setAnimating(true);
    const newAnswers = { ...answers, [current]: val };
    setAnswers(newAnswers);
    setTimeout(() => {
      if (current < quizData.statements.length - 1) {
        setCurrent(current + 1);
        setAnimating(false);
      } else {
        const total = Object.values(newAnswers).filter(Boolean).length;
        setScore(total);
        setPhase("processing");
        setAnimating(false);
      }
    }, 300);
  };

  // Start processing timers when phase becomes "processing"
  useEffect(() => {
    if (phase !== "processing") return;

    if (procBarRef.current) procBarRef.current.style.width = '0%';
    if (procPctRef.current) procPctRef.current.textContent = '0%';
    setProcStepsDone(new Set());
    setProcActiveStep(null);

    const timers = PROCESSING_STEPS.map((step, i) =>
      setTimeout(() => {
        setProcActiveStep(i);
        if (i > 0) setProcStepsDone(prev => { const n = new Set(prev); n.add(i - 1); return n; });
      }, step.time)
    );
    const lastStep = setTimeout(() => {
      setProcStepsDone(prev => { const n = new Set(prev); n.add(PROCESSING_STEPS.length - 1); return n; });
    }, 6200);

    procStartRef.current = performance.now();
    const animate = (now) => {
      const elapsed = now - procStartRef.current;
      const t = Math.min(elapsed / PROCESSING_TOTAL, 1);
      let p;

      if (t <= 0.35) {
        p = (t / 0.35) * 45;
      }
      else if (t <= 0.50) {
        p = 45;
      }
      else if (t <= 0.65) {
        p = 45 + ((t - 0.50) / 0.15) * 25;
      }
      else if (t <= 0.80) {
        p = 70;
      }
      else {
        p = 70 + ((t - 0.80) / 0.20) * 30;
      }
      const pct = Math.min(p, 100);
      if (procBarRef.current) procBarRef.current.style.width = pct + '%';
      if (procPctRef.current) procPctRef.current.textContent = Math.round(pct) + '%';
      if (elapsed < PROCESSING_TOTAL) procRafRef.current = requestAnimationFrame(animate);
    };
    procRafRef.current = requestAnimationFrame(animate);

    const done = setTimeout(() => setPhase("result"), 7000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(lastStep);
      clearTimeout(done);
      cancelAnimationFrame(procRafRef.current);
    };
  }, [phase]);

  const reset = () => { setPhase("intro"); setAnswers({}); setCurrent(0); setScore(null); };

  const result = score !== null ? getResult(score) : null;
  const progress = (current / quizData.statements.length) * 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FDFBF7",
      fontFamily: "'Public Sans', 'Inter', sans-serif",
      color: "#0A1128",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 16px",
    }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "40px 0" }}>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div style={{ animation: "fadeIn 0.8s ease", position: "relative" }}>
            <div style={{ paddingBottom: "90px" }}>

              <img
                src={`/intro${imgExt}`}
                alt="Intro"
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  marginBottom: "20px"
                }}
              />

              <h1 style={{
                fontSize: "clamp(20px, 6vw, 24px)",
                fontWeight: 700,
                lineHeight: 1.3,
                color: "#0A1128",
                marginBottom: "16px",
                marginTop: 0
              }}>
                {quizData.title}
              </h1>

              <p style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "#64748B",
                marginBottom: "20px",
                lineHeight: 1.65
              }}>
                {quizData.intro}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                {quizData.bullets.map((bullet, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", lineHeight: 1 }}>✅</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>{bullet}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* BOTÃO FIXO */}
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: "420px",
                padding: "24px 16px 20px",
                background: "linear-gradient(to top, #FDFBF7 65%, rgba(253,251,247,0))",
                zIndex: 10
              }}
            >
              <button
                onClick={() => setPhase("quiz")}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: G,
                  color: "#3D2B00",
                  border: "none",
                  borderRadius: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(212,175,55,0.35)",
                  fontFamily: "'Public Sans','Inter',sans-serif"
                }}
              >
                Começar o teste
              </button>
            </div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Progress */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#94A3B8" }}>
                  {current + 1} de {quizData.statements.length}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", color: "#D4AF37" }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div style={{ height: "6px", background: "#EEE9DE", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: G,
                  borderRadius: "99px",
                  transition: "width 0.4s ease"
                }} />
              </div>
            </div>

            {/* Question card */}
            <Card style={{
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(-6px)" : "translateY(0)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
              paddingBottom: "20px"
            }}>
              <div style={{ position: "relative", width: "100%", borderRadius: "16px", overflow: "hidden", marginBottom: "16px" }}>
                {quizData.statements.map((_, idx) => (
                  <img
                    key={idx}
                    src={`/${idx + 1}${imgExt}`}
                    alt={`Situação ${idx + 1}`}
                    style={{
                      width: "100%",
                      display: "block",
                      borderRadius: "16px",
                      position: idx === current ? "relative" : "absolute",
                      top: 0,
                      left: 0,
                      opacity: idx === current ? 1 : 0,
                      transition: "opacity 0.3s ease",
                      pointerEvents: idx === current ? "auto" : "none",
                      animation: idx === current ? "questionZoom 12s ease-in-out infinite alternate" : "none"
                    }}
                  />
                ))}
              </div>

              <Label>Situação {current + 1}</Label>
              <div style={{ overflowY: "auto", marginBottom: "24px" }}>
                <p style={{ fontSize: "17px", fontWeight: 500, lineHeight: 1.75, color: "#0A1128", margin: 0 }}>
                  {quizData.statements[current]}
                </p>
              </div>
            </Card>

            {/* SIM / NÃO buttons */}
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "100%",
                maxWidth: "420px",
                padding: "16px",
                background: "#FDFBF7",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                zIndex: 5
              }}
            >
              {[
                { label: "Sim", value: true, desc: "Isso já aconteceu comigo" },
                { label: "Não", value: false, desc: "Nunca passei por isso" }
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => {
                    if (navigator.vibrate) {
                      navigator.vibrate(12);
                    }
                    handleAnswer(opt.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    background: "#F8F6F1",
                    border: "1.5px solid transparent",
                    borderRadius: "14px", cursor: "pointer", textAlign: "left",
                    transition: "all 0.18s ease",
                    fontFamily: "'Public Sans','Inter',sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = opt.value ? "rgba(212,175,55,0.10)" : "#F0EDE6";
                    e.currentTarget.style.borderColor = opt.value ? "#D4AF37" : "#CBD5E1";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#F8F6F1";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0A1128", marginBottom: "2px" }}>{opt.label}</div>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "#64748B" }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${opt.value ? "#D4AF37" : "#CBD5E1"}`,
                    background: opt.value ? "rgba(212,175,55,0.12)" : "transparent"
                  }} />
                </button>
              ))}
            </div>
          </div>
        )}


        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>

            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "24px" }}>
                <div style={{ position: "relative", width: 64, height: 64 }}>
                  <svg width="64" height="64" style={{ position: "absolute", top: 0, left: 0 }}>
                    <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(212,175,55,0.13)" strokeWidth="3" />
                  </svg>
                  <svg width="64" height="64" style={{ position: "absolute", top: 0, left: 0, animation: "spinLoader 1.1s linear infinite" }}>
                    <defs>
                      <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F7D774" stopOpacity="0" />
                        <stop offset="55%" stopColor="#C5A059" stopOpacity="1" />
                        <stop offset="100%" stopColor="#F7D774" stopOpacity="1" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="27" fill="none" stroke="url(#sg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="84 86" strokeDashoffset="-8" />
                  </svg>
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 10, height: 10, borderRadius: "50%",
                    background: "linear-gradient(135deg, #C5A059, #F7D774)",
                    boxShadow: "0 0 10px rgba(212,175,55,0.55)",
                    animation: "pulseCore 1.1s ease-in-out infinite",
                  }} />
                </div>
              </div>

              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0A1128", margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
                Interpretando suas respostas...
              </h2>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
                Estamos analisando os padrões nas suas respostas.
              </p>
            </div>

            <Card style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#D4AF37", marginBottom: "18px" }}>
                O que estamos verificando
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {PROCESSING_STEPS.map((step, i) => {
                  const isDone = procStepsDone.has(i);
                  const isActive = procActiveStep === i && !isDone;
                  const visible = procActiveStep !== null && i <= procActiveStep;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      opacity: visible ? 1 : 0.18,
                      animation: visible ? "fadeSlideUp 0.4s ease forwards" : "none",
                      transition: "opacity 0.25s ease",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: isDone ? "linear-gradient(135deg, #8A6D3B 0%, #C5A059 20%, #F7D774 45%, #FFFFFF 50%, #F7D774 55%, #C5A059 80%, #8A6D3B 100%)" : "transparent",
                        border: isDone ? "none" : `1.5px solid ${isActive ? "#D4AF37" : "rgba(212,175,55,0.25)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                        transform: isDone ? "scale(1)" : "scale(0.85)",
                        boxShadow: isDone ? "0 2px 8px rgba(212,175,55,0.38)" : "none",
                      }}>
                        {isDone && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.2 5.8L8 1" stroke="#3D2B00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{
                        fontSize: "12px", fontWeight: 600,
                        letterSpacing: "0.02em",
                        color: "#94A3B8",
                        transition: "color 0.3s ease",
                        lineHeight: 1.45, flex: 1,
                        ...(isDone ? { color: "#0A1128" } : isActive ? { color: "#C5A059" } : {})
                      }}>
                        {step.label}
                      </span>
                      {isActive && (
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: "#D4AF37",
                          animation: "pulseCore 0.75s ease-in-out infinite",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ height: "6px", background: "#EEE9DE", borderRadius: "99px", overflow: "hidden", marginBottom: "10px" }}>
                  <div ref={procBarRef} style={{
                    height: "100%",
                    width: "0%",
                    background: "linear-gradient(90deg, #8A6D3B 0%, #C5A059 25%, #F7D774 50%, #C5A059 75%, #8A6D3B 100%)",
                    borderRadius: "99px",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#94A3B8" }}>
                    PROCESSANDO
                  </span>
                  <span ref={procPctRef} style={{ fontSize: "13px", fontWeight: 700, color: "#D4AF37", fontVariantNumeric: "tabular-nums" }}>
                    0%
                  </span>
                </div>
              </div>
            </Card>

          </div>
        )}

        {/* ── RESULT ── */}
        {phase === "result" && result && (
          <div style={{ animation: "fadeIn 0.8s ease" }}>

            {/* Radar */}
            <Card style={{ marginBottom: "16px" }}>
              <RadarScanner total={quizData.statements.length} active={score} />
            </Card>

            {/* Profile name */}
            <Card style={{ marginBottom: "16px" }}>
              <Label>Seu resultado</Label>
              <h2 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700, color: "#0A1128", margin: 0, lineHeight: 1.3 }}>
                {result.name}
              </h2>
            </Card>

            {/* Result text */}
            <Card style={{ marginBottom: "16px" }}>
              {result.text.split("\n\n").map((paragraph, i) => (
                <p key={i} style={{ fontSize: "15px", lineHeight: 1.85, color: "#374151", margin: i === 0 ? 0 : "13px 0 0 0" }}>
                  {paragraph}
                </p>
              ))}
            </Card>

            {/* CTA */}
            <Card style={{ marginBottom: "16px", textAlign: "center" }}>
              <a href="https://produtodigitalelite.com/claramente" style={{
                display: "block", width: "100%", padding: "16px",
                fontSize: "14px", fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", textAlign: "center",
                background: G, color: "#3D2B00",
                border: "none", borderRadius: "14px",
                boxShadow: "0 4px 12px rgba(212,175,55,0.35)",
                textDecoration: "none",
                fontFamily: "'Public Sans','Inter',sans-serif",
                transition: "transform 0.15s, box-shadow 0.15s",
                boxSizing: "border-box"
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(212,175,55,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(212,175,55,0.35)"; }}
              >
                {result.cta}
              </a>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", marginTop: "14px", lineHeight: 1.6, marginBottom: 0 }}>
                O que você vai encontrar leva em conta exatamente onde você está agora.
              </p>
            </Card>

          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spinLoader { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseCore { 0%,100% { opacity:1; transform:translate(-50%,-50%) scale(1); } 50% { opacity:0.55; transform:translate(-50%,-50%) scale(0.7); } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes questionZoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #FDFBF7; }
      `}</style>
    </div>
  );
}
