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

    // Distribute active points evenly
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

      // Grid circles
      for (let t = 1; t <= TICKS; t++) {
        ctx.beginPath();
        ctx.arc(CX, CY, (R * t) / TICKS, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(212,175,55,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Radial axes
      for (let i = 0; i < total; i++) {
        const { x, y } = getPos(i);
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "rgba(212,175,55,0.10)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Filled polygon
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

      // Ping effects
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

      // Sweep trail
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

      // Leading edge
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(state.scanAngle) * R, CY + Math.sin(state.scanAngle) * R);
      ctx.strokeStyle = state.phase === "scanning" ? "rgba(255,205,150,0.95)" : "rgba(212,160,112,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
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

      // Center
      ctx.beginPath();
      ctx.arc(CX, CY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(212,160,112,0.5)";
      ctx.fill();

      // Score text
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

      // Normalize scan progress from start
      const swept = state.scanAngle - state.startAngle;

      // Activate points as scanner sweeps past them
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

      // After one full rotation, switch to monitoring
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
  title: "Você está carregando mais do que deveria nas suas relações?",
  subtitle: "15 situações do dia a dia que podem revelar um padrão que você ainda não percebeu",
  intro: `Algumas relações vão pesando aos poucos. Não de uma vez. Não de forma dramática. São pequenas coisas que se repetem — uma conversa que termina estranha, uma situação que fica na cabeça, um cansaço que você não sabe bem explicar de onde vem.

Esse teste foi feito para te ajudar a enxergar esses momentos com mais clareza. Não tem resposta certa ou errada. Só tem o que é verdade pra você.

Leia cada frase com calma. Marque VERDADEIRO se aquilo já aconteceu com você — mesmo que tenha sido poucas vezes. Marque FALSO só se nunca viveu aquela situação.`,
  statements: [
    "Você já saiu de uma conversa sem entender bem o que aconteceu — você tentou explicar algo que te machucou, mas no meio do caminho acabou se defendendo, sem saber como chegou nisso.",
    "Depois de uma briga ou conversa difícil, você já ficou repassando tudo na cabeça — no banho, antes de dormir, no trânsito — tentando descobrir onde as coisas saíram do controle.",
    "Você já ficou olhando uma mensagem no WhatsApp por vários minutos pensando em como responder, com medo de parecer que estava exagerando ou sendo dramática.",
    "Você já preferiu não falar sobre algo que te incomodou porque achou que ia virar uma briga maior do que valia a pena.",
    "Você já pensou \"talvez eu tenha exagerado\" logo depois de uma situação que, na hora, claramente pareceu injusta pra você.",
    "Você já ouviu alguém desabafar por um bom tempo e, quando tentou falar sobre algo seu, a conversa mudou de assunto rapidinho.",
    "Você já ficou pensando em como falar uma coisa de um jeito que a outra pessoa não entendesse como crítica — mesmo quando o que você queria dizer era simples.",
    "Você já se convenceu de que o comportamento de alguém que te magoou tinha uma boa explicação — \"ele deve estar estressado\", \"ela não quis dizer assim\" — mesmo tendo ficado chateada.",
    "Em alguma relação, você já sentiu que precisava ficar calma na conversa porque sabia que, se reagisse de forma mais direta, as coisas iam piorar.",
    "Você já releu uma conversa no WhatsApp tentando entender se disse algo errado — mesmo sem nenhum sinal claro de que tinha errado alguma coisa.",
    "Você já foi a pessoa que voltou a falar sobre uma briga para tentar resolver — enquanto a outra pessoa esperava em silêncio ou ficou no canto dela.",
    "Você já sentiu um cansaço estranho depois de certas conversas — não era raiva, não era tristeza, mas era algo pesado que ficou em você.",
    "Você já teve a sensação de que algumas pessoas na sua vida pedem muito de você emocionalmente — mas achou difícil falar isso porque pareceria reclamação.",
    "Você já explicou como se sentiu sobre uma situação mais de uma vez pra mesma pessoa — e mesmo assim a situação se repetiu.",
    "Você já teve aquele pensamento silencioso de: \"por que sempre sou eu que estou tentando fazer tudo funcionar?\""
  ],
  results: [
    {
      score: 0,
      name: "Você tem limites bem definidos",
      diagnosis: "Pelo que você respondeu, parece que você consegue separar bem o que é sua responsabilidade e o que é responsabilidade da outra pessoa — e isso é mais raro do que parece. A maioria das mulheres leva anos pra chegar nesse lugar, e muitas nunca chegam. Você tem algo que foi construído com muita consciência, mesmo que você não perceba isso claramente.",
      mirror: "Você provavelmente já viveu aquele momento em que uma conversa começou a ficar injusta — e você notou. Não ficou horas depois se culpando, não repassou tudo buscando onde errou. Quando alguém tentou jogar pra você uma responsabilidade que não era sua, seu corpo sinalizou antes mesmo da sua cabeça processar. Você sentiu. E não carregou. Isso, por si só, já é uma conquista enorme.",
      cost: "Mas esse jeito de ser também tem um lado que cansa. Nem todo mundo ao seu redor pensa assim. Algumas relações podem te desgastar justamente porque você enxerga os desequilíbrios com muita clareza — e a outra pessoa ainda nem percebeu que eles existem. Às vezes isso gera um isolamento sutil, uma sensação de que poucas pessoas estão no mesmo nível de consciência que você.",
      insight: "Ter clareza emocional não significa que você seja menos carinhosa ou menos capaz de amar profundamente. Significa que, de alguma forma — pela vida, pelas suas experiências, pelos erros que você processou — você aprendeu a se cuidar dentro das relações. Isso não é pouca coisa. É exatamente o que muitas mulheres buscam e não encontram.",
      belief: "Ter limites claros não é frieza. Não é distância. É a capacidade de estar completamente presente numa relação sem se perder dentro dela. É saber onde você termina e onde o outro começa. E isso é uma das formas mais bonitas de se respeitar — e de respeitar quem está do outro lado.",
      closing: "Uma coisa que vale observar com carinho: as pessoas mais próximas de você conseguem te oferecer o mesmo nível de presença e cuidado que você oferece a elas? Porque equilíbrio não é só o que você sente por dentro — é o que acontece entre duas pessoas quando as duas estão de verdade."
    },
    {
      score: 1,
      name: "Quase tudo equilibrado — mas tem um ponto que merece atenção",
      diagnosis: "Uma situação tocou em você. Pode parecer pouca coisa — e talvez você esteja tentada a minimizar isso agora mesmo, pensando \"ah, foi só uma\". Mas presta atenção nessa vontade de minimizar. Muitas vezes, o início de um padrão aparece exatamente assim: pequeno, quase invisível, fácil de descartar. E é justamente porque é pequeno que ele passa.",
      mirror: "Talvez você já tenha vivido aquele momento onde sentiu algo que não conseguiu colocar em palavras direito. Uma sensação de injustiça que ficou parada no peito. Um pensamento que ficou girando na cabeça mais tempo do que deveria. Você provavelmente deixou passar achando que era bobagem, que não valia a pena fazer disso um problema. Mas o fato de ter ficado com você já diz alguma coisa importante.",
      cost: "O problema não está na situação em si. Está no hábito de minimizar o que você sente antes mesmo de se perguntar se aquilo importa. Quando a gente tem o costume de descartar as próprias reações como \"pequenas demais pra reclamar\", essas situações raramente chegam a ser analisadas de verdade. E o que não é visto, continua acontecendo.",
      insight: "Às vezes o mais revelador não é o que você marcou como verdadeiro — é o que você quase marcou e decidiu não marcar. Existe algo nas bordas da sua vida que talvez mereça um olhar mais honesto. Não pra criar um problema onde não existe — mas pra não ignorar o que talvez já esteja pedindo atenção.",
      belief: "Uma situação não precisa ser grave pra merecer que você a leve a sério. Padrões não começam grandes, dramáticos, impossíveis de ignorar. Eles começam exatamente assim: pequenos, esporádicos, fáceis de passar por cima. E vão crescendo enquanto a gente está ocupada achando que é pequeno demais pra se preocupar.",
      closing: "Se aquela situação ficou na sua cabeça por mais de alguns segundos depois que você marcou, vale se perguntar com calma: por que justamente essa? O que ela tocou que as outras não tocaram?"
    },
    {
      score: 2,
      name: "Dois pontos de atenção na sua vida",
      diagnosis: "Duas situações tocaram em você. Isso mostra que, em alguns momentos da sua vida, você acaba assumindo mais do que precisaria dentro de certas relações — não porque é fraca ou ingênua, mas porque você é o tipo de pessoa que tenta fazer as coisas funcionarem. E isso tem um custo que nem sempre aparece de forma óbvia.",
      mirror: "Você talvez reconheça esses momentos com uma familiaridade desconfortável: pensar demais antes de mandar uma mensagem pra não parecer dramática, sair de uma conversa com aquela sensação residual de \"será que eu exagerei?\", ficar repassando mentalmente o que foi dito tentando entender onde as coisas travaram. São momentos pequenos — mas que aparecem com frequência suficiente pra você ter se reconhecido aqui.",
      cost: "Quando você gasta energia monitorando como suas palavras vão ser recebidas, medindo o tom antes de falar, calculando se aquilo vai gerar conflito — você está fazendo um trabalho emocional que deveria ser dividido entre duas pessoas. Com o tempo, essa vigilância constante vai gerando um cansaço que é difícil de nomear e quase impossível de explicar pra quem está de fora.",
      insight: "Esse jeito de ser quase sempre aparece em pessoas com muita empatia. Você consegue antecipar como as coisas podem ser interpretadas — e usa essa habilidade pra evitar atrito. O problema é que o conflito evitado não desaparece. Ele fica guardado, vai se acumulando, e um dia aparece de um jeito muito maior do que teria sido se tivesse sido dito na hora.",
      belief: "Não é sua função garantir que a outra pessoa entenda o que você disse da forma exata que você quis dizer. Você pode — e deve — falar com cuidado e clareza. Mas interpretar com boa vontade, com generosidade, sem distorcer o que foi dito? Isso é responsabilidade de quem está ouvindo. Não sua.",
      closing: "Duas situações não definem um padrão permanente. Mas são um convite pra você observar: essas coisas aparecem sempre com as mesmas pessoas? Ou surgem em contextos diferentes? A resposta pra essa pergunta vai te dizer mais do que qualquer resultado de teste."
    },
    {
      score: 3,
      name: "Você já assumiu mais do que devia em algumas relações",
      diagnosis: "Três situações tocaram em você. Isso mostra que o papel de quem cuida, resolve, explica e mantém as coisas funcionando não é estranho pra você — você provavelmente já viveu isso em mais de uma relação, em mais de um momento. E provavelmente fez tudo isso achando que era o certo a fazer, que era sua responsabilidade, que era assim que as coisas deveriam ser.",
      mirror: "Você talvez reconheça cenas como essas: ser você a voltar a falar sobre uma briga, enquanto a outra pessoa esperava em silêncio que você desse o primeiro passo. Segurar um comentário que te incomodou pra não inflamar a situação. Explicar a mesma coisa mais de uma vez, com paciência crescentemente difícil de sustentar, tentando ser compreendida de verdade.",
      cost: "Cada vez que você deixa um desequilíbrio passar sem nomear — sem dizer \"isso não me pareceu justo\", sem colocar que algo te machucou — você está, sem querer, comunicando pra relação que aquilo é aceitável. Não porque você acha que é. Mas porque ainda não encontrou uma forma de dizer que não é, sem que isso custasse mais do que valia.",
      insight: "Cuidar das emoções de uma relação quase sozinha é um trabalho imenso — e completamente invisível. É um trabalho que não aparece em nenhuma lista, que ninguém agradece, que a maioria das pessoas nem percebe que está acontecendo. E que cansa de uma forma que é muito difícil de explicar, porque por fora tudo parece \"bem\".",
      belief: "Você não precisa escolher entre ser uma pessoa carinhosa, generosa e empática — e ter limites. As duas coisas podem coexistir. Mas isso não acontece automaticamente. Precisa ser construído com atenção — porque pra muitas mulheres, o caminho automático vai na direção de ceder mais, explicar mais, aguentar mais.",
      closing: "Se as três situações que tocaram em você envolvem as mesmas pessoas, presta atenção nisso. Algumas relações criam sistematicamente mais peso emocional do que outras. Perceber isso não significa abandonar quem você ama — significa entender, com clareza e sem julgamento, o preço real do que você está carregando."
    },
    {
      score: 4,
      name: "Você carrega mais do que deveria em algumas relações",
      diagnosis: "Quatro situações descreveram coisas que você já viveu. Isso começa a mostrar algo mais consistente: você costuma ser a pessoa que mantém a paz, que absorve o que está pesado, que tenta fazer as coisas voltarem ao normal — mesmo quando tudo isso não deveria ser só o seu trabalho.",
      mirror: "Você provavelmente conhece muito bem essa sensação: sair de uma conversa difícil sem entender direito o que aconteceu, mas com aquela peso no peito. Sentir que precisava escolher as palavras com cuidado — com muito cuidado. Revisitar mentalmente uma briga horas depois, no silêncio do seu quarto ou no trânsito, tentando descobrir onde você errou. Encontrar uma justificativa pra comportamentos que te machucaram, porque a alternativa — admitir que foi injusto — parecia pesada demais.",
      cost: "O custo de sempre manter a paz é que você acaba sendo a única que paga por ela. Essa conta não chega de uma vez — ela vai chegando devagar, em parcelas pequenas, em momentos que parecem individualmente pequenos demais pra reclamar. E um dia o total é enorme, e você não sabe bem quando ficou tão pesado.",
      insight: "Pessoas muito empáticas desenvolvem esse jeito de ser porque genuinamente sentem o desconforto do outro — às vezes quase tanto quanto o próprio. Por isso, evitar conflito parece a coisa mais compassiva a fazer. Parece cuidado. E em parte é. Mas cuidar do outro sem se cuidar não é sustentável. Não por muito tempo.",
      belief: "Manter a paz numa relação não deveria ser o trabalho de uma pessoa só. Quando é, o que parece harmonia por fora muitas vezes está escondendo uma tensão que vai crescendo por dentro — silenciosamente, pacientemente, até que não cabe mais.",
      closing: "Se nada mudar na forma como você ocupa esse espaço nas suas relações, existe uma grande chance de que daqui a um ano você esteja exatamente nas mesmas conversas, sentindo exatamente as mesmas coisas. Só com mais um ano carregado."
    },
    {
      score: 5,
      name: "Você carrega muito — e provavelmente já virou rotina",
      diagnosis: "Cinco situações tocaram em você. Isso mostra que o desequilíbrio nas suas relações não é algo que acontece raramente — ele aparece com frequência suficiente pra ter mudado a forma como você se comporta de forma natural, quase automática. Você se adaptou a ele. E quando a gente se adapta a algo por tempo demais, começa a achar que é assim que as coisas são.",
      mirror: "Você talvez se reconheça muito bem nisso: saber na hora quando uma conversa está prestes a virar briga — e recuar quase sem pensar, antes mesmo que aconteça. Revisar mentalmente o que disse depois de uma interação, não porque errou, mas porque aprendeu que é mais seguro checar do que assumir que estava tudo bem. Monitorar o humor do outro antes de falar o que pensa.",
      cost: "Esse estado de atenção constante — de estar sempre ligada, sempre monitorando, sempre calculando — tem um custo que vai muito além do cansaço físico. Ele começa a mudar a forma como você se expressa. Com o tempo, você pode perceber que fala menos do que pensa, mostra menos do que sente, ocupa menos espaço do que tem direito de ocupar.",
      insight: "Esse jeito de ser raramente é uma escolha consciente. Ele vai se formando ao longo de relações que, repetidamente, tornaram a expressão direta arriscada ou custosa demais. Você aprendeu a se proteger de um jeito que também te limita. E o mais difícil é que essa proteção parece tão natural agora que você nem percebe mais que está fazendo.",
      belief: "O problema nunca foi a sua capacidade de se expressar. Nunca foi falta de vocabulário, de coragem, de clareza. Foram as relações ao redor que foram te ensinando, aos poucos, que era mais seguro falar menos. Perceber isso muda completamente a pergunta: não é \"o que há de errado comigo?\" — é \"o que essas relações foram fazendo com a minha voz ao longo do tempo?\"",
      closing: "Você está carregando algo que não deveria ser só seu. A questão não é se isso é verdade — é há quanto tempo você carrega sem perceber que existia uma escolha diferente."
    },
    {
      score: 6,
      name: "Você é muito boa em entender os outros — mas quem te entende?",
      diagnosis: "Seis situações descreveram coisas que você vive com uma frequência real. Isso mostra um padrão bem específico: você tem uma capacidade enorme — e genuína — de perceber como as outras pessoas estão se sentindo. E não só perceber: você frequentemente se adapta a isso antes mesmo de parar pra pensar no que você mesma está precisando naquele momento.",
      mirror: "Você provavelmente reconhece isso em você: a forma como você percebe que a outra pessoa está de mau humor e, quase sem pensar, muda seu tom, suaviza o que ia falar, afia as bordas do que ia dizer. A habilidade de encontrar uma explicação pra comportamentos que te magoaram antes mesmo de ter tempo de sentir que foram machucadores. Sair de uma situação difícil sabendo exatamente como o outro se sentiu — mas com muito pouca clareza sobre como você mesma ficou.",
      cost: "Ficar sempre lendo o estado emocional do outro pra se adaptar a ele é um trabalho enorme — e invisível. A maioria das pessoas ao seu redor nem percebe que você está fazendo isso. Mas ele consome energia real. E vai, devagar, te colocando em segundo lugar na sua própria vida — até você começar a achar que segundo lugar é o lugar que te pertence.",
      insight: "Essa capacidade de sentir o outro com tanta precisão é genuína e bonita. Ela é parte de quem você é. O problema não é ter ela — é que, muito provavelmente, você a desenvolveu como uma forma de navegar em relações onde falar sobre o que você precisava tinha um preço. Onde ser direta custava algo. E então você aprendeu a antecipar, a se adaptar, a suavizar.",
      belief: "Entender o outro não deveria significar se apagar. Você pode ser uma pessoa profundamente empática — e ainda assim ter espaço dentro das suas relações. Você pode oferecer essa capacidade de sentir o outro por escolha, quando quiser, pra quem merecer — em vez de distribuir automaticamente pra qualquer um que apareça.",
      closing: "A pergunta que esse padrão levanta é simples e direta: quem na sua vida te enxerga com o mesmo cuidado e atenção com que você enxerga os outros? Se a resposta demorou pra vir, isso já diz muito."
    },
    {
      score: 7,
      name: "Você é quem sustenta o equilíbrio — e quase ninguém vê isso",
      diagnosis: "Sete situações tocaram em você. Isso coloca você num perfil muito reconhecível: você provavelmente é a pessoa que mantém as coisas funcionando nas suas relações. A que ouve quando ninguém mais ouve. A que resolve quando as coisas travam. A que volta depois de uma briga pra consertar o que se quebrou — enquanto a outra parte espera que você dê esse passo.",
      mirror: "Você talvez reconheça com uma familiaridade dolorosa essa sensação: ser sempre a primeira a quebrar o silêncio depois de uma briga. Explicar o que sente com muito cuidado, escolhendo cada palavra, pra que não pareça acusação. Sentir aquele cansaço específico que vem depois de certas conversas — não porque foram longas, mas porque foram pesadas demais pra uma pessoa carregar sozinha. E mesmo assim, você carregou.",
      cost: "O custo invisível de ser a pessoa que sustenta tudo é que você raramente recebe o mesmo nível de cuidado que oferece. As relações funcionam — porque você as mantém funcionando. Mas o peso não é igual. E quando esse desequilíbrio nunca é nomeado, nunca é falado, ele vai se normalizando silenciosamente até o dia em que parece que é assim mesmo que as coisas são. Que é assim que relações funcionam. Mas não é.",
      insight: "Quem vive esse papel costuma ser vista pelos outros como \"a forte\", \"a madura\", \"a tranquila\", \"a que sempre dá um jeito\". E você é essas coisas — de verdade. Mas essas qualidades, com o tempo, acabam sendo usadas como justificativa pra você carregar mais do que deveria. Não porque alguém planejou isso. Mas porque nunca ninguém questionou. Nem você.",
      belief: "Ser emocionalmente madura não significa estar sempre disponível pra resolver o que está desequilibrado ao seu redor. Maturidade emocional de verdade inclui — precisa incluir — saber quando aquela responsabilidade não é sua. E conseguir dizer isso sem culpa.",
      closing: "Se as relações mais importantes da sua vida dependem de você pra se manter no eixo, vale se perguntar com honestidade: o que acontece quando você não está bem? Quando você é a que precisa de cuidado? Quem está lá? E se a resposta for difícil, isso já é informação."
    },
    {
      score: 8,
      name: "Você aprendeu a manter a paz — mas a que custo?",
      diagnosis: "Oito situações descreveram coisas suas. Isso mostra um padrão que foi se construindo ao longo de muito tempo: você desenvolveu um jeito de se relacionar que coloca a harmonia sempre em primeiro lugar — muitas vezes muito antes de você mesma. E provavelmente você nem percebe mais o quanto de esforço isso exige, porque já ficou automático.",
      mirror: "Você provavelmente se reconhece muito bem nisso: saber exatamente o que dizer pra acalmar uma situação que estava esquentando. Escolher as palavras com precisão pra que ninguém se sinta atacado — mesmo quando você é quem está sendo afetada. O trabalho constante e silencioso de manter as conversas no trilho certo. E o cansaço — também silencioso, também invisível — que vem depois de tudo isso, quando você finalmente fica sozinha.",
      cost: "Construir harmonia o tempo todo tem um preço que raramente aparece de forma clara. Ele aparece como uma sensação persistente de que você está muito presente na vida dos outros e muito pouco presente nas suas próprias necessidades. Como uma dificuldade crescente de falar o que pensa de forma direta, sem antes calcular o impacto. Como um cansaço que você não consegue explicar porque, por fora, nada de dramático aconteceu.",
      insight: "O jeito como você se relaciona é sofisticado e complexo. Você desenvolveu habilidades que a maioria das pessoas não tem. Mas toda construção tem uma fundação. E quando a fundação foi construída sobre \"evitar conflito a qualquer custo\", as rachaduras começam a aparecer — devagar, nos lugares que você menos espera.",
      belief: "Harmonia de verdade não é ausência de conflito. Harmonia real é a capacidade de duas pessoas falarem o que sentem — mesmo que seja difícil, mesmo que doa um pouco — e ainda assim encontrarem um caminho juntas. O que muitas vezes parece harmonia é só o resultado de uma pessoa que foi, aos poucos, desistindo de falar o que sente.",
      closing: "O que você estaria dizendo agora se tivesse certeza de que ia ser ouvida de verdade — sem julgamento, sem retaliação, sem ter que se defender depois? Essa resposta revela muito sobre o estado real das suas relações."
    },
    {
      score: 9,
      name: "Você carrega o equilíbrio emocional de quem está ao seu redor",
      diagnosis: "Nove situações tocaram em você. Isso aponta pra algo que está bem enraizado na forma como você vive suas relações: você assumiu, em várias delas e de várias formas, a responsabilidade pelo equilíbrio emocional que deveria ser compartilhado. Não foi uma decisão. Foi algo que foi acontecendo — e você foi se encaixando nesse papel sem perceber que estava sendo moldada por ele.",
      mirror: "Você provavelmente vive com muita frequência situações como essas: perceber que a outra pessoa está no limite e automaticamente mudar seu comportamento pra não piorar as coisas — mesmo que você também estivesse cansada. Sair de brigas com aquela confusão específica e desgastante — não porque você não entende o que aconteceu, mas porque não consegue mais localizar onde você ficou em meio a tudo aquilo. Justificar pra si mesma, mais uma vez, um comportamento que não merecia justificativa.",
      cost: "Cuidar do equilíbrio emocional de todo mundo ao seu redor tem um custo que se acumula de um jeito quase imperceptível. Não é um episódio que pesa de uma vez. É a soma silenciosa de centenas de pequenas escolhas de se ajustar, se conter, se adaptar, ceder mais um pouco. Com o tempo, pode ficar genuinamente difícil saber o que você quer — porque faz tanto tempo que você está respondendo ao que os outros precisam, que a sua própria voz ficou em segundo plano.",
      insight: "Esse padrão quase sempre começa muito mais cedo do que a gente imagina. Em algum momento da vida — talvez na infância, talvez numa relação importante — você aprendeu que era sua função cuidar do equilíbrio emocional ao seu redor. Essa crença nunca foi questionada. Ela foi só sendo confirmada, repetida e reforçada por cada relação que continuou pedindo exatamente isso de você.",
      belief: "Você não é responsável pelo estado emocional das pessoas ao seu redor. Isso precisa ser dito com clareza: não é. Você pode se importar com elas profundamente. Pode querer bem. Pode estar presente. Mas se importar com alguém não é a mesma coisa que absorver e carregar tudo o que essa pessoa sente.",
      closing: "Tente imaginar o seguinte: se você parasse de sustentar o equilíbrio nas suas relações por alguns dias — simplesmente parasse — o que aconteceria? As relações aguentariam? As outras pessoas dariam conta? A resposta pra essa pergunta diz mais sobre o quanto você está carregando do que qualquer resultado de teste."
    },
    {
      score: 10,
      name: "Você absorve emocionalmente muito mais do que deveria",
      diagnosis: "Dez situações tocaram em você. Isso mostra algo muito importante, que merece ser dito com cuidado: absorver o que as pessoas ao seu redor estão sentindo — a tensão, o estresse, o conflito que pode estar chegando — se tornou tão automático na sua vida que provavelmente já parece completamente natural pra você. Como se fosse só quem você é. Mas não é — é algo que você aprendeu a fazer.",
      mirror: "Você talvez reconheça essa sensação com muita precisão: entrar num ambiente e, em segundos, já saber o estado emocional de quem está lá. Ajustar seu tom, seu jeito, o que você ia falar — tudo isso antes mesmo de ter tomado uma decisão consciente. Sair de certas conversas carregando algo pesado que não era seu — e só perceber horas depois, quando já está sozinha e sem energia pra entender de onde veio aquilo.",
      cost: "Absorver as emoções dos outros com essa intensidade e frequência tem um efeito que vai muito além do cansaço do dia. Ele começa a embaralhar os seus próprios sinais internos. Com o tempo, pode ficar genuinamente difícil separar o que você está sentindo do que você absorveu das pessoas ao seu redor. O que é seu? O que é do ambiente? Às vezes você não sabe mais.",
      insight: "Pessoas com esse padrão costumam ter uma sensibilidade emocional real e muito alta — o que é uma qualidade rara e bonita. O problema não é ter essa sensibilidade. É que ela nunca foi acompanhada de uma estrutura de proteção igualmente forte. Então tudo entra, com facilidade, e muito pouco é filtrado. Você sente tudo — e carrega quase tudo.",
      belief: "Sentir muito não te obriga a carregar tudo. Você pode ter uma sensibilidade emocional profunda — pode continuar sendo a pessoa que sente, que percebe, que está presente — e ainda assim ter clareza sobre o que é seu sentir e o que pertence a outra pessoa. Isso não é frieza. É proteção. É cuidar de você.",
      closing: "O que você precisaria mudar na sua vida pra parar de carregar emocionalmente o que não é seu? Não é uma pergunta retórica. É, provavelmente, a pergunta mais concreta e mais importante que você pode fazer sobre a sua vida agora."
    },
    {
      score: 11,
      name: "Você passou muito tempo cuidando do que não era seu cuidar",
      diagnosis: "Onze situações tocaram em você. Isso revela um padrão que é extenso, consistente e que provavelmente já dura um bom tempo: você passou muito tempo — talvez anos — cuidando de aspectos emocionais das suas relações que não deveriam recair só sobre você. E fez isso tão bem, por tanto tempo, que provavelmente virou invisível até pra você mesma.",
      mirror: "Você provavelmente conhece esse tipo de dia muito bem: checar internamente como as pessoas importantes pra você estão antes de falar o que pensa. Escolher suas batalhas — não porque algumas realmente não valem a pena, mas porque quase todas parecem ter um custo emocional alto demais. Terminar conversas sentindo que você fez malabarismo emocional, equilibrou pratos, administrou humores — quando tudo que você queria era simplesmente conversar.",
      cost: "Cuidar das emoções das suas relações é um trabalho em tempo integral que nunca foi chamado de trabalho. Que nunca apareceu em nenhuma lista. Que nunca recebeu reconhecimento. Ele acontece nos bastidores silenciosos da sua vida — e raramente é visto por quem se beneficia dele. Pra fora, você é a mulher que \"sempre dá um jeito\". Por dentro, você sabe que o jeito tem um preço.",
      insight: "Esse padrão quase sempre vem junto com uma imagem pública que não combina com o que você vive internamente. Pra fora: calma, capaz, que resolve, que não perde o controle. Por dentro: frequentemente exausta de um jeito que é difícil de explicar, frequentemente sozinha no próprio peso, frequentemente se perguntando quando vai ser a sua vez de ser cuidada.",
      belief: "Saber resolver as coisas é uma qualidade real e valiosa. Mas qualidades são ferramentas — não são obrigações. Você pode ter essa habilidade e ainda assim escolher quando e pra quem usá-la. Em vez de oferecê-la automaticamente, de graça, pra qualquer pessoa que simplesmente assume que você vai resolver.",
      closing: "Imagina como seria — de verdade — uma relação onde você não precisasse gerenciar nada. Onde você pudesse simplesmente ser, sem calcular, sem monitorar, sem sustentar. Se essa imagem parece distante demais, quase abstrata, essa talvez seja a informação mais importante que esse teste te deu hoje."
    },
    {
      score: 12,
      name: "Você protege as suas relações — mas quem protege você?",
      diagnosis: "Doze situações descreveram coisas que você vive. Isso aponta pra algo que vai muito além de situações isoladas: existe uma forma automática e profundamente enraizada de funcionar nas suas relações que coloca você, consistentemente, na posição de quem protege o equilíbrio, quem absorve o atrito, quem garante que as coisas não desmoronem — às vezes deixando as suas próprias necessidades tão pra trás que você esquece que elas existem.",
      mirror: "Você provavelmente reconhece esse modo de existir com uma clareza que dói um pouco: entrar em conversas já mentalmente preparada pra gerenciar o que pode dar errado. Antecipar reações antes mesmo que elas aconteçam. Suavizar o que ia dizer antes mesmo de saber se era necessário. Sair de situações mais preocupada com como a outra pessoa se sentiu do que com o que você mesma viveu durante aquela conversa.",
      cost: "Quando você protege suas relações de tensão antes mesmo que ela apareça, você impede que elas sejam testadas. E relações que nunca são testadas raramente crescem de verdade — porque crescimento acontece quando duas pessoas passam por algo difícil juntas e continuam ali. Você cria um ambiente de paz aparente. Mas essa paz é sustentada pelo seu esforço constante, e tem um preço que só você paga.",
      insight: "Esse nível de proteção automática quase sempre tem raízes em alguma relação passada — às vezes bem antiga — onde se expressar de forma direta teve um custo real e doloroso. Você aprendeu, da forma mais concreta possível, que era mais seguro antecipar, conter, suavizar — do que arriscar falar com clareza e viver as consequências.",
      belief: "Você não nasceu assim. Você não é, por natureza, a protetora do equilíbrio emocional de todo mundo ao seu redor. Isso foi aprendido. Foi construído por experiências, por relações, por momentos em que ser direta custou caro. E o que foi aprendido pode — com tempo, com cuidado, com as ferramentas certas — ser questionado e substituído por algo que te custe muito menos.",
      closing: "O que você estaria sentindo agora mesmo se nunca tivesse aprendido que manter a paz era sua responsabilidade? Que tipo de mulher você seria? Isso não é saudade de algo que não existiu — é uma bússola apontando pra onde você ainda pode ir."
    },
    {
      score: 13,
      name: "Você carrega muito — e quase ninguém vê",
      diagnosis: "Treze situações tocaram em você. Esse resultado pede uma atenção genuína — não porque há algo errado com você, longe disso. Mas porque ele mostra que, por um tempo considerável da sua vida, uma parte enorme da sua energia foi direcionada pra fora: pras relações, pro equilíbrio dos outros, pra manter ao redor um ambiente onde você raramente é a prioridade. E você foi fazendo isso tão bem que se tornou invisível.",
      mirror: "Você provavelmente vive com muita frequência nesse estado particular: sentir tudo com uma intensidade real — mas mostrar só o que parece seguro mostrar. Ter uma vida emocional rica, complexa, profunda — e ao mesmo tempo uma dificuldade genuína de mostrar essa complexidade pras pessoas que estão mais perto de você. Ser conhecida como \"a forte\" enquanto carrega coisas que pesam de um jeito que ninguém ao seu redor parece perceber.",
      cost: "O custo desse padrão não é só cansaço — é um tipo de solidão muito específico e muito difícil de nomear. É a solidão de estar completamente cercada de pessoas, de ser importante pra elas, de ser querida — e ainda assim sentir que nenhuma delas vê de verdade o que acontece por dentro. Porque você aprendeu, muito bem, a proteger o que está dentro. E o preço dessa proteção é não ser verdadeiramente vista.",
      insight: "A força que as pessoas veem em você é absolutamente real — não é performance, não é máscara. Mas ela foi construída, em parte, como resposta a ambientes que não ofereceram espaço suficiente e seguro pra fragilidade. Que não disseram \"pode ser fraca aqui, estou segurando\". E então você aprendeu a segurar sozinha. Mas fragilidade não é fraqueza. É humano. É seu de direito.",
      belief: "Você merece relações onde não precise ser invencível o tempo todo. Onde mostrar que está sobrecarregada não seja um risco que você precise calcular. Onde a sua vulnerabilidade seja recebida com o mesmo cuidado, com a mesma gentileza, com o mesmo acolhimento que você oferece à vulnerabilidade dos outros.",
      closing: "Treze situações. Isso não é coincidência — é um padrão que existe há tempo suficiente pra ter moldado partes importantes de como você se vê e de como você se relaciona. E é um padrão que merece, agora, ser cuidado."
    },
    {
      score: 14,
      name: "Você sempre esteve lá — mas quem está lá por você?",
      diagnosis: "Quatorze situações tocaram em você. Isso revela um padrão que foi fundo, durou muito, e provavelmente já se tornou tão parte de quem você é que é difícil de enxergar de fora: você foi, em muitas relações e por muito tempo, a pessoa que sempre esteve lá. Pra ouvir quando ninguém mais tinha paciência. Pra resolver quando as coisas travavam. Pra segurar quando estava desmoronando. E fez tudo isso, tantas vezes, sem se perguntar se o inverso também era verdade.",
      mirror: "Você provavelmente conhece esse sentimento sem nome que carrega: estar exausta de um jeito que você não consegue explicar, porque na superfície tudo parece relativamente \"bem\" — ninguém morreu, nenhuma catástrofe aconteceu. Sentir que suas relações são como projetos que você sustenta ativamente — e que, se você parar de sustentar, vão desmoronar sem cerimônia. Ter pensamentos que você raramente diz em voz alta, como: \"quem cuida de mim quando eu também estou no limite?\" E receber o silêncio como resposta.",
      cost: "Ser a pessoa que sempre está lá tem um custo enorme — principalmente quando essa presença não é correspondida com a mesma intensidade. Você acaba construindo relações onde a sua ausência seria profundamente sentida, mas a sua presença é tratada como garantida, como algo que simplesmente acontece, como o ar. Esses dois fatos convivem de um jeito que nunca parece justo — mas raramente é falado, raramente é nomeado.",
      insight: "Você nunca se sentou e escolheu conscientemente esse papel. Ele foi se formando ao longo de situações onde a sua disponibilidade foi sendo assumida — porque você não colocou um limite onde precisava existir um. Não por ingenuidade. Por generosidade. Por um coração grande. Mas essa generosidade foi, devagar, sendo confundida com obrigação. E o que era escolha foi virando expectativa.",
      belief: "Estar sempre disponível não é uma virtude em si — é um padrão. E padrões podem ser examinados, questionados e mudados. Você pode amar profundamente as pessoas da sua vida e ainda assim não estar disponível pra absolutamente tudo, em todos os momentos, sem nenhum custo pra si mesma. Essas duas coisas podem coexistir.",
      closing: "Olha pras relações mais importantes da sua vida agora e se pergunta, com muita honestidade: se você precisasse — de verdade precisasse — essa pessoa estaria lá da mesma forma que você sempre esteve? O que você sente quando pensa nisso? Essa resposta é a informação mais honesta que você tem."
    },
    {
      score: 15,
      name: "Você sustenta tudo — e faz isso há muito tempo",
      diagnosis: "Quinze situações descreveram a sua vida. Todas elas, sem exceção. Isso não é simplesmente o resultado de um teste — é o retrato de um jeito de existir nas relações que está tão presente há tanto tempo que provavelmente já parece simplesmente quem você é. Você carrega. Você absorve. Você equilibra. Você está lá quando ninguém mais está. E faz tudo isso com tanta naturalidade que raramente alguém — inclusive você mesma — reconhece isso como o trabalho enorme que é.",
      mirror: "Você provavelmente reconhece tudo isso com uma clareza que cansa só de ler: o cansaço que não tem nome porque nada dramaticamente errado aconteceu — você só está exausta de estar sempre presente pra todo mundo. A sensação de injustiça que fica parada no peito e que você não consegue bem explicar, porque separadas, cada situação parece pequena demais pra justificar como você se sente. A solidão específica de estar completamente presente na vida dos outros e quase ausente na sua própria. O pensamento que volta — de madrugada, no banho, no silêncio — de que talvez você precisasse se explicar melhor, se controlar mais, ser mais compreensiva. Mesmo quando você já tinha dado absolutamente tudo que tinha.",
      cost: "O custo de quinze situações que se repetem vai muito além do emocional — ele é estrutural, é profundo, é formativo. Ele moldou como você se vê. Como você fala de si mesma. Quanto espaço você acha que merece ocupar numa relação. Ele fez com que colocar limites pareça egoísmo. Que pedir cuidado pareça fraqueza. Que o cansaço que você sente pareça exagero — em vez do sinal absolutamente claro de que algo, por muito tempo, não esteve equilibrado.",
      insight: "Você não chegou aqui porque é fraca. Você chegou aqui porque é extraordinariamente empática, capaz, responsável e confiável — e essas qualidades foram sendo usadas, ao longo do tempo, por relações que simplesmente assumiram que você continuaria sustentando tudo. Sem necessariamente ter maldade. Mas sem questionamento também. E você também nunca questionou — porque sempre pareceu mais fácil, mais seguro, mais simples continuar.",
      belief: "Você não precisava fazer mais pra merecer mais. Você não precisava ser melhor, mais paciente, mais compreensiva. Você já merecia — desde o começo. O que faltou foi alguém olhar pra você e dizer com clareza: isso não está equilibrado. Você está carregando demais. Isso não é justo. Talvez você mesma precise ser essa pessoa agora.",
      closing: "Quinze situações. Todas verdadeiras. Isso não é o fim de uma reflexão — é o começo de uma pergunta que só você pode responder: o que eu faço agora com tudo o que acabei de perceber sobre mim mesma? Porque se nada mudar — se você sair daqui e as coisas continuarem exatamente como estão — daqui a um ano você vai estar no mesmo lugar. Sentindo as mesmas coisas. Carregando o mesmo peso. E a única coisa que terá mudado é o tempo que passou enquanto você esperava."
    }
  ]
};


const getResult = (score) => quizData.results.find(r => r.score === score) || quizData.results[quizData.results.length - 1];

const G = "linear-gradient(135deg, #8A6D3B 0%, #C5A059 20%, #F7D774 45%, #FFFFFF 50%, #F7D774 55%, #C5A059 80%, #8A6D3B 100%)";

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#FFFFFF",
    borderRadius: "24px",
    padding: "24px",
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
  { label: "Padrões de comunicação...", time: 2000 },
  { label: "Gatilhos emocionais...", time: 4500 },
  { label: "Protocolos psicológicos...", time: 7000 },
  { label: "Sinais de reciprocidade...", time: 9500 },
  { label: "Dinâmicas de poder...", time: 12500 },
  { label: "Leitura personalizada...", time: 15500 },
];
const PROCESSING_TOTAL = 18000;

export default function Quiz() {
  const [phase, setPhase] = useState("intro");
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
  const images = [
    "/intro.png",
    "/cta.png",
    ...Array.from({ length: 15 }, (_, i) => `/${i + 1}.png`)
  ];

  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}, []);

  // ── Processing screen state ──
  const [procStepsDone, setProcStepsDone] = useState(new Set());
  const [procActiveStep, setProcActiveStep] = useState(null);
  const procStartRef = useRef(null);
  const procRafRef = useRef(null);
  const procBarRef = useRef(null);
  const procPctRef = useRef(null);

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

    // Reset
    if (procBarRef.current) procBarRef.current.style.width = '0%';
    if (procPctRef.current) procPctRef.current.textContent = '0%';
    setProcStepsDone(new Set());
    setProcActiveStep(null);

    // Step timers
    const timers = PROCESSING_STEPS.map((step, i) =>
      setTimeout(() => {
        setProcActiveStep(i);
        if (i > 0) setProcStepsDone(prev => { const n = new Set(prev); n.add(i - 1); return n; });
      }, step.time)
    );
    const lastStep = setTimeout(() => {
      setProcStepsDone(prev => { const n = new Set(prev); n.add(PROCESSING_STEPS.length - 1); return n; });
    }, 17500);

    // rAF eased progress — write directly to DOM to avoid React batching issues
    procStartRef.current = performance.now();
    const animate = (now) => {
      const elapsed = now - procStartRef.current;
      const t = Math.min(elapsed / PROCESSING_TOTAL, 1);
      let p;
      if (t <= 0.4)      p = (t / 0.4) * 50;
      else if (t <= 0.7) p = 50 + ((t - 0.4) / 0.3) * 30;
      else               p = 80 + ((t - 0.7) / 0.3) * 20;
      const pct = Math.min(p, 100);
      if (procBarRef.current) procBarRef.current.style.width = pct + '%';
      if (procPctRef.current) procPctRef.current.textContent = Math.round(pct) + '%';
      if (elapsed < PROCESSING_TOTAL) procRafRef.current = requestAnimationFrame(animate);
    };
    procRafRef.current = requestAnimationFrame(animate);

    // Auto advance to result
    const done = setTimeout(() => setPhase("result"), PROCESSING_TOTAL + 500);

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
      <div style={{ width: "100%", maxWidth: "420px", padding: "40px 0 80px" }}>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div style={{ animation: "fadeIn 0.8s ease" }}>

  <img
    src="/intro.png"
    alt="Intro"
    style={{
      width: "100%",
      borderRadius: "16px",
      marginBottom: "20px"
    }}
  />

  <Label>Teste Psicológico</Label>
            <h1 style={{ fontSize: "clamp(20px, 6vw, 24px)", fontWeight: 700, lineHeight: 1.3, color: "#0A1128", marginBottom: "8px", marginTop: 0 }}>
              {quizData.title}
            </h1>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#64748B", marginBottom: "24px", lineHeight: 1.6 }}>
              {quizData.subtitle}
            </p>
            <Card style={{ marginBottom: "24px" }}>
              {quizData.intro.split("\n\n").map((p, i, arr) => (
                <p key={i} style={{ fontSize: "15px", lineHeight: 1.8, color: "#374151", margin: i < arr.length - 1 ? "0 0 14px 0" : 0 }}>{p}</p>
              ))}
            </Card>
            <button onClick={() => setPhase("quiz")} style={{
              width: "100%", padding: "16px", fontSize: "14px", fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase",
              background: G, color: "#3D2B00",
              border: "none", borderRadius: "14px", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(212,175,55,0.35)",
              fontFamily: "'Public Sans','Inter',sans-serif",
              transition: "transform 0.15s, box-shadow 0.15s"
            }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 8px 24px rgba(212,175,55,0.45)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 12px rgba(212,175,55,0.35)"; }}
            >
              Começar o teste
            </button>
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
                  height: "100%", width: `${progress}%`,
                  background: G, borderRadius: "99px",
                  transition: "width 0.4s ease"
                }} />
              </div>
            </div>

            {/* Question card */}
            <Card style={{
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(-6px)" : "translateY(0)",
              transition: "opacity 0.3s ease, transform 0.3s ease"
            }}>

