let supabaseClient;
let products = [];
let categories = [];
let filteredProducts = [];
let currentProductIndex = 0;
let selectedCategory = "";
let currentSide = "front";
let requestItems = [];
let selectedItemId = null;
let designState = createEmptyDesignState();
let dragState = null;

const SIDES = ["front", "back", "leftSleeve", "rightSleeve"];
const SIDE_LABELS = {front:"Vorderseite", back:"Rückseite", leftSleeve:"Linker Ärmel", rightSleeve:"Rechter Ärmel"};
function createEmptyDesignState(){return {front:[],back:[],leftSleeve:[],rightSleeve:[]};}
function getSideLabel(side){return SIDE_LABELS[side]||side;}
function getSideImage(product,side){
  if(!product)return "";
  if(side==="back")return product.imgBack||"";
  if(side==="leftSleeve")return product.imgLeftSleeve||"";
  if(side==="rightSleeve")return product.imgRightSleeve||"";
  return product.imgFront||"";
}
function sideHasImage(product,side){return !!getSideImage(product,side);}

const pImg = document.getElementById("product-img");
const cTitle = document.getElementById("curr-title");
const cDesc = document.getElementById("curr-desc");
const cPrice = document.getElementById("curr-price");
const dropdown = document.getElementById("product-dropdown");
const dropdownTrigger = document.getElementById("dropdown-trigger");
const optionsContainer = document.getElementById("dropdown-options-container");
const canvas = document.getElementById("canvas-container");
const layer = document.getElementById("design-layer");
const categoryStart = document.getElementById("category-start");
const configuratorScreen = document.getElementById("configurator-screen");
const startCategoryGrid = document.getElementById("start-category-grid");
const startProductArea = document.getElementById("start-product-area");
const startProductGrid = document.getElementById("start-product-grid");
const startProductTitle = document.getElementById("start-product-title");

document.addEventListener("DOMContentLoaded", init);

async function init(){
  bindEvents();
  try{
    supabaseClient = getSupabaseClient();
    await loadProducts();
    await loadCategories();
  }catch(err){
    showWarning(err.message);
  }
  setupCanvasEvents();
}

function showWarning(msg){
  [document.getElementById("config-warning"),document.getElementById("start-config-warning")].filter(Boolean).forEach(box=>{
    box.textContent=msg;
    box.classList.remove("hidden");
  });
}

function bindEvents(){
  dropdownTrigger.addEventListener("click",e=>{dropdown.classList.toggle("open");e.stopPropagation();});
  window.addEventListener("click",()=>dropdown.classList.remove("open"));
  document.getElementById("category-filter").addEventListener("change",applyCategoryFilter);
  document.getElementById("start-back-btn").addEventListener("click",showCategoryStart);
  document.getElementById("back-to-products-btn").addEventListener("click",()=>showProductsForCategory(selectedCategory));
  document.getElementById("logo-loader").addEventListener("change",handleLogoUpload);
  document.getElementById("add-text-btn").addEventListener("click",addTextItem);
  document.getElementById("delete-selected-btn").addEventListener("click",deleteSelectedItem);
  document.getElementById("reset-side-btn").addEventListener("click",resetCurrentSide);
  bindOptional("move-up-btn",()=>moveSelected(0,-1));
  bindOptional("move-down-btn",()=>moveSelected(0,1));
  bindOptional("move-left-btn",()=>moveSelected(-1,0));
  bindOptional("move-right-btn",()=>moveSelected(1,0));
  bindOptional("size-minus-btn",()=>resizeSelected(-1));
  bindOptional("size-plus-btn",()=>resizeSelected(1));
  bindOptional("center-h-btn",centerSelectedHorizontal);
  document.getElementById("add-request-btn").addEventListener("click",addCurrentProductToRequest);
  document.getElementById("download-design-btn").addEventListener("click",downloadAllRequestDesignImages);
  document.getElementById("send-order-btn").addEventListener("click",sendOrder);
  document.getElementById("front-btn").addEventListener("click",()=>setSide("front"));
  document.getElementById("back-btn").addEventListener("click",()=>setSide("back"));
  document.getElementById("left-sleeve-btn").addEventListener("click",()=>setSide("leftSleeve"));
  document.getElementById("right-sleeve-btn").addEventListener("click",()=>setSide("rightSleeve"));
  canvas.addEventListener("click", e=>{
    if(e.target === canvas || e.target === pImg || e.target === layer){
      selectedItemId = null;
      renderDesignItems();
    }
  });
}

