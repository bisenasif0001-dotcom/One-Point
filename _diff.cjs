const puppeteer = require('puppeteer');
const fs = require('fs');
const pages = ['service-pan-card','service-voter-id','service-color-printing','service-document-scanning','service-lamination','service-photocopy-printing','index','services'];
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  for (const slug of pages) {
    const a = `_base_${slug}.png`, b = `_after_${slug}.png`;
    if (!fs.existsSync(a) || !fs.existsSync(b)) { console.log(slug, 'missing'); continue; }
    const ad = 'data:image/png;base64,'+fs.readFileSync(a).toString('base64');
    const bd = 'data:image/png;base64,'+fs.readFileSync(b).toString('base64');
    const res = await page.evaluate(async (ad, bd) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const ia = await load(ad), ib = await load(bd);
      const W = Math.min(ia.width, ib.width), H = Math.min(ia.height, ib.height);
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.drawImage(ia,0,0); const da = x.getImageData(0,0,W,H).data;
      x.clearRect(0,0,W,H); x.drawImage(ib,0,0); const db = x.getImageData(0,0,W,H).data;
      let diff=0; for (let i=0;i<da.length;i+=4){ if(Math.abs(da[i]-db[i])+Math.abs(da[i+1]-db[i+1])+Math.abs(da[i+2]-db[i+2])>30) diff++; }
      return { W, H, ah: ia.height, bh: ib.height, pctDiff: +(100*diff/(W*H)).toFixed(2) };
    }, ad, bd);
    console.log(`${slug.padEnd(28)} base=${res.ah}px after=${res.bh}px diff=${res.pctDiff}%`);
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
