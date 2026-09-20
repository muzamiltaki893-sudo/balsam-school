const view=document.getElementById("view");
const title=document.getElementById("pageTitle");
const modal=document.getElementById("modal");
const modalContent=document.getElementById("modalContent");
let me=null, dataCache=null;

const api=async(url,opt={})=>{
  const r=await fetch(url,opt);
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"حدث خطأ");
  return d;
};

async function init(){
  try{
    const d=await api("/api/me"); me=d.user;
    await render("home");
  }catch(e){location.href="/";}
}
function setActive(tab){
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  const names={home:"الرئيسية",tests:"الاختبارات",profile:"الملف الشخصي",ranking:"ترتيب الطلاب"};
  title.textContent=names[tab];
}
async function render(tab){
  setActive(tab);
  if(tab==="home") return home();
  if(tab==="tests") return tests();
  if(tab==="profile") return profile();
  if(tab==="ranking") return ranking();
}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>render(b.dataset.tab));

async function home(){
  const d=await api("/api/home"); dataCache=d;
  document.getElementById("notifyCount").textContent=d.notifications.length;
  const verse=d.verses?.[0]||"لم تضف الإدارة آية بعد.";
  view.innerHTML=`
    <img class="hero-logo" src="/assets/logo.jpg" alt="الشعار">
    <div class="brand-lines"><strong><em>البلسم</em> الثانوية</strong><p>تعليم رفيع ★ قيم راسخة ★ مستقبل مشرق</p></div>
    <div class="card verse-card"><p>${escapeHtml(verse)}</p><small>آية من القرآن الكريم</small></div>
    <div class="card announcement"><span class="accent">إعلان هام</span><p>${escapeHtml(d.announcement||"لا توجد إعلانات حالياً.")}</p></div>
    <div class="section-head"><h3>منشورات المدرسة</h3><span class="muted">${d.posts.length?"عرض الكل":"لا توجد منشورات"}</span></div>
    ${d.posts.length?d.posts.map(postCard).join(""):`<div class="card muted" style="text-align:center">لم تتم إضافة منشورات بعد. ستظهر هنا مباشرة عند نشرها من البوت أو حساب المدرسة.</div>`}
  `;
}
function postCard(p){return `<article class="card post"><div class="post-badge">✦</div><div><h4>${escapeHtml(p.title)}</h4><p>${escapeHtml(p.body)}</p></div></article>`}