function bindOptional(id,fn){
  const el=document.getElementById(id);
  if(el)el.addEventListener("click",fn);
}

async function loadProducts(){
  dropdownTrigger.textContent="Produkte werden geladen...";
  const {data,error}=await supabaseClient.from("products").select("*").eq("active",true).order("id",{ascending:true});
  if(error)throw error;
  products=(data||[]).map(productFromRow);
}

async function loadCategories(){
  try{
    const {data,error}=await supabaseClient.from("categories").select("*").order("name",{ascending:true});
    if(error)throw error;
    categories=(data||[]).map(row=>row.name).filter(Boolean);
  }catch(err){
    console.warn("Kategorien-Tabelle konnte nicht geladen werden:",err.message);
    categories=[];
  }
  buildCategoryFilter();
  renderStartCategories();
  resetConfiguratorPreview();
}

function getCategories(){
  const productCats=products.map(p=>p.category).filter(Boolean);
  return [...new Set([...categories,...productCats])].sort();
}

function buildCategoryFilter(){
  const sel=document.getElementById("category-filter");
  const cats=getCategories();
  sel.innerHTML='<option value="">Alle Kategorien</option>';
  cats.forEach(c=>{const opt=document.createElement("option");opt.value=c;opt.textContent=c;sel.appendChild(opt);});
}

function renderStartCategories(){
  const cats=getCategories();
  startProductArea.classList.add("hidden");
  startCategoryGrid.classList.remove("hidden");
  startCategoryGrid.innerHTML="";

  if(!products.length){
    startCategoryGrid.innerHTML='<div class="notice">Noch keine aktiven Produkte vorhanden.</div>';
    return;
  }

  const allBtn=createCategoryCard("Alle Produkte",products.length,products[0]?.imgFront||"",()=>showProductsForCategory(""));
  startCategoryGrid.appendChild(allBtn);

  cats.forEach(cat=>{
    const catProducts=products.filter(p=>p.category===cat);
    const img=catProducts.find(p=>p.imgFront)?.imgFront||"";
    startCategoryGrid.appendChild(createCategoryCard(cat,catProducts.length,img,()=>showProductsForCategory(cat)));
  });
}

function createCategoryCard(title,count,img,clickHandler){
  const card=document.createElement("button");
  card.className="start-category-card";
  card.type="button";
  card.innerHTML='<div class="start-category-img">'+(img?'<img src="'+img+'" alt="">':'<span>📦</span>')+'</div><div class="start-category-title"></div><div class="sub"></div>';
  card.querySelector(".start-category-title").textContent=title;
  card.querySelector(".sub").textContent=count+" Produkt"+(count===1?"":"e");
  card.addEventListener("click",clickHandler);
  return card;
}

function showCategoryStart(){
  selectedCategory="";
  categoryStart.classList.remove("hidden");
  configuratorScreen.classList.add("hidden");
  renderStartCategories();
  window.scrollTo({top:0,behavior:"smooth"});
}

