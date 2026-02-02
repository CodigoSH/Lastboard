var H=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var j=`:host {
    display: block;
}

.paper {
    /* Neutralized to allow components.css to control styling via Host */
    background-color: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    color: inherit;
    box-sizing: border-box;
    height: 100%;
}`;class k extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${j}</style>
            ${H()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",k);var z=`:host {
    display: inline-block;
    width: 100%;
}

.btn {
    width: 100%;
    height: 38px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    outline: none;
    box-sizing: border-box;
    padding: 0 16px;
}

/* Variant: Ghost (Default) */
.btn--ghost {
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--border);
}

.btn--ghost:hover {
    color: var(--text-main);
    border-color: var(--border-bright);
    background: var(--panel);
}

/* Variant: Primary */
.btn--primary {
    background: var(--surface-solid);
    color: var(--accent);
    border: 1px solid var(--accent);
}

.btn--primary:hover {
    background: var(--surface-solid);
    /* Maintain solid background */
    box-shadow: 0 0 12px rgba(0, 120, 212, 0.2);
    /* Using primary blue var shade */
    border-color: var(--accent);
}

.btn:active {
    transform: translateY(1px);
}`;class w extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(i){if(this.getAttribute("type")==="submit"){let o=this.closest("form");if(o)if(o.requestSubmit)o.requestSubmit();else o.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(i){this._loading=i,this.render()}get loading(){return this._loading}render(){let i=this.getAttribute("variant")||"ghost",o=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${z}</style>
            <button class="btn btn--${i}" ${this._loading?"disabled":""}>
                ${o}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",w);var x=({src:i,initials:o,alt:t})=>`
    <div class="avatar" title="${t}">
        ${i?`<img src="${i}" alt="${t}" class="avatar__img">`:`<span class="avatar__initials">${o}</span>`}
    </div>
`;var O=`:host {
    display: block;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
}

.avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 1px solid var(--border);
    overflow: hidden;
    background-color: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-main);
    font-weight: 600;
    font-size: inherit;
    transition: border-color 150ms ease;
    box-sizing: border-box;
}

.avatar:hover {
    border-color: var(--accent);
}

