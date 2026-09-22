// Run against this branch served at http://127.0.0.1:8765, using an isolated browser.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
const context=await browser.newContext({serviceWorkers:'block'});
let habits=[{id:1,user_id:'test-user',name:'Ejercicio aeróbico y movilidad',description:'Descripción de prueba',is_active:true,created_at:'2026-09-21',target_percentage:null}];
const errors=[];const writes=[];
await context.route('https://**/*',async route=>{const req=route.request(),u=new URL(req.url());if(!u.hostname.endsWith('supabase.co')) return route.abort();let data=[];
if(u.pathname.endsWith('/habits')) {if(req.method()==='PATCH'){const body=req.postDataJSON();assert.equal(u.searchParams.get('user_id'),'eq.test-user');Object.assign(habits.find(h=>h.id===Number(u.searchParams.get('id').slice(3))),body);writes.push(body);}if(req.method()==='POST'){const body=req.postDataJSON()[0];assert.equal(body.user_id,'test-user');habits.push({...body,id:habits.length+1,created_at:'2026-09-21'});writes.push(body);}data=habits;}
if(u.pathname.endsWith('/habit_activity_periods')) data=habits.map(h=>({habit_id:h.id,started_on:'2026-09-21',ended_on:null}));
if(u.pathname.endsWith('/habit_checks'))data=[{habit_id:1,log_date:'2026-09-22',status:1}];
await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
await context.addInitScript(()=>{localStorage.setItem('peso_supabase_session_v1',JSON.stringify({access_token:'fake',expires_at:9999999999,user:{id:'test-user'}}));});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8765');await page.locator('.habit-target').first().waitFor();
for(const width of [360,390,1280]) {await page.setViewportSize({width,height:1000});await page.screenshot({path:`/tmp/registro-${width}-closed.png`,fullPage:true});await page.locator('.habit-window summary').first().click();await page.locator('.habit-target summary').first().click();await page.locator('#newHabitDetails summary').click();await page.screenshot({path:`/tmp/registro-${width}-open.png`,fullPage:true});console.log(width,await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,tables:[...document.querySelectorAll('.table-wrap')].filter(x=>x.offsetWidth).map(x=>({width:x.clientWidth,scroll:x.scrollWidth}))})));await page.locator('.habit-window summary').first().click();await page.locator('.habit-target summary').first().click();await page.locator('#newHabitDetails summary').click();}
for(const summary of await page.locator('.habit-window summary').all()){await summary.click();assert(await summary.evaluate(x=>x.parentElement.open));await summary.click();}
await page.locator('.habit-target summary').first().click();
for(const value of ['-1','101','1.5']){await page.locator('#target-1').fill(value);assert.equal(await page.locator('#target-1').evaluate(x=>x.checkValidity()),false);}
await page.locator('.habit-target summary').first().click();
for(const value of ['0','100','']){await page.locator('.habit-target summary').first().click();await page.locator('#target-1').fill(value);await page.getByRole('button',{name:'Guardar objetivo'}).first().click();await page.waitForFunction(()=>!document.querySelector('.habit-target').open);await page.reload();await page.locator('.habit-target').first().waitFor();assert.equal(habits[0].target_percentage,value===''?null:Number(value));}
await page.locator('#newHabitDetails summary').click();await page.locator('#habitName').fill('Hábito de prueba');await page.locator('#habitTarget').fill('40');await page.locator('#createHabit').click();await page.waitForFunction(()=>document.querySelectorAll('.habit-target').length===2);await page.reload();await page.locator('.habit-target').nth(1).waitFor();assert.equal(habits[1].target_percentage,40);
await page.locator('#newHabitDetails summary').click();await page.locator('#habitName').fill('Sin objetivo');
for(const value of ['-1','101','1.5']){await page.locator('#habitTarget').fill(value);await page.locator('#createHabit').click();assert.equal(habits.length,2);}
await page.locator('#habitTarget').fill('');await page.locator('#createHabit').click();await page.waitForFunction(()=>document.querySelectorAll('.habit-target').length===3);await page.reload();await page.locator('.habit-target').nth(2).waitFor();assert.equal(habits[2].target_percentage,null);assert.deepEqual(errors,[]);console.log('UI mock persistence passed',writes);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