<img
  key={current}
  src={`/${current + 1}.png`}
  alt={`Situação ${current + 1}`}
  style={{
    width: "100%",
    borderRadius: "16px",
    marginBottom: "16px",
    animation: "questionZoom 12s ease-in-out infinite alternate"
  }}
/>

              
              <Label>Situação {current + 1}</Label>
              <p style={{ fontSize: "17px", fontWeight: 500, lineHeight: 1.75, color: "#0A1128", margin: "0 0 24px 0", minHeight: "80px" }}>
                {quizData.statements[current]}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "Verdadeiro", value: true, desc: "Isso já aconteceu comigo" },
                  { label: "Falso", value: false, desc: "Nunca passei por isso" }
                ].map(opt => (
                  <button key={opt.label} onClick={() => handleAnswer(opt.value)} style={{
                    width: "100%", padding: "14px 16px",
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
            </Card>
          </div>
        )}


        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>

            {/* Title area */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              {/* Spinner */}
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
                Nossas ferramentas estão interpretando os padrões presentes nas suas respostas.
              </p>
            </div>

            {/* Steps card */}
            <Card style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#D4AF37", marginBottom: "18px" }}>
                O que estamos verificando
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {PROCESSING_STEPS.map((step, i) => {
                  const isDone   = procStepsDone.has(i);
                  const isActive = procActiveStep === i && !isDone;
                  const visible  = procActiveStep !== null && i <= procActiveStep;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      opacity: visible ? 1 : 0.18,
                      animation: visible ? "fadeSlideUp 0.4s ease forwards" : "none",
                      transition: "opacity 0.25s ease",
                    }}>
                      {/* Check / pending circle */}
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
                        color: isDone ? "#0A1128" : isActive ? "#C5A059" : "#94A3B8",
                        transition: "color 0.3s ease",
                        lineHeight: 1.45, flex: 1,
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

              {/* Progress bar inside card */}
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
              <Label>Seu perfil</Label>
              <h2 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700, color: "#0A1128", margin: 0, lineHeight: 1.3 }}>
                {result.name}
              </h2>
            </Card>

            {/* Sections */}
            {[
              { label: "O que isso mostra", content: result.diagnosis },
              { label: "Situações que você provavelmente reconhece", content: result.mirror },
              { label: "O custo que ninguém vê", content: result.cost },
              { label: "O que poucas pessoas percebem", content: result.insight },
              { label: "O que não é culpa sua", content: result.belief },
            ].map((s, i) => (
              <Card key={i} style={{ marginBottom: "16px" }}>
                <Label>{s.label}</Label>
                <p style={{ fontSize: "15px", lineHeight: 1.85, color: "#374151", margin: 0 }}>{s.content}</p>
              </Card>
            ))}

            {/* Closing quote */}
            <div style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.09), rgba(212,175,55,0.03))",
              borderRadius: "24px", padding: "24px",
              border: "1px solid rgba(212,175,55,0.22)",
              marginBottom: "16px"
            }}>
              <p style={{ fontSize: "16px", lineHeight: 1.85, color: "#1E293B", margin: 0, fontStyle: "italic", fontWeight: 500 }}>
                {result.closing}
              </p>
            </div>

            {/* CTA */}
            <Card style={{ marginBottom: "16px", textAlign: "center" }}>
              <Label>Antes de sair</Label>
              <p style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1.45, color: "#0A1128", marginBottom: "16px", marginTop: "4px" }}>
                Não existe nenhuma outra mulher no mundo que viveu exatamente o que você viveu.
              </p>
              <p style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.85, color: "#64748B", marginBottom: "14px" }}>
                As mesmas palavras, ditas por pessoas diferentes, machucam de formas diferentes. O mesmo comportamento, vindo de pessoas diferentes, deixa marcas diferentes.
              </p>
              <p style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.8, color: "#374151", marginBottom: "14px" }}>
                A sua história é só sua. E ela merece ser tratada como tal.
              </p>
              <p style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.85, color: "#64748B", marginBottom: "14px" }}>
                É por isso que você provavelmente já tentou muita coisa — e mesmo assim aquela sensação ficou. Porque a maioria dos conselhos, dos livros e dos conteúdos sobre relacionamentos foi feito pensando numa mulher genérica. Não na sua situação. Não na sua dor específica.
              </p>
              <p style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.8, color: "#374151", marginBottom: "6px" }}>
                O que vem a seguir foi pensado de um jeito diferente.
              </p>
              <p style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.85, color: "#64748B", marginBottom: "28px", fontStyle: "italic" }}>
                Você não precisa se adaptar ao que vem a seguir. O que vem a seguir é que foi feito pra se adaptar a você.
              </p>
              
<img
  src="/cta.png"
  alt="CTA"
  style={{
    width: "100%",
    borderRadius: "16px",
    marginBottom: "20px"
  }}
/>

              <a href="#" style={{
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
                Descobrir meu próximo passo
              </a>
              <p style={{ fontSize: "12px", fontWeight: 500, color: "#94A3B8", marginTop: "14px", lineHeight: 1.6, marginBottom: 0 }}>
                O que você vai encontrar leva em conta exatamente onde você está agora.
              </p>
            </Card>

            {/* Restart */}
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <button onClick={reset} style={{
                background: "transparent", border: "none", color: "#94A3B8",
                fontSize: "12px", fontWeight: 500, cursor: "pointer",
                textDecoration: "underline", fontFamily: "'Public Sans','Inter',sans-serif", padding: "8px"
              }}>
                Refazer o teste
              </button>
            </div>
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