function showProductsForCategory(cat){
  selectedCategory=cat||"";
  filteredProducts=products.filter(p=>!selectedCategory||p.category===selectedCategory);
  document.getElementById("category-filter").value=selectedCategory;
  buildDropdown();
  resetConfiguratorPreview();

  categoryStart.classList.remove("hidden");
  configuratorScreen.classList.add("hidden");
  startCategoryGrid.classList.add("hidden");
  startProductArea.classList.remove("hidden");
  startProductTitle.textContent=selectedCategory?selectedCategory:"Alle Produkte";
  startProductGrid.innerHTML="";

  if(!filteredProducts.length){
    startProductGrid.innerHTML='<div class="notice">In dieser Kategorie gibt es noch keine aktiven Produkte.</div>';
    return;
  }

  filteredProducts.forEach((p,idx)=>{
    const card=document.createElement("button");
    card.className="start-product-card";
    card.type="button";
    card.innerHTML='<div class="start-product-img"><img src="'+(p.imgFront||"")+'" alt=""></div><div class="start-product-name"></div><div class="sub"></div><div class="dropdown-price"></div>';
    card.querySelector(".start-product-name").textContent=p.title;
    card.querySelector(".sub").textContent=(p.category||"Ohne Kategorie")+(p.desc?" · "+p.desc:"");
    card.querySelector(".dropdown-price").textContent="€ "+formatPrice(p.price);
    card.addEventListener("click",()=>openConfigurator(idx));
    startProductGrid.appendChild(card);
  });
  window.scrollTo({top:0,behavior:"smooth"});
}

function openConfigurator(index){
  categoryStart.classList.add("hidden");
  configuratorScreen.classList.remove("hidden");
  selectProduct(index);
  window.scrollTo({top:0,behavior:"smooth"});
}

function resetConfiguratorPreview(){
  dropdownTrigger.textContent=filteredProducts.length?"Produkt wählen":"Keine Produkte";
  optionsContainer.innerHTML="";
  pImg.removeAttribute("src");
  layer.innerHTML="";
  cTitle.innerHTML="<strong>Kein Produkt gewählt</strong>";
  cDesc.textContent="Bitte zuerst Kategorie und Produkt auswählen.";
  cPrice.textContent="";
  document.getElementById("size-grid").innerHTML="";
  document.getElementById("total-box").textContent="Gesamt: 0 Stück · € 0.00";
}

function applyCategoryFilter(){
  showProductsForCategory(document.getElementById("category-filter").value);
}

function buildDropdown(){
  optionsContainer.innerHTML="";
  filteredProducts.forEach((p,idx)=>{
    const opt=document.createElement("div");
    opt.className="dropdown-option";
    opt.innerHTML='<img class="dropdown-thumb" src="'+p.imgFront+'" alt=""><div><div class="dropdown-title"></div><div class="dropdown-price">€ '+formatPrice(p.price)+'</div></div>';
    opt.querySelector(".dropdown-title").textContent=p.title;
    opt.addEventListener("click",e=>{selectProduct(idx);dropdown.classList.remove("open");e.stopPropagation();});
    optionsContainer.appendChild(opt);
  });
}

function selectProduct(index){
  if(!filteredProducts[index])return;
  currentProductIndex=index;
  const p=filteredProducts[index];
  currentSide="front";
  designState=createEmptyDesignState();
  selectedItemId=null;
  pImg.src=p.imgFront;
  pImg.onload=()=>renderDesignItems();
  cTitle.innerHTML="<strong>"+p.title+"</strong>";
  cDesc.textContent=(p.category?p.category+" · ":"")+(p.desc||"");
  cPrice.textContent="€ "+formatPrice(p.price);
  dropdownTrigger.innerHTML='<span style="display:flex;align-items:center;gap:8px;min-width:0;"><img src="'+p.imgFront+'" style="width:26px;height:26px;object-fit:contain;border-radius:4px;background:#f8fafc;"> <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span></span>';
  dropdownTrigger.querySelector("span span").textContent=p.title;
  document.querySelectorAll(".dropdown-option").forEach((opt,idx)=>opt.classList.toggle("active",idx===index));
  buildSizeGrid(p);
  setSide("front");
  updateTotal();
}

