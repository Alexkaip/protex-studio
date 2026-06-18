function getSupabaseClient(){
  const cfg=window.PROTEX_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_KEY||cfg.SUPABASE_KEY.includes("HIER_")) throw new Error("Supabase Konfiguration fehlt. Bitte config.js bearbeiten.");
  return window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_KEY);
}
function productFromRow(row){return{
  id:row.id,
  title:row.name||"",
  desc:row.description||"",
  price:row.price||"",
  category:row.category||"",
  sizes:splitList(row.sizes||"S,M,L,XL,XXL"),
  imgFront:row.image||"",
  imgBack:row.image_back||"",
  imgLeft:row.image_left||"",
  imgRight:row.image_right||"",
  active:row.active!==false,
  printPrice:Number(row.print_price_element ?? window.PROTEX_CONFIG?.PRINT_PRICE_PER_ELEMENT ?? window.PROTEX_CONFIG?.PRINT_PRICE_PER_SIDE ?? 5) || 0,
  minQty:Number(row.min_qty ?? 1) || 1,
  discount20:Number(row.discount_20 ?? 0) || 0,
  discount50:Number(row.discount_50 ?? 0) || 0
};}
function rowFromProduct(product){return{
  name:product.title,
  description:product.desc||"",
  price:String(product.price||""),
  category:product.category||"",
  image:product.imgFront||"",
  image_back:product.imgBack||"",
  image_left:product.imgLeft||"",
  image_right:product.imgRight||"",
  sizes:(product.sizes||[]).join(","),
  active:product.active!==false,
  print_price_element:Number(product.printPrice ?? 5) || 0,
  min_qty:Number(product.minQty ?? 1) || 1,
  discount_20:Number(product.discount20 ?? 0) || 0,
  discount_50:Number(product.discount50 ?? 0) || 0
};}
function splitList(str){return String(str||"").split(/[|,]/).map(s=>s.trim()).filter(Boolean);}
function formatPrice(value){const n=Number(String(value).replace(",","."));return Number.isFinite(n)?n.toFixed(2):"0.00";}
function slugify(text){return String(text||"produkt").toLowerCase().replace(/[ä]/g,"ae").replace(/[ö]/g,"oe").replace(/[ü]/g,"ue").replace(/[ß]/g,"ss").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50)||"produkt";}
