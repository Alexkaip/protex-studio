let supabaseClient,session=null,products=[],categories=[],requests=[],quantityDiscountTiers=[],couponCodes=[],visitorStats={total:0,today:0,last7:0},printCostPerPosition=5;
const SIDES=["front","back","leftSleeve","rightSleeve"];
const SIDE_LABELS={front:"Vorderseite",back:"Rückseite",leftSleeve:"Linker Ärmel",rightSleeve:"Rechter Ärmel"};
function sideLabel(side){return SIDE_LABELS[side]||side;}

document.addEventListener("DOMContentLoaded",init);

async function init(){
  bindEvents();
  try{
    supabaseClient=getSupabaseClient();
    const res=await supabaseClient.auth.getSession();
    session=res.data.session;
    updateLoginState();
  }catch(err){showWarning(err.message)}
}

function showWarning(msg){
  const box=document.getElementById("config-warning");
  box.textContent=msg;
  box.classList.remove("hidden");
}

function bindEvents(){
  document.getElementById("login-btn").addEventListener("click",login);
  document.getElementById("logout-btn").addEventListener("click",logout);
  document.getElementById("save-product-btn").addEventListener("click",saveProduct);
  document.getElementById("reset-form-btn").addEventListener("click",resetForm);
  document.getElementById("reload-btn").addEventListener("click",loadAll);
  document.getElementById("search").addEventListener("input",renderProducts);
  document.getElementById("csv-template-btn").addEventListener("click",downloadTemplate);
  document.getElementById("csv-export-btn").addEventListener("click",exportCsv);
  document.getElementById("csv-import").addEventListener("change",importCsv);
  document.getElementById("add-category-btn").addEventListener("click",addCategory);
  const reloadRequests=document.getElementById("reload-requests-btn");
  if(reloadRequests)reloadRequests.addEventListener("click",loadRequests);
  const addDiscountRow=document.getElementById("add-discount-row-btn");
  if(addDiscountRow)addDiscountRow.addEventListener("click",()=>{quantityDiscountTiers.push({min_qty:"",discount_percent:""});renderDiscountSettings();});
  const saveDiscounts=document.getElementById("save-discounts-btn");
  if(saveDiscounts)saveDiscounts.addEventListener("click",saveDiscountSettings);
  const toggleDiscounts=document.getElementById("toggle-discounts-btn");
  if(toggleDiscounts)toggleDiscounts.addEventListener("click",()=>toggleDiscountPanel());
  const closeDiscounts=document.getElementById("close-discounts-btn");
  if(closeDiscounts)closeDiscounts.addEventListener("click",()=>toggleDiscountPanel(false));
  const addCouponRow=document.getElementById("add-coupon-row-btn");
  if(addCouponRow)addCouponRow.addEventListener("click",()=>{couponCodes.push({code:"",discount_percent:"",active:true});renderCouponSettings();});
  const saveCoupons=document.getElementById("save-coupons-btn");
  if(saveCoupons)saveCoupons.addEventListener("click",saveCouponSettings);
  const toggleCoupons=document.getElementById("toggle-coupons-btn");
  if(toggleCoupons)toggleCoupons.addEventListener("click",()=>toggleCouponPanel());
  const closeCoupons=document.getElementById("close-coupons-btn");
  if(closeCoupons)closeCoupons.addEventListener("click",()=>toggleCouponPanel(false));
  const togglePrintCost=document.getElementById("toggle-printcost-btn");
  if(togglePrintCost)togglePrintCost.addEventListener("click",()=>togglePrintCostPanel());
  const closePrintCost=document.getElementById("close-printcost-btn");
  if(closePrintCost)closePrintCost.addEventListener("click",()=>togglePrintCostPanel(false));
  const savePrintCost=document.getElementById("save-printcost-btn");
  if(savePrintCost)savePrintCost.addEventListener("click",savePrintCostSettings);
  const toggleStats=document.getElementById("toggle-stats-btn");
  if(toggleStats)toggleStats.addEventListener("click",()=>toggleStatsPanel());
  const closeStats=document.getElementById("close-stats-btn");
  if(closeStats)closeStats.addEventListener("click",()=>toggleStatsPanel(false));
  const reloadStats=document.getElementById("reload-stats-btn");
  if(reloadStats)reloadStats.addEventListener("click",loadVisitorStats);
  const clearStats=document.getElementById("clear-stats-btn");
  if(clearStats)clearStats.addEventListener("click",clearVisitorStats);
}

function toggleDiscountPanel(force){
  const panel=document.getElementById("discount-panel");
  if(!panel)return;
  const show=typeof force==="boolean"?force:panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!show);
  if(show){
    renderDiscountSettings();
    setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }
}

function toggleCouponPanel(force){
  const panel=document.getElementById("coupon-panel");
  if(!panel)return;
  const show=typeof force==="boolean"?force:panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!show);
  if(show){
    renderCouponSettings();
    setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }
}

