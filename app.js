/* ===== 主題 ===== */
(function(){
  const key='hh-theme';
  const saved=localStorage.getItem(key);
  const prefersDark=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', saved || (prefersDark?'dark':'light'));
  document.getElementById('themeBtn').addEventListener('click',()=>{
    const cur=document.documentElement.getAttribute('data-theme');
    const next=cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    localStorage.setItem(key,next);
  });
})();

/* ===== 分頁切換 ===== */
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const id=tab.dataset.tab;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id==='page-bmc'){ setTimeout(()=>focusScroll(), 60); }
  });
});

/* ===== 讀取 content.txt（預設） ===== */
let data = null;
async function loadContent(){
  const res = await fetch('content.txt', {cache:'no-cache'});
  const text = await res.text();
  data = JSON.parse(text);
  hydrateAll();
}
loadContent();

/* ===== BMC 渲染與互動 ===== */
const bmcEl = document.getElementById('bmc');
const sectionsMap = {
  kp:'關鍵合作夥伴（Key Partners）',
  ka:'關鍵活動（Key Activities）',
  kr:'關鍵資源（Key Resources）',
  vp:'價值主張（Value Proposition）',
  cr:'顧客關係（Customer Relationships）',
  ch:'通路（Channels）',
  cs:'顧客族群（Customer Segments）',
  cost:'成本結構（Cost Structure）',
  rev:'收入來源（Revenue Streams）'
};
const tagNameMap = {course:'課程', data:'數據', incub:'孵化', commerce:'商品'};
const tagClass = {course:'t-course', data:'t-data', incub:'t-incub', commerce:'t-commerce'};

function escapeHtml(s){return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);}

function renderBMC(){
  bmcEl.innerHTML = '';
  Object.entries(sectionsMap).forEach(([key, title])=>{
    const cell = document.createElement('article');
    cell.id = key; cell.className = 'cell'; cell.dataset.key = key;
    cell.innerHTML = `<h3><span class="dot"></span><span class="editable" contenteditable="false" data-title>${title}</span></h3><ul></ul>`;
    const ul = cell.querySelector('ul');

    (data.bmc[key]||[]).forEach((item, idx)=>{
      // item 形式：{text:"...", tags:["course","data"]}
      const li = document.createElement('li');
      li.className = 'editable'; li.setAttribute('contenteditable','false'); li.dataset.index = idx;
      li.dataset.tags = (item.tags||[]).join(',');
      const tagsHtml = (item.tags||[]).map(t=>`<span class="tag ${tagClass[t]}">${tagNameMap[t]}</span>`).join(' ');
      li.innerHTML = escapeHtml(item.text) + (tagsHtml ? (' ' + tagsHtml) : '');
      ul.appendChild(li);
    });

    bmcEl.appendChild(cell);
  });
}

/* 聚焦與篩選 */
const filterSel=document.getElementById('filter');
const tagCbs={course:document.getElementById('fCourse'), data:document.getElementById('fData'),
              incub:document.getElementById('fIncub'), commerce:document.getElementById('fCommerce')};
const onlyBlocksCb=document.getElementById('onlyBlocks');
const toggleTagsCb=document.getElementById('toggleTags');

function liMatches(li,on){
  const tags = (li.dataset.tags||'').split(',').filter(Boolean);
  if(on.anyOn){
    return (on.course && tags.includes('course')) ||
           (on.data && tags.includes('data')) ||
           (on.incub && tags.includes('incub')) ||
           (on.commerce && tags.includes('commerce'));
  }
  return tags.length===0; // 四個都沒勾：只顯示無標籤項目
}
function applyTagFilter(){
  const on={course:tagCbs.course.checked, data:tagCbs.data.checked,
            incub:tagCbs.incub.checked, commerce:tagCbs.commerce.checked};
  on.anyOn = on.course || on.data || on.incub || on.commerce;
  document.body.classList.toggle('hide-tags', !toggleTagsCb.checked);
  const onlyBlocks = onlyBlocksCb.checked;

  document.querySelectorAll('#bmc .cell').forEach(cell=>{
    let hasVisible=false;
    cell.querySelectorAll('li').forEach(li=>{
      const show=liMatches(li,on);
      li.classList.toggle('hidden', !show);
      if(show) hasVisible=true;
    });
    if(onlyBlocks){ cell.classList.toggle('hidden', !hasVisible); }
    else { if(!bmcEl.classList.contains('single-view')) cell.classList.remove('hidden'); }
  });
}
function focusScroll(){
  const val=filterSel.value;
  bmcEl.classList.toggle('single-view', val!=='all');
  document.querySelectorAll('#bmc .cell').forEach(cell=>{
    cell.classList.toggle('focus', val!=='all' && cell.id===val);
  });
  const target = val==='all'?null:document.getElementById(val);
  if(target){ target.scrollIntoView({behavior:'smooth', block:'center', inline:'center'}); }
}
filterSel.addEventListener('change', ()=>{ focusScroll(); applyTagFilter(); });
Object.values(tagCbs).forEach(cb=> cb.addEventListener('change', applyTagFilter));
onlyBlocksCb.addEventListener('change', applyTagFilter);
toggleTagsCb.addEventListener('change', applyTagFilter);

/* ===== Roadmap 渲染與篩選 ===== */
const roadEl = document.getElementById('road');
const yearCbs = { y1:document.getElementById('y1'), y2:document.getElementById('y2'), y3:document.getElementById('y3') };
const coreCbs = { course:document.getElementById('cCourse'), data:document.getElementById('cData'),
                  incub:document.getElementById('cIncub'), commerce:document.getElementById('cCommerce') };

