var R=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var Y=`:host {
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
}`;class K extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${Y}</style>
            ${R()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",K);var H=`:host {
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
}`;class j extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(i){if(this.getAttribute("type")==="submit"){let o=this.closest("form");if(o)if(o.requestSubmit)o.requestSubmit();else o.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(i){this._loading=i,this.render()}get loading(){return this._loading}render(){let i=this.getAttribute("variant")||"ghost",o=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${H}</style>
            <button class="btn btn--${i}" ${this._loading?"disabled":""}>
                ${o}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",j);var y=({src:i,initials:o,alt:d})=>`
    <div class="avatar" title="${d}">
        ${i?`<img src="${i}" alt="${d}" class="avatar__img">`:`<span class="avatar__initials">${o}</span>`}
    </div>
`;var z=`:host {
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
}`;class w extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(i,o,d){if(o!==d)this.render()}render(){let i=this.getAttribute("src"),o=this.getAttribute("initials")||"??",d=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${z}</style>
            ${y({src:i||void 0,initials:o,alt:d})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",w);var n=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class E{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let i=localStorage.getItem("csh_lang"),o=navigator.language.split("-")[0],d="en";if(i&&n.find((l)=>l.code===i))d=i;else if(n.find((l)=>l.code===o))d=o;if(d!=="en")await this.loadLocale(d);this.currentLanguage=d,this.notifyListeners()}static getInstance(){if(!E.instance)E.instance=new E;return E.instance}getLocale(){return{...n.find((o)=>o.code===this.currentLanguage)||n[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return n}async loadLocale(i){if(this.cache.has(i))return;try{let o=await fetch(`/locales/${i}.json?v=${new Date().getTime()}`);if(!o.ok)throw Error(`Failed to load locale ${i}`);let d=await o.json();this.cache.set(i,d)}catch(o){console.error(o)}}async setLanguage(i){if(n.find((o)=>o.code===i))await this.loadLocale(i),this.currentLanguage=i,localStorage.setItem("csh_lang",i),this.notifyListeners();else console.warn(`[I18n] Language ${i} not supported`)}t(i,o){let d=this.cache.get(this.currentLanguage),l=this.cache.get("en"),h=d?.[i];if(!h&&l)h=l[i];if(!h)return i;if(o)Object.keys(o).forEach((g)=>{h=h.replace(`{${g}}`,o[g])});return h}subscribe(i){return this.listeners.push(i),i(this.getLocale()),()=>{this.listeners=this.listeners.filter((o)=>o!==i)}}notifyListeners(){let i=this.getLocale();this.listeners.forEach((o)=>o(i))}async ensureInitialized(){return this.initialized}}var r=E.getInstance();async function O(i){try{await r.ensureInitialized(),await i()}catch(o){console.error("[Bootstrap] Critical failure:",o),document.body.innerHTML=`
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
        `}}class _{static STORAGE_KEY="kashboard_theme";static CLASS_NAME="dark-mode";static init(){let i=localStorage.getItem(this.STORAGE_KEY);if(i==="dark")this.enableDark();else if(i==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(i,o,d){let l="";if(d){let h=new Date;h.setTime(h.getTime()+d*24*60*60*1000),l="; expires="+h.toUTCString()}document.cookie=i+"="+(o||"")+l+"; path=/"}}O(async()=>{let i=1,o=3,d="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png",l=document.querySelector(".setup-container"),h=document.getElementById("setupForm"),g=document.getElementById("nextBtn"),p=document.getElementById("backBtn"),A=document.getElementById("feedback"),b=document.getElementById("language"),e=document.getElementById("username"),x=document.getElementById("password"),u=document.getElementById("confirmPassword"),c={light:document.getElementById("themeLight"),dark:document.getElementById("themeDark")},G=r.getAvailableLocales(),C=navigator.language.split("-")[0];if(!G.find((s)=>s.code===C))C="en";if(b)G.forEach((s)=>{let t=document.createElement("option");if(t.value=s.code,t.textContent=`${s.flag} ${s.name}`,s.code===C)t.selected=!0;b.appendChild(t)}),r.setLanguage(C),b.addEventListener("change",(s)=>{let t=s.target.value;r.setLanguage(t),$()});if(_.init(),_.isDark())c.dark?.classList.add("selected"),c.light?.classList.remove("selected");else c.light?.classList.add("selected"),c.dark?.classList.remove("selected");function V(s){if(Object.entries(c).forEach(([t,a])=>{if(a)t===s?a.classList.add("selected"):a.classList.remove("selected")}),s==="dark")_.enableDark();else _.enableLight()}Object.entries(c).forEach(([s,t])=>{if(t)t.addEventListener("click",()=>V(s))});let T=["https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/pi-hole.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png"],D=document.getElementById("avatarInput"),k=document.getElementById("avatarTrigger"),U=document.getElementById("avatarPreview"),q=document.getElementById("avatarUrl");if(k&&D)k.addEventListener("click",()=>D.click()),D.addEventListener("change",(s)=>{let t=s.target.files?.[0];if(t){let a=new FileReader;a.onload=(f)=>{let m=f.target?.result;if(m)U.setAttribute("src",m),q.value=m,d=m},a.readAsDataURL(t)}});let $=()=>{document.getElementById("pageTitle").textContent=r.t("app.title"),document.getElementById("pageSubtitle").textContent=r.t("setup.subtitle");let s=document.querySelectorAll("label"),t=(a,f)=>{let m=document.querySelector(`label[for="${a}"]`);if(m)m.textContent=r.t(f)};if(t("language","settings.language"),t("username","setup.root_user"),t("password","settings.new_password"),t("confirmPassword","settings.confirm_password"),i===3)g.textContent=r.t("setup.create_admin");else{let a=r.t("general.next");g.textContent=a&&!a.toUpperCase().includes("GENERAL")&&!a.includes(".")?a:"Next"}if(p)p.textContent="Back"};r.subscribe($),$();function N(){let s=document.getElementById("progressFill");if(s)s.style.width=`${(i-1)/(o-1)*100}%`;if(document.querySelectorAll(".step-dot").forEach((a)=>{let f=parseInt(a.getAttribute("data-step")||"0");if(a.classList.remove("active","completed"),f===i)a.classList.add("active");if(f<i)a.classList.add("completed")}),document.querySelectorAll(".wizard-step").forEach((a)=>a.classList.remove("active")),document.getElementById(`step${i}`)?.classList.add("active"),p)p.style.display=i===1?"none":"block";let t=r.t("general.next");if(g.textContent=i===o?r.t("setup.create_admin"):t&&!t.includes("GENERAL")?t:"Next",i===3){document.getElementById("summaryLang").textContent=b.options[b.selectedIndex].text;let a="System";if(c.light?.classList.contains("selected"))a="Light";if(c.dark?.classList.contains("selected"))a="Dark";document.getElementById("summaryTheme").textContent=a,document.getElementById("summaryUser").textContent=e.value}A.style.display="none",g.removeAttribute("disabled")}function F(){if(A.style.display="none",i===1)return!0;if(i===2){let s=e.value.trim(),t=x.value,a=u.value;if(s.length<3)return M(r.t("setup.error_username")),!1;if(t.length<8)return M(r.t("setup.error_password")),!1;if(t!==a)return M(r.t("notifier.password_mismatch")||"Passwords do not match"),!1;return!0}return!0}function M(s){A.style.display="block",A.textContent=s}g.addEventListener("click",async()=>{if(!F())return;if(i<o)i++,N();else await J()}),p.addEventListener("click",()=>{if(i>1)i--,N()}),h.addEventListener("keydown",(s)=>{if(s.key==="Enter")s.preventDefault(),g.click()});async function J(){g.textContent=r.t("setup.creating"),g.setAttribute("disabled","true");let s="dark";if(c.light?.classList.contains("selected"))s="light";if(c.dark?.classList.contains("selected"))s="dark";let t={username:e.value.trim(),password:x.value,language:b.value,theme:s,avatarUrl:d};try{let a=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(a.ok)localStorage.setItem("csh_lang",t.language),g.textContent=r.t("setup.welcome_admin"),g.style.backgroundColor="var(--accent-alt, #00f5a0)",setTimeout(()=>window.location.href="/",1000);else{let f=await a.text();M(`${r.t("setup.failed")}: ${f}`),g.removeAttribute("disabled"),g.textContent=r.t("setup.create_admin")}}catch(a){console.error(a),M(r.t("setup.error_connection")),g.removeAttribute("disabled")}}requestAnimationFrame(()=>l.style.opacity="1")});