function buildSizeGrid(p){
  const grid=document.getElementById("size-grid");
  grid.innerHTML="";
  (p.sizes?.length?p.sizes:["S","M","L","XL"]).forEach(size=>{
    const row=document.createElement("div");
    row.className="size-row";
    row.innerHTML='<label></label><input type="number" min="0" step="1" inputmode="numeric" value="0" data-size="'+size+'">';
    row.querySelector("label").textContent=size;
    const input=row.querySelector("input");
    input.addEventListener("input",()=>{
      let val=parseInt(String(input.value).replace(/^0+(?=\\d)/,""),10);
      if(!Number.isFinite(val)||val<0) val=0;
      input.value=String(val);
      updateTotal();
    });
    grid.appendChild(row);
  });
}

function getQuantities(){
  return [...document.querySelectorAll("#size-grid input")]
    .map(i=>({size:i.dataset.size,qty:parseInt(i.value,10)||0}))
    .filter(x=>x.qty>0);
}

function updateTotal(){
  const prod=filteredProducts[currentProductIndex];
  const qty=getQuantities().reduce((s,x)=>s+x.qty,0);
  const total=qty*(Number(String(prod?.price||0).replace(",","."))||0);
  document.getElementById("total-box").textContent="Gesamt: "+qty+" Stück · € "+formatPrice(total);
}

function setSide(side){
  const p=filteredProducts[currentProductIndex];
  if(!p)return;

  if(!sideHasImage(p,side)){
    const fallback=SIDES.find(s=>sideHasImage(p,s))||"front";
    side=fallback;
  }

  currentSide=side;
  pImg.src=getSideImage(p,currentSide);

  SIDES.forEach(s=>{
    const btn=document.getElementById(s==="leftSleeve"?"left-sleeve-btn":s==="rightSleeve"?"right-sleeve-btn":s+"-btn");
    if(btn){
      btn.classList.toggle("active",currentSide===s);
      btn.disabled=!sideHasImage(p,s);
      btn.title=btn.disabled?"Für diese Seite wurde kein Produktbild hinterlegt":"";
    }
  });

  selectedItemId=null;
  renderDesignItems();
}
function addDesignItem(item){
  const items=designState[currentSide];
  items.push({
    id: "d"+Date.now()+Math.random().toString(16).slice(2),
    type: item.type,
    src: item.src || "",
    text: item.text || "",
    color: item.color || "#000000",
    font: item.font || "Arial, sans-serif",
    relX: .38,
    relY: .32,
    relW: item.type==="image" ? .18 : .22,
    fontSize: 32,
    originalName: item.originalName || "",
    mime: item.mime || "",
    originalContent: item.originalContent || ""
  });
  selectedItemId=items[items.length-1].id;
  renderDesignItems();
}

function handleLogoUpload(e){
  const file=e.target.files[0];
  if(!file||!file.type.startsWith("image/"))return;
  const reader=new FileReader();
  reader.onload=()=>{
    const dataUrl=String(reader.result||"");
    addDesignItem({
      type:"image",
      src:dataUrl,
      originalName:file.name||"grafik",
      mime:file.type||"image/png",
      originalContent:dataUrl.split(",")[1]||""
    });
    e.target.value="";
  };
  reader.readAsDataURL(file);
}

function addTextItem(){
  const text=document.getElementById("text-input").value.trim();
  if(!text){alert("Bitte zuerst Text eingeben.");return;}
  addDesignItem({
    type:"text",
    text,
    color:document.getElementById("text-color").value,
    font:document.getElementById("font-select").value
  });
}

function deleteSelectedItem(){
  if(!selectedItemId){alert("Bitte zuerst ein Element anklicken.");return;}
  designState[currentSide]=designState[currentSide].filter(i=>i.id!==selectedItemId);
  selectedItemId=null;
  renderDesignItems();
}

function resetCurrentSide(){
  if(!confirm("Alle Designs auf dieser Seite löschen?"))return;
  designState[currentSide]=[];
  selectedItemId=null;
  renderDesignItems();
}

