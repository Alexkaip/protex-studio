let supabaseClient;
let products = [];
let filteredProducts = [];
let currentProductIndex = 0;
let currentSide = "front";
let requestItems = [];
let selectedItemId = null;
let activeDiscountCode = "";
let activeDiscountPercent = 0;
let designState = { front: [], back: [], left: [], right: [] };
let dragState = null;

const pImg = document.getElementById("product-img");
const cTitle = document.getElementById("curr-title");
const cDesc = document.getElementById("curr-desc");
const cPrice = document.getElementById("curr-price");
const dropdown = document.getElementById("product-dropdown");
const dropdownTrigger = document.getElementById("dropdown-trigger");
const optionsContainer = document.getElementById("dropdown-options-container");
const canvas = document.getElementById("canvas-container");
const layer = document.getElementById("design-layer");

document.addEventListener("DOMContentLoaded", init);

async function init(){
  bindEvents();
  try{
    supabaseClient = getSupabaseClient();
    await loadProducts();
  }catch(err){
    showWarning(err.message);
  }
  setupCanvasEvents();
}

function showWarning(msg){
  const box=document.getElementById("config-warning");
  box.textContent=msg;
  box.classList.remove("hidden");
}

function bindEvents(){
  dropdownTrigger.addEventListener("click",e=>{dropdown.classList.toggle("open");e.stopPropagation();});
  window.addEventListener("click",()=>dropdown.classList.remove("open"));
  document.getElementById("category-filter").addEventListener("change",applyCategoryFilter);
  document.getElementById("logo-loader").addEventListener("change",handleLogoUpload);
  document.getElementById("add-text-btn").addEventListener("click",function(e){ e.preventDefault(); addTextItem(); });
  document.getElementById("delete-selected-btn").addEventListener("click",deleteSelectedItem);
  document.getElementById("reset-side-btn").addEventListener("click",resetCurrentSide);
  document.getElementById("add-request-btn").addEventListener("click",addCurrentProductToRequest);
  document.getElementById("download-design-btn").addEventListener("click",downloadAllRequestDesignImages);
  document.getElementById("send-order-btn").addEventListener("click",sendOrder);
  document.getElementById("apply-discount-btn")?.addEventListener("click",applyDiscountCode);
  document.getElementById("discount-code")?.addEventListener("input",()=>{activeDiscountCode="";activeDiscountPercent=0;updateTotal();const s=document.getElementById("discount-status");if(s)s.textContent="";});
  document.getElementById("front-btn").addEventListener("click",()=>setSide("front"));
  document.getElementById("back-btn").addEventListener("click",()=>setSide("back"));
  document.getElementById("left-btn").addEventListener("click",()=>setSide("left"));
  document.getElementById("right-btn").addEventListener("click",()=>setSide("right"));
  document.getElementById("move-up").addEventListener("click",()=>nudgeSelected(0,-0.01));
  document.getElementById("move-down").addEventListener("click",()=>nudgeSelected(0,0.01));
  document.getElementById("move-left").addEventListener("click",()=>nudgeSelected(-0.01,0));
  document.getElementById("move-right").addEventListener("click",()=>nudgeSelected(0.01,0));
  document.getElementById("scale-up").addEventListener("click",()=>scaleSelected(0.02));
  document.getElementById("scale-down").addEventListener("click",()=>scaleSelected(-0.02));
  document.getElementById("rotate-left").addEventListener("click",()=>rotateSelected(-5));
  document.getElementById("rotate-right").addEventListener("click",()=>rotateSelected(5));
  document.getElementById("center-item").addEventListener("click",()=>positionSelected(0.42,0.42));
  document.getElementById("pos-chest-left").addEventListener("click",()=>positionSelected(0.34,0.25));
  document.getElementById("pos-chest-right").addEventListener("click",()=>positionSelected(0.56,0.25));
  document.getElementById("copy-to-back").addEventListener("click",copyFrontToBack);
  document.getElementById("zoom-reset").addEventListener("click",()=>{canvas.style.transform="scale(1)";});
  document.querySelectorAll("[data-zoom]").forEach(btn=>btn.addEventListener("click",()=>{canvas.style.transform="scale("+btn.dataset.zoom+")";}));
  canvas.addEventListener("click", e=>{
    if(e.target === canvas || e.target === pImg || e.target === layer){
      selectedItemId = null;
      renderDesignItems();
    }
  });
}

