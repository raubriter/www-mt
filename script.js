const HALF_HOUR_MS = 1_800_000;
const FIVE_HOURS_MS = 18_000_000;
const TIMEZONE_OFFSET_MS = -3 * 3_600_000;
const HASH_SEED = 1_779_033_703;
const MULBERRY_SEED = 0x6d2b79f5;
const DEFAULT_QUESTIONS = 45;
const OPTIONS = 'ABCDE';
const DEFAULT_OPTION = 'A';

const LAYOUT = {
  bw: 8,
  bh: 5.5,
  r: 2.2,
  cg: 6,
  bcg: 3,
  cs: 14,
  sy: 30,
  rh: 10
};
LAYOUT.cw = LAYOUT.bw + LAYOUT.bcg + 4 * LAYOUT.cg + 2 * LAYOUT.r;
LAYOUT.tw = 3 * LAYOUT.cw + 2 * LAYOUT.cs;
LAYOUT.sx = 105 - LAYOUT.tw / 2;

let questionDatabase = [];
let timeOffset = 0;

const formatCode = code => code.match(/.{1,4}/g).join('-').toUpperCase();

const generateCode = () => {
  const timestamp = (Date.now() + HALF_HOUR_MS + FIVE_HOURS_MS).toString(36).padStart(8, '0');
  const random = Math.random().toString(36).substring(2, 10).padEnd(8, '0');
  return timestamp + random;
};

const getCurrentTime = () => Date.now() + timeOffset;

const formatTime = ms =>
  new Date(ms + TIMEZONE_OFFSET_MS).toISOString().substring(11, 19);

const formatDateTime = ms => {
  const iso = new Date(ms + TIMEZONE_OFFSET_MS).toISOString();
  return (
    iso.substring(8, 10) +
    iso.substring(5, 7) +
    iso.substring(0, 4) +
    '_' +
    iso.substring(11, 13) +
    iso.substring(14, 16) +
    iso.substring(17, 19)
  );
};

const hashString = str => {
  let hash = HASH_SEED ^ str.length;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
};

const createPRNG = seed => () => {
  let t = (seed += MULBERRY_SEED);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffleQuestions = input => {
  const random = createPRNG(hashString(input)());
  const pool = questionDatabase.slice();

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  while (pool.length < DEFAULT_QUESTIONS) {
    pool.push({ img: '', c: DEFAULT_OPTION });
  }

  return pool.slice(0, DEFAULT_QUESTIONS);
};

const syncTime = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch('https://timeapi.io/api/v1/time/current/utc', {
      signal: controller.signal
    });
    const data = await response.json();
    timeOffset =
      Date.UTC(
        data.year,
        data.month - 1,
        data.day,
        data.hour,
        data.minute,
        data.seconds,
        data.milliSeconds
      ) - Date.now();
  } catch {
    timeOffset = 0;
  } finally {
    clearTimeout(timeout);
  }
};

const loadImageAsCanvas = (url, maxDimension) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const scale = maxDimension
        ? Math.min(1, maxDimension / Math.max(img.width, img.height))
        : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve({ data: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = reject;
    img.src = url;
  });

const loadQuestionDatabase = async () => {
  try {
    const response = await fetch('data/list.txt');
    if (!response.ok) throw new Error();
    const text = await response.text();
    questionDatabase = text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(filename => {
        const parts = filename.split(/[-/.]/);
        return {
          img: filename,
          c: parts[parts.length - 2]
        };
      });
  } catch {
    showError('Erro: data/list.txt não encontrado.');
  }
};

const showError = message => {
  document.body.innerHTML = `
    <div style="position:absolute;top:20px;left:20px;">
      <img src="mt.svg" style="height:40px;">
    </div>
    <div style="font-family:monospace;font-size:24px;display:flex;justify-content:center;align-items:center;height:100vh;">
      ${message}
    </div>`;
};