function renderRoadmap(){
  roadEl.innerHTML = '';
  const cores = {course:'課程（Courses）', data:'數據（Data · 心靈 INBODY）', incub:'孵化（Incubation · 師資）', commerce:'商品（Commerce · 療癒商城）'};
  Object.keys(cores).forEach(core=>{
    const sec = document.createElement('section');
    sec.className='swim'; sec.dataset.core=core;
    sec.innerHTML = `<h4 class="editable" contenteditable="false">${cores[core]}</h4>
      <div class="row">
        ${['y1','y2','y3'].map(y=>{
          const items=(data.roadmap[core]?.[y]||[]).map(t=>`- ${escapeHtml(t)}`).join('<br>');
          const yLabel = {y1:'Y1 驗證', y2:'Y2 擴張', y3:'Y3 規模化'}[y];
          return `<div class="block editable" contenteditable="false" data-year="${y}"><div class="y">${yLabel}</div>${items||''}</div>`;
        }).join('')}
      </div>`;
    roadEl.appendChild(sec);
  });
}
function applyRoadmapFilter(){
  const showY={y1:yearCbs.y1.checked, y2:yearCbs.y2.checked, y3:yearCbs.y3.checked};
  const showC={course:coreCbs.course.checked, data:coreCbs.data.checked, incub:coreCbs.incub.checked, commerce:coreCbs.commerce.checked};
  document.querySelectorAll('#road .swim').forEach(sw=>{
    const core=sw.dataset.core; const coreOn=!!showC[core];
    sw.style.display = coreOn ? '' : 'none';
    if(coreOn){
      sw.querySelectorAll('.block').forEach(b=>{ b.style.display = showY[b.dataset.year] ? '' : 'none'; });
    }
  });
}
Object.values(yearCbs).forEach(cb=> cb.addEventListener('change', applyRoadmapFilter));
Object.values(coreCbs).forEach(cb=> cb.addEventListener('change', applyRoadmapFilter));

/* ===== Venn 綁定 ===== */
function syncVennFromData(){
  document.querySelector('.l1').textContent = data.venn.l1;
  document.querySelector('.l2').textContent = data.venn.l2;
  document.querySelector('.l3').textContent = data.venn.l3;
  document.querySelector('.venn-center').textContent = data.venn.center;
  const ul = document.getElementById('vennList');
  ul.innerHTML = '';
  (data.venn.legend||[]).forEach(item=>{
    const li=document.createElement('li');
    li.className='editable'; li.setAttribute('contenteditable','false');
    li.textContent = item; ul.appendChild(li);
  });
}

/* ===== 編輯模式：真正改資料（但儲存為下載的 content.txt，供你覆蓋回 repo） ===== */
const editBtn = document.getElementById('editToggle');
const tip = document.getElementById('editTip');
let editing=false;
function setEditable(on){
  editing=on; tip.style.display=on?'block':'none';
  document.querySelectorAll('.editable').forEach(el=> el.setAttribute('contenteditable', on?'true':'false'));
  editBtn.textContent = on?'關閉編輯':'編輯模式';
}
editBtn.addEventListener('click', ()=> setEditable(!editing));

// 把使用者修改回寫到 data
document.addEventListener('input',(e)=>{
  if(!editing || !data) return;
  const el=e.target;

  // BMC
  if(el.closest('#bmc')){
    const cell = el.closest('.cell'); const key=cell?.dataset?.key;
    if(!key) return;
    if(el.tagName==='LI'){
      const idx = +el.dataset.index;
      const plain = el.innerText.replace(/\s+(課程|數據|孵化|商品)\s*$/,'').trim();
      const tags = (data.bmc[key][idx].tags||[]);
      data.bmc[key][idx] = {text:plain, tags:[...tags]};
      // 重新渲染單一 li 以保留標籤
      const tagsHtml = tags.map(t=>`<span class="tag ${tagClass[t]}">${tagNameMap[t]}</span>`).join(' ');
      el.innerHTML = escapeHtml(plain) + (tagsHtml?(' '+tagsHtml):'');
    }
  }

  // Roadmap（以換行分項）
  if(el.closest('#road')){
    const swim = el.closest('.swim'); const core=swim?.dataset?.core;
    if(!core) return;
    if(el.classList.contains('block')){
      const y = el.dataset.year;
      const text = el.innerText.split('\n')
        .filter(s=>!/^Y\d/.test(s)).map(s=>s.replace(/^-+\s*/,'').trim()).filter(Boolean);
      data.roadmap[core][y] = text;
    }
  }

  // Venn
  if(el.closest('#page-venn')){
    if(el.classList.contains('l1')) data.venn.l1 = el.innerText.trim();
    if(el.classList.contains('l2')) data.venn.l2 = el.innerText.trim();
    if(el.classList.contains('l3')) data.venn.l3 = el.innerText.trim();
    if(el.classList.contains('venn-center')) data.venn.center = el.innerText.trim();
    if(el.parentElement?.id === 'vennList'){
      data.venn.legend = Array.from(document.querySelectorAll('#vennList li')).map(li=>li.innerText.trim()).filter(Boolean);
    }
  }
});

/* ===== 儲存：下載 content.txt（覆蓋回 GitHub） ===== */
document.getElementById('saveTxt').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'content.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
});

/* ===== 初始化 ===== */
function hydrateAll(){
  renderBMC(); focusScroll(); applyTagFilter();
  renderRoadmap(); applyRoadmapFilter();
  syncVennFromData();
}

