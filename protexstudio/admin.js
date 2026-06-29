let supabaseClient,session=null,products=[],categories=[],subcategories=[],categoryImages={},categoryOrders={},requests=[],quantityDiscountTiers=[],couponCodes=[],visitorStats={total:0,today:0,last7:0},printCostPerPosition=5,productColorVariants=[];
const SIDES=["front","back","leftSleeve","rightSleeve"];
const SIDE_LABELS={front:"Vorderseite",back:"Rueckseite",leftSleeve:"Linker Aermel",rightSleeve:"Rechter Aermel"};
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
  document.getElementById("reset-form-btn").addEventListener("click",closeProductModal);
  document.getElementById("open-product-modal-btn").addEventListener("click",openNewProductModal);
  document.getElementById("close-product-modal-btn").addEventListener("click",closeProductModal);
  document.getElementById("add-color-variant-btn").addEventListener("click",addColorVariant);
  const productModal=document.getElementById("product-form-modal");
  if(productModal)productModal.addEventListener("click",e=>{if(e.target===productModal)closeProductModal();});
  document.getElementById("reload-btn").addEventListener("click",loadAll);
  document.getElementById("search").addEventListener("input",renderProducts);
  document.getElementById("p-category").addEventListener("change",renderSubcategoryOptions);
  const subcategoryParent=document.getElementById("subcategory-parent");
  if(subcategoryParent)subcategoryParent.addEventListener("change",renderSubcategoryList);
  const addSubcategoryBtn=document.getElementById("add-subcategory-btn");
  if(addSubcategoryBtn)addSubcategoryBtn.addEventListener("click",addSubcategory);
  document.getElementById("csv-export-btn").addEventListener("click",exportCsv);
  const shopifyExportBtn=document.getElementById("shopify-export-btn");
  if(shopifyExportBtn)shopifyExportBtn.addEventListener("click",exportShopifyCsv);
  const sevdeskProductExportBtn=document.getElementById("sevdesk-product-export-btn");
  if(sevdeskProductExportBtn)sevdeskProductExportBtn.addEventListener("click",exportSevdeskProductCsv);
  document.getElementById("csv-import").addEventListener("change",importCsv);
  document.getElementById("add-category-btn").addEventListener("click",addCategory);
  const reloadRequests=document.getElementById("reload-requests-btn");
  if(reloadRequests)reloadRequests.addEventListener("click",loadRequests);
  const toggleRequests=document.getElementById("toggle-requests-btn");
  if(toggleRequests)toggleRequests.addEventListener("click",()=>toggleRequestsPanel());
  const sevdeskExportBtn=document.getElementById("sevdesk-export-btn");
  if(sevdeskExportBtn)sevdeskExportBtn.addEventListener("click",exportSevdeskCsv);
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
  status.textContent="Login laeuft...";
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
    ["toggle-requests-btn","toggle-discounts-btn","toggle-coupons-btn","toggle-stats-btn"].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.remove("hidden");});
    await loadAll();
  }else{
    document.getElementById("login-card").classList.remove("hidden");
    document.getElementById("admin-area").classList.add("hidden");
    document.getElementById("logout-btn").classList.add("hidden");
    ["toggle-requests-btn","toggle-discounts-btn","toggle-coupons-btn","toggle-stats-btn"].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.add("hidden");});
    ["requests-section","discount-panel","coupon-panel","printcost-panel","stats-panel"].forEach(id=>{const panel=document.getElementById(id);if(panel)panel.classList.add("hidden");});
  }
}

async function loadAll(){
  await loadProducts();
  await loadCategories();
  await loadSubcategories();
  await loadDiscountSettings();
  await loadCouponSettings();
  await loadPrintCostSettings();
  await loadVisitorStats(false);
  renderCategorySelect();
  renderCategoryList();
  renderSubcategoryParentSelect();
  renderSubcategoryList();
  renderDiscountSettings();
  renderCouponSettings();
  renderSubcategoryOptions();
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
    let {data,error}=await supabaseClient.from("categories").select("*").order("sort_order",{ascending:true}).order("name",{ascending:true});
    if(error && String(error.message||"").includes("sort_order")){
      const fallback=await supabaseClient.from("categories").select("*").order("name",{ascending:true});
      data=fallback.data;
      error=fallback.error;
    }
    if(error)throw error;
    categoryImages={};
    categoryOrders={};
    (data||[]).forEach((r,index)=>{
      if(!r.name)return;
      categoryImages[r.name]=r.image_url||"";
      categoryOrders[r.name]=Number.isFinite(Number(r.sort_order))?Number(r.sort_order):index;
    });
    const stored=(data||[]).map(r=>r.name).filter(Boolean);
    const productCats=products.map(p=>p.category).filter(Boolean);
    categories=sortCategoryNames([...new Set([...stored,...productCats])]);
  }catch(err){
    const productCats=products.map(p=>p.category).filter(Boolean);
    categories=sortCategoryNames([...new Set(productCats)]);
    showWarning("Hinweis: Tabelle categories fehlt oder ist nicht freigegeben. Bitte SQL aus supabase-setup-v18.sql ausfuehren. "+err.message);
  }
}

async function loadSubcategories(){
  const productSubs=products.filter(p=>p.category&&p.subcategory).map(p=>({category:p.category,name:p.subcategory}));
  try{
    let {data,error}=await supabaseClient.from("subcategories").select("*").order("category",{ascending:true}).order("sort_order",{ascending:true}).order("name",{ascending:true});
    if(error && String(error.message||"").includes("sort_order")){
      const fallback=await supabaseClient.from("subcategories").select("*").order("category",{ascending:true}).order("name",{ascending:true});
      data=fallback.data;
      error=fallback.error;
    }
    if(error)throw error;
    const stored=(data||[]).map((r,index)=>({category:r.category||"",name:r.name||"",imageUrl:r.image_url||"",sortOrder:Number.isFinite(Number(r.sort_order))?Number(r.sort_order):index})).filter(r=>r.category&&r.name);
    subcategories=uniqueSubcategories([...stored,...productSubs]);
  }catch(err){
    subcategories=uniqueSubcategories(productSubs);
    showWarning("Hinweis: Tabelle subcategories fehlt oder ist nicht freigegeben. Bitte SQL fuer Unterkategorien ausfuehren. "+err.message);
  }
}

function uniqueSubcategories(rows){
  const map=new Map();
  rows.forEach(r=>{
    const category=String(r.category||"").trim();
    const name=String(r.name||"").trim();
    if(!category||!name)return;
    const key=category.toLowerCase()+"|"+name.toLowerCase();
    const current=map.get(key)||{};
    map.set(key,{category,name,imageUrl:r.imageUrl||current.imageUrl||"",sortOrder:Number.isFinite(Number(r.sortOrder))?Number(r.sortOrder):(current.sortOrder ?? 9999)});
  });
  return [...map.values()].sort((a,b)=>a.category.localeCompare(b.category)||(a.sortOrder??9999)-(b.sortOrder??9999)||a.name.localeCompare(b.name));
}

function sortCategoryNames(names){
  return [...names].sort((a,b)=>(categoryOrders[a]??9999)-(categoryOrders[b]??9999)||String(a).localeCompare(String(b)));
}

async function upsertCategoryRow(row){
  let {error}=await supabaseClient.from("categories").upsert(row,{onConflict:"name"});
  if(error && String(error.message||"").includes("sort_order")){
    const fallback={...row};
    delete fallback.sort_order;
    const retry=await supabaseClient.from("categories").upsert(fallback,{onConflict:"name"});
    error=retry.error;
  }
  if(error)throw error;
}

async function upsertSubcategoryRow(row){
  let {error}=await supabaseClient.from("subcategories").upsert(row,{onConflict:"category,name"});
  if(error && String(error.message||"").includes("sort_order")){
    const fallback={...row};
    delete fallback.sort_order;
    const retry=await supabaseClient.from("subcategories").upsert(fallback,{onConflict:"category,name"});
    error=retry.error;
  }
  if(error)throw error;
}

function renderCategorySelect(){
  const sel=document.getElementById("p-category");
  const current=sel.value;
  sel.innerHTML='<option value="">Kategorie waehlen...</option>';
  categories.forEach(c=>{const opt=document.createElement("option");opt.value=c;opt.textContent=c;sel.appendChild(opt)});
  sel.value=categories.includes(current)?current:"";
}

function getSubcategories(category){
  const fromTable=subcategories.filter(s=>(!category||s.category===category)).map(s=>s.name);
  const fromProducts=products.filter(p=>(!category||p.category===category)&&p.subcategory).map(p=>p.subcategory);
  return [...new Set([...fromTable,...fromProducts].filter(Boolean))].sort((a,b)=>{
    const rowA=subcategories.find(s=>(!category||s.category===category)&&s.name===a);
    const rowB=subcategories.find(s=>(!category||s.category===category)&&s.name===b);
    return (rowA?.sortOrder??9999)-(rowB?.sortOrder??9999)||String(a).localeCompare(String(b));
  });
}

function renderSubcategoryOptions(){
  const sel=document.getElementById("p-subcategory");
  if(!sel)return;
  const category=document.getElementById("p-category")?.value||"";
  const current=sel.value;
  sel.innerHTML='<option value="">Unterkategorie waehlen...</option>';
  getSubcategories(category).forEach(sub=>{
    const opt=document.createElement("option");
    opt.value=sub;
    opt.textContent=sub;
    sel.appendChild(opt);
  });
  sel.value=getSubcategories(category).includes(current)?current:"";
}