async function loadProducts(){
  dropdownTrigger.textContent="Produkte werden geladen...";
  const {data,error}=await supabaseClient.from("products").select("*").eq("active",true).order("id",{ascending:true});
  if(error)throw error;
  products=(data||[]).map(productFromRow);
  buildCategoryFilter();
  applyCategoryFilter();
}

function buildCategoryFilter(){
  const sel=document.getElementById("category-filter");
  const cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Alle Kategorien</option>';
  cats.forEach(c=>{const opt=document.createElement("option");opt.value=c;opt.textContent=c;sel.appendChild(opt);});
}

function applyCategoryFilter(){
  const cat=document.getElementById("category-filter").value;
  filteredProducts=products.filter(p=>!cat||p.category===cat);
  buildDropdown();
  if(filteredProducts.length)selectProduct(0);
  else{
    dropdownTrigger.textContent="Keine Produkte";
    optionsContainer.innerHTML="";
    pImg.removeAttribute("src");
    cTitle.innerHTML="<strong>Kein Produkt</strong>";
    cDesc.textContent="In dieser Kategorie gibt es noch keine Produkte.";
    cPrice.textContent="";
  }
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
  designState={front:[],back:[],left:[],right:[]};
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

function getPrintElementCount(state = designState){
  return (state.front || []).length + (state.back || []).length + (state.left || []).length + (state.right || []).length;
}

function getPrintPricePerPiece(state = designState, product = filteredProducts[currentProductIndex]){
  const fallback = Number(window.PROTEX_CONFIG?.PRINT_PRICE_PER_ELEMENT ?? window.PROTEX_CONFIG?.PRINT_PRICE_PER_SIDE ?? 5) || 0;
  const elementPrice = Number(product?.printPrice ?? fallback) || 0;
  return getPrintElementCount(state) * elementPrice;
}

function getBasePrice(product){
  return Number(String(product?.price || 0).replace(",", ".")) || 0;
}

function getDiscountPercent(product, qty){
  if(!product) return 0;
  if(qty >= 50) return Number(product.discount50 || 0) || 0;
  if(qty >= 20) return Number(product.discount20 || 0) || 0;
  return 0;
}

function getMinQty(product){
  return Number(product?.minQty || 1) || 1;
}


function getConfiguredDiscount(code){
  const cfg = window.PROTEX_CONFIG || {};
  const codes = cfg.DISCOUNT_CODES || {};
  const key = String(code || "").trim().toUpperCase();
  if(!key) return 0;
  return Number(codes[key] || 0) || 0;
}

function applyDiscountCode(){
  const input = document.getElementById("discount-code");
  const status = document.getElementById("discount-status");
  const code = String(input?.value || "").trim().toUpperCase();
  const percent = getConfiguredDiscount(code);

  if(!code){
    activeDiscountCode = "";
    activeDiscountPercent = 0;
    if(status) status.textContent = "";
    updateTotal();
    return;
  }

  if(percent > 0){
    activeDiscountCode = code;
    activeDiscountPercent = percent;
    if(input) input.value = code;
    if(status){
      status.textContent = "Rabattcode aktiv: " + code + " = " + percent + "%";
      status.style.color = "#16a34a";
      status.style.fontWeight = "800";
    }
  }else{
    activeDiscountCode = "";
    activeDiscountPercent = 0;
    if(status){
      status.textContent = "Rabattcode ungültig.";
      status.style.color = "#dc2626";
      status.style.fontWeight = "800";
    }
  }
  updateTotal();
}

function getCodeDiscountPercent(){
  return Number(activeDiscountPercent || 0) || 0;
}

function updateTotal(){
  const prod=filteredProducts[currentProductIndex];
  const qty=getQuantities().reduce((s,x)=>s+x.qty,0);
  const basePrice = getBasePrice(prod);
  const elementCount = getPrintElementCount(designState);
  const printElementPrice = Number(prod?.printPrice ?? window.PROTEX_CONFIG?.PRINT_PRICE_PER_ELEMENT ?? 5) || 0;
  const printPrice = getPrintPricePerPiece(designState, prod);
  const rawPiecePrice = basePrice + printPrice;
  const quantityDiscountPercent = getDiscountPercent(prod, qty);
  const codeDiscountPercent = getCodeDiscountPercent();
  const totalDiscountPercent = Math.min(90, quantityDiscountPercent + codeDiscountPercent);
  const discountAmount = rawPiecePrice * totalDiscountPercent / 100;
  const pricePerPiece = Math.max(0, rawPiecePrice - discountAmount);
  const total=qty*pricePerPiece;

  document.getElementById("total-box").textContent="Gesamt: "+qty+" Stück · € "+formatPrice(total);

  const detail = document.getElementById("price-detail-box");
  if(detail){
    const minQty = getMinQty(prod);
    let msg =
      "Grundpreis: € " + formatPrice(basePrice) +
      " · Druck: " + elementCount + " × € " + formatPrice(printElementPrice) +
      " = € " + formatPrice(printPrice) +
      " · Stückpreis: € " + formatPrice(pricePerPiece);

    if(quantityDiscountPercent > 0){
      msg += " · Mengenrabatt: " + quantityDiscountPercent + "%";
    }
    if(codeDiscountPercent > 0){
      msg += " · Code " + activeDiscountCode + ": " + codeDiscountPercent + "%";
    }
    if(totalDiscountPercent > 0){
      msg += " · Rabatt gesamt: " + totalDiscountPercent + "%";
    }
    if(qty > 0 && qty < minQty){
      msg += " · Mindestmenge: " + minQty + " Stück";
      detail.classList.add("warn");
    }else{
      detail.classList.remove("warn");
    }
    detail.textContent = msg;
  }
}

function setSide(side){
  const p=filteredProducts[currentProductIndex];
  if(!p)return;

  const imageBySide = {
    front: p.imgFront,
    back: p.imgBack,
    left: p.imgLeft,
    right: p.imgRight
  };

  if(side !== "front" && !imageBySide[side]){
    alert("Für diese Ansicht ist noch kein Bild im Admin hochgeladen.");
    return;
  }

  currentSide=side;
  pImg.src=imageBySide[side] || p.imgFront;

  document.getElementById("front-btn").classList.toggle("active",currentSide==="front");
  document.getElementById("back-btn").classList.toggle("active",currentSide==="back");
  document.getElementById("left-btn").classList.toggle("active",currentSide==="left");
  document.getElementById("right-btn").classList.toggle("active",currentSide==="right");

  document.getElementById("back-btn").disabled=!p.imgBack;
  document.getElementById("left-btn").disabled=!p.imgLeft;
  document.getElementById("right-btn").disabled=!p.imgRight;

  selectedItemId=null;
  renderDesignItems();
  updateTotal();
}

function addDesignItem(item){
  const items=designState[currentSide];

  // Neue Elemente starten immer sichtbar mittig am Produktbild.
  // Besonders wichtig am Handy, weil freies Ziehen dort schwieriger ist.
  const isMobile = window.innerWidth < 900;
  const startW = item.type==="image" ? (isMobile ? .24 : .18) : (isMobile ? .34 : .24);
  const startX = Math.max(.05, .5 - startW / 2);
  const startY = item.type==="text" ? .42 : .36;

  items.push({
    id: "d"+Date.now()+Math.random().toString(16).slice(2),
    type: item.type,
    src: item.src || "",
    originalName: item.originalName || "",
    mime: item.mime || "",
    text: item.text || "",
    color: item.color || "#000000",
    font: item.font || "Arial, sans-serif",
    bold: item.bold !== false,
    italic: item.italic || false,
    shadow: item.shadow || false,
    outline: item.outline || "none",
    relX: startX,
    relY: startY,
    relW: startW,
    fontSize: isMobile ? 28 : 32,
    rotation: 0
  });
  selectedItemId=items[items.length-1].id;
  renderDesignItems();
  updateTotal();

  // Am Handy kurz zur Vorschau springen, damit der Kunde den neuen Text sofort sieht.
  if(isMobile){
    document.querySelector(".editor-section")?.scrollIntoView({behavior:"smooth", block:"start"});
  }
}

function handleLogoUpload(e){
  const files=[...e.target.files].filter(file=>file.type.startsWith("image/"));
  if(!files.length)return;
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=()=>addDesignItem({
      type:"image",
      src:reader.result,
      originalName:file.name || "logo.png",
      mime:file.type || "image/png"
    });
    reader.readAsDataURL(file);
  });
  e.target.value="";
}