.avatar__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar__initials {
    user-select: none;
}`;class u extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(i,o,t){if(o!==t)this.render()}render(){let i=this.getAttribute("src"),o=this.getAttribute("initials")||"??",t=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${O}</style>
            ${x({src:i||void 0,initials:o,alt:t})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",u);var n=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class _{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let i=localStorage.getItem("csh_lang"),o=navigator.language.split("-")[0],t="en";if(i&&n.find((h)=>h.code===i))t=i;else if(n.find((h)=>h.code===o))t=o;if(t!=="en")await this.loadLocale(t);this.currentLanguage=t,this.notifyListeners()}static getInstance(){if(!_.instance)_.instance=new _;return _.instance}getLocale(){return{...n.find((o)=>o.code===this.currentLanguage)||n[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return n}async loadLocale(i){if(this.cache.has(i))return;try{let o=await fetch(`/locales/${i}.json?v=${new Date().getTime()}`);if(!o.ok)throw Error(`Failed to load locale ${i}`);let t=await o.json();this.cache.set(i,t)}catch(o){console.error(o)}}async setLanguage(i){if(n.find((o)=>o.code===i))await this.loadLocale(i),this.currentLanguage=i,localStorage.setItem("csh_lang",i),this.notifyListeners();else console.warn(`[I18n] Language ${i} not supported`)}t(i,o){let t=this.cache.get(this.currentLanguage),h=this.cache.get("en"),l=t?.[i];if(!l&&h)l=h[i];if(!l)return i;if(o)Object.keys(o).forEach((g)=>{l=l.replace(`{${g}}`,o[g])});return l}subscribe(i){return this.listeners.push(i),i(this.getLocale()),()=>{this.listeners=this.listeners.filter((o)=>o!==i)}}notifyListeners(){let i=this.getLocale();this.listeners.forEach((o)=>o(i))}async ensureInitialized(){return this.initialized}}var d=_.getInstance();async function y(i){try{await d.ensureInitialized(),await i()}catch(o){console.error("[Bootstrap] Critical failure:",o),document.body.innerHTML=`
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                background: #111; 
                color: #fff; 
                font-family: sans-serif;
                text-align: center;
            ">
                <h1 style="color: #fa5252;">System Error</h1>
                <p>Failed to initialize application resources.</p>
                <p style="opacity: 0.7; font-size: 0.9em;">Check console for details.</p>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    cursor: pointer;
                    border-radius: 4px;
                ">Reload</button>
            </div>
        `}}class p{static STORAGE_KEY="kashboard_theme";static CLASS_NAME="dark-mode";static init(){let i=localStorage.getItem(this.STORAGE_KEY);if(i==="dark")this.enableDark();else if(i==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(i,o,t){let h="";if(t){let l=new Date;l.setTime(l.getTime()+t*24*60*60*1000),h="; expires="+l.toUTCString()}document.cookie=i+"="+(o||"")+h+"; path=/"}}y(async()=>{let i=1,o=3,t="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png",h=document.querySelector(".setup-container"),l=document.getElementById("setupForm"),g=document.getElementById("nextBtn"),b=document.getElementById("backBtn"),A=document.getElementById("feedback"),E=document.getElementById("language"),D=document.getElementById("username"),N=document.getElementById("password"),V=document.getElementById("confirmPassword"),c={light:document.getElementById("themeLight"),dark:document.getElementById("themeDark")},R=d.getAvailableLocales(),C=navigator.language.split("-")[0];if(!R.find((a)=>a.code===C))C="en";if(E)R.forEach((a)=>{let r=document.createElement("option");if(r.value=a.code,r.textContent=`${a.flag} ${a.name}`,a.code===C)r.selected=!0;E.appendChild(r)}),d.setLanguage(C),E.addEventListener("change",(a)=>{let r=a.target.value;d.setLanguage(r),G()});if(p.init(),p.isDark())c.dark?.classList.add("selected"),c.light?.classList.remove("selected");else c.light?.classList.add("selected"),c.dark?.classList.remove("selected");function U(a){if(Object.entries(c).forEach(([r,s])=>{if(s)r===a?s.classList.add("selected"):s.classList.remove("selected")}),a==="dark")p.enableDark();else p.enableLight()}Object.entries(c).forEach(([a,r])=>{if(r)r.addEventListener("click",()=>U(a))});let v=["https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/pi-hole.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png"],$=document.getElementById("avatarInput"),Y=document.getElementById("avatarTrigger"),q=document.getElementById("avatarPreview"),F=document.getElementById("avatarUrl");if(Y&&$)Y.addEventListener("click",()=>$.click()),$.addEventListener("change",(a)=>{let r=a.target.files?.[0];if(r){let s=new FileReader;s.onload=(f)=>{let m=f.target?.result;if(m)q.setAttribute("src",m),F.value=m,t=m},s.readAsDataURL(r)}});let G=()=>{let a=(s,f)=>{let m=document.getElementById(s);if(m)m.textContent=d.t(f)};a("pageSubtitle","setup.subtitle");let r=(s,f)=>{let m=document.querySelector(`label[for="${s}"]`);if(m)m.textContent=d.t(f)};if(r("language","settings.language"),r("username","setup.root_user"),r("password","settings.new_password"),r("confirmPassword","settings.confirm_password"),a("lblInterfaceTheme","setup.interface_theme"),a("lblThemeLight","settings.light"),a("lblThemeDark","settings.dark"),a("summaryKeyLang","settings.language"),a("summaryKeyTheme","settings.theme"),a("summaryKeyAdmin","setup.summary_admin"),i===3)g.textContent=d.t("setup.create_admin");else g.textContent=d.t("general.next");if(b)b.textContent=d.t("general.back");a("changeImageText","action.change_image"),a("readyMsg","setup.ready_msg")};d.subscribe(G),G();function K(){let a=document.getElementById("progressFill");if(a)a.style.width=`${(i-1)/(o-1)*100}%`;if(document.querySelectorAll(".step-dot").forEach((s)=>{let f=parseInt(s.getAttribute("data-step")||"0");if(s.classList.remove("active","completed"),f===i)s.classList.add("active");if(f<i)s.classList.add("completed")}),document.querySelectorAll(".wizard-step").forEach((s)=>s.classList.remove("active")),document.getElementById(`step${i}`)?.classList.add("active"),b)b.style.display=i===1?"none":"block";b.textContent=d.t("general.back");let r=d.t("general.next");if(g.textContent=i===o?d.t("setup.create_admin"):r,i===3){document.getElementById("summaryLang").textContent=E.options[E.selectedIndex].text;let s=d.t("settings.system")||"System";if(c.light?.classList.contains("selected"))s=d.t("settings.light");if(c.dark?.classList.contains("selected"))s=d.t("settings.dark");document.getElementById("summaryTheme").textContent=s,document.getElementById("summaryUser").textContent=D.value}A.style.display="none",g.removeAttribute("disabled")}function J(){if(A.style.display="none",i===1)return!0;if(i===2){let a=D.value.trim(),r=N.value,s=V.value;if(a.length<3)return M(d.t("setup.error_username")),!1;if(r.length<8)return M(d.t("setup.error_password")),!1;if(r!==s)return M(d.t("notifier.password_mismatch")||"Passwords do not match"),!1;return!0}return!0}function M(a){A.style.display="block",A.textContent=a}g.addEventListener("click",async()=>{if(!J())return;if(i<o)i++,K();else await Q()}),b.addEventListener("click",()=>{if(i>1)i--,K()}),document.addEventListener("keydown",(a)=>{if(a.key==="Enter")a.preventDefault(),g.click()});async function Q(){g.textContent=d.t("setup.creating"),g.setAttribute("disabled","true");let a="dark";if(c.light?.classList.contains("selected"))a="light";if(c.dark?.classList.contains("selected"))a="dark";let r={username:D.value.trim(),password:N.value,language:E.value,theme:a,avatarUrl:t};try{let s=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});if(s.ok)localStorage.setItem("csh_lang",r.language),g.textContent=d.t("setup.welcome_admin"),g.style.backgroundColor="var(--accent-alt, #00f5a0)",setTimeout(()=>window.location.href="/",1000);else{let f=await s.text();M(`${d.t("setup.failed")}: ${f}`),g.removeAttribute("disabled"),g.textContent=d.t("setup.create_admin")}}catch(s){console.error(s),M(d.t("setup.error_connection")),g.removeAttribute("disabled")}}requestAnimationFrame(()=>h.style.opacity="1")});