function renderSubcategoryParentSelect(){
  const sel=document.getElementById("subcategory-parent");
  if(!sel)return;
  const current=sel.value;
  sel.innerHTML='<option value="">Kategorie waehlen...</option>';
  categories.forEach(c=>{const opt=document.createElement("option");opt.value=c;opt.textContent=c;sel.appendChild(opt)});
  sel.value=categories.includes(current)?current:"";
}

function renderSubcategoryList(){
  const list=document.getElementById("subcategory-list");
  if(!list)return;
  const category=document.getElementById("subcategory-parent")?.value||"";
  list.innerHTML="";
  if(!category){list.innerHTML='<div class="sub">Bitte Hauptkategorie waehlen.</div>';return}
  const rows=subcategories.filter(s=>s.category===category);
  if(!rows.length){list.innerHTML='<div class="sub">Noch keine Unterkategorien.</div>';return}
  rows.forEach((s,index)=>{
    const chip=document.createElement("span");
    chip.className="category-chip";
    chip.innerHTML=(s.imageUrl?'<img class="chip-img" src="'+s.imageUrl+'" alt="">':"")+"<span></span><button class='chip-move-btn chip-up-btn' type='button' title='Nach oben'>&#8593;</button><button class='chip-move-btn chip-down-btn' type='button' title='Nach unten'>&#8595;</button><button class='chip-image-btn' type='button'>Bild</button><button type='button'>x</button><input class='hidden' type='file' accept='image/*'>";
    chip.querySelector("span").textContent=s.name;
    chip.querySelector(".chip-up-btn").disabled=index===0;
    chip.querySelector(".chip-down-btn").disabled=index===rows.length-1;
    const fileInput=chip.querySelector("input[type=file]");
    chip.querySelector(".chip-up-btn").addEventListener("click",()=>moveSubcategory(category,s.name,-1));
    chip.querySelector(".chip-down-btn").addEventListener("click",()=>moveSubcategory(category,s.name,1));
    chip.querySelector(".chip-image-btn").addEventListener("click",()=>fileInput.click());
    fileInput.addEventListener("change",()=>updateSubcategoryImage(s.category,s.name,fileInput.files[0]));
    chip.querySelector("button:last-of-type").addEventListener("click",()=>removeSubcategory(s.category,s.name));
    list.appendChild(chip);
  });
}

function renderCategoryList(){
  const list=document.getElementById("category-list");
  list.innerHTML="";
  if(!categories.length){list.innerHTML='<div class="sub">Noch keine Kategorien.</div>';return}
  categories.forEach((c,index)=>{
    const chip=document.createElement("span");
    chip.className="category-chip";
    chip.innerHTML=(categoryImages[c]?'<img class="chip-img" src="'+categoryImages[c]+'" alt="">':"")+"<span></span><button class='chip-move-btn chip-up-btn' type='button' title='Nach oben'>&#8593;</button><button class='chip-move-btn chip-down-btn' type='button' title='Nach unten'>&#8595;</button><button class='chip-image-btn' type='button'>Bild</button><button type='button'>x</button><input class='hidden' type='file' accept='image/*'>";
    chip.querySelector("span").textContent=c;
    chip.querySelector(".chip-up-btn").disabled=index===0;
    chip.querySelector(".chip-down-btn").disabled=index===categories.length-1;
    const fileInput=chip.querySelector("input[type=file]");
    chip.querySelector(".chip-up-btn").addEventListener("click",()=>moveCategory(c,-1));
    chip.querySelector(".chip-down-btn").addEventListener("click",()=>moveCategory(c,1));
    chip.querySelector(".chip-image-btn").addEventListener("click",()=>fileInput.click());
    fileInput.addEventListener("change",()=>updateCategoryImage(c,fileInput.files[0]));
    chip.querySelector("button:last-of-type").addEventListener("click",()=>removeCategory(c));
    list.appendChild(chip);
  });
}

async function saveCategoryOrder(){
  categories.forEach((name,index)=>{categoryOrders[name]=index;});
  try{
    for(let index=0;index<categories.length;index++){
      const name=categories[index];
      await upsertCategoryRow({name,image_url:categoryImages[name]||"",sort_order:index});
    }
  }catch(err){
    showWarning("Reihenfolge konnte nicht dauerhaft gespeichert werden. Bitte SQL fuer Kategorie-Reihenfolge ausfuehren. "+err.message);
  }
}

async function moveCategory(name,direction){
  const index=categories.indexOf(name);
  const target=index+direction;
  if(index<0||target<0||target>=categories.length)return;
  [categories[index],categories[target]]=[categories[target],categories[index]];
  renderCategoryList();
  renderCategorySelect();
  renderSubcategoryParentSelect();
  await saveCategoryOrder();
}

async function saveSubcategoryOrder(category){
  const rows=subcategories.filter(s=>s.category===category);
  rows.forEach((row,index)=>{row.sortOrder=index;});
  try{
    for(let index=0;index<rows.length;index++){
      const row=rows[index];
      await upsertSubcategoryRow({category:row.category,name:row.name,image_url:row.imageUrl||"",sort_order:index});
    }
  }catch(err){
    showWarning("Unterkategorie-Reihenfolge konnte nicht dauerhaft gespeichert werden. Bitte SQL fuer Kategorie-Reihenfolge ausfuehren. "+err.message);
  }
}

async function moveSubcategory(category,name,direction){
  const rows=subcategories.filter(s=>s.category===category);
  const index=rows.findIndex(s=>s.name===name);
  const target=index+direction;
  if(index<0||target<0||target>=rows.length)return;
  [rows[index].sortOrder,rows[target].sortOrder]=[rows[target].sortOrder,rows[index].sortOrder];
  if(rows[index].sortOrder===rows[target].sortOrder){
    rows[index].sortOrder=index+direction;
    rows[target].sortOrder=index;
  }
  subcategories=uniqueSubcategories(subcategories);
  renderSubcategoryList();
  renderSubcategoryOptions();
  await saveSubcategoryOrder(category);
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
    showWarning('Hinweis: Tabelle settings fehlt oder ist nicht freigegeben. Bitte SQL aus supabase-setup-v18.sql ausfuehren. '+err.message);
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
    row.innerHTML='<label>ab Stueck</label><input type="number" min="1" class="discount-min" value="'+escapeHtml(tier.min_qty)+'"><label>Rabatt %</label><input type="number" min="0" max="100" step="0.1" class="discount-percent" value="'+escapeHtml(tier.discount_percent)+'"><button type="button" class="delete-btn">x</button>';
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
    showWarning('Hinweis: Gutscheincodes konnten nicht geladen werden. Bitte SQL aus supabase-setup-v18.sql ausfuehren. '+err.message);
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
    row.innerHTML='<label>Code</label><input type="text" class="coupon-code" value="'+escapeHtml(coupon.code)+'" placeholder="z.B. PROTEX10"><label>Rabatt %</label><input type="number" min="0" max="100" step="0.1" class="coupon-percent" value="'+escapeHtml(coupon.discount_percent)+'"><label class="coupon-active-label"><input type="checkbox" class="coupon-active" '+(coupon.active!==false?'checked':'')+'> Aktiv</label><button type="button" class="delete-btn">x</button>';
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
    showWarning('Hinweis: Druckkosten konnten nicht geladen werden. Bitte SQL aus supabase-setup-v18.sql ausfuehren. '+err.message);
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
    if(value<0)throw new Error('Bitte einen gueltigen Betrag eingeben.');
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
    if(box)box.innerHTML='<div class="notice warn">Besucherzaehler konnte nicht geladen werden. Bitte SQL ausfuehren.<br>'+escapeHtml(err.message)+'</div>';
    if(status)status.textContent='';
  }
}

function renderVisitorStats(){
  const box=document.getElementById('visitor-stats-box');
  if(!box)return;
  box.innerHTML='<div class="stat-card"><strong>'+visitorStats.total+'</strong><span>Gesamt</span></div><div class="stat-card"><strong>'+visitorStats.today+'</strong><span>Heute</span></div><div class="stat-card"><strong>'+visitorStats.last7+'</strong><span>Letzte 7 Tage</span></div>';
}

async function clearVisitorStats(){
  if(!confirm('Besucherzaehler wirklich loeschen?'))return;
  const status=document.getElementById('visitor-stats-status');
  if(status)status.textContent='Zaehler wird geloescht...';
  try{
    const {error}=await supabaseClient.from('visits').delete().neq('id',0);
    if(error)throw error;
    await loadVisitorStats(false);
    if(status)status.textContent='Besucherzaehler geloescht.';
  }catch(err){
    if(status)status.textContent=err.message;
  }
}