function togglePrintCostPanel(force){
  const panel=document.getElementById("printcost-panel");
  if(!panel)return;
  const show=typeof force==="boolean"?force:panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!show);
  if(show){
    renderPrintCostSettings();
    setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }
}

function toggleStatsPanel(force){
  const panel=document.getElementById("stats-panel");
  if(!panel)return;
  const show=typeof force==="boolean"?force:panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!show);
  if(show){
    loadVisitorStats();
    setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }
}

async function login(){
  const email=document.getElementById("login-email").value.trim(),password=document.getElementById("login-password").value,status=document.getElementById("login-status");
  status.textContent="Login läuft...";
  const{data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){status.textContent=error.message;return}
  session=data.session;status.textContent="";updateLoginState();
}

async function logout(){
  await supabaseClient.auth.signOut();
  session=null;
  updateLoginState();
}

async function updateLoginState(){
  if(session){
    document.getElementById("login-card").classList.add("hidden");
    document.getElementById("admin-area").classList.remove("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
    ["toggle-discounts-btn","toggle-coupons-btn","toggle-printcost-btn","toggle-stats-btn"].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.remove("hidden");});
    await loadAll();
  }else{
    document.getElementById("login-card").classList.remove("hidden");
    document.getElementById("admin-area").classList.add("hidden");
    document.getElementById("logout-btn").classList.add("hidden");
    ["toggle-discounts-btn","toggle-coupons-btn","toggle-printcost-btn","toggle-stats-btn"].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.add("hidden");});
    ["discount-panel","coupon-panel","printcost-panel","stats-panel"].forEach(id=>{const panel=document.getElementById(id);if(panel)panel.classList.add("hidden");});
  }
}

async function loadAll(){
  await loadProducts();
  await loadCategories();
  await loadDiscountSettings();
  await loadCouponSettings();
  await loadPrintCostSettings();
  await loadVisitorStats(false);
  renderCategorySelect();
  renderCategoryList();
  renderDiscountSettings();
  renderCouponSettings();
  renderProducts();
  await loadRequests();
}

async function loadProducts(){
  const{data,error}=await supabaseClient.from("products").select("*").order("id",{ascending:true});
  if(error){alert(error.message);return}
  products=(data||[]).map(productFromRow);
}

async function loadCategories(){
  try{
    const{data,error}=await supabaseClient.from("categories").select("*").order("name",{ascending:true});
    if(error)throw error;
    const stored=(data||[]).map(r=>r.name).filter(Boolean);
    const productCats=products.map(p=>p.category).filter(Boolean);
    categories=[...new Set([...stored,...productCats])].sort();
  }catch(err){
    const productCats=products.map(p=>p.category).filter(Boolean);
    categories=[...new Set(productCats)].sort();
    showWarning("Hinweis: Tabelle categories fehlt oder ist nicht freigegeben. Bitte SQL aus supabase-setup-v18.sql ausführen. "+err.message);
  }
}

function renderCategorySelect(){
  const sel=document.getElementById("p-category");
  const current=sel.value;
  sel.innerHTML='<option value="">Kategorie wählen...</option>';
  categories.forEach(c=>{const opt=document.createElement("option");opt.value=c;opt.textContent=c;sel.appendChild(opt)});
  sel.value=categories.includes(current)?current:"";
}

function renderCategoryList(){
  const list=document.getElementById("category-list");
  list.innerHTML="";
  if(!categories.length){list.innerHTML='<div class="sub">Noch keine Kategorien.</div>';return}
  categories.forEach(c=>{
    const chip=document.createElement("span");
    chip.className="category-chip";
    chip.innerHTML="<span></span><button type='button'>×</button>";
    chip.querySelector("span").textContent=c;
    chip.querySelector("button").addEventListener("click",()=>removeCategory(c));
    list.appendChild(chip);
  });
}

function normalizeDiscountTiers(value){
  const defaults=[{min_qty:10,discount_percent:5},{min_qty:25,discount_percent:10},{min_qty:50,discount_percent:15},{min_qty:100,discount_percent:20}];
  const rows=Array.isArray(value)?value:defaults;
  return rows.map(r=>({
    min_qty:parseInt(r.min_qty ?? r.minQty ?? r.qty ?? 0,10)||0,
    discount_percent:Number(String(r.discount_percent ?? r.discount ?? r.percent ?? 0).replace(',','.'))||0
  })).filter(r=>r.min_qty>0 && r.discount_percent>0).sort((a,b)=>a.min_qty-b.min_qty);
}

