const fs = require('fs');
/*
  audit:ui — kiểm giao diện toàn site bằng trình duyệt thật theo .clinerules/03-chuan-giao-dien-ui.md.
  Chạy: npm run preview (cửa sổ khác) rồi npm run audit:ui
        AUDIT_URL=https://hugo-theme-sept2026-test.vercel.app npm run audit:ui   (production)
        AUDIT_PAGES="/,/collections/all" npm run audit:ui                       (chỉ vài trang)
  Kết quả: test-results/audit-ui/report.json + ảnh toàn trang; in tóm tắt lỗi theo mã UI-x.y. Exit 1 khi có lỗi ✱.
*/
const { chromium } = require('playwright');
const nodePath = require('path');
const BASE = (process.env.AUDIT_URL || 'http://localhost:3000').replace(/\/$/,'');
const OUTDIR = nodePath.join(__dirname, '..', 'test-results', 'audit-ui');
fs.mkdirSync(OUTDIR, { recursive: true });
// Trang đại diện cho mọi template/alias — thêm vào đây khi tạo template/trang mới (.clinerules/03).
const PAGES = (process.env.AUDIT_PAGES ? process.env.AUDIT_PAGES.replace(/,/g,'\n') : `/
/collections/all
/collections/skinceuticals
/collections/giai-phap-mun-trung-ca
/collections/flash-sale-1
/products/kem-duong-retinol-0-3-peptide
/products/serum-vitamin-c-15
/?tpl=list_collections
/?tpl=search
/?tpl=cart
/?tpl=404
/?tpl=login
/?tpl=register
/?tpl=account
/?tpl=orders
/?tpl=addresses
/blogs/tin-tuc
/blogs/tin-tuc/retinol-thanh-phan-vang-chong-lao-hoa
/blogs/chuyen-gia
/blogs/chuyen-gia/chuyen-gia-thanh-hang
/blogs/hoat-chat
/blogs/hoat-chat/retinol
/blogs/truoc-va-sau
/blogs/giai-phap-skin-health
/?tpl=blog.video
/?tpl=blog.instagram-feed
/about-us
/gioi-thieu
/chuyen-gia
/clinical-proof
/dat-lich-tu-van
/skin-health-beauty
/skinhealthy-services
/skinhealthy-service-detail
/spa-services
/soi-da
/kham-da-ai
/ai-skin-quiz
/tra-cuu-hoat-chat
/tin-tuc
/loyalty
/order-lookup
/dai-ly-b2b
/chinh-sach-bao-mat
/getglowing-micro-peel-ha-noi
/seo-directory
/patient-portal`).split('\n').map(s=>s.trim()).filter(Boolean);
// = các bậc --fs-* (desktop + mobile) ở snippets/design_tokens.bwt — .clinerules/03 UI-2.2
const SCALE = new Set([10,11,12,13,14,15,16,17,18,20,24,26,28,32,36,40,46,56,100,200]);
(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const [vpName, vp, mobile] of [['laptop',{width:1440,height:900},false],['mobile',{width:390,height:844},true]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
    for (const path of PAGES) {
      const page = await ctx.newPage(); const errors = [];
      page.on('dialog', d => { errors.push('dialog: ' + d.message().slice(0,80)); d.dismiss().catch(()=>{}); }); // alert/confirm chặn evaluate ⇒ từng treo ở /?tpl=account
      page.on('pageerror', e => errors.push('JS: '+e.message.slice(0,140)));
      page.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text().slice(0,140)); });
      let timer; const hang = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('quá 90s — trang treo')), 90000); });
      try { await Promise.race([hang, (async () => {
        await page.goto(BASE+path, { waitUntil: 'networkidle', timeout: 45000 });
        await page.evaluate(async () => { for (let y=0,i=0;y<document.body.scrollHeight&&i<40;y+=700,i++){ /* trần 40 bước: trang tự dài ra khi cuộn (tra-cuu-hoat-chat) từng làm treo */ window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));} window.scrollTo(0,0); });
        await page.waitForTimeout(500);
        page.setDefaultTimeout(30000);
        const r = await page.evaluate((SCALE) => {
          SCALE = new Set(SCALE);
          const vis = el => { const s=getComputedStyle(el); if (s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return false; const b=el.getBoundingClientRect(); return b.width>0&&b.height>0; };
          const deepVis = el => { for (let p=el;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p); if(s.display==='none'||s.visibility==='hidden') return false;} return true; };
          const out = {};
          out.overflowX = document.documentElement.scrollWidth - window.innerWidth;
          // phần tử thò ra ngoài viewport phải
          const off = [];
          document.querySelectorAll('body *').forEach(el => { if (off.length>6) return; const b=el.getBoundingClientRect(); if (b.width>0 && b.right > window.innerWidth+2 && b.left < window.innerWidth && deepVis(el)) { let clip=false; for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p); if(/hidden|clip|auto|scroll/.test(s.overflowX)){clip=true;break;}} if(!clip) off.push(el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' r='+Math.round(b.right)); } });
          out.offscreen = off;
          // mép container
          // lấy đúng logo hiển thị (querySelector nhiều selector trả phần tử đầu theo thứ tự DOM ⇒ từng bắt nhầm icon cờ ở topbar)
          const logo = ['header a.logo-wrapper','header .header-logo','header .pc-logo-master'].map(s => [...document.querySelectorAll(s)].find(e => e.getBoundingClientRect().width > 0)).find(Boolean);
          out.headerLeft = logo ? Math.round(logo.getBoundingClientRect().left) : null;
          const edges = {};
          document.querySelectorAll('main .container, .bodywrap .container, section .container, .breadcrumb-container .container, .footer .container').forEach(c => { if(!vis(c)||!deepVis(c)) return; const cs=getComputedStyle(c); const l=Math.round(c.getBoundingClientRect().left+parseFloat(cs.paddingLeft)); const w=Math.round(c.getBoundingClientRect().width); const k=l+'/'+w; (edges[k]=edges[k]||[]).push(String(c.parentElement.className||c.parentElement.tagName).split(' ')[0]); });
          out.containerEdges = edges;
          // chữ
          const fam = {}, odd = {}; let h1 = 0;
          const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set();
          while (tw.nextNode()) { const t=tw.currentNode; if(!t.textContent.trim()) continue; const el=t.parentElement; if(!el||seen.has(el)) continue; seen.add(el);
            if (el.closest('script,style,noscript,.dev-toolbar,#dev-toolbar,[class*="dev-tool"],.tpl-badge,.sr-only,.visually-hidden')) continue;
            if (!vis(el)||!deepVis(el)) continue; const cs=getComputedStyle(el);
            if (cs.position==='absolute' && cs.clip && cs.clip!=='auto') continue;
            const f=cs.fontFamily.split(',')[0].replace(/["']/g,'').trim(); fam[f]=(fam[f]||0)+1;
            const fs=parseFloat(cs.fontSize); if (!SCALE.has(fs)) { const k=fs+'px'; (odd[k]=odd[k]||[]).push(el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+'«'+t.textContent.trim().slice(0,16)+'»'); }
          }
          document.querySelectorAll('h1').forEach(h=>{ let ok=true; for(let e=h;e&&e!==document.body;e=e.parentElement){ if(getComputedStyle(e).display==='none'){ok=false;break;} } if(ok) h1++; }); /* chỉ display:none mới tính là mất h1 — h1 trong slide hero tự chạy tạm visibility:hidden khi chuyển slide */ // h1 sr-only / đang fade-in vẫn hợp lệ cho SEO
          out.fonts = fam; out.oddSizes = Object.fromEntries(Object.entries(odd).map(([k,v])=>[k,[v.length, ...[...new Set(v)].slice(0,4)]])); out.h1 = h1;
          // ảnh
          const imgs = []; document.querySelectorAll('img').forEach(i => { if(!deepVis(i)) return; if (i.complete && i.naturalWidth===0 && i.getAttribute('src')) imgs.push('BROKEN '+i.getAttribute('src').slice(0,80)); else if (!i.hasAttribute('alt')) imgs.push('NOALT '+(i.getAttribute('src')||'').slice(0,80)); });
          out.imgs = imgs.slice(0,8);
          // nút nhỏ
          const small = []; if (window.innerWidth < 500) document.querySelectorAll('button, a.btn, .btn, input[type=submit]').forEach(b => { if(!vis(b)||!deepVis(b)) return; const r=b.getBoundingClientRect(); if (r.height<32 || r.width<32) small.push(String(b.className).split(' ')[0]+'«'+(b.textContent.trim()||b.getAttribute('aria-label')||'').slice(0,14)+'» '+Math.round(r.width)+'x'+Math.round(r.height)); });
          out.smallTargets = small.slice(0,8);
          out.title = document.title.slice(0,60);
          const bodyText = document.body.innerText; out.liquidLeak = /Liquid (syntax )?error|SYSTEM\.LINQ|\{\{|\{%/.test(bodyText) ? (bodyText.match(/.{0,40}(Liquid (syntax )?error|SYSTEM\.LINQ|\{\{|\{%).{0,40}/)||[''])[0] : '';
          return out;
        }, [...SCALE]);
        r.errors = [...new Set(errors)].slice(0,5);
        const fn = nodePath.join(OUTDIR, vpName+'_'+path.replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'') .slice(0,60)+'.png');
        await page.screenshot({ path: fn, fullPage: true }).catch(()=>{});
        report.push({ vp: vpName, path, ...r });
      })()]); } catch (e) { report.push({ vp: vpName, path, fatal: e.message.slice(0,200) }); }
      clearTimeout(timer);
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(nodePath.join(OUTDIR, 'report.json'), JSON.stringify(report, null, 1));
  // Tóm tắt theo mã tiêu chí (.clinerules/03)
  let fail = 0; const line = (code, r, msg) => { fail++; console.log(`${code}  [${r.vp}] ${r.path}  ${msg}`); };
  for (const r of report) {
    if (r.fatal) { line('LOAD  ', r, r.fatal); continue; }
    if (r.overflowX > 1) line('UI-1.1', r, `cuộn ngang ${r.overflowX}px`);
    if (r.offscreen.length) line('UI-1.1', r, 'thò ra mép phải: ' + r.offscreen.slice(0,3).join(', '));
    if (r.vp === 'laptop' && r.headerLeft != null) { const full = Math.max(...Object.keys(r.containerEdges).map(k => +k.split('/')[1]), 0); /* khung hẹp có chủ đích (FAQ 760px…) không tính — .clinerules/01 2.1 */ const bad = Object.keys(r.containerEdges).filter(k => +k.split('/')[1] >= full - 2 && Math.abs(+k.split('/')[0] - r.headerLeft) > 2); if (bad.length) line('UI-1.2', r, `mép container ${bad.map(k=>k+'('+r.containerEdges[k][0]+')').join(', ')} ≠ logo ${r.headerLeft}`); }
    const badFont = Object.keys(r.fonts).filter(f => !/Montserrat|monospace|Font ?Awesome|Material|swiper-icons/i.test(f)); if (badFont.length) line('UI-2.1', r, 'font lạ: ' + badFont.join(', '));
    const odd = Object.entries(r.oddSizes); if (odd.length) line('UI-2.2', r, 'cỡ ngoài thang: ' + odd.map(([k,v]) => `${k}×${v[0]} ${v[1]||''}`).join(' ; '));
    if (r.h1 !== 1) line('UI-2.5', r, `${r.h1} thẻ h1`);
    if (r.smallTargets.length) line('UI-4.1', r, 'vùng bấm nhỏ: ' + r.smallTargets.slice(0,4).join(', '));
    r.imgs.forEach(i => line(i.startsWith('BROKEN') ? 'UI-6.1' : 'UI-6.2', r, i));
    r.errors.filter(e => e.startsWith('JS:') && !(/localhost/.test(BASE) && /Bizweb is not defined|\$\.validate is not a function/.test(e)))  /* preview không có bizweb-api.js/customer.js từ CDN Sapo */.forEach(e => line('UI-8.1', r, e));
    if (r.liquidLeak) line('UI-8.2', r, 'lộ mã/lỗi Liquid: ' + r.liquidLeak);
  }
  console.log(`
audit:ui — ${report.length} lượt trang, ${fail} lỗi. Ảnh + report: ${OUTDIR}`);
  process.exitCode = fail ? 1 : 0;
})();