async function addCategory(){
  const input=document.getElementById("new-category");
  const val=input.value.trim();
  if(!val)return;
  const imageFile=document.getElementById("new-category-image")?.files[0];
  const imageUrl=imageFile?await uploadFile(imageFile,"category"):(categoryImages[val]||"");
  try{
    const nextOrder=categories.length;
    await upsertCategoryRow({name:val,image_url:imageUrl,sort_order:categoryOrders[val]??nextOrder});
    categoryOrders[val]=categoryOrders[val]??nextOrder;
  }catch(err){
    if(!categories.includes(val))categories.push(val);
    showWarning("Kategorie nur lokal hinzugefuegt. Fuer dauerhaftes Speichern bitte Tabelle categories anlegen. "+err.message);
  }
  if(!categories.includes(val))categories.push(val);
  if(imageUrl)categoryImages[val]=imageUrl;
  categories=sortCategoryNames(categories);
  input.value="";
  const imgInput=document.getElementById("new-category-image");if(imgInput)imgInput.value="";
  renderCategorySelect();
  renderSubcategoryParentSelect();
  document.getElementById("p-category").value=val;
  const subcategoryParent=document.getElementById("subcategory-parent");
  if(subcategoryParent)subcategoryParent.value=val;
  renderSubcategoryList();
  renderCategoryList();
}

async function updateCategoryImage(name,file){
  if(!file)return;
  try{
    const imageUrl=await uploadFile(file,"category");
    await upsertCategoryRow({name,image_url:imageUrl});
    categoryImages[name]=imageUrl;
    renderCategoryList();
  }catch(err){alert("Kategoriebild konnte nicht gespeichert werden: "+err.message)}
}

async function removeCategory(cat){
  if(products.some(p=>p.category===cat)){
    alert("Diese Kategorie wird noch von Produkten verwendet. Bitte Produkte vorher aendern.");
    return;
  }
  if(!confirm("Kategorie '"+cat+"' wirklich loeschen?"))return;
  try{
    const{error}=await supabaseClient.from("categories").delete().eq("name",cat);
    if(error)throw error;
  }catch(err){alert("Kategorie konnte nicht aus der Datenbank geloescht werden: "+err.message)}
  categories=categories.filter(c=>c!==cat);
  renderCategorySelect();
  renderSubcategoryParentSelect();
  renderSubcategoryList();
  renderCategoryList();
}

async function addSubcategory(){
  const category=document.getElementById("subcategory-parent").value;
  const input=document.getElementById("new-subcategory");
  const name=input.value.trim();
  if(!category){alert("Bitte zuerst eine Hauptkategorie waehlen.");return}
  if(!name)return;
  const imageFile=document.getElementById("new-subcategory-image")?.files[0];
  const imageUrl=imageFile?await uploadFile(imageFile,"subcategory"):"";
  const nextOrder=subcategories.filter(s=>s.category===category).length;
  try{
    await upsertSubcategoryRow({category,name,image_url:imageUrl,sort_order:nextOrder});
  }catch(err){
    showWarning("Unterkategorie nur lokal hinzugefuegt. Bitte SQL fuer Unterkategorien ausfuehren. "+err.message);
  }
  subcategories=uniqueSubcategories([...subcategories,{category,name,imageUrl,sortOrder:nextOrder}]);
  input.value="";
  const imgInput=document.getElementById("new-subcategory-image");if(imgInput)imgInput.value="";
  renderSubcategoryList();
  renderSubcategoryOptions();
}

async function updateSubcategoryImage(category,name,file){
  if(!file)return;
  try{
    const imageUrl=await uploadFile(file,"subcategory");
    await upsertSubcategoryRow({category,name,image_url:imageUrl});
    subcategories=uniqueSubcategories(subcategories.map(s=>s.category===category&&s.name===name?{...s,imageUrl}:s));
    renderSubcategoryList();
  }catch(err){alert("Unterkategoriebild konnte nicht gespeichert werden: "+err.message)}
}

async function removeSubcategory(category,name){
  const usedCount=products.filter(p=>p.category===category&&p.subcategory===name).length;
  const msg=usedCount
    ? "Unterkategorie '"+name+"' wirklich loeschen? Sie wird auch bei "+usedCount+" Produkt(en) entfernt."
    : "Unterkategorie '"+name+"' wirklich loeschen?";
  if(!confirm(msg))return;
  try{
    if(usedCount){
      const updateRes=await supabaseClient.from("products").update({subcategory:""}).eq("category",category).eq("subcategory",name);
      if(updateRes.error)throw updateRes.error;
    }
    const{error}=await supabaseClient.from("subcategories").delete().eq("category",category).eq("name",name);
    if(error)throw error;
  }catch(err){
    alert("Unterkategorie konnte nicht aus der Datenbank gelscht werden: "+err.message);
    return;
  }
  products=products.map(p=>p.category===category&&p.subcategory===name?{...p,subcategory:""}:p);
  subcategories=subcategories.filter(s=>!(s.category===category&&s.name===name));
  renderSubcategoryList();
  renderSubcategoryOptions();
  renderProducts();
}

function renderProducts(){
  const list=document.getElementById("product-list"),q=document.getElementById("search").value.toLowerCase();
  list.innerHTML="";
  const filtered=products.filter(p=>!q||[p.title,p.desc,p.category,p.subcategory,productTypeLabel(p.productType)].join(" ").toLowerCase().includes(q));
  renderProfitSummary([]);
  if(!filtered.length){list.innerHTML='<div class="notice">Keine Produkte gefunden.</div>';return}

  const categoryNames=[...new Set([...categories,...filtered.map(p=>p.category||"Ohne Kategorie")])]
    .filter(Boolean)
    .sort((a,b)=>a.localeCompare(b,"de"));

  categoryNames.forEach(category=>{
    const catProducts=filtered.filter(p=>(p.category||"Ohne Kategorie")===category);
    if(!catProducts.length)return;
    const categoryBox=document.createElement("details");
    categoryBox.className="product-category-group";
    categoryBox.open=true;
    const catSummary=document.createElement("summary");
    catSummary.innerHTML='<span></span><strong></strong>';
    catSummary.querySelector("span").textContent=category;
    catSummary.querySelector("strong").textContent=catProducts.length+" Artikel";
    categoryBox.appendChild(catSummary);

    const subNames=[...new Set(catProducts.map(p=>p.subcategory||"Ohne Unterkategorie"))]
      .sort((a,b)=>a.localeCompare(b,"de"));
    subNames.forEach(sub=>{
      const subProducts=catProducts.filter(p=>(p.subcategory||"Ohne Unterkategorie")===sub);
      const subBox=document.createElement("div");
      subBox.className="product-subcategory-group";
      const subHead=document.createElement("div");
      subHead.className="product-subcategory-head";
      subHead.innerHTML='<span></span><strong></strong>';
      subHead.querySelector("span").textContent=sub;
      subHead.querySelector("strong").textContent=subProducts.length+" Artikel";
      subBox.appendChild(subHead);
      subProducts.forEach(p=>subBox.appendChild(createProductAdminRow(p)));
      categoryBox.appendChild(subBox);
    });
    list.appendChild(categoryBox);
  });
}

function createProductAdminRow(p){
  const row=document.createElement("div");
  row.className="product-admin-item";
  row.innerHTML='<img src="'+(p.imgFront||"")+'" alt=""><div><strong></strong><div class="sub"></div><div class="product-actions"></div></div>';
  row.querySelector("strong").textContent=p.title;
  const printInfo=p.printCostPerPosition!==""&&p.printCostPerPosition!=null ? " - Druck EUR "+formatPrice(p.printCostPerPosition) : "";
  const profitInfo=profitTextForProduct(p);
  const sevdeskInfo=p.sevdeskArticleNumber ? " - ArtNr "+p.sevdeskArticleNumber : "";
  const colorInfo=(p.colorVariants||[]).length ? " - "+p.colorVariants.length+" Farbe(n)" : "";
  row.querySelector(".sub").textContent="EUR "+formatPrice(p.price)+" - "+productTypeLabel(p.productType)+" - "+(p.active?"aktiv":"inaktiv")+" - "+(p.personalizable!==false?"Konfigurator":"nur Shop")+colorInfo+profitInfo+printInfo+sevdeskInfo;
  const actions=row.querySelector(".product-actions");
  actions.appendChild(actionBtn("Bearbeiten","edit-btn",()=>editProduct(p)));
  actions.appendChild(actionBtn("Duplizieren","copy-btn",()=>duplicateProduct(p)));
  actions.appendChild(actionBtn("Loeschen","delete-btn",()=>deleteProduct(p.id)));
  return row;
}

function actionBtn(text,cls,fn){
  const b=document.createElement("button");
  b.className=cls;b.type="button";b.textContent=text;b.addEventListener("click",fn);
  return b;
}

function normalizeArticleNumber(value){
  return String(value||"").trim().toLowerCase();
}

function findDuplicateArticleNumber(articleNumber,currentId){
  const normalized=normalizeArticleNumber(articleNumber);
  if(!normalized)return null;
  return products.find(p=>normalizeArticleNumber(p.sevdeskArticleNumber)===normalized && String(p.id)!==String(currentId||""));
}

function ensureUniqueArticleNumber(articleNumber,currentId){
  const duplicate=findDuplicateArticleNumber(articleNumber,currentId);
  if(duplicate)throw new Error("Artikelnummer "+articleNumber+" ist bereits bei \""+(duplicate.title||"anderem Produkt")+"\" vergeben.");
}

