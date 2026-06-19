let supabaseClient,session=null,products=[],categories=[],requests=[];

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
    await loadAll();
  }else{
    document.getElementById("login-card").classList.remove("hidden");
    document.getElementById("admin-area").classList.add("hidden");
    document.getElementById("logout-btn").classList.add("hidden");
  }
}

async function loadAll(){
  await loadProducts();
  await loadCategories();
  renderCategorySelect();
  renderCategoryList();
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
    const frontFile=document.getElementById("p-front").files[0],backFile=document.getElementById("p-back").files[0];
    let imgFront=old?.imgFront||"",imgBack=old?.imgBack||"";
    if(frontFile)imgFront=await uploadFile(frontFile,"front");
    if(backFile)imgBack=await uploadFile(backFile,"back");
    if(!imgFront)throw new Error("Bitte ein Vorderseitenbild hochladen.");
    const product={title:document.getElementById("p-title").value.trim(),category:document.getElementById("p-category").value.trim(),desc:document.getElementById("p-desc").value.trim(),price:document.getElementById("p-price").value.trim(),sizes:splitList(document.getElementById("p-sizes").value),imgFront,imgBack,active:document.getElementById("p-active").checked};
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
    row.innerHTML='<div><strong></strong><div class="sub"></div></div><span class="request-status"></span>';
    row.querySelector("strong").textContent=r.customer_email||"Ohne E-Mail";
    row.querySelector(".sub").textContent=formatDate(r.created_at)+" · "+count+" Produkt(e)";
    row.querySelector(".request-status").textContent=r.status||"Neu";
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
  html+='<p><strong>Anmerkung:</strong><br>'+escapeHtml(r.note||"-").replaceAll("\\n","<br>")+'</p>';
  html+='<h3>Produkte</h3>';
  items.forEach((item,idx)=>{
    const qty=(item.quantities||[]).map(q=>escapeHtml(q.size)+": "+escapeHtml(q.qty)).join(", ")||"-";
    html+='<div class="request-detail-item"><strong>'+(idx+1)+'. '+escapeHtml(item.title||"-")+'</strong><br>';
    html+='<span class="sub">'+escapeHtml(item.category||"-")+' · € '+escapeHtml(item.price||"")+'</span><br>';
    html+='Menge: '+qty+'<br>Design: '+escapeHtml(item.designSummary||"-")+'</div>';
  });
  if((r.layout_images||[]).length){
    html+='<h3>Layoutbilder</h3><div class="request-images">';
    (r.layout_images||[]).forEach((img,i)=>{
      html+='<a class="btn btn-light" download="'+escapeHtml(img.filename||("layout-"+(i+1)+".jpg"))+'" href="data:image/jpeg;base64,'+img.content+'">Bild '+(i+1)+' herunterladen</a>';
    });
    html+='</div>';
  }
  detail.innerHTML=html;
}

function formatDate(value){
  if(!value)return "-";
  try{return new Date(value).toLocaleString("de-AT")}catch(_){return value}
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