function renderDesignItems(){
  layer.innerHTML="";
  const rect=pImg.getBoundingClientRect();
  const canvasRect=canvas.getBoundingClientRect();
  const leftOffset=rect.left-canvasRect.left;
  const topOffset=rect.top-canvasRect.top;
  const imgW=rect.width || canvas.clientWidth;
  const imgH=rect.height || canvas.clientHeight;

  designState[currentSide].forEach(item=>{
    const el=document.createElement("div");
    el.className="design-item"+(item.id===selectedItemId?" active":"");
    el.dataset.id=item.id;
    el.style.left=(leftOffset + item.relX*imgW)+"px";
    el.style.top=(topOffset + item.relY*imgH)+"px";
    el.style.width=Math.max(40,item.relW*imgW)+"px";

    if(item.type==="image"){
      const img=document.createElement("img");
      img.src=item.src;
      img.style.width="100%";
      el.appendChild(img);
    }else{
      const span=document.createElement("span");
      span.textContent=item.text;
      span.style.color=item.color;
      span.style.fontFamily=item.font;
      span.style.fontSize=Math.max(14,item.fontSize*(imgH/560))+"px";
      el.appendChild(span);
    }

    const resizer=document.createElement("div");
    resizer.className="resizer";
    el.appendChild(resizer);

    el.addEventListener("mousedown",startDrag);
    el.addEventListener("touchstart",startDrag,{passive:false});
    el.addEventListener("click",e=>{selectedItemId=item.id;renderDesignItems();e.stopPropagation();});
    layer.appendChild(el);
  });
}

function setupCanvasEvents(){
  window.addEventListener("mousemove",moveDrag);
  window.addEventListener("touchmove",moveDrag,{passive:false});
  window.addEventListener("mouseup",endDrag);
  window.addEventListener("touchend",endDrag);
  window.addEventListener("resize",renderDesignItems);
}

function point(e){return e.touches?e.touches[0]:e;}

function startDrag(e){
  const el=e.currentTarget;
  const item=getCurrentItems().find(i=>i.id===el.dataset.id);
  if(!item)return;
  selectedItemId=item.id;
  const pt=point(e);
  dragState={
    action:e.target.classList.contains("resizer")?"resize":"drag",
    item,
    startX:pt.clientX,
    startY:pt.clientY,
    startRelX:item.relX,
    startRelY:item.relY,
    startRelW:item.relW,
    startFontSize:item.fontSize
  };
  renderDesignItems();
  e.preventDefault();
}

function moveDrag(e){
  if(!dragState)return;
  const pt=point(e);
  const rect=pImg.getBoundingClientRect();
  const dx=(pt.clientX-dragState.startX)/(rect.width||1);
  const dy=(pt.clientY-dragState.startY)/(rect.height||1);

  if(dragState.action==="drag"){
    dragState.item.relX=Math.max(0,Math.min(.95,dragState.startRelX+dx));
    dragState.item.relY=Math.max(0,Math.min(.95,dragState.startRelY+dy));
  }else{
    const diff=(pt.clientX-dragState.startX)/(rect.width||1);
    dragState.item.relW=Math.max(.04,Math.min(.9,dragState.startRelW+diff));
    if(dragState.item.type==="text"){
      dragState.item.fontSize=Math.max(12,dragState.startFontSize+(pt.clientX-dragState.startX)/3);
    }
  }
  renderDesignItems();
  e.preventDefault();
}

function endDrag(){dragState=null;}

function getCurrentItems(){return designState[currentSide]||[];}

function getSelectedDesignItem(){
  if(!selectedItemId)return null;
  return getCurrentItems().find(i=>i.id===selectedItemId)||null;
}

function moveSelected(dx,dy){
  const item=getSelectedDesignItem();
  if(!item){alert("Bitte zuerst Text oder Logo anklicken.");return;}
  const rect=pImg.getBoundingClientRect();
  const step=8;
  item.relX=Math.max(0,Math.min(.95,item.relX+(dx*step)/(rect.width||800)));
  item.relY=Math.max(0,Math.min(.95,item.relY+(dy*step)/(rect.height||800)));
  renderDesignItems();
}