function duplicateArticleNumbersInList(list){
  const seen=new Map(),duplicates=[];
  list.forEach(p=>{
    const number=normalizeArticleNumber(p.sevdeskArticleNumber);
    if(!number)return;
    if(seen.has(number))duplicates.push({number:p.sevdeskArticleNumber,first:seen.get(number),second:p});
    else seen.set(number,p);
  });
  return duplicates;
}
function parseMoneyValue(value){
  const raw=String(value??"").trim().replace(/[^\d,.\-]/g,"");
  if(!raw)return null;
  const normalized=raw.includes(",") ? raw.replace(/\./g,"").replace(",",".") : raw;
  const n=Number(normalized);
  return Number.isFinite(n)?n:null;
}

function productProfit(product){
  const sellGross=parseMoneyValue(product.price);
  const buy=parseMoneyValue(product.sevdeskPurchasePrice);
  if(sellGross==null||buy==null)return null;
  const taxRate=parseMoneyValue(product.sevdeskTaxRate);
  const taxFactor=taxRate!=null&&taxRate>0 ? 1+(taxRate/100) : 1;
  const sellNet=sellGross/taxFactor;
  const vat=sellGross-sellNet;
  const profit=sellNet-buy;
  const margin=sellNet!==0 ? (profit/sellNet)*100 : 0;
  return {sellGross,sellNet,buy,vat,profit,margin,taxRate:taxRate||0};
}

function profitTextForProduct(product){
  const data=productProfit(product);
  if(!data)return "";
  return " - Gewinn netto EUR "+formatPrice(data.profit)+" ("+formatPercent(data.margin)+")";
}

function formatPercent(value){
  const n=Number(value);
  return Number.isFinite(n)?n.toFixed(1).replace(".",",")+"%":"0,0%";
}

function renderProfitSummary(list){
  const el=document.getElementById("product-profit-summary");
  if(!el)return;
  const rows=list.map(productProfit).filter(Boolean);
  if(!rows.length){el.classList.add("hidden");el.textContent="";return;}
  const sellGross=rows.reduce((sum,r)=>sum+r.sellGross,0);
  const sellNet=rows.reduce((sum,r)=>sum+r.sellNet,0);
  const buy=rows.reduce((sum,r)=>sum+r.buy,0);
  const vat=rows.reduce((sum,r)=>sum+r.vat,0);
  const profit=sellNet-buy;
  const margin=sellNet!==0 ? (profit/sellNet)*100 : 0;
  el.classList.remove("hidden");
  el.textContent="Gewinn netto: EUR "+formatPrice(profit)+" ("+formatPercent(margin)+") - Verkauf brutto EUR "+formatPrice(sellGross)+" - Netto EUR "+formatPrice(sellNet)+" - MwSt EUR "+formatPrice(vat)+" - Einkauf netto EUR "+formatPrice(buy);
}
function productTypeLabel(type){
  const map={configurator:"Konfigurator",shop_only:"Nur Shop",set:"Set",print_fee:"Druckkosten/Zubehoer"};
  return map[type]||"Konfigurator";
}

function categoryText(p){
  return (p.category||"Ohne Kategorie")+(p.subcategory?" / "+p.subcategory:"");
}

function formatShopifyVariantIds(value){
  const ids=value&&typeof value==="object"?value:{};
  return Object.keys(ids).filter(size=>!String(size).startsWith("_")).sort().map(size=>size+"="+ids[size]).join("\n");
}

function parseShopifyVariantIds(value){
  const ids={};
  String(value||"").split(/\r?\n/).forEach(line=>{
    const trimmed=line.trim();
    if(!trimmed)return;
    const parts=trimmed.split("=");
    if(parts.length<2)return;
    const size=parts.shift().trim();
    const id=parts.join("=").trim();
    if(size&&id)ids[size]=id;
  });
  return ids;
}
function getValue(id){
  const el=document.getElementById(id);
  return el?String(el.value||"").trim():"";
}
function setValue(id,value){
  const el=document.getElementById(id);
  if(el)el.value=value??"";
}

function emptyColorVariant(){
  return {name:"",hex:"#111111",shopifyVariantId:"",images:{front:"",back:"",leftSleeve:"",rightSleeve:""}};
}

function normalizeColorVariants(rows){
  return (Array.isArray(rows)?rows:[]).map(v=>({
    name:String(v.name||"").trim(),
    hex:String(v.hex||v.color||"#111111").trim()||"#111111",
    shopifyVariantId:String(v.shopifyVariantId||v.shopify_variant_id||v.variantId||"").trim(),
    images:{
      front:v.images?.front||v.imgFront||"",
      back:v.images?.back||v.imgBack||"",
      leftSleeve:v.images?.leftSleeve||v.imgLeftSleeve||"",
      rightSleeve:v.images?.rightSleeve||v.imgRightSleeve||""
    }
  })).filter(v=>v.name||v.images.front||v.images.back||v.images.leftSleeve||v.images.rightSleeve);
}

function renderColorVariants(){
  const list=document.getElementById("color-variant-list");
  if(!list)return;
  list.innerHTML="";
  if(!productColorVariants.length){
    list.innerHTML='<div class="notice">Noch keine Farbvarianten angelegt. Ohne Farbvariante nutzt das Produkt die normalen Bilder.</div>';
    return;
  }
  productColorVariants.forEach((variant,index)=>{
    const box=document.createElement("div");
    box.className="color-variant-card";
    box.dataset.index=String(index);
    box.innerHTML='<div class="color-variant-head"><strong>Farbe '+(index+1)+'</strong><button class="mini-delete-btn" type="button">Entfernen</button></div>'+
      '<div class="color-variant-grid">'+
      '<div class="form-group"><label>Farbname</label><input type="text" class="cv-name" placeholder="z.B. Schwarz"></div>'+
      '<div class="form-group"><label>Farbpunkt</label><input type="color" class="cv-hex"></div>'+
      '<div class="form-group wide"><label>Shopify Variant ID</label><input type="text" class="cv-shopify-id" placeholder="z.B. 10904180228442"><div class="sub">Optional: direkte Shopify-Variante fuer diese Farbe.</div></div>'+
      '<div class="form-group"><label>Vorderseite</label><input type="file" class="cv-front" accept="image/*"><div class="sub cv-front-current"></div></div>'+
      '<div class="form-group"><label>Rueckseite</label><input type="file" class="cv-back" accept="image/*"><div class="sub cv-back-current"></div></div>'+
      '<div class="form-group"><label>Linker Aermel</label><input type="file" class="cv-left" accept="image/*"><div class="sub cv-left-current"></div></div>'+
      '<div class="form-group"><label>Rechter Aermel</label><input type="file" class="cv-right" accept="image/*"><div class="sub cv-right-current"></div></div>'+
      '</div>';
    box.querySelector(".cv-name").value=variant.name||"";
    box.querySelector(".cv-hex").value=variant.hex||"#111111";
    box.querySelector(".cv-shopify-id").value=variant.shopifyVariantId||"";
    box.querySelector(".cv-front-current").textContent=variant.images?.front?"Bild gespeichert":"";
    box.querySelector(".cv-back-current").textContent=variant.images?.back?"Bild gespeichert":"";
    box.querySelector(".cv-left-current").textContent=variant.images?.leftSleeve?"Bild gespeichert":"";
    box.querySelector(".cv-right-current").textContent=variant.images?.rightSleeve?"Bild gespeichert":"";
    box.querySelector(".mini-delete-btn").addEventListener("click",()=>{productColorVariants.splice(index,1);renderColorVariants();});
    list.appendChild(box);
  });
}

function addColorVariant(){
  productColorVariants.push(emptyColorVariant());
  renderColorVariants();
}

async function collectColorVariantsForSave(){
  const cards=[...document.querySelectorAll(".color-variant-card")];
  const rows=[];
  for(const card of cards){
    const index=Number(card.dataset.index);
    const old=productColorVariants[index]||emptyColorVariant();
    const variant={
      name:card.querySelector(".cv-name")?.value.trim()||"",
      hex:card.querySelector(".cv-hex")?.value||"#111111",
      shopifyVariantId:card.querySelector(".cv-shopify-id")?.value.trim()||old.shopifyVariantId||"",
      images:{...(old.images||{})}
    };
    const front=card.querySelector(".cv-front")?.files[0];
    const back=card.querySelector(".cv-back")?.files[0];
    const left=card.querySelector(".cv-left")?.files[0];
    const right=card.querySelector(".cv-right")?.files[0];
    if(front)variant.images.front=await uploadFile(front,"color-front");
    if(back)variant.images.back=await uploadFile(back,"color-back");
    if(left)variant.images.leftSleeve=await uploadFile(left,"color-left");
    if(right)variant.images.rightSleeve=await uploadFile(right,"color-right");
    if(variant.name||variant.shopifyVariantId||variant.images.front||variant.images.back||variant.images.leftSleeve||variant.images.rightSleeve)rows.push(variant);
  }
  return normalizeColorVariants(rows);
}

function openProductModal(){
  const modal=document.getElementById("product-form-modal");
  if(!modal)return;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(()=>document.getElementById("p-title")?.focus(),40);
}

function closeProductModal(){
  const modal=document.getElementById("product-form-modal");
  if(!modal)return;
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  const status=document.getElementById("save-status");
  if(status)status.textContent="";
}

function openNewProductModal(){
  resetForm();
  openProductModal();
}