function addTextItem(){
  const input=document.getElementById("text-input");
  const text=(input?.value || "").trim();
  if(!text){
    alert("Bitte zuerst Text eingeben.");
    return;
  }

  addDesignItem({
    type:"text",
    text:text,
    color:document.getElementById("text-color")?.value || "#000000",
    font:document.getElementById("font-select")?.value || "Arial, sans-serif",
    bold:document.getElementById("text-bold") ? document.getElementById("text-bold").checked : true,
    italic:document.getElementById("text-italic") ? document.getElementById("text-italic").checked : false,
    shadow:document.getElementById("text-shadow") ? document.getElementById("text-shadow").checked : false,
    outline:document.getElementById("text-outline") ? document.getElementById("text-outline").value : "none"
  });
}

function deleteSelectedItem(){
  if(!selectedItemId){alert("Bitte zuerst ein Element anklicken.");return;}
  designState[currentSide]=designState[currentSide].filter(i=>i.id!==selectedItemId);
  selectedItemId=null;
  renderDesignItems();
  updateTotal();
}

function resetCurrentSide(){
  if(!confirm("Alle Designs auf dieser Seite löschen?"))return;
  designState[currentSide]=[];
  selectedItemId=null;
  renderDesignItems();
  updateTotal();
}

function renderDesignItems(){
  layer.innerHTML="";
  const rect=pImg.getBoundingClientRect();
  const canvasRect=canvas.getBoundingClientRect();
  const leftOffset=rect.left-canvasRect.left;
  const topOffset=rect.top-canvasRect.top;
  const imgW=rect.width || canvas.clientWidth;
  const imgH=rect.height || canvas.clientHeight;

  renderElementList();
  designState[currentSide].forEach(item=>{
    const el=document.createElement("div");
    el.className="design-item"+(item.id===selectedItemId?" active":"");
    el.dataset.id=item.id;
    el.style.left=(leftOffset + item.relX*imgW)+"px";
    el.style.top=(topOffset + item.relY*imgH)+"px";
    el.style.width=Math.max(40,item.relW*imgW)+"px";
    el.style.transform="rotate("+(item.rotation||0)+"deg)";

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
      span.style.fontWeight=item.bold ? "900" : "400";
      span.style.fontStyle=item.italic ? "italic" : "normal";
      span.style.textShadow=item.shadow ? "2px 2px 3px rgba(0,0,0,.35)" : "none";
      if(item.outline==="white"){
        span.style.webkitTextStroke="1px white";
        span.style.textStroke="1px white";
      }else if(item.outline==="black"){
        span.style.webkitTextStroke="1px black";
        span.style.textStroke="1px black";
      }else{
        span.style.webkitTextStroke="0";
        span.style.textStroke="0";
      }
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


function renderElementList(){
  const list=document.getElementById("element-list");
  if(!list)return;
  const items=designState[currentSide]||[];
  list.innerHTML="";
  if(!items.length){list.innerHTML='<div class="sub">Keine Elemente auf dieser Seite.</div>';return;}
  items.forEach((item,idx)=>{
    const btn=document.createElement("button");
    btn.type="button";
    btn.className=item.id===selectedItemId?"active":"";
    btn.textContent=(item.type==="image"?"Logo/Grafik ":"Text ")+(idx+1)+(item.type==="text"?": "+item.text:"");
    btn.addEventListener("click",()=>{selectedItemId=item.id;renderDesignItems();});
    list.appendChild(btn);
  });
}

function getSelectedItem(){
  if(!selectedItemId)return null;
  return (designState[currentSide]||[]).find(i=>i.id===selectedItemId)||null;
}

function nudgeSelected(dx,dy){
  const item=getSelectedItem();
  if(!item){alert("Bitte zuerst ein Element auswählen.");return;}
  item.relX=Math.max(0,Math.min(.95,item.relX+dx));
  item.relY=Math.max(0,Math.min(.95,item.relY+dy));
  renderDesignItems();
}

function scaleSelected(delta){
  const item=getSelectedItem();
  if(!item){alert("Bitte zuerst ein Element auswählen.");return;}
  item.relW=Math.max(.04,Math.min(.9,item.relW+delta));
  if(item.type==="text") item.fontSize=Math.max(12,item.fontSize+(delta*120));
  renderDesignItems();
}

function rotateSelected(delta){
  const item=getSelectedItem();
  if(!item){alert("Bitte zuerst ein Element auswählen.");return;}
  item.rotation=(item.rotation||0)+delta;
  renderDesignItems();
}

function positionSelected(x,y){
  const item=getSelectedItem();
  if(!item){alert("Bitte zuerst ein Element auswählen.");return;}
  item.relX=x; item.relY=y;
  renderDesignItems();
}

function copyFrontToBack(){
  if(!designState.front.length){alert("Auf der Vorderseite ist noch kein Design.");return;}
  designState.back=cloneState(designState.front);
  alert("Design wurde auf die Rückseite kopiert.");
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

function cloneState(obj){return JSON.parse(JSON.stringify(obj));}

function getSideLabel(side){
  if(side==="front") return "Vorderseite";
  if(side==="back") return "Rückseite";
  if(side==="left") return "Links/Ärmel";
  if(side==="right") return "Rechts/Ärmel";
  return side;
}

function addCurrentProductToRequest(){
  const prod=filteredProducts[currentProductIndex];
  if(!prod){alert("Bitte Produkt wählen.");return;}
  const quantities=getQuantities();
  const totalQty = quantities.reduce((s,q)=>s+q.qty,0);
  const minQty = getMinQty(prod);
  if(!quantities.length&&!confirm("Keine Menge ausgewählt. Trotzdem hinzufügen?"))return;
  if(totalQty > 0 && totalQty < minQty){
    alert("Mindestbestellmenge für dieses Produkt: " + minQty + " Stück.");
    return;
  }

  const savedDesigns = cloneState(designState);
  const basePrice = getBasePrice(prod);
  const printPrice = getPrintPricePerPiece(savedDesigns, prod);
  const totalQtyForDiscount = quantities.reduce((s,q)=>s+q.qty,0);
  const quantityDiscountPercent = getDiscountPercent(prod, totalQtyForDiscount);
  const codeDiscountPercent = getCodeDiscountPercent();
  const totalDiscountPercent = Math.min(90, quantityDiscountPercent + codeDiscountPercent);
  const rawPiecePrice = basePrice + printPrice;
  const pricePerPiece = Math.max(0, rawPiecePrice - (rawPiecePrice * totalDiscountPercent / 100));
  requestItems.push({
    title:prod.title,
    price:prod.price,
    basePrice,
    printPrice,
    printElementPrice: Number(prod.printPrice || 0),
    printElementCount: getPrintElementCount(savedDesigns),
    quantityDiscountPercent,
    codeDiscountPercent,
    discountCode: activeDiscountCode,
    discountPercent: totalDiscountPercent,
    pricePerPiece,
    desc:prod.desc||"",
    category:prod.category||"",
    quantities,
    productImages:{front:prod.imgFront,back:prod.imgBack,left:prod.imgLeft,right:prod.imgRight},
    designs:savedDesigns
  });
  renderRequestList();
}

function removeRequestItem(index){requestItems.splice(index,1);renderRequestList();}

function designSummary(designs){
  const front=(designs.front||[]).length;
  const back=(designs.back||[]).length;
  const left=(designs.left||[]).length;
  const right=(designs.right||[]).length;
  return "Vorne: "+front+", Hinten: "+back+", Links: "+left+", Rechts: "+right+" Element(e)";
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
    info.querySelector("span").textContent=qty+" · "+designSummary(item.designs)+" · € "+formatPrice(item.pricePerPiece || item.price)+" / Stück";
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
    const imageUrl =
      side==="back" && item.productImages.back ? item.productImages.back :
      side==="left" && item.productImages.left ? item.productImages.left :
      side==="right" && item.productImages.right ? item.productImages.right :
      item.productImages.front;
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
      items.forEach(d=>{
        chain=chain.then(()=>drawDesign(ctx,canvasExport,d));
      });
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
        ctx.save();
        ctx.translate(x+w/2,y+(w*ratio)/2);
        ctx.rotate(((d.rotation||0)*Math.PI)/180);
        ctx.drawImage(img,-w/2,-(w*ratio)/2,w,w*ratio);
        ctx.restore();
        resolve();
      };
      img.onerror=resolve;
      img.src=d.src;
    }else if(d.type==="text"){
      const fontSize=Math.max(20,(d.fontSize||32)/560*canvas.height);
      const weight=d.bold ? "900" : "400";
      const italic=d.italic ? "italic " : "";
      ctx.font=italic+weight+" "+fontSize+"px "+(d.font||"Arial, sans-serif");
      ctx.textBaseline="top";
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(((d.rotation||0)*Math.PI)/180);

      if(d.shadow){
        ctx.shadowColor="rgba(0,0,0,.35)";
        ctx.shadowBlur=4;
        ctx.shadowOffsetX=3;
        ctx.shadowOffsetY=3;
      }

      if(d.outline==="white" || d.outline==="black"){
        ctx.lineWidth=Math.max(2, fontSize*0.08);
        ctx.strokeStyle=d.outline==="white" ? "#ffffff" : "#000000";
        ctx.strokeText(d.text||"",0,0);
      }

      ctx.fillStyle=d.color||"#000";
      ctx.fillText(d.text||"",0,0);
      ctx.restore();
      resolve();
    }else resolve();
  });
}