function normalizeCouponCodes(value){
  const defaults=[{code:"PROTEX10",discount_percent:10,active:true},{code:"VIP20",discount_percent:20,active:true},{code:"VEREIN30",discount_percent:30,active:true},{code:"SPONSOR40",discount_percent:40,active:true}];
  const rows=Array.isArray(value)?value:defaults;
  return rows.map(r=>({
    code:String(r.code||"").trim().toUpperCase(),
    discount_percent:Number(String(r.discount_percent ?? r.discount ?? r.percent ?? 0).replace(',','.'))||0,
    active:r.active!==false
  })).filter(r=>r.code && r.discount_percent>0).sort((a,b)=>a.code.localeCompare(b.code));
}

async function loadDiscountSettings(){
  try{
    const {data,error}=await supabaseClient.from('settings').select('value').eq('key','quantity_discounts').maybeSingle();
    if(error)throw error;
    quantityDiscountTiers=normalizeDiscountTiers(data?.value);
  }catch(err){
    quantityDiscountTiers=normalizeDiscountTiers();
    showWarning('Hinweis: Tabelle settings fehlt oder ist nicht freigegeben. Bitte SQL aus supabase-setup-v18.sql ausführen. '+err.message);
  }
}

function renderDiscountSettings(){
  const list=document.getElementById('discount-settings-list');
  if(!list)return;
  list.innerHTML='';
  if(!quantityDiscountTiers.length)quantityDiscountTiers=[{min_qty:10,discount_percent:5},{min_qty:25,discount_percent:10},{min_qty:50,discount_percent:15},{min_qty:100,discount_percent:20}];
  quantityDiscountTiers.forEach((tier,idx)=>{
    const row=document.createElement('div');
    row.className='discount-settings-row';
    row.innerHTML='<label>ab Stück</label><input type="number" min="1" class="discount-min" value="'+escapeHtml(tier.min_qty)+'"><label>Rabatt %</label><input type="number" min="0" max="100" step="0.1" class="discount-percent" value="'+escapeHtml(tier.discount_percent)+'"><button type="button" class="delete-btn">×</button>';
    row.querySelector('.discount-min').addEventListener('input',()=>{quantityDiscountTiers[idx].min_qty=row.querySelector('.discount-min').value;});
    row.querySelector('.discount-percent').addEventListener('input',()=>{quantityDiscountTiers[idx].discount_percent=row.querySelector('.discount-percent').value;});
    row.querySelector('.delete-btn').addEventListener('click',()=>{quantityDiscountTiers.splice(idx,1);renderDiscountSettings();});
    list.appendChild(row);
  });
}

async function saveDiscountSettings(){
  const status=document.getElementById('discount-save-status');
  if(status)status.textContent='Speichern...';
  try{
    const rows=[...document.querySelectorAll('.discount-settings-row')].map(row=>({
      min_qty:parseInt(row.querySelector('.discount-min').value,10)||0,
      discount_percent:Number(String(row.querySelector('.discount-percent').value).replace(',','.'))||0
    })).filter(r=>r.min_qty>0 && r.discount_percent>0).sort((a,b)=>a.min_qty-b.min_qty);
    if(!rows.length)throw new Error('Bitte mindestens eine Rabattzeile eintragen.');
    const {error}=await supabaseClient.from('settings').upsert({key:'quantity_discounts',value:rows,updated_at:new Date().toISOString()},{onConflict:'key'});
    if(error)throw error;
    quantityDiscountTiers=rows;
    renderDiscountSettings();
    if(status)status.textContent='Mengenrabatte gespeichert.';
  }catch(err){
    if(status)status.textContent=err.message;
  }
}

async function loadCouponSettings(){
  try{
    const {data,error}=await supabaseClient.from('settings').select('value').eq('key','coupon_codes').maybeSingle();
    if(error)throw error;
    couponCodes=normalizeCouponCodes(data?.value);
  }catch(err){
    couponCodes=normalizeCouponCodes();
    showWarning('Hinweis: Gutscheincodes konnten nicht geladen werden. Bitte SQL aus supabase-setup-v18.sql ausführen. '+err.message);
  }
}

function renderCouponSettings(){
  const list=document.getElementById('coupon-settings-list');
  if(!list)return;
  list.innerHTML='';
  if(!couponCodes.length)couponCodes=normalizeCouponCodes();
  couponCodes.forEach((coupon,idx)=>{
    const row=document.createElement('div');
    row.className='coupon-settings-row';
    row.innerHTML='<label>Code</label><input type="text" class="coupon-code" value="'+escapeHtml(coupon.code)+'" placeholder="z.B. PROTEX10"><label>Rabatt %</label><input type="number" min="0" max="100" step="0.1" class="coupon-percent" value="'+escapeHtml(coupon.discount_percent)+'"><label class="coupon-active-label"><input type="checkbox" class="coupon-active" '+(coupon.active!==false?'checked':'')+'> Aktiv</label><button type="button" class="delete-btn">×</button>';
    row.querySelector('.coupon-code').addEventListener('input',()=>{couponCodes[idx].code=row.querySelector('.coupon-code').value.toUpperCase();});
    row.querySelector('.coupon-percent').addEventListener('input',()=>{couponCodes[idx].discount_percent=row.querySelector('.coupon-percent').value;});
    row.querySelector('.coupon-active').addEventListener('change',()=>{couponCodes[idx].active=row.querySelector('.coupon-active').checked;});
    row.querySelector('.delete-btn').addEventListener('click',()=>{couponCodes.splice(idx,1);renderCouponSettings();});
    list.appendChild(row);
  });
}