function editProduct(p){
  document.getElementById("form-title").textContent="Produkt bearbeiten";
  document.getElementById("edit-id").value=p.id;
  ["p-front","p-back","p-left-sleeve","p-right-sleeve"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  const status=document.getElementById("save-status");if(status)status.textContent="";
  document.getElementById("p-title").value=p.title;
  const productTypeInput=document.getElementById("p-product-type");
  if(productTypeInput)productTypeInput.value=p.productType||"configurator";
  document.getElementById("p-category").value=p.category;
  renderSubcategoryOptions();
  const subcategoryInput=document.getElementById("p-subcategory");
  if(subcategoryInput)subcategoryInput.value=p.subcategory||"";
  document.getElementById("p-desc").value=p.desc;
  document.getElementById("p-price").value=p.price;
  setValue("p-sevdesk-article-number",p.sevdeskArticleNumber||"");
  setValue("p-sevdesk-unit",p.sevdeskUnit||"Stk");
  setValue("p-sevdesk-stock",p.sevdeskStock??"0,00");
  setValue("p-sevdesk-tax-rate",p.sevdeskTaxRate??"20,00");
  setValue("p-sevdesk-purchase-price",p.sevdeskPurchasePrice||"");
  setValue("p-sevdesk-category",p.sevdeskCategory||"Standard");
  const sevdeskStockEnabled=document.getElementById("p-sevdesk-stock-enabled");
  if(sevdeskStockEnabled)sevdeskStockEnabled.checked=p.sevdeskStockEnabled===true;
  const printCostInput=document.getElementById("p-print-cost");
  if(printCostInput)printCostInput.value=p.printCostPerPosition ?? "";
  const printRuleInput=document.getElementById("p-print-rule");
  if(printRuleInput)printRuleInput.value=p.printRule||"standard";
  document.getElementById("p-sizes").value=(p.sizes||[]).join(",");
  setValue("p-shopify-handle",p.shopifyVariantIds?._handle||"");
  setValue("p-shopify-default-variant",p.shopifyVariantIds?._default||"");
  const shopifyVariants=document.getElementById("p-shopify-variants");
  if(shopifyVariants)shopifyVariants.value=formatShopifyVariantIds(p.shopifyVariantIds);
  productColorVariants=normalizeColorVariants(p.colorVariants);
  renderColorVariants();
  document.getElementById("p-active").checked=p.active;
  document.getElementById("p-personalizable").checked=p.personalizable!==false;
  openProductModal();
}

function resetForm(){
  document.getElementById("form-title").textContent="Produkt anlegen";
  document.getElementById("edit-id").value="";
  const status=document.getElementById("save-status");if(status)status.textContent="";
  ["p-title","p-subcategory","p-desc","p-price","p-print-cost","p-shopify-handle","p-shopify-default-variant","p-shopify-variants","p-sevdesk-article-number","p-sevdesk-purchase-price"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  setValue("p-sevdesk-unit","Stk");
  setValue("p-sevdesk-stock","0,00");
  setValue("p-sevdesk-tax-rate","20,00");
  setValue("p-sevdesk-category","Standard");
  const sevdeskStockEnabled=document.getElementById("p-sevdesk-stock-enabled");if(sevdeskStockEnabled)sevdeskStockEnabled.checked=false;
  document.getElementById("p-category").value="";
  const productTypeInput=document.getElementById("p-product-type");if(productTypeInput)productTypeInput.value="configurator";
  const printRuleInput=document.getElementById("p-print-rule");if(printRuleInput)printRuleInput.value="standard";
  document.getElementById("p-sizes").value="S,M,L,XL,XXL";
  document.getElementById("p-front").value="";
  document.getElementById("p-back").value="";
  document.getElementById("p-left-sleeve").value="";
  document.getElementById("p-right-sleeve").value="";
  productColorVariants=[];
  renderColorVariants();
  document.getElementById("p-active").checked=true;
  document.getElementById("p-personalizable").checked=true;
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
    const colorVariants=await collectColorVariantsForSave();
    const shopifyVariantIds=parseShopifyVariantIds(document.getElementById("p-shopify-variants")?.value||"");
    const shopifyHandle=getValue("p-shopify-handle");
    const shopifyDefaultVariant=getValue("p-shopify-default-variant");
    if(shopifyHandle)shopifyVariantIds._handle=shopifyHandle;
    if(shopifyDefaultVariant)shopifyVariantIds._default=shopifyDefaultVariant;
    colorVariants.forEach(variant=>{
      if(variant.name&&variant.shopifyVariantId)shopifyVariantIds[variant.name]=variant.shopifyVariantId;
    });
    const product={title:document.getElementById("p-title").value.trim(),productType:(document.getElementById("p-product-type")?.value||"configurator"),printRule:(document.getElementById("p-print-rule")?.value||"standard"),category:document.getElementById("p-category").value.trim(),subcategory:(document.getElementById("p-subcategory")?.value||"").trim(),desc:document.getElementById("p-desc").value.trim(),price:document.getElementById("p-price").value.trim(),sevdeskArticleNumber:getValue("p-sevdesk-article-number"),sevdeskUnit:getValue("p-sevdesk-unit")||"Stk",sevdeskStock:getValue("p-sevdesk-stock")||"0,00",sevdeskStockEnabled:document.getElementById("p-sevdesk-stock-enabled")?.checked===true,sevdeskTaxRate:getValue("p-sevdesk-tax-rate")||"20,00",sevdeskPurchasePrice:getValue("p-sevdesk-purchase-price"),sevdeskCategory:getValue("p-sevdesk-category")||"Standard",printCostPerPosition:(document.getElementById("p-print-cost")?.value||"").trim(),sizes:splitList(document.getElementById("p-sizes").value),shopifyVariantIds,colorVariants,imgFront,imgBack,imgLeftSleeve,imgRightSleeve,active:document.getElementById("p-active").checked,personalizable:document.getElementById("p-personalizable").checked};
    if(!product.title)throw new Error("Produktname fehlt.");
    ensureUniqueArticleNumber(product.sevdeskArticleNumber,id);
    if(product.category && !categories.includes(product.category)){
      await upsertCategoryRow({name:product.category,sort_order:categories.length});
    }
    const row=rowFromProduct(product);
    if(id){const{error}=await supabaseClient.from("products").update(row).eq("id",id);if(error)throw error}
    else{const{error}=await supabaseClient.from("products").insert(row);if(error)throw error}
    status.textContent="Gespeichert.";
    resetForm();
    await loadAll();
    closeProductModal();
  }catch(err){status.textContent=err.message}
}

async function duplicateProduct(p){
  const row=rowFromProduct({...p,title:p.title+" Kopie"});
  const{error}=await supabaseClient.from("products").insert(row);
  if(error)alert(error.message);
  await loadAll();
}

async function deleteProduct(id){
  if(!confirm("Produkt wirklich loeschen?"))return;
  const{error}=await supabaseClient.from("products").delete().eq("id",id);
  if(error)alert(error.message);
  await loadAll();
}

function downloadTemplate(){
  const rows=[
    ["Produktname","Produkttyp","Kategorie","Beschreibung","Preis","Groessen","Aktiv","BildVorderseite","BildRueckseite","BildLinkerAermel","BildRechterAermel"],
  ];
  const csv="\ufeff"+rows.map(row=>row.map(csvEscape).join(",")).join("\r\n");
  downloadText(csv,"produkt-vorlage.csv","text/csv;charset=utf-8");
}

function exportCsv(){
  const rows=[["Produktname","Produkttyp","Kategorie","Unterkategorie","Beschreibung","Preis","sevDeskArtikelnummer","sevDeskEinheit","sevDeskBestand","sevDeskBestandAktiv","sevDeskUmsatzsteuer","sevDeskEinkaufspreis","sevDeskKategorie","DruckkostenProDruck","DruckRegel","Groessen","ShopifyVariantIDs","Aktiv","Personalisierbar","BildVorderseite","BildRueckseite","BildLinkerAermel","BildRechterAermel"]];
  products.forEach(p=>rows.push([
    p.title||"",
    p.productType||"configurator",
    p.category||"",
    p.subcategory||"",
    p.desc||"",
    p.price||"",
    p.sevdeskArticleNumber||"",
    p.sevdeskUnit||"Stk",
    p.sevdeskStock??"0,00",
    p.sevdeskStockEnabled===true?"true":"false",
    p.sevdeskTaxRate??"20,00",
    p.sevdeskPurchasePrice||"",
    p.sevdeskCategory||"Standard",
    p.printCostPerPosition ?? "",
    p.printRule||"standard",
    (p.sizes||[]).join("|"),
    formatShopifyVariantIds(p.shopifyVariantIds),
    p.active!==false ? "true" : "false",
    p.personalizable!==false ? "true" : "false",
    p.imgFront||"",
    p.imgBack||"",
    p.imgLeftSleeve||"",
    p.imgRightSleeve||""
  ]));
  const csv="\ufeff"+rows.map(row=>row.map(csvEscape).join(",")).join("\r\n");
  downloadText(csv,"interner-produkte-export-nicht-fuer-sevdesk.csv","text/csv;charset=utf-8");
}

function exportSevdeskProductCsv(){
  const activeProducts=products.filter(p=>p.active!==false);
  if(!activeProducts.length){alert("Keine aktiven Produkte fuer sevDesk gefunden.");return;}
  const duplicates=duplicateArticleNumbersInList(activeProducts);
  if(duplicates.length){alert("Doppelte sevDesk Artikelnummer gefunden: "+duplicates[0].number+" bei \""+(duplicates[0].first.title||"")+"\" und \""+(duplicates[0].second.title||"")+"\". Bitte zuerst korrigieren.");return;}
  const rows=[["Artikelnummer","Name","Einheit","Bestand","Bestand aktiviert","Umsatzsteuer","Einkaufspreis","Verkaufspreis","Kategorie","Beschreibung"]];
  activeProducts.forEach(p=>{
    rows.push([
      p.sevdeskArticleNumber||String(p.id||slugify(p.title||"artikel")),
      p.title||"",
      p.sevdeskUnit||"Stk",
      formatSevdeskDecimal(p.sevdeskStock,"0,00"),
      p.sevdeskStockEnabled===true?"1":"0",
      formatSevdeskDecimal(p.sevdeskTaxRate,"20,00"),
      formatSevdeskDecimal(p.sevdeskPurchasePrice,"0,00"),
     formatSevdeskDecimal(grossToNetPrice(p.price,p.sevdeskTaxRate),"0,00"),
      p.sevdeskCategory||"Standard",
      p.desc||""
    ]);
  });
  const csv="\ufeff"+rows.map(row=>row.map(csvEscape).join(";")).join("\r\n");
  downloadText(csv,"sevdesk-artikel-export.csv","text/csv;charset=utf-8");
  alert("sevDesk Datei erstellt: sevdesk-artikel-export.csv\n\nBitte nur diese Datei bei sevDesk importieren. Nicht den internen Produkte-Export verwenden.");
}

function formatSevdeskDecimal(value,fallback){
  const n=parseMoneyValue(value);
  if(n==null)return fallback||"";
  return n.toFixed(2).replace(".",",");
}

function grossToNetPrice(grossValue,taxRateValue){
  const gross=parseMoneyValue(grossValue);
  if(gross==null)return "";
  const taxRate=parseMoneyValue(taxRateValue);
  const factor=taxRate!=null&&taxRate>0 ? 1+(taxRate/100) : 1;
  return gross/factor;
}
function exportShopifyCsv(){
  const rows=[[
    "Handle","Title","Body (HTML)","Vendor","Product Category","Type","Tags","Published",
    "Option1 Name","Option1 Value","Variant SKU","Variant Grams","Variant Inventory Tracker",
    "Variant Inventory Qty","Variant Inventory Policy","Variant Fulfillment Service",
    "Variant Price","Variant Requires Shipping","Variant Taxable","Image Src","Image Position","Status"
  ]];
  products.filter(p=>p.active!==false).forEach(p=>{
    const sizes=(p.sizes&&p.sizes.length?p.sizes:["Standard"]);
    const handle=String(p.shopifyVariantIds?._handle||"").trim()||slugify(p.title);
    const price=formatShopifyPrice(p.price);
    const images=shopifyImagesForProduct(p);
    sizes.forEach((size,idx)=>{
      rows.push([
        handle,
        idx===0?(p.title||""):"",
        idx===0?shopifyBody(p.desc):"",
        idx===0?"Protex Austria":"",
        "",
        idx===0?(p.subcategory||p.category||""):"",
        idx===0?[p.category,p.subcategory,(p.personalizable!==false&&p.productType!=="shop_only"?"protex-configurator":"")].filter(Boolean).join(", "):"",
        idx===0?"TRUE":"",
        "Groesse",
        size,
        handle+"-"+slugify(size),
        "0",
        "",
        "0",
        "deny",
        "manual",
        price,
        "TRUE",
        "TRUE",
        idx===0?(images[0]||""):"",
        idx===0?"1":"",
        "active"
      ]);
    });
    images.slice(1).forEach((image,idx)=>{
      rows.push([
        handle,"","","","","","","","","","","","","","","","","","",
        image,
        String(idx+2),
        ""
      ]);
    });
  });
  const csv="\ufeff"+rows.map(row=>row.map(csvEscape).join(",")).join("\r\n");
  downloadText(csv,"produkte-shopify-export.csv","text/csv;charset=utf-8");
}

function shopifyImagesForProduct(p){
  const images=[p.imgFront,p.imgBack,p.imgLeftSleeve,p.imgRightSleeve]
    .map(v=>String(v||"").trim())
    .filter(Boolean);
  return [...new Set(images)];
}

function shopifyBody(value){
  return String(value||"").trim().replace(/\r?\n/g,"<br>");
}

function formatShopifyPrice(value){
  const n=Number(String(value||"0").replace(",","."));
  return Number.isFinite(n)?n.toFixed(2):"0.00";
}

function csvEscape(value){
  const s=String(value??"");
  return /[",\r\n;]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}

function parseCsv(text){
  text=String(text||"").replace(/^\ufeff/,"");
  const firstLine=(text.split(/\r?\n/).find(line=>line.trim())||"");
  const delimiter=(firstLine.match(/;/g)||[]).length>=(firstLine.match(/,/g)||[]).length ? ";" : ",";
  const rows=[];let row=[],cur="",quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'&&text[i+1]==='"'){cur+='"';i++;continue}
    if(ch==='"'){quoted=!quoted;continue}
    if(ch===delimiter&&!quoted){row.push(cur.trim());cur="";continue}
    if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&text[i+1]==="\n")i++;
      row.push(cur.trim());
      if(row.some(v=>v!==""))rows.push(row);
      row=[];cur="";continue;
    }
    cur+=ch;
  }
  row.push(cur.trim());
  if(row.some(v=>v!==""))rows.push(row);
  return rows;
}

