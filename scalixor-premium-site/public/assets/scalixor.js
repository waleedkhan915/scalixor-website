const body=document.body;
const toggle=document.querySelector("[data-theme]");
const menu=document.querySelector(".menu");
const nav=document.querySelector(".navlinks");
const saved=localStorage.getItem("scalixor-theme");
if(saved==="light") body.classList.add("light");
function setTheme(){
  body.classList.toggle("light");
  localStorage.setItem("scalixor-theme",body.classList.contains("light")?"light":"dark");
  if(toggle) toggle.textContent=body.classList.contains("light")?"☾":"☼";
}
if(toggle){toggle.textContent=body.classList.contains("light")?"☾":"☼";toggle.addEventListener("click",setTheme)}
if(menu)menu.addEventListener("click",()=>{nav.classList.toggle("open");menu.textContent=nav.classList.contains("open")?"×":"☰"});
document.querySelectorAll(".navlinks a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("show");io.unobserve(e.target)}}),{threshold:.08});
document.querySelectorAll(".reveal").forEach(x=>io.observe(x));
document.querySelectorAll("[data-year]").forEach(x=>x.textContent=new Date().getFullYear());
const header=document.querySelector("header");
window.addEventListener("scroll",()=>header&&header.classList.toggle("scrolled",scrollY>12),{passive:true});
document.querySelectorAll("[data-counter]").forEach(el=>{
  const target=Number(el.dataset.counter)||0; let done=false;
  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&!done){done=true;let n=0;const step=Math.max(1,Math.ceil(target/35));const t=setInterval(()=>{n=Math.min(target,n+step);el.textContent=n+(el.dataset.suffix||"");if(n>=target)clearInterval(t)},28);obs.disconnect()}}));
  obs.observe(el);
});

// Visitor-local header status: timezone first, geolocation when permitted, IP fallback otherwise.
const statusEls=document.querySelectorAll("[data-local-status]");
const weatherCode={0:["☀️","Clear"],1:["🌤️","Mostly clear"],2:["⛅","Partly cloudy"],3:["☁️","Cloudy"],45:["🌫️","Fog"],48:["🌫️","Fog"],51:["🌦️","Drizzle"],53:["🌦️","Drizzle"],55:["🌧️","Drizzle"],56:["🌧️","Freezing drizzle"],57:["🌧️","Freezing drizzle"],61:["🌦️","Rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],66:["🌧️","Freezing rain"],67:["🌧️","Freezing rain"],71:["🌨️","Snow"],73:["🌨️","Snow"],75:["❄️","Heavy snow"],77:["❄️","Snow grains"],80:["🌦️","Showers"],81:["🌧️","Showers"],82:["⛈️","Heavy showers"],85:["🌨️","Snow showers"],86:["🌨️","Heavy snow showers"],95:["⛈️","Thunderstorm"],96:["⛈️","Thunderstorm"],99:["⛈️","Thunderstorm"]};
const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"Local time";
const tzLabels={"Asia/Karachi":"Pakistan","Asia/Calcutta":"India","Asia/Kolkata":"India","Europe/London":"United Kingdom","Europe/Dublin":"Ireland","America/New_York":"New York","America/Los_Angeles":"Los Angeles","America/Chicago":"Chicago","America/Denver":"Denver","Australia/Sydney":"Sydney","Asia/Dubai":"Dubai","Asia/Riyadh":"Riyadh","Asia/Singapore":"Singapore"};
let visitor={lat:null,lon:null,city:tzLabels[tz]||tz.split("/").pop().replaceAll("_"," "),country:""};
let weatherState={temp:null,icon:"◌"};
function setStatus(extra={}){
  const now=new Date();
  const time=new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:tz}).format(now);
  const date=new Intl.DateTimeFormat(undefined,{day:"2-digit",month:"short",timeZone:tz}).format(now);
  const place=extra.city||visitor.city||"Local";
  if(extra.temp!=null) weatherState.temp=extra.temp;
  if(extra.icon) weatherState.icon=extra.icon;
  const temp=weatherState.temp!=null?`${Math.round(weatherState.temp)}°C`:"--°";
  const icon=weatherState.icon||"◌";
  statusEls.forEach(el=>{el.innerHTML=`<span class="status-dot"></span><span class="status-main">${place}<span>·</span>${time}<span>·</span>${date}</span><span class="status-weather">${icon} ${temp}</span>`;el.title=`Local time and weather for ${place}. Timezone: ${tz}.`});
}
setStatus();
async function getWeather(lat,lon){
  try{
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,weather_code&timezone=auto`,{cache:"no-store"});
    if(!r.ok) throw new Error("weather");
    const d=await r.json();
    const code=d.current?.weather_code; const meta=weatherCode[code]||["🌡️","Weather"];
    setStatus({temp:d.current?.temperature_2m,icon:meta[0]});
  }catch(e){ setStatus(); }
}
async function reverseGeocode(lat,lon){
  try{
    const r=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,{cache:"no-store"});
    if(!r.ok) throw new Error("geo");
    const d=await r.json();
    const city=d.city||d.locality||d.principalSubdivision||d.countryName;
    if(city) visitor.city=city;
  }catch(e){}
}
async function useLocation(lat,lon){
  visitor.lat=lat;visitor.lon=lon;
  await Promise.all([reverseGeocode(lat,lon),getWeather(lat,lon)]);
  setStatus();
}
function ipFallback(){
  fetch("https://ipapi.co/json/",{cache:"no-store"}).then(r=>r.json()).then(d=>{
    if(d.latitude&&d.longitude){visitor.city=d.city||d.region||visitor.city;return useLocation(Number(d.latitude),Number(d.longitude));}
  }).catch(()=>{});
}
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(p=>useLocation(p.coords.latitude,p.coords.longitude),()=>ipFallback(),{enableHighAccuracy:false,timeout:7000,maximumAge:900000});
}else ipFallback();
setInterval(()=>setStatus(),30000);


// Global WhatsApp click-to-chat button — shown on every page.
(function addWhatsAppButton(){
  if(document.querySelector('.whatsapp-float')) return;
  const number='923279842198';
  const message='Hi Scalixor, I would like to know more about your services.';
  const href=`https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const a=document.createElement('a');
  a.className='whatsapp-float';
  a.href=href;
  a.target='_blank';
  a.rel='noopener noreferrer';
  a.setAttribute('aria-label','Chat with Scalixor on WhatsApp');
  a.innerHTML=`<span class="wa-label">Chat with us on WhatsApp</span><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.11 17.21c-.27-.14-1.59-.78-1.84-.87-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.15-1.33-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.63 1.11 2.81c.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.56.57.65.21 1.24.18 1.71.11.52-.08 1.59-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z"/><path d="M16.02 3.2c-7.07 0-12.81 5.73-12.81 12.79 0 2.25.59 4.44 1.72 6.37L3.2 28.8l6.61-1.73a12.8 12.8 0 0 0 6.2 1.58h.01c7.06 0 12.8-5.74 12.8-12.8S23.08 3.2 16.02 3.2zm0 23.26h-.01a10.45 10.45 0 0 1-5.32-1.45l-.38-.23-3.92 1.03 1.05-3.82-.25-.39a10.43 10.43 0 1 1 8.83 4.86z"/></svg>`;
  document.body.appendChild(a);
})();