(async () => {
  const params = new URLSearchParams(location.search);

  if (params.has('k')) {
    const code = params.get('k').replace(/-/g, '').toLowerCase();
    if (code.length < 8) return;

    const expiry = parseInt(code.substring(0, 8), 36);

    await syncTime();

    if (getCurrentTime() > expiry) {
      showError('Indisponível');
      return;
    }

    await loadQuestionDatabase();

    const questions = shuffleQuestions(code);
    const answers = questions.map(q => q.c).join('');
    const margin = 10;
    const viewWidth = LAYOUT.tw + margin * 2;
    const viewHeight = LAYOUT.sy + 15 * LAYOUT.rh + margin;

    let svg = `<div style="position:absolute;top:20px;left:20px;"><img src="mt.svg" style="height:40px;"></div>`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" style="width:100%;max-width:800px;height:auto;display:block;margin:60px auto 20px auto;">`;

    for (let col = 0; col < 3; col++) {
      const x = margin + col * (LAYOUT.cw + LAYOUT.cs);
      for (let i = 0; i < 5; i++) {
        svg += `<text x="${x + LAYOUT.bw + LAYOUT.bcg + LAYOUT.r + i * LAYOUT.cg}" y="${LAYOUT.sy - 4}" font-family="Times New Roman, Times, serif" font-size="2.5" text-anchor="middle" fill="black">${OPTIONS[i]}</text>`;
      }
    }

    for (let i = 0; i < DEFAULT_QUESTIONS; i++) {
      const col = Math.floor(i / 15);
      const row = i % 15;
      const x = margin + col * (LAYOUT.cw + LAYOUT.cs);
      const y = LAYOUT.sy + row * LAYOUT.rh;

      svg += `<rect x="${x}" y="${y - LAYOUT.bh / 2}" width="${LAYOUT.bw}" height="${LAYOUT.bh}" fill="black"/>`;
      svg += `<text x="${x + LAYOUT.bw / 2}" y="${y + 1}" font-family="Times New Roman, Times, serif" font-size="3.2" font-weight="bold" text-anchor="middle" fill="white">${String(i + 1).padStart(2, '0')}</text>`;

      for (let j = 0; j < 5; j++) {
        const isAnswer = answers[i] === OPTIONS[j];
        svg += `<circle cx="${x + LAYOUT.bw + LAYOUT.bcg + LAYOUT.r + j * LAYOUT.cg}" cy="${y}" r="${LAYOUT.r}" fill="${isAnswer ? 'black' : 'white'}" stroke="black" stroke-width="0.3"/>`;
      }
    }

    svg += '</svg>';
    document.body.innerHTML = svg;
    return;
  }

  if (params.get('c') === 'check') {
    document.body.innerHTML = `
      <div style="position:absolute;top:20px;left:20px;">
        <img src="mt.svg" style="height:40px;">
      </div>
      <div style="font-family:monospace;padding:20px;display:flex;justify-content:center;align-items:center;height:100vh;">
        <form onsubmit="event.preventDefault();const v=this.querySelector('input').value.replace(/[^a-z0-9]/gi,'').toLowerCase();if(v)location.href='?k='+v;" style="display:flex;gap:10px;">
          <input placeholder="XXXX-XXXX-XXXX-XXXX" style="font-size:24px;padding:10px;text-transform:uppercase;width:300px;text-align:center;border:2px solid black;outline:none;" autofocus>
          <button type="submit" style="font-size:24px;padding:10px 20px;cursor:pointer;background:black;color:white;border:none;font-weight:bold;">OK</button>
        </form>
      </div>`;
    return;
  }

  if (params.get('c') === 'create') {
    document.body.innerHTML = `
      <div style="position:absolute;top:20px;left:20px;">
        <img src="mt.svg" style="height:40px;">
      </div>
      <div id="progress" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:64px;line-height:1;color:#000;">0%</div>`;

    const progressEl = document.getElementById('progress');
    let lastProgress = -1;

    const setProgress = value => {
      value = Math.min(100, Math.max(0, value));
      if (value <= lastProgress) return;
      lastProgress = value;
      progressEl.textContent = Math.round(value) + '%';
    };

    const yieldUI = () =>
      document.visibilityState === 'visible'
        ? new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))
        : Promise.resolve();

    setProgress(0);
    const syncPromise = syncTime();

    await loadQuestionDatabase();
    setProgress(2);

    const code = generateCode();
    const questions = shuffleQuestions(code);
    const url = location.origin + location.pathname + '?k=' + code;

    const qrPromise = (() => {
      const container = document.createElement('div');
      new QRCode(container, {
        text: url,
        width: 256,
        height: 256,
        correctLevel: QRCode.CorrectLevel.M
      });
      return container.querySelector('canvas').toDataURL('image/png');
    })();
    setProgress(3);

    const logoPromise = loadImageAsCanvas('mt.svg', 512).catch(() => null);

    const IMG_START = 5;
    const IMG_WEIGHT = 40;
    const activeIndices = [];
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].img) activeIndices.push(i);
    }
    const imageCount = activeIndices.length || 1;

    const imageStates = new Array(questions.length).fill(null);
    for (const idx of activeIndices) {
      imageStates[idx] = { total: 0, loaded: 0, done: false };
    }

    let maxImageProgress = 0;

    const bumpImageProgress = () => {
      let sum = 0;
      for (const idx of activeIndices) {
        const state = imageStates[idx];
        if (state.done) sum += 1;
        else if (state.total > 0) sum += Math.min(1, state.loaded / state.total);
      }
      const progress = sum / imageCount;
      if (progress > maxImageProgress) {
        maxImageProgress = progress;
        setProgress(IMG_START + maxImageProgress * IMG_WEIGHT);
      }
    };

    if (activeIndices.length === 0) setProgress(IMG_START + IMG_WEIGHT);

    const imagesPromise = Promise.all(
      questions.map(async (question, index) => {
        if (!question.img) return null;
        try {
          const response = await fetch(question.img);
          if (!response.ok) throw new Error();
          const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
          imageStates[index].total = contentLength || 0;

          const reader = response.body.getReader();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            imageStates[index].loaded += value.length;
            if (imageStates[index].total > 0) bumpImageProgress();
          }

          const blob = new Blob(chunks, {
            type: response.headers.get('content-type') || 'image/png'
          });
          const fileReader = new FileReader();
          fileReader.readAsDataURL(blob);
          const dataUrl = await new Promise((resolve, reject) => {
            fileReader.onload = () => resolve(fileReader.result);
            fileReader.onerror = reject;
          });

          const img = new Image();
          img.src = dataUrl;
          await img.decode();

          imageStates[index].done = true;
          bumpImageProgress();
          return { data: dataUrl, width: img.width, height: img.height };
        } catch {
          imageStates[index].done = true;
          bumpImageProgress();
          return null;
        }
      })
    );

    const [qrData, logoData, images] = await Promise.all([
      qrPromise,
      logoPromise,
      imagesPromise
    ]);
    await syncPromise;

    setProgress(IMG_START + IMG_WEIGHT);
    await yieldUI();

    const startTime = getCurrentTime();
    const startMs = startTime + HALF_HOUR_MS;
    const endMs = startMs + FIVE_HOURS_MS;

    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.setFont('times');

    let lowerBound = 150;
    if (logoData) {
      const maxLogoMm = 70;
      const ratio = logoData.width / logoData.height;
      const logoWidth = logoData.width >= logoData.height ? maxLogoMm : maxLogoMm * ratio;
      const logoHeight = logoData.width >= logoData.height ? maxLogoMm / ratio : maxLogoMm;
      doc.addImage(logoData.data, 'PNG', 105 - logoWidth / 2, 148.5 - logoHeight / 2, logoWidth, logoHeight);
      lowerBound = 148.5 + logoHeight / 2;
    } else {
      doc.setFontSize(140);
      doc.text('MT', 105, 140, { align: 'center' });
    }

    doc.setFontSize(12);
    doc.text(formatTime(startMs), 105, lowerBound + 15, { align: 'center' });
    doc.text(formatTime(endMs), 105, lowerBound + 22, { align: 'center' });

    const PDF_START = IMG_START + IMG_WEIGHT;
    const PDF_WEIGHT = 97 - PDF_START;
    const totalSteps = 46;
    let step = 0;
    let lastYield = performance.now();

    for (let i = 0; i < 45; i++) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('times', 'bold');
      doc.text('Questão ' + (i + 1), 20, 20);

      const image = images[i];
      if (image) {
        const ratio = image.width / image.height;
        let maxWidth = 180;
        let maxHeight = 180 / ratio;
        if (maxHeight > 250) {
          maxHeight = 250;
          maxWidth = 250 * ratio;
        }
        doc.addImage(image.data, 'PNG', (210 - maxWidth) / 2, 25, maxWidth, maxHeight);
      }

      step++;
      setProgress(PDF_START + (step / totalSteps) * PDF_WEIGHT);

      if (performance.now() - lastYield > 40) {
        await yieldUI();
        lastYield = performance.now();
      }
    }

    doc.addPage();
    for (let col = 0; col < 3; col++) {
      const x = LAYOUT.sx + col * (LAYOUT.cw + LAYOUT.cs);
      doc.setFontSize(8);
      doc.setFont('times', 'normal');
      for (let i = 0; i < 5; i++) {
        doc.text(OPTIONS[i], x + LAYOUT.bw + LAYOUT.bcg + LAYOUT.r + i * LAYOUT.cg, LAYOUT.sy - 4, { align: 'center' });
      }
    }

    for (let i = 0; i < 45; i++) {
      const col = Math.floor(i / 15);
      const row = i % 15;
      const x = LAYOUT.sx + col * (LAYOUT.cw + LAYOUT.cs);
      const y = LAYOUT.sy + row * LAYOUT.rh;

      doc.setFillColor(0, 0, 0);
      doc.rect(x, y - LAYOUT.bh / 2, LAYOUT.bw, LAYOUT.bh, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('times', 'bold');
      doc.text(String(i + 1).padStart(2, '0'), x + LAYOUT.bw / 2, y + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      for (let j = 0; j < 5; j++) {
        doc.circle(x + LAYOUT.bw + LAYOUT.bcg + LAYOUT.r + j * LAYOUT.cg, y, LAYOUT.r, 'S');
      }
    }

    step++;
    setProgress(PDF_START + (step / totalSteps) * PDF_WEIGHT);

    await yieldUI();

    doc.addImage(qrData, 'PNG', 155, 220, 40, 40);
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text(formatCode(code), 175, 268, { align: 'center' });

    setProgress(100);
    await yieldUI();

    doc.save('mt_' + formatDateTime(startMs) + '_' + code.toUpperCase() + '.pdf');
    return;
  }

  document.body.innerHTML = `
    <div style="font-family:monospace;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#fff;">
      <img src="mt.svg" style="width:400px;max-width:90vw;margin-bottom:50px;">
      <div style="display:flex;gap:20px;">
        <a href="?c=create" style="font-family:monospace;font-size:24px;padding:15px 30px;background:#222;color:white;text-decoration:none;border:none;cursor:pointer;font-weight:bold;">create</a>
        <a href="?c=check" style="font-family:monospace;font-size:24px;padding:15px 30px;background:#222;color:white;text-decoration:none;border:none;cursor:pointer;font-weight:bold;">check</a>
      </div>
    </div>`;
})();