function normalizeHeader(value){
  return String(value||"").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .replace(/[^a-z0-9]/g,"");
}

function normalizeProductType(value){
  const v=String(value||"").trim().toLowerCase();
  if(["nur shop","shop","shop_only","shopify"].includes(v))return "shop_only";
  if(["set","set angebot","set-angebot","bundle"].includes(v))return "set";
  if(["druckkosten","druckkosten/zubehoer","print_fee","zubehoer"].includes(v))return "print_fee";
  return "configurator";
}

function normalizePrintRule(value){
  const v=String(value||"").trim().toLowerCase();
  if(["free_text","text gratis"].includes(v))return "free_text";
  if(["free_all","gratis","alle gratis"].includes(v))return "free_all";
  if(["set_included","set enthalten","inkludiert"].includes(v))return "set_included";
  return "standard";
}

function pick(row,headers,names,fallbackIndex){
  for(const name of names){
    const idx=headers.indexOf(normalizeHeader(name));
    if(idx>=0)return row[idx]||"";
  }
  return fallbackIndex>=0 ? (row[fallbackIndex]||"") : "";
}

function hasAnyHeader(headers,names){
  return names.some(name=>headers.includes(normalizeHeader(name)));
}

function netToGrossPrice(netValue,taxRateValue){
  const net=parseMoneyValue(netValue);
  if(net==null)return "";
  const taxRate=parseMoneyValue(taxRateValue);
  const factor=taxRate!=null&&taxRate>0 ? 1+(taxRate/100) : 1;
  return net*factor;
}