async function saveCouponSettings(){
  const status=document.getElementById('coupon-save-status');
  if(status)status.textContent='Speichern...';
  try{
    const rows=[...document.querySelectorAll('.coupon-settings-row')].map(row=>({
      code:String(row.querySelector('.coupon-code').value||'').trim().toUpperCase(),
      discount_percent:Number(String(row.querySelector('.coupon-percent').value).replace(',','.'))||0,
      active:row.querySelector('.coupon-active').checked
    })).filter(r=>r.code && r.discount_percent>0).sort((a,b)=>a.code.localeCompare(b.code));
    if(!rows.length)throw new Error('Bitte mindestens einen Gutscheincode eintragen.');
    const {error}=await supabaseClient.from('settings').upsert({key:'coupon_codes',value:rows,updated_at:new Date().toISOString()},{onConflict:'key'});
    if(error)throw error;
    couponCodes=rows;
    renderCouponSettings();
    if(status)status.textContent='Gutscheincodes gespeichert.';
  }catch(err){
    if(status)status.textContent=err.message;
  }
}

function normalizePrintCost(value){
  if(value && typeof value === 'object') value=value.price_per_print ?? value.price ?? value.amount ?? value.value;
  const n=Number(String(value ?? 5).replace(',','.'));
  return Number.isFinite(n) && n>=0 ? n : 5;
}

async function loadPrintCostSettings(){
  try{
    const {data,error}=await supabaseClient.from('settings').select('value').eq('key','print_cost_per_position').maybeSingle();
    if(error)throw error;
    printCostPerPosition=normalizePrintCost(data?.value);
  }catch(err){
    printCostPerPosition=5;
    showWarning('Hinweis: Druckkosten konnten nicht geladen werden. Bitte SQL aus supabase-setup-v18.sql ausführen. '+err.message);
  }
}

function renderPrintCostSettings(){
  const input=document.getElementById('print-cost-input');
  if(input)input.value=String(printCostPerPosition).replace('.',',');
}

async function savePrintCostSettings(){
  const status=document.getElementById('printcost-save-status');
  if(status)status.textContent='Speichern...';
  try{
    const input=document.getElementById('print-cost-input');
    const value=Number(String(input?.value||'0').replace(',','.'))||0;
    if(value<0)throw new Error('Bitte einen gültigen Betrag eingeben.');
    const {error}=await supabaseClient.from('settings').upsert({key:'print_cost_per_position',value:{price_per_print:value},updated_at:new Date().toISOString()},{onConflict:'key'});
    if(error)throw error;
    printCostPerPosition=value;
    renderPrintCostSettings();
    if(status)status.textContent='Druckkosten gespeichert.';
  }catch(err){
    if(status)status.textContent=err.message;
  }
}

async function loadVisitorStats(updateStatus=true){
  const box=document.getElementById('visitor-stats-box');
  const status=document.getElementById('visitor-stats-status');
  if(updateStatus && status)status.textContent='Besucher werden geladen...';
  try{
    const now=new Date();
    const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
    const start7=new Date(now.getTime()-7*24*60*60*1000).toISOString();
    const [totalRes,todayRes,last7Res]=await Promise.all([
      supabaseClient.from('visits').select('id',{count:'exact',head:true}),
      supabaseClient.from('visits').select('id',{count:'exact',head:true}).gte('created_at',startToday),
      supabaseClient.from('visits').select('id',{count:'exact',head:true}).gte('created_at',start7)
    ]);
    if(totalRes.error)throw totalRes.error;
    if(todayRes.error)throw todayRes.error;
    if(last7Res.error)throw last7Res.error;
    visitorStats={total:totalRes.count||0,today:todayRes.count||0,last7:last7Res.count||0};
    renderVisitorStats();
    if(status)status.textContent='';
  }catch(err){
    if(box)box.innerHTML='<div class="notice warn">Besucherzähler konnte nicht geladen werden. Bitte SQL ausführen.<br>'+escapeHtml(err.message)+'</div>';
    if(status)status.textContent='';
  }
}

function renderVisitorStats(){
  const box=document.getElementById('visitor-stats-box');
  if(!box)return;
  box.innerHTML='<div class="stat-card"><strong>'+visitorStats.total+'</strong><span>Gesamt</span></div><div class="stat-card"><strong>'+visitorStats.today+'</strong><span>Heute</span></div><div class="stat-card"><strong>'+visitorStats.last7+'</strong><span>Letzte 7 Tage</span></div>';
}

