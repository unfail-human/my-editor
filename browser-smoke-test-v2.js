const { chromium }=require('playwright');
const fs=require('fs'); const path=require('path');
const out=path.join(process.cwd(),'browser-results'); fs.mkdirSync(out,{recursive:true});
const data=[
['a4','01-A4','바람이 머문 자리','늦여름의 기록','오래 머문 계절은 떠나는 순간에도 작은 흔적을 남긴다. 창가에 닿은 빛과 느린 바람 사이에서 오늘의 문장을 조용히 적어 둔다.'],
['letter','02-letter','당신에게 보내는 편지','어느 맑은 저녁에','오늘은 평소보다 조금 천천히 걸었습니다. 서두르지 않아도 도착할 수 있다는 사실을 오래 기억하고 싶어서, 이 짧은 편지를 남깁니다.'],
['postcard','03-postcard','여름의 끝','POSTCARD · AUGUST','빛이 낮아지고 바람이 길어지는 시간. 우리는 계절의 끝에서 가장 선명한 장면 하나를 오래 바라보았다.'],
['card','04-card-3x2','작은 기록','NOTE 01','좋아하는 것은 오래 바라볼수록 더 선명해진다. 오늘의 마음도 그렇게 한 줄씩 남겨 둔다.'],
['widecard','05-widecard-16x9','긴 오후','SCENE 02','창문을 통과한 빛이 방의 가장 먼 곳까지 천천히 번졌다. 아무 일도 일어나지 않은 오후가 오히려 오래 기억에 남았다.'],
['minicard','06-minicard-4x3','오늘의 문장','MEMO','조용한 하루에도 기록할 만한 순간은 있다. 작은 문장이 그 순간을 붙잡아 준다.'],
['square','07-square','한 장의 계절','ARCHIVE','계절은 같은 자리로 돌아오는 것 같지만, 매번 조금 다른 빛과 마음을 데려온다.']];
const pageCount=s=>{const m=(s||'').match(/\/\s*(\d+)/);return m?+m[1]:1};
(async()=>{
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});
 const errors=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())}); page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message));
 await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle'}); await page.waitForTimeout(1500);
 if(await page.locator('#patchNoticeModal').isVisible().catch(()=>false)){await page.locator('#patchNoticeModal .patch-notice-card').click({position:{x:20,y:20}}).catch(()=>{});await page.waitForTimeout(300)}
 const report={loaded:true,templates:[],pagination:{},slotMinimum:{},typography:{},background:{},consoleErrors:errors};
 const range=async(id,v)=>{await page.locator('#'+id).evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},v);await page.waitForTimeout(220)};
 const color=async(id,v)=>{await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);await page.waitForTimeout(220)};
 const savePng=async(name)=>{await page.click('#saveMenuBtn');await page.click('[data-save-scope="current"]');const p=page.waitForEvent('download',{timeout:45000});await page.click('[data-export="png"]');const d=await p;await d.saveAs(path.join(out,name+'.png'));};
 for(const [id,name,title,subtitle,body] of data){
   await page.selectOption('#documentTemplate',id);await page.waitForTimeout(600);
   await page.locator('#titleInput').fill(title);await page.locator('#subtitleInput').fill(subtitle);await page.locator('#editor').fill(body);await page.waitForTimeout(900);
   await page.click('[data-tab="text"]');await range('letterSpacing',id==='widecard'?3:1);await range('widthScale',id==='minicard'?96:100);
   await page.click('[data-tab="background"]');await page.locator('.bg-mode[data-mode="solid"]').click();await color('solidColor',id==='postcard'?'#f8f1e7':id==='square'?'#f2f0eb':'#fbfaf7');
   await page.click('[data-tab="document"]');await page.waitForTimeout(250);
   const info={id,name,paperBox:await page.locator('#paper').boundingBox(),titleBox:await page.locator('#titleInput').boundingBox(),subtitleBox:await page.locator('#subtitleInput').boundingBox(),paperBackground:await page.locator('#paper').evaluate(e=>getComputedStyle(e).backgroundColor),workspaceBackground:await page.locator('.workspace').evaluate(e=>getComputedStyle(e).backgroundColor),orientationText:await page.locator('#documentOrientation option:checked').textContent()};
   await page.click('#previewBtn');await page.waitForTimeout(500);info.previewVisible=await page.locator('#previewModal').isVisible();info.previewPaperCount=await page.locator('#previewHost .paper').count();await page.locator('[data-close-preview]').first().click();await page.waitForTimeout(200);
   await savePng(name);info.file=name+'.png';report.templates.push(info);
 }
 // pagination forward + pull-back
 await page.selectOption('#documentTemplate','a4');await page.waitForTimeout(500);await page.click('[data-tab="text"]');await page.locator('#titleInput').fill('자동 페이지 흐름 테스트');await page.locator('#subtitleInput').fill('넘침과 역류 확인');
 const para='페이지의 끝은 문장의 끝과 같지 않다. 내용이 넘치면 다음 장으로 자연스럽게 이어지고, 앞 장에 빈 공간이 생기면 뒤의 문장이 다시 앞으로 돌아와야 한다. ';
 const bulk=Array.from({length:28},(_,i)=>`문단 ${String(i+1).padStart(2,'0')} · ${para}${para}`).join('\n\n');await page.locator('#editor').fill(bulk);await page.waitForTimeout(4500);
 const overflowLabel=await page.locator('#pageNavLabel').textContent();const overflowPages=pageCount(overflowLabel);
 while(!/^PAGE\s+01/.test(await page.locator('#pageNavLabel').textContent())){await page.click('#prevPageBtn');await page.waitForTimeout(100)}
 const before=await page.locator('#editor').innerText();await page.locator('#editor').fill('앞부분을 짧게 줄였습니다.');await page.waitForTimeout(4500);const pullLabel=await page.locator('#pageNavLabel').textContent();const after=await page.locator('#editor').innerText();report.pagination={overflowLabel,overflowPages,pullLabel,pullPages:pageCount(pullLabel),firstBeforeLength:before.length,firstAfterLength:after.length,pulledAdditionalContent:after.length>'앞부분을 짧게 줄였습니다.'.length};
 // slot minimum
 const slotsBefore=await page.locator('.slot-card').count();if(slotsBefore>=4){await page.locator('.slot-card').first().locator('.slot-more').click();await page.waitForTimeout(200);page.once('dialog',d=>d.accept());await page.locator('#slotModalDeleteBtn').click();await page.waitForTimeout(900)}report.slotMinimum={before:slotsBefore,after:await page.locator('.slot-card').count()};
 // typography values
 await page.click('[data-tab="text"]');await range('letterSpacing',8);await range('widthScale',115);report.typography=await page.locator('#editor').evaluate(e=>({letterSpacing:getComputedStyle(e).letterSpacing,transform:getComputedStyle(e).transform,width:e.style.width}));
 // background isolation
 await page.click('[data-tab="background"]');await page.locator('.bg-mode[data-mode="solid"]').click();const wb=await page.locator('.workspace').evaluate(e=>getComputedStyle(e).backgroundColor);await color('solidColor','#e7d9c7');const wa=await page.locator('.workspace').evaluate(e=>getComputedStyle(e).backgroundColor);report.background={workspaceBefore:wb,workspaceAfter:wa,paperAfter:await page.locator('#paper').evaluate(e=>getComputedStyle(e).backgroundColor),isolated:wb===wa};
 report.consoleErrors=errors;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await page.screenshot({path:path.join(out,'site-final-screen.png'),fullPage:true});console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
