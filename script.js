let D = [], o = 0;
const G = 18e5, T = 18e6, BRT = -3 * 36e5;
const L = { bw: 8, bh: 5.5, r: 2.2, cg: 6, bcg: 3, cs: 14, sy: 30, rh: 10 };
L.cw = L.bw + L.bcg + 4 * L.cg + 2 * L.r;
L.tw = 3 * L.cw + 2 * L.cs;
L.sx = 105 - L.tw / 2;

const fmt = k => k.match(/.{1,4}/g).join('-').toUpperCase();
const gen = () => (Date.now() + G + T).toString(36).padStart(8, '0') + Math.random().toString(36).substring(2, 10).padEnd(8, '0');
const gt = () => Date.now() + o;
const hms = m => new Date(m + BRT).toISOString().substring(11, 19);

const xm = s => {
	let h = 1779033703 ^ s.length;
	for (let i = 0; i < s.length; i++) {
		h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
		h = h << 13 | h >>> 19;
	}
	return () => {
		h = Math.imul(h ^ h >>> 16, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		return (h ^= h >>> 16) >>> 0;
	};
};

const ml = a => () => {
	let t = a += 0x6D2B79F5;
	t = Math.imul(t ^ t >>> 15, t | 1);
	t ^= t + Math.imul(t ^ t >>> 7, t | 61);
	return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const sh = u => {
	const r = ml(xm(u)()), p = D.slice();
	let i, j, t;
	for (i = p.length - 1; i > 0; i--) {
		j = Math.floor(r() * (i + 1));
		t = p[i]; p[i] = p[j]; p[j] = t;
	}
	while (p.length < 45)
		p.push({ img: '', c: 'A' });
	return p.slice(0, 45);
};

const st = async () => {
	const c = new AbortController(), t = setTimeout(() => c.abort(), 3000);
	try {
		const d = await (await fetch('https://timeapi.io/api/v1/time/current/utc', { signal: c.signal })).json();
		o = Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.seconds, d.milliSeconds) - Date.now();
	} catch (e) {
		o = 0;
	} finally {
		clearTimeout(t);
	}
};

const getImgCanvas = (u, maxDim) => new Promise((res, rej) => {
	const i = new Image();
	i.crossOrigin = "Anonymous";
	i.onload = () => {
		const sc = maxDim ? Math.min(1, maxDim / Math.max(i.width, i.height)) : 1;
		const w = Math.round(i.width * sc), h = Math.round(i.height * sc);
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		c.getContext('2d').drawImage(i, 0, 0, w, h);
		res({ d: c.toDataURL('image/png'), w, h });
	};
	i.onerror = rej;
	i.src = u;
});

const getImgRaw = async u => {
	const r = await fetch(u);
	if (!r.ok)
		throw new Error(u);
	const b = await r.blob();
	const fr = new FileReader();
	fr.readAsDataURL(b);
	const d = await new Promise((res, rej) => {
		fr.onload = () => res(fr.result);
		fr.onerror = rej;
	});
	const i = new Image();
	i.src = d;
	await i.decode();
	return { d, w: i.width, h: i.height };
};

const loadDB = async () => {
	try {
		const r = await fetch('data/list.txt');
		if (!r.ok)
			throw 0;
		D = (await r.text()).split('\n').map(l => l.trim()).filter(l => l).map(f => {
			const p = f.split(/[-/.]/);
			return { img: f, c: p[p.length - 2] };
		});
	} catch (e) {
		alert('Erro: data/list.txt não encontrado.');
	}
};

(async () => {
	const p = new URLSearchParams(location.search);

	if (p.has('k')) {
		const k = p.get('k').replace(/-/g, '').toLowerCase();
		if (k.length < 8)
			return;
		const e = parseInt(k.substring(0, 8), 36);

		await loadDB();
		await st();
		if (gt() > e)
			return;

		const Q = sh(k), A = Q.map(q => q.c).join('');
		const m = 10, W = L.tw + m * 2, H = L.sy + 15 * L.rh + m;
		let s = `<div style="position:absolute;top:20px;left:20px;"><img src="mt.svg" style="height:40px;"></div>`;
		s += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:800px;height:auto;display:block;margin:60px auto 20px auto;">`;
		for (let c = 0; c < 3; c++) {
			const x = m + c * (L.cw + L.cs);
			for (let i = 0; i < 5; i++)
				s += `<text x="${x + L.bw + L.bcg + L.r + i * L.cg}" y="${L.sy - 4}" font-family="Times New Roman, Times, serif" font-size="2.5" text-anchor="middle" fill="black">${'ABCDE'[i]}</text>`;
		}
		for (let i = 0; i < 45; i++) {
			const c = Math.floor(i / 15), r = i % 15;
			const x = m + c * (L.cw + L.cs), y = L.sy + r * L.rh;
			s += `<rect x="${x}" y="${y - L.bh / 2}" width="${L.bw}" height="${L.bh}" fill="black"/>`;
			s += `<text x="${x + L.bw / 2}" y="${y + 1}" font-family="Times New Roman, Times, serif" font-size="3.2" font-weight="bold" text-anchor="middle" fill="white">${String(i + 1).padStart(2, '0')}</text>`;
			for (let j = 0; j < 5; j++) {
				const f = A[i] === 'ABCDE'[j] ? 'black' : 'white';
				s += `<circle cx="${x + L.bw + L.bcg + L.r + j * L.cg}" cy="${y}" r="${L.r}" fill="${f}" stroke="black" stroke-width="0.3"/>`;
			}
		}
		s += '</svg>';
		document.body.innerHTML = s;
		return;
	}

	if (p.get('c') === 'check') {
		document.body.innerHTML = `
			<div style="position:absolute;top:20px;left:20px;"><img src="mt.svg" style="height:40px;"></div>
			<div style="font-family:monospace;padding:20px;display:flex;justify-content:center;align-items:center;height:100vh;">
				<form onsubmit="event.preventDefault();const v=this.querySelector('input').value.replace(/[^a-z0-9]/gi,'').toLowerCase();if(v)location.href='?k='+v;" style="display:flex;gap:10px;">
					<input placeholder="XXXX-XXXX-XXXX-XXXX" style="font-size:24px;padding:10px;text-transform:uppercase;width:300px;text-align:center;border:2px solid black;outline:none;" autofocus>
					<button type="submit" style="font-size:24px;padding:10px 20px;cursor:pointer;background:black;color:white;border:none;font-weight:bold;">OK</button>
				</form>
			</div>`;
		return;
	}

	if (p.get('c') === 'create') {
		await loadDB();
		await st();
		document.body.innerHTML = `<div style="position:absolute;top:20px;left:20px;"><img src="mt.svg" style="height:40px;"></div>`;

		const u = gen(), Q = sh(u), g = gt(), S = g + G, E = S + T;
		const url = location.origin + location.pathname + '?k=' + u;
		const cq = document.createElement('div');
		new QRCode(cq, { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
		const qd = cq.querySelector('canvas').toDataURL('image/png');
		const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
		doc.setFont('times');

		let lb = 150, lg;
		try {
			lg = await getImgCanvas('mt.svg', 512);
		} catch (e) {}
		if (lg) {
			const mm = 70, rt = lg.w / lg.h;
			const mw = lg.w >= lg.h ? mm : mm * rt, mh = lg.w >= lg.h ? mm / rt : mm;
			doc.addImage(lg.d, 'PNG', 105 - mw / 2, 148.5 - mh / 2, mw, mh);
			lb = 148.5 + mh / 2;
		} else {
			doc.setFontSize(140);
			doc.text('MT', 105, 140, { align: 'center' });
		}

		doc.setFontSize(12);
		doc.text(hms(S), 105, lb + 15, { align: 'center' });
		doc.text(hms(E), 105, lb + 22, { align: 'center' });

		for (let i = 0; i < 45; i++) {
			doc.addPage();
			doc.setFontSize(14);
			doc.setFont('times', 'bold');
			doc.text('Questão ' + (i + 1), 20, 20);
			if (!Q[i].img)
				continue;
			try {
				const im = await getImgRaw(Q[i].img);
				const rt = im.w / im.h;
				let mw = 180, mh = 180 / rt;
				if (mh > 250) {
					mh = 250;
					mw = 250 * rt;
				}
				doc.addImage(im.d, 'PNG', (210 - mw) / 2, 25, mw, mh);
			} catch (e) {}
		}

		doc.addPage();
		for (let c = 0; c < 3; c++) {
			const x = L.sx + c * (L.cw + L.cs);
			doc.setFontSize(8);
			doc.setFont('times', 'normal');
			for (let i = 0; i < 5; i++)
				doc.text('ABCDE'[i], x + L.bw + L.bcg + L.r + i * L.cg, L.sy - 4, { align: 'center' });
		}
		for (let i = 0; i < 45; i++) {
			const c = Math.floor(i / 15), r = i % 15;
			const x = L.sx + c * (L.cw + L.cs), y = L.sy + r * L.rh;
			doc.setFillColor(0, 0, 0);
			doc.rect(x, y - L.bh / 2, L.bw, L.bh, 'F');
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(9);
			doc.setFont('times', 'bold');
			doc.text(String(i + 1).padStart(2, '0'), x + L.bw / 2, y + 1, { align: 'center' });
			doc.setTextColor(0, 0, 0);
			for (let j = 0; j < 5; j++)
				doc.circle(x + L.bw + L.bcg + L.r + j * L.cg, y, L.r, 'S');
		}

		doc.addImage(qd, 'PNG', 155, 220, 40, 40);
		doc.setFontSize(9);
		doc.setFont('times', 'bold');
		doc.text(fmt(u), 175, 268, { align: 'center' });
		doc.save('prova.pdf');
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