function resizeSelected(direction){
  const item=getSelectedDesignItem();
  if(!item){alert("Bitte zuerst Text oder Logo anklicken.");return;}
  item.relW=Math.max(.04,Math.min(.9,item.relW+(direction*.015)));
  if(item.type==="text")item.fontSize=Math.max(10,(item.fontSize||32)+(direction*2));
  renderDesignItems();
}

function centerSelectedHorizontal(){
  const item=getSelectedDesignItem();
  if(!item){alert("Bitte zuerst Text oder Logo anklicken.");return;}
  item.relX=Math.max(0,Math.min(.95,.5-(item.relW||.2)/2));
  renderDesignItems();
}

function cloneState(obj){return JSON.parse(JSON.stringify(obj));}


function addCurrentProductToRequest(){
  const prod=filteredProducts[currentProductIndex];
  if(!prod){alert("Bitte Produkt wählen.");return;}
  const quantities=getQuantities();
  if(!quantities.length&&!confirm("Keine Menge ausgewählt. Trotzdem hinzufügen?"))return;

  const clonedDesigns=cloneState(designState);
  requestItems.push({
    title:prod.title,
    price:prod.price,
    desc:prod.desc||"",
    category:prod.category||"",
    quantities,
    productImages:{front:prod.imgFront,back:prod.imgBack,leftSleeve:prod.imgLeftSleeve,rightSleeve:prod.imgRightSleeve},
    designs:clonedDesigns,
    designTexts:designTextSummary(clonedDesigns),
    originalFiles:originalFilesFromDesigns(clonedDesigns,prod.title)
  });
  renderRequestList();
}

function removeRequestItem(index){requestItems.splice(index,1);renderRequestList();}

function designSummary(designs){
  return SIDES.map(side=>getSideLabel(side)+": "+((designs?.[side]||[]).length)+" Element(e)").join(", ");
}

function designTextSummary(designs){
  const out=[];
  SIDES.forEach(side=>{
    (designs?.[side]||[]).forEach(d=>{
      if(d.type==="text" && d.text){
        out.push(getSideLabel(side)+": "+d.text);
      }
    });
  });
  return out;
}

function originalFilesFromDesigns(designs, productTitle){
  const files=[];
  SIDES.forEach(side=>{
    (designs?.[side]||[]).forEach((d,idx)=>{
      if(d.type==="image" && d.originalContent){
        files.push({
          filename:d.originalName||("grafik-"+(idx+1)+".png"),
          mime:d.mime||"application/octet-stream",
          content:d.originalContent,
          used_on:(productTitle||"Produkt")+" - "+getSideLabel(side)
        });
      }
    });
  });
  return files;
}

function renderRequestList(){
  const list=document.getElementById("request-list");
  list.innerHTML="";
  if(!requestItems.length){list.innerHTML='<div class="sub">Noch keine Produkte in der Anfrage.</div>';return;}
  requestItems.forEach((item,idx)=>{
    const row=document.createElement("div");
    row.className="request-item";
    const qty=item.quantities.map(q=>q.size+":"+q.qty).join(", ")||"keine Menge";
    const info=document.createElement("div");
    info.innerHTML="<strong></strong><br><span></span>";
    info.querySelector("strong").textContent=item.title;
    info.querySelector("span").textContent=qty+" · "+designSummary(item.designs);
    const btn=document.createElement("button");
    btn.className="remove-request";
    btn.type="button";
    btn.textContent="Entfernen";
    btn.addEventListener("click",()=>removeRequestItem(idx));
    row.appendChild(info);row.appendChild(btn);list.appendChild(row);
  });
}

