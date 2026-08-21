const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'browser-results');
fs.mkdirSync(outDir, { recursive: true });

const templates = [
  { id:'a4', name:'01-A4', title:'바람이 머문 자리', subtitle:'늦여름의 기록', body:'오래 머문 계절은 떠나는 순간에도 작은 흔적을 남긴다. 창가에 닿은 빛과 느린 바람 사이에서 오늘의 문장을 조용히 적어 둔다.' },
  { id:'letter', name:'02-letter', title:'당신에게 보내는 편지', subtitle:'어느 맑은 저녁에', body:'오늘은 평소보다 조금 천천히 걸었습니다. 서두르지 않아도 도착할 수 있다는 사실을 오래 기억하고 싶어서, 이 짧은 편지를 남깁니다.' },
  { id:'postcard', name:'03-postcard', title:'여름의 끝', subtitle:'POSTCARD · AUGUST', body:'빛이 낮아지고 바람이 길어지는 시간. 우리는 계절의 끝에서 가장 선명한 장면 하나를 오래 바라보았다.' },
  { id:'card', name:'04-card-3x2', title:'작은 기록', subtitle:'NOTE 01', body:'좋아하는 것은 오래 바라볼수록 더 선명해진다. 오늘의 마음도 그렇게 한 줄씩 남겨 둔다.' },
  { id:'widecard', name:'05-widecard-16x9', title:'긴 오후', subtitle:'SCENE 02', body:'창문을 통과한 빛이 방의 가장 먼 곳까지 천천히 번졌다. 아무 일도 일어나지 않은 오후가 오히려 오래 기억에 남았다.' },
  { id:'minicard', name:'06-minicard-4x3', title:'오늘의 문장', subtitle:'MEMO', body:'조용한 하루에도 기록할 만한 순간은 있다. 작은 문장이 그 순간을 붙잡아 준다.' },
  { id:'square', name:'07-square', title:'한 장의 계절', subtitle:'ARCHIVE', body:'계절은 같은 자리로 돌아오는 것 같지만, 매번 조금 다른 빛과 마음을 데려온다.' },
];