async function importCsv(e){
  const file=e.target.files[0];if(!file)return;
  const text=await file.text();
  const parsed=parseCsv(text);
  if(parsed.length<2){alert("Keine Produkte gefunden.");e.target.value="";return}
  const headers=parsed[0].map(normalizeHeader);
  const articleNumberHeaders=["sevDeskArtikelnummer","sevDesk Artikelnummer","Artikelnumer","Artikelnummer","Nr.","Nr","Prod.Nr.","ProdNr","Produktnummer","Artikel-Nr.","Art.-Nr.","Art Nr"];
  const grossPriceHeaders=["Preis (Brutto)","Preis Brutto","Bruttopreis","VK Brutto","Verkaufspreis Brutto","Verkaufspreis (Brutto)"];
  const netPriceHeaders=["Verkaufspreis","Preis (Netto)","Preis Netto","Nettopreis","VK Netto","Verkaufspreis Netto","Verkaufspreis (Netto)"];
  const taxHeaders=["sevDeskUmsatzsteuer","Umsatzsteuer","Umsatzsteuer in %","MwSt","Mehrwertsteuer","Steuersatz"];
  const purchasePriceHeaders=["sevDeskEinkaufspreis","Einkaufspreis","Einkaufspreis Netto","Einkaufspreis (Netto)","EK","EK Netto"];
  const descHeaders=["Beschreibung","Produktbeschreibung","Artikelbeschreibung","Beschreibung (Artikel)","Kurzbeschreibung","Langbeschreibung","Text","Beschreibungstext"];
  const categoryHeaders=["Kategorie","Artikelkategorie"];
  const hasDescHeader=hasAnyHeader(headers,descHeaders);
  const isSevdeskArticleCsv=hasAnyHeader(headers,articleNumberHeaders)&&(hasAnyHeader(headers,grossPriceHeaders)||hasAnyHeader(headers,netPriceHeaders)||hasAnyHeader(headers,taxHeaders));
  const hasSubcategory=headers.includes(normalizeHeader("Unterkategorie"));
  const hasShopifyVariantIds=headers.includes(normalizeHeader("ShopifyVariantIDs"));
  const hasPrintCost=headers.includes(normalizeHeader("DruckkostenProDruck"))||headers.includes(normalizeHeader("Druckkosten"))||headers.includes(normalizeHeader("Druckkosten pro Druck"));
  const hasPersonalizable=headers.includes(normalizeHeader("Personalisierbar"));
  const offset=hasSubcategory?1:0;
  const printCostOffset=hasPrintCost?1:0;
  const shopifyOffset=hasShopifyVariantIds?1:0;
  const personalizableOffset=hasPersonalizable?1:0;
  const insertRows=[];
  const updateJobs=[];
  const existingRes=await supabaseClient.from("products").select("*");
  if(existingRes.error){alert(existingRes.error.message);e.target.value="";return}
  const keyFor=(name,category,subcategory)=>String(name||"").trim().toLowerCase()+"|"+String(category||"").trim().toLowerCase()+"|"+String(subcategory||"").trim().toLowerCase();
  const existingProducts=(existingRes.data||[]).map(productFromRow);
  const existingByKey=new Map(existingProducts.map(p=>[keyFor(p.title,p.category,p.subcategory),p]));
  const existingByArticleNumber=new Map(existingProducts.map(p=>[normalizeArticleNumber(p.sevdeskArticleNumber),p]).filter(([number])=>number));
  const importKeys=new Set();
  const importArticleNumbers=new Map();
  let skipped=0,updated=0,inserted=0;
  for(let i=1;i<parsed.length;i++){
    const c=parsed[i];
    const title=pick(c,headers,["Produktname","Name"],0);
    const productTypeRaw=pick(c,headers,["Produkttyp","ProduktTyp","Produkt Typ","Typ"],-1);
    const printRuleRaw=pick(c,headers,["DruckRegel","Druck Regel","PrintRule"],-1);
    if(!title)continue;
    const subcategory=isSevdeskArticleCsv ? "" : pick(c,headers,["Unterkategorie","Subkategorie","Subcategory"],hasSubcategory?2:-1);
    const descRaw=pick(c,headers,descHeaders,isSevdeskArticleCsv?-1:2+offset);
    if(title.trim().toLowerCase()==="t-shirt premium" && descRaw.trim().toLowerCase()==="100% baumwolle")continue;
    const category=isSevdeskArticleCsv ? "" : pick(c,headers,["Kategorie"],1);
    const productKey=keyFor(title,category,subcategory);
    const printCostRaw=pick(c,headers,["DruckkostenProDruck","Druckkosten","Druckkosten pro Druck"],hasPrintCost?4+offset:-1);
    const shopifyVariantIds=parseShopifyVariantIds(pick(c,headers,["ShopifyVariantIDs","Shopify Variant IDs","Shopify Varianten IDs"],hasShopifyVariantIds?5+offset+printCostOffset:-1));
    const activeRaw=pick(c,headers,["Aktiv"],5+offset+printCostOffset+shopifyOffset);
    const personalizableRaw=pick(c,headers,["Personalisierbar","Konfigurator","Im Konfigurator","Nur Shop"],hasPersonalizable?6+offset+printCostOffset+shopifyOffset:-1);
    const taxRaw=pick(c,headers,taxHeaders,-1)||"20,00";
    const grossPriceRaw=pick(c,headers,grossPriceHeaders,-1);
    const netPriceRaw=pick(c,headers,netPriceHeaders,isSevdeskArticleCsv?7:-1);
    const importPrice=isSevdeskArticleCsv
      ? (grossPriceRaw ? formatSevdeskDecimal(grossPriceRaw,"") : formatSevdeskDecimal(netToGrossPrice(netPriceRaw,taxRaw),""))
      : pick(c,headers,["Preis","Verkaufspreis"],3+offset);
    const product={
      title:title,
      productType:isSevdeskArticleCsv?"shop_only":normalizeProductType(productTypeRaw),
      printRule:normalizePrintRule(printRuleRaw),
      category:category,
      subcategory:subcategory,
      desc:descRaw,
      price:importPrice,
      sevdeskArticleNumber:pick(c,headers,articleNumberHeaders,-1),
      sevdeskUnit:pick(c,headers,["sevDeskEinheit","Einheit"],-1)||"Stk",
      sevdeskStock:formatSevdeskDecimal(pick(c,headers,["sevDeskBestand","Bestand"],-1),"0,00"),
      sevdeskStockEnabled:["true","1","ja","yes"].includes(String(pick(c,headers,["sevDeskBestandAktiv","Bestand aktiviert"],-1)).toLowerCase()),
      sevdeskTaxRate:formatSevdeskDecimal(taxRaw,"20,00"),
      sevdeskPurchasePrice:formatSevdeskDecimal(pick(c,headers,purchasePriceHeaders,-1),""),
      sevdeskCategory:(isSevdeskArticleCsv?pick(c,headers,categoryHeaders,8):pick(c,headers,["sevDeskKategorie"],-1))||"Standard",
      printCostPerPosition:isSevdeskArticleCsv?"":printCostRaw,
      sizes:isSevdeskArticleCsv?[]:splitList(pick(c,headers,["Groessen","Groessen"],4+offset).replaceAll("|",",")),
      shopifyVariantIds:shopifyVariantIds,
      active:isSevdeskArticleCsv?true:(!activeRaw || !["false","0","nein","no","inaktiv"].includes(String(activeRaw).toLowerCase())),
      personalizable:isSevdeskArticleCsv?false:(!personalizableRaw || !["false","0","nein","no","nur shop","shop","shopify"].includes(String(personalizableRaw).toLowerCase())),
      imgFront:pick(c,headers,["BildVorderseite","Bild vorne","Vorderseite","BildVorne"],isSevdeskArticleCsv?-1:6+offset+printCostOffset+shopifyOffset+personalizableOffset),
      imgBack:pick(c,headers,["BildRueckseite","BildRueckseite","Bild hinten","Rueckseite","Rueckseite","BildHinten"],isSevdeskArticleCsv?-1:7+offset+printCostOffset+shopifyOffset+personalizableOffset),
      imgLeftSleeve:pick(c,headers,["BildLinkerAermel","BildLinkerAermel","Linker Aermel","Linker Aermel"],isSevdeskArticleCsv?-1:8+offset+printCostOffset+shopifyOffset+personalizableOffset),
      imgRightSleeve:pick(c,headers,["BildRechterAermel","BildRechterAermel","Rechter Aermel","Rechter Aermel"],isSevdeskArticleCsv?-1:9+offset+printCostOffset+shopifyOffset+personalizableOffset)
    };
    const articleNumberKey=normalizeArticleNumber(product.sevdeskArticleNumber);
    const importKey=articleNumberKey ? "article:"+articleNumberKey : "product:"+productKey;
    if(importKeys.has(importKey)){skipped++;continue}
    importKeys.add(importKey);
    if(articleNumberKey){
      if(importArticleNumbers.has(articleNumberKey)){skipped++;continue;}
      importArticleNumbers.set(articleNumberKey,product.title);
    }
    const existingProduct=articleNumberKey ? existingByArticleNumber.get(articleNumberKey) : existingByKey.get(productKey);
    if(existingProduct){
      const merged={
        ...existingProduct,
        title:product.title||existingProduct.title,
        desc:(isSevdeskArticleCsv&&hasDescHeader)?product.desc:(product.desc||existingProduct.desc),
        price:product.price||existingProduct.price,
        sevdeskArticleNumber:product.sevdeskArticleNumber||existingProduct.sevdeskArticleNumber,
        sevdeskUnit:product.sevdeskUnit||existingProduct.sevdeskUnit,
        sevdeskStock:product.sevdeskStock||existingProduct.sevdeskStock,
        sevdeskStockEnabled:product.sevdeskStockEnabled,
        sevdeskTaxRate:product.sevdeskTaxRate||existingProduct.sevdeskTaxRate,
        sevdeskPurchasePrice:product.sevdeskPurchasePrice||existingProduct.sevdeskPurchasePrice,
        sevdeskCategory:product.sevdeskCategory||existingProduct.sevdeskCategory
      };
      if(!isSevdeskArticleCsv){
        merged.productType=product.productType;
        merged.printRule=product.printRule;
        merged.category=product.category;
        merged.subcategory=product.subcategory;
        merged.printCostPerPosition=product.printCostPerPosition;
        merged.sizes=product.sizes;
        merged.shopifyVariantIds=product.shopifyVariantIds;
        merged.active=product.active;
        merged.personalizable=product.personalizable;
        merged.imgFront=product.imgFront||existingProduct.imgFront;
        merged.imgBack=product.imgBack||existingProduct.imgBack;
        merged.imgLeftSleeve=product.imgLeftSleeve||existingProduct.imgLeftSleeve;
        merged.imgRightSleeve=product.imgRightSleeve||existingProduct.imgRightSleeve;
      }
      updateJobs.push({id:existingProduct.id,row:rowFromProduct(merged),category:merged.category});
      updated++;
    }else{
      insertRows.push(rowFromProduct(product));
      inserted++;
    }
  }
  if(!insertRows.length&&!updateJobs.length){alert(skipped?skipped+" doppelte Zeilen uebersprungen. Keine Produkte importiert oder aktualisiert.":"Keine Produkte gefunden.");e.target.value="";return}
  const importCats=[...new Set([...insertRows.map(r=>r.category),...updateJobs.map(j=>j.category)].filter(Boolean))];
  for(const name of importCats){
    const sortOrder=categoryOrders[name]??categories.length;
    await upsertCategoryRow({name,sort_order:sortOrder});
  }
  let importError=null;
  if(insertRows.length){
    const{error}=await supabaseClient.from("products").insert(insertRows);
    if(error)importError=error;
  }
  if(!importError){
    for(const job of updateJobs){
      const{error}=await supabaseClient.from("products").update(job.row).eq("id",job.id);
      if(error){importError=error;break;}
    }
  }
  if(importError)alert(importError.message);else alert(inserted+" Produkte importiert, "+updated+" Produkte aktualisiert."+((skipped>0)?" "+skipped+" doppelte Zeilen uebersprungen.":""));
  e.target.value="";
  await loadAll();
}

