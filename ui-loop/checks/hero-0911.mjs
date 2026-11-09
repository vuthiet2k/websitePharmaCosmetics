import { chromium, webkit, devices } from 'playwright';
import zlib from 'node:zlib';
const base = process.argv[2] || 'http://localhost:3000/';
function decode(buf){ let o=8, w,h,ct, idat=[]; while(o<buf.length){ const len=buf.readUInt32BE(o), t=buf.toString('ascii',o+4,o+8), d=buf.subarray(o+8,o+8+len);
  if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];} if(t==='IDAT') idat.push(d); o+=12+len; }
  const bpp = ct===6?4:3, raw=zlib.inflateSync(Buffer.concat(idat)), px=Buffer.alloc(w*h*bpp), st=w*bpp;
  for(let y=0;y<h;y++){ const f=raw[y*(st+1)], r=raw.subarray(y*(st+1)+1,(y+1)*(st+1)); for(let x=0;x<st;x++){ const a=x>=bpp?px[y*st+x-bpp]:0, b=y?px[(y-1)*st+x]:0, c=(x>=bpp&&y)?px[(y-1)*st+x-bpp]:0; let v=r[x];
    if(f===1)v+=a; else if(f===2)v+=b; else if(f===3)v+=(a+b)>>1; else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c); v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);} px[y*st+x]=v&255; } }
  return {w,h,bpp,px}; }
const lin=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4}, L=(r,g,b)=>.2126*lin(r)+.7152*lin(g)+.0722*lin(b), CR=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
function contrast(img, fg){ const out=[]; for(let i=0;i<img.w*img.h;i++){ const r=img.px[i*img.bpp],g=img.px[i*img.bpp+1],b=img.px[i*img.bpp+2];
  const [fr,fg2,fb,fa]=fg; const tr=fr*fa+r*(1-fa), tg=fg2*fa+g*(1-fa), tb=fb*fa+b*(1-fa); out.push(CR(L(tr,tg,tb),L(r,g,b))); } out.sort((a,b)=>a-b);
  return { p10:+out[Math.floor(out.length*.1)].toFixed(2), med:+out[Math.floor(out.length*.5)].toFixed(2), min:+out[0].toFixed(2) }; }
for (const [name, eng, opt] of [['chromium390', chromium, { viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1 }], ['webkit-iPhone13', webkit, {...devices['iPhone 13'], deviceScaleFactor:1}], ['desk1440', chromium, { viewport:{width:1440,height:900} }]]) {
  const b = await eng.launch(); const ctx = await b.newContext({ ...opt, reducedMotion:'reduce' }); const p = await ctx.newPage();
  await p.goto(base, { waitUntil:'networkidle', timeout:90000 }); await p.addStyleTag({content:'#dev-toolbar{display:none!important}'}); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => { const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(Math.round)};
    const hero=document.querySelector('#section_hero .portal-hero__media, .portal-hero__media'); const act=document.querySelector('.portal-hero__slide.swiper-slide-active')||document.querySelector('.portal-hero__slide');
    const t=act.querySelector('.portal-hero__title'), btn=act.querySelector('.portal-hero__cta .pc-btn'); const nav=document.querySelector('.pc-bottom-nav'); const cs=getComputedStyle(t);
    const next=hero.closest('section').nextElementSibling;
    return { vh: innerHeight, hero: R(hero), title: R(t), titleTxt: t.textContent.trim(), font: cs.fontWeight+' '+cs.fontSize+' '+cs.textTransform+' '+cs.color, btn: R(btn), btnTxt: btn&&btn.textContent.trim(), nav: R(nav), navVisible: nav && getComputedStyle(nav).display!=='none', nextTop: next && Math.round(next.getBoundingClientRect().top), heroBottom: Math.round(hero.getBoundingClientRect().bottom), below: (()=>{const y=hero.getBoundingClientRect().bottom+12; if(y>=innerHeight) return 'ngoài màn'; const e=document.elementFromPoint(innerWidth/2,y); return e && (e.tagName+'.'+String(e.className).slice(0,40))})(), btnBg: btn && getComputedStyle(btn).backgroundColor+' / '+getComputedStyle(btn).color, titleOp: getComputedStyle(t).opacity+'/'+getComputedStyle(t.closest('.portal-hero__caption')).opacity }; });
  await p.addStyleTag({content:'.portal-hero__caption{visibility:hidden!important}'}); await p.waitForTimeout(300);
  const shot = async (r) => decode(await p.screenshot({ clip:{x:Math.max(0,r[0]),y:Math.max(0,r[1]),width:r[2],height:Math.min(r[3], m.vh - r[1])} }));
  const ct = contrast(await shot(m.title), [255,255,255,.82]);
  // Nút so với ảnh xung quanh (viền 10px quanh nút, ẩn caption): tương phản nền nút #075B40 với từng điểm ảnh — WCAG 1.4.11 cần ≥ 3:1
  const ring = await shot([m.btn[0]-10, m.btn[1]-10, m.btn[2]+20, m.btn[3]+20]);
  const bgL = L(7,91,64); const rs=[]; for(let y=0;y<ring.h;y++) for(let x=0;x<ring.w;x++){ if(x>=10&&x<ring.w-10&&y>=10&&y<ring.h-10) continue; const o=(y*ring.w+x)*ring.bpp; rs.push(CR(bgL, L(ring.px[o],ring.px[o+1],ring.px[o+2]))); }
  rs.sort((a,b)=>a-b); const cb = m.btnBg + ' | nút vs ảnh quanh: p10 ' + rs[Math.floor(rs.length*.1)].toFixed(2) + ' trung vị ' + rs[Math.floor(rs.length*.5)].toFixed(2) + ' min ' + rs[0].toFixed(2);
  console.log('==', name, JSON.stringify(m)); console.log('   tương phản tiêu đề (trắng 82%):', JSON.stringify(ct), ' | nút (#0E5235):', JSON.stringify(cb));
  await b.close();
}
