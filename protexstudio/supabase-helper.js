function getSupabaseClient(){
  const cfg=window.PROTEX_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_KEY||cfg.SUPABASE_KEY.includes("HIER_")) throw new Error("Supabase Konfiguration fehlt. Bitte config.js bearbeiten.");
  return window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);
}
function productFromRow(row){return{id:row.id,title:row.name||"",desc:row.description||"",price:row.price||"",category:row.category||"",sizes:splitList(row.sizes||"S,M,L,XL,XXL"),imgFront:row.image||"",imgBack:row.image_back||"",imgLeftSleeve:row.image_left_sleeve||"",imgRightSleeve:row.image_right_sleeve||"",active:row.active!==false};}
function rowFromProduct(product){return{name:product.title,description:product.desc||"",price:String(product.price||""),category:product.category||"",image:product.imgFront||"",image_back:product.imgBack||"",image_left_sleeve:product.imgLeftSleeve||"",image_right_sleeve:product.imgRightSleeve||"",sizes:(product.sizes||[]).join(","),active:product.active!==false};}
function splitList(str){return String(str||"").split(/[|,]/).map(s=>s.trim()).filter(Boolean);}
function formatPrice(value){const n=Number(String(value).replace(",","."));return Number.isFinite(n)?n.toFixed(2):"0.00";}
function slugify(text){return String(text||"produkt").toLowerCase().replace(/[ä]/g,"ae").replace(/[ö]/g,"oe").replace(/[ü]/g,"ue").replace(/[ß]/g,"ss").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"produkt";}
