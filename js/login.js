const form=document.getElementById("loginForm");
const msg=document.getElementById("message");
const password=document.getElementById("password");

document.getElementById("togglePassword").onclick=()=>{
  password.type=password.type==="password"?"text":"password";
};

fetch("/api/home").then(r=>r.json()).then(data=>{
  if(data.whatsapp) document.getElementById("whatsappLink").href=data.whatsapp;
}).catch(()=>{});

document.getElementById("forgot").onclick=()=>{
  msg.textContent="لإعادة كلمة المرور، تواصل مع إدارة المدرسة عبر واتساب.";
};

document.getElementById("schoolLogin").onclick=()=>{
  document.getElementById("studentNo").focus();
  msg.textContent="استخدم رقم حساب المدرسة وكلمة المرور التي أنشأها البوت.";
};

form.addEventListener("submit",async e=>{
  e.preventDefault(); msg.textContent="جارٍ تسجيل الدخول...";
  try{
    const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      studentNo:document.getElementById("studentNo").value,
      password:password.value
    })});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"فشل تسجيل الدخول");
    location.href="/app";
  }catch(err){msg.textContent=err.message;}
});