async function clearVisitorStats(){
  if(!confirm('Besucherzähler wirklich löschen?'))return;
  const status=document.getElementById('visitor-stats-status');
  if(status)status.textContent='Zähler wird gelöscht...';
  try{
    const {error}=await supabaseClient.from('visits').delete().neq('id',0);
    if(error)throw error;
    await loadVisitorStats(false);
    if(status)status.textContent='Besucherzähler gelöscht.';
  }catch(err){
    if(status)status.textContent=err.message;
  }
}

async function addCategory(){
  const input=document.getElementById("new-category");
  const val=input.value.trim();
  if(!val)return;
  try{
    const{error}=await supabaseClient.from("categories").upsert({name:val},{onConflict:"name"});
    if(error)throw error;
  }catch(err){
    if(!categories.includes(val))categories.push(val);
    showWarning("Kategorie nur lokal hinzugefügt. Für dauerhaftes Speichern bitte Tabelle categories anlegen. "+err.message);
  }
  if(!categories.includes(val))categories.push(val);
  categories.sort();
  input.value="";
  renderCategorySelect();
  document.getElementById("p-category").value=val;
  renderCategoryList();
}

async function removeCategory(cat){
  if(products.some(p=>p.category===cat)){
    alert("Diese Kategorie wird noch von Produkten verwendet. Bitte Produkte vorher ändern.");
    return;
  }
  if(!confirm("Kategorie '"+cat+"' wirklich löschen?"))return;
  try{
    const{error}=await supabaseClient.from("categories").delete().eq("name",cat);
    if(error)throw error;
  }catch(err){alert("Kategorie konnte nicht aus der Datenbank gelöscht werden: "+err.message)}
  categories=categories.filter(c=>c!==cat);
  renderCategorySelect();
  renderCategoryList();
}

function renderProducts(){
  const list=document.getElementById("product-list"),q=document.getElementById("search").value.toLowerCase();
  list.innerHTML="";
  const filtered=products.filter(p=>!q||[p.title,p.desc,p.category].join(" ").toLowerCase().includes(q));
  if(!filtered.length){list.innerHTML='<div class="notice">Keine Produkte gefunden.</div>';return}
  filtered.forEach(p=>{
    const row=document.createElement("div");
    row.className="product-admin-item";
    row.innerHTML='<img src="'+(p.imgFront||"")+'" alt=""><div><strong></strong><div class="sub"></div><div class="product-actions"></div></div>';
    row.querySelector("strong").textContent=p.title;
    row.querySelector(".sub").textContent="€ "+formatPrice(p.price)+" · "+(p.category||"Ohne Kategorie")+" · "+(p.active?"aktiv":"inaktiv");
    const actions=row.querySelector(".product-actions");
    actions.appendChild(actionBtn("Bearbeiten","edit-btn",()=>editProduct(p)));
    actions.appendChild(actionBtn("Duplizieren","copy-btn",()=>duplicateProduct(p)));
    actions.appendChild(actionBtn("Löschen","delete-btn",()=>deleteProduct(p.id)));
    list.appendChild(row);
  });
}

function actionBtn(text,cls,fn){
  const b=document.createElement("button");
  b.className=cls;b.type="button";b.textContent=text;b.addEventListener("click",fn);
  return b;
}

function editProduct(p){
  document.getElementById("form-title").textContent="Produkt bearbeiten";
  document.getElementById("edit-id").value=p.id;
  document.getElementById("p-title").value=p.title;
  document.getElementById("p-category").value=p.category;
  document.getElementById("p-desc").value=p.desc;
  document.getElementById("p-price").value=p.price;
  document.getElementById("p-sizes").value=(p.sizes||[]).join(",");
  document.getElementById("p-active").checked=p.active;
  window.scrollTo({top:0,behavior:"smooth"});
}