function buildMailText(){
  const clientEmail=document.getElementById("client-email").value.trim();
  const notes=document.getElementById("client-notes").value.trim();
  let productText="";
  requestItems.forEach((item,index)=>{
    const qtyText=item.quantities.map(q=>q.size+": "+q.qty).join(", ")||"-";
    const totalQty=item.quantities.reduce((s,q)=>s+q.qty,0);
    const totalPrice=totalQty*(Number(String(item.price).replace(",","."))||0);
    productText+=(index+1)+". "+item.title+"\\n"+
      "- Kategorie: "+(item.category||"-")+"\\n"+
      "- Basispreis: € "+item.price+"\\n"+
      "- Menge: "+qtyText+"\\n"+
      "- Gesamt: € "+formatPrice(totalPrice)+"\\n"+
      "- Beschreibung: "+(item.desc||"-")+"\\n"+
      "- Design: "+designSummary(item.designs)+"\\n\\n";
  });
  return "Hallo!\\n\\nich habe folgende Produkte im Konfigurator zusammengestellt.\\n\\nPRODUKTE / ANFRAGE:\\n"+productText+
    "KUNDEN-INFOS:\\n- Meine E-Mail: "+clientEmail+"\\n- Anmerkung: "+(notes||"-")+"\\n\\n"+
    "Die Layoutbilder für Vorder- und Rückseite wurden über das Online-Formular mitgesendet.\\n\\nBitte um Rückmeldung.\\n";
}

function createSideBlob(item,side){
  return new Promise((resolve,reject)=>{
    const imageUrl=getSideImage({
      imgFront:item.productImages.front,
      imgBack:item.productImages.back,
      imgLeftSleeve:item.productImages.leftSleeve,
      imgRightSleeve:item.productImages.rightSleeve
    },side);
    if(!imageUrl){reject(new Error("Für "+getSideLabel(side)+" wurde kein Produktbild hinterlegt."));return;}
    const productImage=new Image();
    productImage.crossOrigin="anonymous";
    productImage.onload=function(){
      const canvasExport=document.createElement("canvas");
      const ctx=canvasExport.getContext("2d");
      const maxWidth=1400;
      const scale=Math.min(1,maxWidth/(productImage.naturalWidth||1200));
      canvasExport.width=Math.round((productImage.naturalWidth||1200)*scale);
      canvasExport.height=Math.round((productImage.naturalHeight||900)*scale);
      ctx.fillStyle="#fff";
      ctx.fillRect(0,0,canvasExport.width,canvasExport.height);
      ctx.drawImage(productImage,0,0,canvasExport.width,canvasExport.height);

      const items=item.designs[side]||[];
      let chain=Promise.resolve();
      items.forEach(d=>{chain=chain.then(()=>drawDesign(ctx,canvasExport,d));});
      chain.then(()=>canvasExport.toBlob(blob=>blob?resolve(blob):reject(new Error("Layout konnte nicht erstellt werden.")),"image/jpeg",.86));
    };
    productImage.onerror=()=>reject(new Error("Produktbild konnte nicht geladen werden."));
    productImage.src=imageUrl;
  });
}
function drawDesign(ctx,canvas,d){
  return new Promise(resolve=>{
    const x=d.relX*canvas.width;
    const y=d.relY*canvas.height;
    const w=Math.max(40,d.relW*canvas.width);
    if(d.type==="image"&&d.src){
      const img=new Image();
      img.onload=function(){
        const ratio=img.naturalHeight&&img.naturalWidth?img.naturalHeight/img.naturalWidth:1;
        ctx.drawImage(img,x,y,w,w*ratio);
        resolve();
      };
      img.onerror=resolve;
      img.src=d.src;
    }else if(d.type==="text"){
      ctx.fillStyle=d.color||"#000";
      const fontSize=Math.max(20,(d.fontSize||32)/560*canvas.height);
      ctx.font="900 "+fontSize+"px "+(d.font||"Arial, sans-serif");
      ctx.textBaseline="top";
      ctx.fillText(d.text||"",x,y);
      resolve();
    }else resolve();
  });
}