async function tests(){
  const d=await api("/api/tests");
  view.innerHTML=`<div class="section-head"><h3>الاختبارات</h3><span class="admin-badge">${d.tests.length} متاح</span></div>
  ${d.tests.length?d.tests.map(t=>`
    <div class="test-row">
      <div class="doc">▣</div><div class="grow"><h4>${escapeHtml(t.name)}</h4><p>${escapeHtml(t.title)} • ${t.question_count} سؤال • ${t.duration_minutes} دقيقة</p></div>
      <button class="btn btn-primary" onclick="startTest(${t.id})">ابدأ</button>
    </div>`).join(""):`<div class="card muted" style="text-align:center">لا توجد اختبارات منشورة بعد.</div>`}`;
}
window.startTest=async(id)=>{
  try{
    const d=await api("/api/tests/"+id);
    let idx=0,answers=Array(d.questions.length).fill("");
    const draw=()=>{
      const q=d.questions[idx];
      view.innerHTML=`<div class="test-active"><h3>${escapeHtml(d.test.name)}</h3><p>${escapeHtml(d.test.title)}</p>
        <div class="test-meta"><div><small>السؤال</small><strong>${idx+1} / ${d.questions.length}</strong></div><div><small>المدة</small><strong>${d.test.duration_minutes} دقيقة</strong></div></div>
        <div class="progress"><i style="width:${((idx)/d.questions.length)*100}%"></i></div></div>
        <div class="question-card"><h3>${escapeHtml(q.q)}</h3>${q.options.map(o=>`<button class="option ${answers[idx]===o?"selected":""}" data-opt="${escapeAttr(o)}">${escapeHtml(o)}</button>`).join("")}</div>
        <div style="display:flex;justify-content:space-between;margin-top:15px">
          <button class="btn" id="prev" ${idx===0?"disabled":""}>السابق</button>
          <button class="btn btn-primary" id="next">${idx===d.questions.length-1?"إنهاء الاختبار":"التالي"}</button>
        </div>`;
      document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{answers[idx]=b.dataset.opt;draw()});
      document.getElementById("prev").onclick=()=>{if(idx>0){idx--;draw()}};
      document.getElementById("next").onclick=async()=>{
        if(!answers[idx]) return alert("اختر إجابة أولاً.");
        if(idx<d.questions.length-1){idx++;draw()}else submitTest(id,answers);
      };
    }; draw();
  }catch(e){alert(e.message)}
};
async function submitTest(id,answers){
  try{
    const d=await api("/api/tests/"+id+"/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers})});
    view.innerHTML=`<div class="result"><div>أحسنت، انتهى الاختبار</div><div class="big">${d.score}</div><div>من ${d.total} سؤال</div><p>أضيفت ${d.pointsAdded} نقطة إلى ملفك الشخصي</p><button class="btn btn-primary" onclick="render('tests')">العودة للاختبارات</button></div>`;
  }catch(e){alert(e.message)}
}

async function profile(){
  const d=await api("/api/profile"), u=d.user;
  view.innerHTML=`<div class="profile-head"><div class="avatar">♙</div><h2>${escapeHtml(u.name)}</h2><p>${escapeHtml(u.course||"")} ${u.specialization?"• "+escapeHtml(u.specialization):""}</p>
    <div class="stats"><div><small>النقاط</small><strong>${u.points}</strong></div><div><small>الحساب</small><strong>${escapeHtml(u.student_no)}</strong></div><div><small>الاختبارات</small><strong>${d.finished.length}</strong></div></div>
  </div>
  <div class="card">
    <div class="menu-row"><span>♙ المعلومات الشخصية</span><span>‹</span></div>
    <div class="menu-row"><span>▥ إحصائياتي</span><span>‹</span></div>
    <div class="menu-row"><span>♜ الإنجازات</span><span>‹</span></div>
    <div class="menu-row"><span>⚙ الإعدادات</span><span>‹</span></div>
    <div class="menu-row" id="logout"><span>↪ تسجيل الخروج</span><span>‹</span></div>
  </div>
  <h3>الاختبارات المنتهية</h3>
  ${d.finished.length?d.finished.map(x=>`<div class="test-row"><div class="doc">✓</div><div class="grow"><h4>${escapeHtml(x.name)}</h4><p>${escapeHtml(x.title)}</p></div><span class="score">${x.score}/${x.total}</span></div>`).join(""):`<div class="card muted">لا توجد اختبارات منتهية بعد.</div>`}`;
  document.getElementById("logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.href="/";}
  if(u.role==="school") addSchoolTools();
}
function addSchoolTools(){
  view.insertAdjacentHTML("beforeend",`<div class="card"><span class="admin-badge">حساب المدرسة</span><h3>لوحة الإدارة</h3><div class="menu-row" onclick="adminStudents()"><span>إدارة الطلاب والتقارير</span><span>‹</span></div><div class="menu-row" onclick="adminCreatePost()"><span>إضافة منشور</span><span>‹</span></div><div class="menu-row" onclick="adminAnnouncement()"><span>تعديل الخبر الهام</span><span>‹</span></div><div class="menu-row" onclick="adminStats()"><span>تقارير المنصة والاختبارات</span><span>‹</span></div></div>`);
}
window.adminStudents=async()=>{
  try{const d=await api("/api/admin/students"); modal.classList.remove("hidden"); modalContent.innerHTML=`<h2>إدارة الطلاب</h2>${d.students.length?d.students.map(s=>`<div class="test-row"><div class="grow"><b>${escapeHtml(s.name)}</b><p>${s.student_no} • ${s.points} نقطة</p></div><button class="btn btn-primary" onclick="addPoints(${s.id})">+ نقاط</button></div>`).join(""):`<p>لا يوجد طلاب.</p>`}<button class="btn" onclick="closeModal()">إغلاق</button>`}catch(e){alert(e.message)}
}
window.addPoints=async(id)=>{const n=prompt("كم نقطة؟");if(n===null)return;await api("/api/admin/points/"+id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(n)})});closeModal();adminStudents()}
window.adminCreatePost=async()=>{modal.classList.remove("hidden");modalContent.innerHTML=`<h2>منشور جديد</h2><div class="form-grid"><input id="pt" placeholder="العنوان"><textarea id="pb" placeholder="نص المنشور"></textarea><button class="btn btn-primary" onclick="savePost()">نشر</button><button class="btn" onclick="closeModal()">إغلاق</button></div>`}
window.savePost=async()=>{await api("/api/admin/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:pt.value,body:pb.value})});closeModal();home()}
window.adminAnnouncement=async()=>{const d=await api("/api/home");modal.classList.remove("hidden");modalContent.innerHTML=`<h2>الخبر الهام</h2><div class="form-grid"><textarea id="annText">${escapeHtml(d.announcement)}</textarea><button class="btn btn-primary" onclick="saveAnn()">حفظ</button><button class="btn" onclick="closeModal()">إغلاق</button></div>`}
window.saveAnn=async()=>{await api("/api/admin/announcement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:annText.value})});closeModal();home()}
window.closeModal=()=>modal.classList.add("hidden");

async function ranking(){
  const d=await api("/api/ranking");
  view.innerHTML=`<div class="card"><input class="search" id="rankSearch" placeholder="ابحث عن طالب بالاسم..."></div>
  <div id="rankList"></div>`;
  const draw=(query="")=>{
    const list=d.students.filter(s=>s.name.includes(query));
    const top=list.slice(0,3);
    document.getElementById("rankList").innerHTML=`
      ${top.length?`<div class="ranking-top">${top.map((s,i)=>`<div class="podium ${i===0?"first":""}"><div class="rank">${i+1}</div><strong>${escapeHtml(s.name)}</strong><small>${s.points} نقطة</small></div>`).join("")}</div>`:""}
      ${list.map((s,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-avatar">♙</div><div class="rank-name"><b>${escapeHtml(s.name)}</b><div class="rank-points">${escapeHtml(s.course||"")}</div></div><div class="rank-points">${s.points} نقطة</div></div>`).join("")}
      ${!list.length?`<div class="card muted">لا توجد نتائج.</div>`:""}`;
  };
  draw();document.getElementById("rankSearch").oninput=e=>draw(e.target.value.trim());
}
function escapeHtml(s){return String(s??"").replace(/[&<>"\']/g,c=>c==="&"?"&amp;":c==="<"?"&lt;":c===">"?"&gt;":c==="\""?"&quot;":"&#039;")}
function escapeAttr(s){return escapeHtml(s).replace(/`/g,"&#096;")}
document.getElementById("notifyBtn").onclick=async()=>{
  const d=await api("/api/home");
  modal.classList.remove("hidden");
  modalContent.innerHTML=`<h2>التنبيهات</h2>${d.notifications.length?d.notifications.map(n=>`<div class="card">${escapeHtml(n.body)}</div>`).join(""):`<p class="muted">لا توجد تنبيهات.</p>`}<button class="btn" onclick="closeModal()">إغلاق</button>`;
};
init();

window.adminStats=async()=>{
  try{
    const [s,t]=await Promise.all([api("/api/admin/stats"),api("/api/admin/tests")]);
    modal.classList.remove("hidden");
    modalContent.innerHTML=`<h2>تقارير المدرسة</h2>
      <div class="stats"><div><small>الطلاب</small><strong>${s.students}</strong></div><div><small>الاختبارات</small><strong>${s.tests}</strong></div><div><small>الممتحنون</small><strong>${s.attempts}</strong></div></div>
      <h3>الاختبارات</h3>
      ${t.tests.length?t.tests.map(x=>`<div class="test-row"><div class="grow"><b>${escapeHtml(x.name)}</b><p>${x.participants} ممتحن • ${x.question_count} سؤال</p></div><button class="btn btn-primary" onclick="testReport(${x.id})">التقرير</button></div>`).join(""):`<p class="muted">لا توجد اختبارات.</p>`}
      <button class="btn" onclick="closeModal()">إغلاق</button>`;
  }catch(e){alert(e.message)}
};
window.testReport=async(id)=>{
  try{
    const d=await api("/api/admin/test-reports/"+id);
    modalContent.innerHTML=`<h2>${escapeHtml(d.test.name)}</h2><p class="muted">عدد الممتحنين: ${d.attempts.length}</p>
    ${d.attempts.length?d.attempts.map((a,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-avatar">♙</div><div class="rank-name"><b>${escapeHtml(a.name)}</b><div class="rank-points">${a.student_no}</div></div><strong>${a.score}/${a.total}</strong></div>`).join(""):`<p class="muted">لم ينته أحد الاختبار بعد.</p>`}
    <button class="btn" onclick="adminStats()">عودة</button>`;
  }catch(e){alert(e.message)}
};