function resetForm(){
  document.getElementById("form-title").textContent="Produkt anlegen";
  document.getElementById("edit-id").value="";
  ["p-title","p-desc","p-price"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("p-category").value="";
  document.getElementById("p-sizes").value="S,M,L,XL,XXL";
  document.getElementById("p-front").value="";
  document.getElementById("p-back").value="";
  document.getElementById("p-left-sleeve").value="";
  document.getElementById("p-right-sleeve").value="";
  document.getElementById("p-active").checked=true;
}

async function uploadFile(file,prefix){
  if(!file)return"";
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
  const filename=prefix+"-"+Date.now()+"-"+Math.random().toString(16).slice(2)+"."+ext;
  const{error}=await supabaseClient.storage.from(window.PROTEX_CONFIG.STORAGE_BUCKET).upload(filename,file,{cacheControl:"3600",upsert:false});
  if(error)throw error;
  const{data}=supabaseClient.storage.from(window.PROTEX_CONFIG.STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function saveProduct(){
  const status=document.getElementById("save-status");
  status.textContent="Speichern...";
  try{
    const id=document.getElementById("edit-id").value,old=id?products.find(p=>String(p.id)===String(id)):null;
    const frontFile=document.getElementById("p-front").files[0],backFile=document.getElementById("p-back").files[0],leftFile=document.getElementById("p-left-sleeve").files[0],rightFile=document.getElementById("p-right-sleeve").files[0];
    let imgFront=old?.imgFront||"",imgBack=old?.imgBack||"",imgLeftSleeve=old?.imgLeftSleeve||"",imgRightSleeve=old?.imgRightSleeve||"";
    if(frontFile)imgFront=await uploadFile(frontFile,"front");
    if(backFile)imgBack=await uploadFile(backFile,"back");
    if(leftFile)imgLeftSleeve=await uploadFile(leftFile,"left-sleeve");
    if(rightFile)imgRightSleeve=await uploadFile(rightFile,"right-sleeve");
    if(!imgFront)throw new Error("Bitte ein Vorderseitenbild hochladen.");
    const product={title:document.getElementById("p-title").value.trim(),category:document.getElementById("p-category").value.trim(),desc:document.getElementById("p-desc").value.trim(),price:document.getElementById("p-price").value.trim(),sizes:splitList(document.getElementById("p-sizes").value),imgFront,imgBack,imgLeftSleeve,imgRightSleeve,active:document.getElementById("p-active").checked};
    if(!product.title)throw new Error("Produktname fehlt.");
    if(product.category && !categories.includes(product.category)){
      await supabaseClient.from("categories").upsert({name:product.category},{onConflict:"name"});
    }
    const row=rowFromProduct(product);
    if(id){const{error}=await supabaseClient.from("products").update(row).eq("id",id);if(error)throw error}
    else{const{error}=await supabaseClient.from("products").insert(row);if(error)throw error}
    status.textContent="Gespeichert.";
    resetForm();
    await loadAll();
  }catch(err){status.textContent=err.message}
}

async function duplicateProduct(p){
  const row=rowFromProduct({...p,title:p.title+" Kopie"});
  const{error}=await supabaseClient.from("products").insert(row);
  if(error)alert(error.message);
  await loadAll();
}

async function deleteProduct(id){
  if(!confirm("Produkt wirklich löschen?"))return;
  const{error}=await supabaseClient.from("products").delete().eq("id",id);
  if(error)alert(error.message);
  await loadAll();
}

function downloadTemplate(){
  const csv="Produktname,Beschreibung,Preis,Kategorie,Größen\\nT-Shirt Premium,100% Baumwolle,19.90,T-Shirt,S|M|L|XL|XXL\\n";
  downloadText(csv,"produkt-vorlage.csv","text/csv;charset=utf-8");
}

function exportCsv(){
  const rows=[["Produktname","Beschreibung","Preis","Kategorie","Größen","Aktiv"]];
  products.forEach(p=>rows.push([p.title,p.desc,p.price,p.category,(p.sizes||[]).join("|"),p.active]));
  const csv=rows.map(row=>row.map(csvEscape).join(",")).join("\\n");
  downloadText(csv,"produkte-export.csv","text/csv;charset=utf-8");
}

function csvEscape(value){
  const s=String(value??"");
  return/[",\\n;]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}

function parseCsvLine(line){
  const out=[];let cur="",quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}
    else if(ch==='"')quoted=!quoted;
    else if((ch===","||ch===";")&&!quoted){out.push(cur);cur=""}
    else cur+=ch;
  }
  out.push(cur);
  return out.map(v=>v.trim());
}

async function importCsv(e){
  const file=e.target.files[0];if(!file)return;
  const text=await file.text();
  const lines=text.split(/\\r?\\n/).filter(l=>l.trim());
  const rows=[];
  for(let i=1;i<lines.length;i++){
    const c=parseCsvLine(lines[i]);
    if(!c[0])continue;
    rows.push({name:c[0],description:c[1]||"",price:c[2]||"",category:c[3]||"",sizes:(c[4]||"").replaceAll("|",","),active:true});
  }
  if(!rows.length){alert("Keine Produkte gefunden.");return}
  const importCats=[...new Set(rows.map(r=>r.category).filter(Boolean))];
  for(const name of importCats){await supabaseClient.from("categories").upsert({name},{onConflict:"name"});}
  const{error}=await supabaseClient.from("products").insert(rows);
  if(error)alert(error.message);else alert(rows.length+" Produkte importiert. Bilder bitte ergänzen.");
  e.target.value="";
  await loadAll();
}

function downloadText(text,filename,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ANFRAGEN */
async function loadRequests(){
  const list=document.getElementById("admin-request-list");
  if(!list)return;
  list.innerHTML='<div class="sub">Anfragen werden geladen...</div>';
  try{
    const{data,error}=await supabaseClient.from("requests").select("*").order("created_at",{ascending:false}).limit(50);
    if(error)throw error;
    requests=data||[];
    renderRequests();
  }catch(err){
    list.innerHTML='<div class="notice warn">Anfragen konnten nicht geladen werden. Bitte SQL aus supabase-setup-v18.sql ausführen.<br>'+err.message+'</div>';
  }
}

function renderRequests(){
  const list=document.getElementById("admin-request-list");
  const detail=document.getElementById("admin-request-detail");
  list.innerHTML="";
  if(detail)detail.innerHTML='<div class="sub">Anfrage anklicken für Details.</div>';
  if(!requests.length){list.innerHTML='<div class="sub">Noch keine Anfragen vorhanden.</div>';return}
  requests.forEach(r=>{
    const count=(r.order_data?.items||[]).length;
    const row=document.createElement("div");
    row.className="admin-request-row";
    row.innerHTML='<div class="request-row-main"><strong></strong><div class="sub"></div></div><span class="request-status"></span><button class="mini-delete-btn" type="button">Löschen</button>';
    row.querySelector("strong").textContent=r.customer_email||"Ohne E-Mail";
    row.querySelector(".sub").textContent=formatDate(r.created_at)+" · "+count+" Produkt(e)";
    row.querySelector(".request-status").textContent=r.status||"Neu";
    row.querySelector(".mini-delete-btn").addEventListener("click",e=>{e.stopPropagation();deleteRequest(r.id);});
    row.addEventListener("click",()=>showRequestDetail(r));
    list.appendChild(row);
  });
}

function showRequestDetail(r){
  const detail=document.getElementById("admin-request-detail");
  const items=r.order_data?.items||[];

  let html='<h3>Anfrage</h3>';
  html+='<div class="sub">'+formatDate(r.created_at)+' · '+(r.status||"Neu")+'</div>';
  html+='<p><strong>Kunde:</strong> '+escapeHtml(r.customer_email||"-")+'</p>';
  html+='<p><strong>Telefon:</strong> '+escapeHtml(r.order_data?.customer_phone||"-")+'</p>';
  html+='<button class="btn btn-danger" id="detail-delete-request-btn" type="button">Anfrage löschen</button>';
  html+='<p><strong>Anmerkung:</strong><br>'+escapeHtml(r.note||"-").replaceAll("\\n","<br>")+'</p>';

  const pricing=r.order_data?.pricing;
  if(pricing){
    html+='<div class="discount-box"><strong>Preis / Rabatt</strong><br>';
    html+='Gesamtmenge: '+escapeHtml(pricing.totalQty||0)+' Stück<br>';
    html+='Produktpreis: € '+formatPrice(pricing.productSubtotal||0)+'<br>';
    html+='Druckpositionen: '+escapeHtml(pricing.totalPrintPositions||0)+'<br>';
    html+='Druckkosten pro Druck: € '+formatPrice(pricing.printCostPerPosition||0)+'<br>';
    html+='Druckkosten gesamt: € '+formatPrice(pricing.printCostAmount||0)+'<br>';
    html+='Warenwert: € '+formatPrice(pricing.subtotal||0)+'<br>';
    if((pricing.quantityDiscountRate||0)>0) html+='Mengenrabatt: '+escapeHtml(pricing.quantityDiscountRate||0)+'% (-€ '+formatPrice(pricing.quantityDiscountAmount||0)+')<br>';
    html+='Zwischensumme: € '+formatPrice(pricing.afterQuantity||0)+'<br>';
    html+='Gutscheincode: '+escapeHtml(pricing.voucherCode||'-')+'<br>';
    html+='Gutscheinrabatt: '+escapeHtml(pricing.voucherDiscountRate||0)+'% (-€ '+formatPrice(pricing.voucherDiscountAmount||0)+')<br>';
    html+='<strong>Endpreis: € '+formatPrice(pricing.total||0)+'</strong>';
    html+='</div>';
  }

  html+='<h3>Produkte</h3>';

  items.forEach((item,idx)=>{
    const qty=(item.quantities||[]).map(q=>escapeHtml(q.size)+": "+escapeHtml(q.qty)).join(", ")||"-";
    const designs=item.designs||{front:[],back:[],leftSleeve:[],rightSleeve:[]};

    html+='<div class="request-detail-item">';
    html+='<strong>'+(idx+1)+'. '+escapeHtml(item.title||"-")+'</strong><br>';
    html+='<span class="sub">'+escapeHtml(item.category||"-")+' · € '+escapeHtml(item.price||"")+'</span><br>';
    html+='Menge: '+qty+'<br>';
    html+='Design: '+escapeHtml(item.designSummary||"-")+'<br>';

    html+='<br><strong>Texte / Schriftinfos:</strong>';
    let hasText=false;

    SIDES.forEach(side=>{
      (designs[side]||[]).forEach(d=>{
        if(d.type==="text" && d.text){
          hasText=true;
          html+='<div style="margin-top:8px;padding:8px;border:1px solid #dbe3ee;border-radius:8px;background:#fff">';
          html+='<strong>'+(sideLabel(side))+'</strong><br>';
          html+='Text: '+escapeHtml(d.text)+'<br>';
          html+='Schriftart: '+escapeHtml(d.font||"-")+'<br>';
          html+='Farbe: '+escapeHtml(d.color||"-")+'<br>';
          html+='Schriftgröße: '+escapeHtml(d.fontSize||"-")+'<br>';
          html+='Position X: '+escapeHtml(d.relX||"-")+'<br>';
          html+='Position Y: '+escapeHtml(d.relY||"-")+'<br>';
          html+='Breite: '+escapeHtml(d.relW||"-");
          html+='</div>';
        }
      });
    });

    if(!hasText){
      html+='<br><span class="sub">Keine Texte vorhanden.</span>';
    }

    const itemFiles=item.originalFiles||[];
    if(itemFiles.length){
      html+='<br><br><strong>Originalgrafiken:</strong><div class="request-images">';
      itemFiles.forEach((file,i)=>{
        const mime=escapeHtml(file.mime||"application/octet-stream");
        const filename=escapeHtml(file.filename||("grafik-"+(i+1)));
        html+='<a class="btn btn-light" download="'+filename+'" href="data:'+mime+';base64,'+file.content+'">'+filename+' herunterladen</a>';
      });
      html+='</div>';
    }

    const designData={
      produkt:item.title||"",
      kategorie:item.category||"",
      mengen:item.quantities||[],
      texte:[],
      grafiken:[]
    };

    SIDES.forEach(side=>{
      (designs[side]||[]).forEach(d=>{
        if(d.type==="text"){
          designData.texte.push({
            seite:sideLabel(side),
            text:d.text||"",
            schriftart:d.font||"",
            farbe:d.color||"",
            schriftgroesse:d.fontSize||"",
            position_x:d.relX||"",
            position_y:d.relY||"",
            breite:d.relW||""
          });
        }
        if(d.type==="image"){
          designData.grafiken.push({
            seite:sideLabel(side),
            datei:d.originalName||"",
            position_x:d.relX||"",
            position_y:d.relY||"",
            breite:d.relW||""
          });
        }
      });
    });

    const json=encodeURIComponent(JSON.stringify(designData,null,2));
    html+='<br><br><a class="btn btn-light" download="design-daten-'+escapeHtml(item.title||"produkt")+'.json" href="data:application/json;charset=utf-8,'+json+'">Design-Daten ohne Produktbild herunterladen</a>';

    html+='</div>';
  });

  const uploadedFiles=r.order_data?.uploaded_files||[];
  if(uploadedFiles.length){
    html+='<h3>Original hochgeladene Grafiken</h3><div class="request-images">';
    uploadedFiles.forEach((file,i)=>{
      const mime=escapeHtml(file.mime||"application/octet-stream");
      const filename=escapeHtml(file.filename||("grafik-"+(i+1)));
      const used=escapeHtml(file.used_on||"");
      html+='<a class="btn btn-light" download="'+filename+'" href="data:'+mime+';base64,'+file.content+'">Grafik '+(i+1)+' herunterladen'+(used?' · '+used:'')+'</a>';
    });
    html+='</div>';
  }

  if((r.layout_images||[]).length){
    html+='<h3>Layoutbilder</h3><div class="request-images">';
    (r.layout_images||[]).forEach((img,i)=>{
      html+='<a class="btn btn-light" download="'+escapeHtml(img.filename||("layout-"+(i+1)+".jpg"))+'" href="data:image/jpeg;base64,'+img.content+'">Bild '+(i+1)+' herunterladen</a>';
    });
    html+='</div>';
  }

  detail.innerHTML=html;

  const delBtn=document.getElementById("detail-delete-request-btn");
  if(delBtn)delBtn.addEventListener("click",()=>deleteRequest(r.id));
}

async function deleteRequest(id){
  if(!confirm("Diese Anfrage wirklich löschen?"))return;
  try{
    const{error}=await supabaseClient.from("requests").delete().eq("id",id);
    if(error)throw error;
    const detail=document.getElementById("admin-request-detail");
    if(detail)detail.innerHTML='<div class="sub">Anfrage gelöscht.</div>';
    await loadRequests();
  }catch(err){
    alert("Anfrage konnte nicht gelöscht werden: "+err.message);
  }
}

function formatDate(value){
  if(!value)return "-";
  try{return new Date(value).toLocaleString("de-AT")}catch(_){return value}
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

window.deleteRequest=deleteRequest;