async function downloadAllRequestDesignImages(){
  if(!requestItems.length){alert("Bitte zuerst ein Produkt zur Anfrage hinzufügen.");return;}
  let fileIndex=1;
  for(const item of requestItems){
    for(const side of SIDES){
      if(!item.productImages[side] && !(item.designs[side]||[]).length) continue;
      const blob=await createSideBlob(item,side);
      triggerBlobDownload(blob,"layout-"+fileIndex+"-"+slugify(item.title)+"-"+side+".jpg");
      fileIndex++;
      await new Promise(r=>setTimeout(r,450));
    }
  }
}

function triggerBlobDownload(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
    reader.onerror=()=>reject(new Error("Layout konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
  });
}

async function sendOrder(){
  const clientEmail=document.getElementById("client-email").value.trim(),status=document.getElementById("send-status");
  const notes=document.getElementById("client-notes").value.trim();
  if(!clientEmail){alert("Bitte E-Mail angeben.");return;}
  if(!requestItems.length){alert("Bitte zuerst mindestens ein Produkt hinzufügen.");return;}
  const mailText=buildMailText(),sendBtn=document.getElementById("send-order-btn");
  sendBtn.disabled=true;sendBtn.textContent="Wird gespeichert...";status.textContent="Layouts werden vorbereitet...";
  try{
    const layoutImages=[];
    let fileIndex=1;
    for(const item of requestItems){
      for(const side of SIDES){
        if(fileIndex>5) break;
        if(!item.productImages[side] && !(item.designs[side]||[]).length) continue;
        const blob=await createSideBlob(item,side);
        layoutImages.push({
          filename:"layout-"+fileIndex+"-"+slugify(item.title)+"-"+side+".jpg",
          side,
          product:item.title,
          content:await blobToBase64(blob)
        });
        fileIndex++;
      }
      if(fileIndex>5) break;
    }

    const uploadedFiles=[];
    const seenUploads=new Set();
    function pushOriginalFile(file){
      if(!file||!file.content)return;
      const key=(file.filename||"grafik")+":"+String(file.content).slice(0,120);
      if(seenUploads.has(key))return;
      seenUploads.add(key);
      uploadedFiles.push({
        filename:file.filename||("grafik-"+(uploadedFiles.length+1)),
        mime:file.mime||"application/octet-stream",
        content:file.content,
        used_on:file.used_on||""
      });
    }
    requestItems.forEach(item=>{
      (item.originalFiles||[]).forEach(pushOriginalFile);
      originalFilesFromDesigns(item.designs,item.title).forEach(pushOriginalFile);
    });

    status.textContent="Anfrage wird im Admin gespeichert...";
   const cleanItems = requestItems.map(item => ({
  title: item.title,
  price: item.price,
  desc: item.desc || "",
  category: item.category || "",
  quantities: item.quantities || [],
  designTexts: item.designTexts || [],
  designSummary: designSummary(item.designs),
  designs: item.designs || createEmptyDesignState()
}));

const {error}=await supabaseClient.from("requests").insert({
  customer_email: clientEmail,
  note: notes,
  mail_text: mailText,
  order_data: {
    items: cleanItems,
    total_items: cleanItems.length,
    uploaded_files: uploadedFiles
  },
  layout_images: layoutImages,
  status: "Neu"
});
    if(error)throw error;

    status.textContent="Danke! Anfrage wurde gespeichert.";
    alert("Anfrage wurde gespeichert. Wir melden uns ehestmöglich.");
    requestItems=[];
    renderRequestList();
    document.getElementById("client-notes").value="";
  }catch(error){
    console.error(error);
    status.textContent="Fehler: "+error.message;
    alert("Speichern fehlgeschlagen: "+error.message+"\\n\\nBitte prüfe, ob die Supabase Tabelle requests angelegt wurde.");
  }finally{
    sendBtn.disabled=false;sendBtn.textContent="Anfrage speichern";
  }
}