function sumQuantities(quantities){
  return (quantities||[]).reduce((sum,q)=>sum+(Number(q.qty)||0),0);
}

function exportSevdeskCsv(){
  if(!requests.length){alert("Keine Anfragen geladen.");return;}
  const rows=[["Datum","Status","Kunde E-Mail","Telefon","Anfrage ID","Position","Beschreibung","Kategorie","Menge","Einzelpreis netto/brutto","Druckkosten","Gesamt","Notiz"]];
  requests.forEach(r=>{
    const items=r.order_data?.items||[];
    items.forEach((item,idx)=>{
      const qty=sumQuantities(item.quantities);
      const unitPrice=Number(String(item.price||0).replace(",","."))||0;
      const printTotal=Number(item.printCostTotal||0)||0;
      const lineTotal=qty*unitPrice+printTotal;
      rows.push([
        formatDate(r.created_at),
        r.status||"Neu",
        r.customer_email||"",
        r.phone||"",
        r.id||"",
        idx+1,
        item.title||"",
        [item.category,item.subcategory].filter(Boolean).join(" / "),
        qty,
        formatPrice(unitPrice),
        formatPrice(printTotal),
        formatPrice(lineTotal),
        r.note||""
      ]);
    });
  });
  const csv="\ufeff"+rows.map(row=>row.map(csvEscape).join(";")).join("\r\n");
  downloadText(csv,"sevdesk-anfragen-export.csv","text/csv;charset=utf-8");
}
function downloadText(text,filename,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ANFRAGEN */
function openRequestCount(){
  return (requests||[]).filter(r=>String(r.status||"Neu").toLowerCase()!=="erledigt").length;
}

function updateRequestBadge(){
  const badge=document.getElementById("request-count-badge");
  if(!badge)return;
  const count=openRequestCount();
  badge.textContent=String(count);
  badge.classList.toggle("hidden",count===0);
}

function toggleRequestsPanel(force){
  const section=document.getElementById("requests-section");
  if(!section)return;
  const show=typeof force==="boolean"?force:section.classList.contains("hidden");
  section.classList.toggle("hidden",!show);
  if(show)section.scrollIntoView({behavior:"smooth",block:"start"});
}

async function loadRequests(){
  const list=document.getElementById("admin-request-list");
  if(!list)return;
  list.innerHTML='<div class="sub">Anfragen werden geladen...</div>';
  try{
    const{data,error}=await supabaseClient.from("requests").select("*").order("created_at",{ascending:false}).limit(50);
    if(error)throw error;
    requests=data||[];
    updateRequestBadge();
    renderRequests();
  }catch(err){
    requests=[];
    updateRequestBadge();
    list.innerHTML='<div class="notice warn">Anfragen konnten nicht geladen werden. Bitte SQL aus supabase-setup-v18.sql ausfuehren.<br>'+err.message+'</div>';
  }
}

function renderRequests(){
  const list=document.getElementById("admin-request-list");
  const detail=document.getElementById("admin-request-detail");
  updateRequestBadge();
  list.innerHTML="";
  if(detail)detail.innerHTML='<div class="sub">Anfrage anklicken fuer Details.</div>';
  if(!requests.length){list.innerHTML='<div class="sub">Noch keine Anfragen vorhanden.</div>';return}
  requests.forEach(r=>{
    const count=(r.order_data?.items||[]).length;
    const row=document.createElement("div");
    row.className="admin-request-row";
    row.innerHTML='<div class="request-row-main"><strong></strong><div class="sub"></div></div><span class="request-status"></span><button class="mini-delete-btn" type="button">Loeschen</button>';
    row.querySelector("strong").textContent=r.customer_email||"Ohne E-Mail";
    row.querySelector(".sub").textContent=formatDate(r.created_at)+"  -  "+count+" Produkt(e)";
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
  html+='<div class="sub">'+formatDate(r.created_at)+'  '+(r.status||"Neu")+'</div>';
  html+='<div class="request-admin-controls"><label>Status</label><select id="request-status-select"><option>Neu</option><option>In Arbeit</option><option>Wartet auf Kunde</option><option>Erledigt</option></select><label>Interne Notiz</label><textarea id="request-internal-note" rows="3" placeholder="Nur intern sichtbar"></textarea><button class="btn btn-light" id="save-request-meta-btn" type="button">Status speichern</button></div>';
  html+='<p><strong>Kunde:</strong> '+escapeHtml(r.customer_email||"-")+'</p>';
  html += '<p><strong>Telefon:</strong> ' +
        escapeHtml(r.phone || "-") +
        '</p>';
  html+='<button class="btn btn-danger" id="detail-delete-request-btn" type="button">Anfrage loeschen</button>';
  html+='<p><strong>Anmerkung:</strong><br>'+escapeHtml(r.note||"-").replaceAll("\\n","<br>")+'</p>';

  const pricing=r.order_data?.pricing;
  if(pricing){
    html+='<div class="discount-box"><strong>Preis / Rabatt</strong><br>';
    html+='Gesamtmenge: '+escapeHtml(pricing.totalQty||0)+' Stueck<br>';
    html+='Produktpreis: EUR '+formatPrice(pricing.productSubtotal||0)+'<br>';
    html+='Druckpositionen: '+escapeHtml(pricing.totalPrintPositions||0)+'<br>';
    html+='Druckkosten pro Druck: EUR '+formatPrice(pricing.printCostPerPosition||0)+'<br>';
    html+='Druckkosten gesamt: EUR '+formatPrice(pricing.printCostAmount||0)+'<br>';
    html+='Warenwert: EUR '+formatPrice(pricing.subtotal||0)+'<br>';
    html+='Mengenrabatt: '+escapeHtml(pricing.quantityDiscountRate||0)+'% (-EUR '+formatPrice(pricing.quantityDiscountAmount||0)+')<br>';
    html+='Zwischensumme: EUR '+formatPrice(pricing.afterQuantity||0)+'<br>';
    html+='Gutscheincode: '+escapeHtml(pricing.voucherCode||'-')+'<br>';
    html+='Gutscheinrabatt: '+escapeHtml(pricing.voucherDiscountRate||0)+'% (-EUR '+formatPrice(pricing.voucherDiscountAmount||0)+')<br>';
    html+='<strong>Endpreis: EUR '+formatPrice(pricing.total||0)+'</strong>';
    html+='</div>';
  }

  html+='<h3>Produkte</h3>';

  items.forEach((item,idx)=>{
    const qty=(item.quantities||[]).map(q=>escapeHtml(q.size)+": "+escapeHtml(q.qty)).join(", ")||"-";
    const designs=item.designs||{front:[],back:[],leftSleeve:[],rightSleeve:[]};

    html+='<div class="request-detail-item">';
    html+='<strong>'+(idx+1)+'. '+escapeHtml(item.title||"-")+'</strong><br>';
    html+='<span class="sub">'+escapeHtml(item.category||"-")+'  -  EUR '+escapeHtml(item.price||"")+'</span><br>';
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
          html+='Schriftgroesse: '+escapeHtml(d.fontSize||"-")+'<br>';
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
      html+='<a class="btn btn-light" download="'+filename+'" href="data:'+mime+';base64,'+file.content+'">Grafik '+(i+1)+' herunterladen'+(used?'  -  '+used:'')+'</a>';
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

  const statusSelect=document.getElementById("request-status-select");
  if(statusSelect)statusSelect.value=r.status||"Neu";
  const internalNote=document.getElementById("request-internal-note");
  if(internalNote)internalNote.value=r.internal_note||"";
  const saveMetaBtn=document.getElementById("save-request-meta-btn");
  if(saveMetaBtn)saveMetaBtn.addEventListener("click",()=>updateRequestMeta(r.id,statusSelect?.value||"Neu",internalNote?.value||""));

  const delBtn=document.getElementById("detail-delete-request-btn");
  if(delBtn)delBtn.addEventListener("click",()=>deleteRequest(r.id));
}

async function updateRequestMeta(id,status,internalNote){
  try{
    const{error}=await supabaseClient.from("requests").update({status:status,internal_note:internalNote}).eq("id",id);
    if(error)throw error;
    await loadRequests();
  }catch(err){
    alert("Status konnte nicht gespeichert werden: "+err.message);
  }
}

async function deleteRequest(id){
  if(!confirm("Diese Anfrage wirklich loeschen?"))return;
  try{
    const{error}=await supabaseClient.from("requests").delete().eq("id",id);
    if(error)throw error;
    const detail=document.getElementById("admin-request-detail");
    if(detail)detail.innerHTML='<div class="sub">Anfrage geloescht.</div>';
    await loadRequests();
  }catch(err){
    alert("Anfrage konnte nicht geloescht werden: "+err.message);
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





