function parsePageCount(label){
  const m = label.match(/\/\s*(\d+)/);
  return m ? Number(m[1]) : 1;
}

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({ viewport:{width:1600,height:1100}, acceptDownloads:true });
  const consoleErrors=[];
  page.on('console', msg=>{ if(msg.type()==='error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err=>consoleErrors.push('PAGEERROR: '+err.message));

  await page.goto('http://127.0.0.1:4173/index.html', {waitUntil:'networkidle'});
  await page.waitForTimeout(1200);

  // Dismiss update notice if present. Site behavior is click-the-card-to-close.
  const patch = page.locator('#patchNoticeModal');
  if(await patch.isVisible().catch(()=>false)){
    await page.locator('#patchNoticeModal .patch-notice-card').click({position:{x:30,y:30}}).catch(()=>{});
    await page.waitForTimeout(250);
  }

  const report={
    loaded:true,
    initialTitle: await page.title(),
    templates:[],
    pagination:{},
    slotMinimum:{},
    typography:{},
    background:{},
    consoleErrors
  };

  async function setRange(id,value){
    await page.locator('#'+id).evaluate((el,v)=>{
      el.value=String(v);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }, value);
    await page.waitForTimeout(180);
  }

  async function setColor(id,value){
    await page.locator('#'+id).evaluate((el,v)=>{
      el.value=v;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }, value);
    await page.waitForTimeout(180);
  }

  async function chooseTemplate(id){
    await page.selectOption('#documentTemplate', id);
    await page.waitForTimeout(500);
  }

  async function enterContent(item){
    await page.locator('#titleInput').fill(item.title);
    await page.locator('#subtitleInput').fill(item.subtitle);
    await page.locator('#editor').fill(item.body);
    await page.waitForTimeout(850);
  }

  async function exportCurrentPng(filename){
    await page.click('#saveMenuBtn');
    await page.click('[data-save-scope="current"]');
    const dlPromise = page.waitForEvent('download', {timeout:30000});
    await page.click('[data-export="png"]');
    const dl = await dlPromise;
    const dest=path.join(outDir,filename+'.png');
    await dl.saveAs(dest);
    return dest;
  }

  // Real site-generated PNG for every visible template.
  for(const item of templates){
    await chooseTemplate(item.id);
    await enterContent(item);
    // Exercise typography and paper color on the real UI, but keep results restrained.
    await setRange('letterSpacing', item.id==='widecard'?3:1);
    await setRange('widthScale', item.id==='minicard'?96:100);
    await page.click('[data-tab="background"]');
    await page.locator('.bg-mode[data-mode="solid"]').click();
    await setColor('solidColor', item.id==='postcard'?'#f8f1e7': item.id==='square'?'#f2f0eb':'#fbfaf7');
    await page.click('[data-tab="document"]');
    await page.waitForTimeout(250);

    const paperBox=await page.locator('#paper').boundingBox();
    const bg=await page.locator('#paper').evaluate(el=>getComputedStyle(el).backgroundColor);
    const workspaceBg=await page.locator('.workspace').evaluate(el=>getComputedStyle(el).backgroundColor);
    const titleBox=await page.locator('#titleInput').boundingBox();
    const subtitleBox=await page.locator('#subtitleInput').boundingBox();

    // Open actual site preview and verify it renders.
    await page.click('#previewBtn');
    await page.waitForTimeout(450);
    const previewVisible=await page.locator('#previewModal').isVisible();
    const previewPaperCount=await page.locator('#previewHost .paper').count();
    await page.locator('[data-close-preview]').first().click();
    await page.waitForTimeout(200);

    const saved=await exportCurrentPng(item.name);
    report.templates.push({
      id:item.id,
      file:path.basename(saved),
      paperBox,
      titleBox,
      subtitleBox,
      paperBackground:bg,
      workspaceBackground:workspaceBg,
      previewVisible,
      previewPaperCount,
      orientationLabel:await page.locator('#documentOrientation').inputValue(),
      orientationText:await page.locator('#documentOrientation option:checked').textContent()
    });
  }

  // Automatic pagination: overflow forward, then pull content back after shortening.
  await chooseTemplate('a4');
  await page.click('[data-tab="text"]');
  await page.locator('#titleInput').fill('자동 페이지 흐름 테스트');
  await page.locator('#subtitleInput').fill('넘침과 역류 확인');
  const para='페이지의 끝은 문장의 끝과 같지 않다. 내용이 넘치면 다음 장으로 자연스럽게 이어지고, 앞 장에 빈 공간이 생기면 뒤의 문장이 다시 앞으로 돌아와야 한다. ';
  let bulk=Array.from({length:34},(_,i)=>`문단 ${String(i+1).padStart(2,'0')} · ${para}${para}`).join('\n\n');
  await page.locator('#editor').fill(bulk);
  await page.waitForTimeout(3500);
  const labelAfterOverflow=await page.locator('#pageNavLabel').textContent();
  const pagesAfterOverflow=parsePageCount(labelAfterOverflow);

  // Move to first page and drastically shorten its own text; auto-chain should reflow/pull back.
  while((await page.locator('#pageNavLabel').textContent()).match(/PAGE\s+(\d+)/)?.[1] !== '01'){
    await page.click('#prevPageBtn');
    await page.waitForTimeout(120);
  }
  const firstBefore=await page.locator('#editor').innerText();
  await page.locator('#editor').fill('앞 페이지의 내용을 크게 줄였습니다. 뒤 페이지의 내용이 빈 공간으로 다시 당겨져 오는지 확인합니다.');
  await page.waitForTimeout(3500);
  const labelAfterPull=await page.locator('#pageNavLabel').textContent();
  const pagesAfterPull=parsePageCount(labelAfterPull);
  const firstAfter=await page.locator('#editor').innerText();
  report.pagination={labelAfterOverflow,pagesAfterOverflow,labelAfterPull,pagesAfterPull,firstBeforeLength:firstBefore.length,firstAfterLength:firstAfter.length,pulledAdditionalContent:firstAfter.length>60};

  // Minimum four slots: delete until the UI would go below four, check automatic refill.
  const slotCountBefore=await page.locator('.slot-card').count();
  if(slotCountBefore>=4){
    // delete first slot once; patch should immediately refill to four.
    await page.locator('.slot-card').first().locator('.slot-more').click();
    await page.waitForTimeout(200);
    await page.locator('#slotModalDeleteBtn').click();
    // Native confirm dialog
    page.once('dialog', async d=>await d.accept());
    await page.waitForTimeout(800).catch(()=>{});
  }
  report.slotMinimum={before:slotCountBefore,after:await page.locator('.slot-card').count()};

  // Typography measurable values.
  await page.click('[data-tab="text"]');
  await setRange('letterSpacing',8);
  await setRange('widthScale',115);
  report.typography=await page.locator('#editor').evaluate(el=>({letterSpacing:getComputedStyle(el).letterSpacing,transform:getComputedStyle(el).transform,width:el.style.width}));

  // Background isolation test: paper changes, workspace should remain stable.
  await page.click('[data-tab="background"]');
  await page.locator('.bg-mode[data-mode="solid"]').click();
  const workspaceBefore=await page.locator('.workspace').evaluate(el=>getComputedStyle(el).backgroundColor);
  await setColor('solidColor','#e7d9c7');
  const paperAfter=await page.locator('#paper').evaluate(el=>getComputedStyle(el).backgroundColor);
  const workspaceAfter=await page.locator('.workspace').evaluate(el=>getComputedStyle(el).backgroundColor);
  report.background={workspaceBefore,workspaceAfter,paperAfter,isolated:workspaceBefore===workspaceAfter};

  report.consoleErrors=consoleErrors;
  fs.writeFileSync(path.join(outDir,'report.json'),JSON.stringify(report,null,2));
  await page.screenshot({path:path.join(outDir,'site-final-screen.png'),fullPage:true});

  console.log(JSON.stringify(report,null,2));
  await browser.close();
})();