async function downloadAllRequestDesignImages(){
  if(!requestItems.length){alert("Bitte zuerst ein Produkt zur Anfrage hinzufügen.");return;}
  let fileIndex=1;
  for(const item of requestItems){
    for(const side of ["front","back","left","right"]){
      if(side==="back" && !item.productImages.back && !(item.designs.back||[]).length) continue;
      if(side==="left" && !item.productImages.left && !(item.designs.left||[]).length) continue;
      if(side==="right" && !item.productImages.right && !(item.designs.right||[]).length) continue;
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


function collectDesignDetails(item){
  const lines = [];
  ["front","back","left","right"].forEach(side=>{
    const sideItems = item.designs?.[side] || [];
    if(!sideItems.length) return;
    lines.push(getSideLabel(side) + ":");
    sideItems.forEach((d,idx)=>{
      if(d.type==="text"){
        lines.push("  - Text " + (idx+1) + ": " + (d.text || "") + " | Schrift: " + (d.font || "") + " | Farbe: " + (d.color || "") + " | Kontur: " + (d.outline || "none") + " | Schatten: " + (d.shadow ? "Ja" : "Nein"));
      }else{
        lines.push("  - Logo/Grafik " + (idx+1) + ": " + (d.originalName || "hochgeladene Grafik"));
      }
    });
  });
  return lines.join("\\n");
}

function collectOriginalLogoFiles(){
  const result = [];
  requestItems.forEach(item=>{
    ["front","back","left","right"].forEach(side=>{
      (item.designs?.[side] || []).forEach(d=>{
        if(d.type==="image" && d.src && d.src.startsWith("data:")){
          result.push({
            name:d.originalName || ("logo-"+(result.length+1)+".png"),
            mime:d.mime || "image/png",
            dataUrl:d.src
          });
        }
      });
    });
  });
  return result;
}

function dataUrlToBlob(dataUrl){
  const parts = dataUrl.split(",");
  const mime = (parts[0].match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
  const binary = atob(parts[1] || "");
  const arr = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) arr[i]=binary.charCodeAt(i);
  return new Blob([arr], {type:mime});
}

async function createOrderPdfBlob(orderNumber, mailText){
  if(!window.jspdf || !window.jspdf.jsPDF){
    return new Blob([mailText], {type:"text/plain;charset=utf-8"});
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"mm", format:"a4"});
  const margin = 12;
  let y = 14;

  function line(text, size=10, bold=false){
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const rows = doc.splitTextToSize(String(text || ""), 185);
    rows.forEach(r=>{
      if(y > 282){ doc.addPage(); y = 14; }
      doc.text(r, margin, y);
      y += 6;
    });
  }

  line("Protex Studio - Auftragsblatt", 16, true);
  line("Auftragsnummer: " + orderNumber, 11, true);
  line("Datum: " + new Date().toLocaleString("de-AT"), 10, false);
  line(" ");

  const clientEmail = document.getElementById("client-email")?.value?.trim() || "-";
  const notes = document.getElementById("client-notes")?.value?.trim() || "-";
  line("Kunde / Kontakt", 12, true);
  line("E-Mail: " + clientEmail);
  line("Anmerkung: " + notes);
  line(" ");

  requestItems.forEach((item, index)=>{
    const qtyText = item.quantities.map(q=>q.size+": "+q.qty).join(", ") || "-";
    const totalQty = item.quantities.reduce((s,q)=>s+q.qty,0);
    const totalPrice = totalQty * Number(item.pricePerPiece || 0);

    line((index+1)+". "+item.title, 12, true);
    line("Kategorie: " + (item.category || "-"));
    line("Größen/Stück: " + qtyText);
    line("Grundpreis: EUR " + formatPrice(item.basePrice || 0));
    line("Druckelemente: " + (item.printElementCount || 0) + " x EUR " + formatPrice(item.printElementPrice || 0));
    line("Druckkosten pro Stück: EUR " + formatPrice(item.printPrice || 0));
    line("Rabattcode: " + (item.discountCode || "-") + " (" + (item.codeDiscountPercent || 0) + "%)");
    line("Rabatt gesamt: " + (item.discountPercent || 0) + "%");
    line("Einzelpreis gesamt: EUR " + formatPrice(item.pricePerPiece || 0));
    line("Gesamt: EUR " + formatPrice(totalPrice));
    line("Designs:");
    line(collectDesignDetails(item) || "-");
    line(" ");
  });

  return doc.output("blob");
}

function createOrderNumber(){
  const d = new Date();
  const y = d.getFullYear();
  const stamp = String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0") + "-" + String(d.getHours()).padStart(2,"0") + String(d.getMinutes()).padStart(2,"0") + String(d.getSeconds()).padStart(2,"0");
  return "PS-" + y + "-" + stamp;
}

async function sendOrder(){
  const clientEmail=document.getElementById("client-email").value.trim(),status=document.getElementById("send-status");
  if(!clientEmail){alert("Bitte E-Mail angeben.");return;}
  if(!requestItems.length){alert("Bitte zuerst mindestens ein Produkt hinzufügen.");return;}
  const mailText=buildMailText(),sendBtn=document.getElementById("send-order-btn");
  sendBtn.disabled=true;sendBtn.textContent="Wird gesendet...";status.textContent="Layouts, PDF und Originaldateien werden vorbereitet...";
  try{
    const formData=new FormData();
    formData.append("form-name","design-anfrage");
    formData.append("kunde_email",clientEmail);
    formData.append("nachricht",mailText);
    const orderNumber = createOrderNumber();
    const pdfBlob = await createOrderPdfBlob(orderNumber, mailText);
    formData.append("auftrag_pdf", pdfBlob, orderNumber + "-auftrag.pdf");

    const originals = collectOriginalLogoFiles().slice(0,5);
    originals.forEach((file, idx)=>{
      formData.append("original_logo_"+(idx+1), dataUrlToBlob(file.dataUrl), file.name || ("logo-"+(idx+1)+".png"));
    });
    let fileIndex=1;
    for(const item of requestItems){
      for(const side of ["front","back","left","right"]){
        if(fileIndex>5) break;
        if(side==="back" && !item.productImages.back && !(item.designs.back||[]).length) continue;
      if(side==="left" && !item.productImages.left && !(item.designs.left||[]).length) continue;
      if(side==="right" && !item.productImages.right && !(item.designs.right||[]).length) continue;
        const blob=await createSideBlob(item,side);
        formData.append("layout_"+fileIndex,blob,"layout-"+fileIndex+"-"+slugify(item.title)+"-"+side+".jpg");
        fileIndex++;
      }
      if(fileIndex>5) break;
    }
    const response=await fetch("/",{method:"POST",body:formData});
    if(!response.ok)throw new Error("Netlify Antwort: "+response.status+" "+response.statusText);
    status.textContent="Danke! Anfrage wurde gesendet.";
    alert("Anfrage wurde gesendet.");
  }catch(error){
    console.error(error);
    status.textContent="Fehler: "+error.message;
    alert("Direktversand fehlgeschlagen: "+error.message);
  }finally{
    sendBtn.disabled=false;sendBtn.textContent="Anfrage direkt senden";
  }
}
