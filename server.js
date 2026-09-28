require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { db, getSetting, setSetting, findUserByLogin } = require("./src/db");
const { signUser, authRequired, schoolOnly } = require("./src/auth");
const { normalizeQuestions } = require("./src/utils");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));

const loginLimiter = rateLimit({windowMs:15*60*1000,max:30,standardHeaders:true,legacyHeaders:false});
const upload = multer({
  dest:path.join(__dirname,"uploads"),
  limits:{fileSize:10*1024*1024},
  fileFilter:(req,file,cb)=>cb(null,file.mimetype==="application/pdf")
});

function userView(u){
  return {id:u.id,studentNo:u.student_no,name:u.name,course:u.course,specialization:u.specialization,role:u.role,points:u.points};
}

app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.get("/app", (req,res)=>res.sendFile(path.join(__dirname,"public","app.html")));

app.post("/api/login", loginLimiter, (req,res)=>{
  const {studentNo,password}=req.body||{};
  if (!studentNo || !password) return res.status(400).json({error:"أدخل رقم الطالب وكلمة المرور"});
  const user=findUserByLogin(String(studentNo).trim(),String(password));
  if (!user) return res.status(401).json({error:"رقم الحساب أو كلمة المرور غير صحيحة"});
  const token=signUser(user);
  res.cookie("balsam_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*60*60*1000});
  res.json({user:userView(user)});
});
app.post("/api/logout",(req,res)=>{res.clearCookie("balsam_session");res.json({ok:true})});

app.get("/api/me",authRequired,(req,res)=>{
  const u=db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if(!u) return res.status(401).json({error:"الحساب غير موجود"});
  res.json({user:userView(u)});
});

app.get("/api/home",(req,res)=>{
  const posts=db.prepare("SELECT id,title,body,created_at FROM posts ORDER BY id DESC LIMIT 20").all();
  const notifications=db.prepare("SELECT id,body,created_at FROM notifications ORDER BY id DESC LIMIT 20").all();
  const verses=JSON.parse(getSetting("verses")||"[]");
  res.json({announcement:getSetting("important_announcement"),verses,posts,notifications,whatsapp:getSetting("whatsapp_url")});
});

app.get("/api/ranking",authRequired,(req,res)=>{
  const students=db.prepare("SELECT student_no,name,course,specialization,points FROM users WHERE role='student' ORDER BY points DESC,name ASC").all();
  res.json({students});
});

app.get("/api/profile",authRequired,(req,res)=>{
  const u=db.prepare("SELECT id,student_no,name,course,specialization,role,points,created_at FROM users WHERE id=?").get(req.user.id);
  const finished=db.prepare(`
    SELECT t.id,t.name,t.title,a.score,a.total,a.submitted_at
    FROM attempts a JOIN tests t ON t.id=a.test_id
    WHERE a.user_id=? AND a.submitted_at IS NOT NULL ORDER BY a.submitted_at DESC
  `).all(req.user.id);
  res.json({user:u,finished});
});

app.get("/api/tests",authRequired,(req,res)=>{
  const tests=db.prepare("SELECT id,name,title,duration_minutes,question_count,created_at FROM tests WHERE status='active' ORDER BY id DESC").all();
  res.json({tests});
});

app.get("/api/tests/:id",authRequired,(req,res)=>{
  const test=db.prepare("SELECT id,name,title,duration_minutes,question_count,created_at FROM tests WHERE id=? AND status='active'").get(req.params.id);
  if(!test) return res.status(404).json({error:"الاختبار غير موجود"});
  const attempted=db.prepare("SELECT submitted_at,score,total FROM attempts WHERE test_id=? AND user_id=?").get(test.id,req.user.id);
  if(attempted?.submitted_at) return res.status(409).json({error:"لقد أنهيت هذا الاختبار من قبل",result:attempted});
  const exists=db.prepare("SELECT * FROM attempts WHERE test_id=? AND user_id=?").get(test.id,req.user.id);
  if(!exists) db.prepare("INSERT INTO attempts(test_id,user_id,total) VALUES(?,?,?)").run(test.id,req.user.id,test.question_count);
  const raw=db.prepare("SELECT questions_json FROM tests WHERE id=?").get(test.id).questions_json;
  const questions=JSON.parse(raw).map(q=>({q:q.q,options:q.options}));
  res.json({test,questions});
});

app.post("/api/tests/:id/submit",authRequired,(req,res)=>{
  const test=db.prepare("SELECT * FROM tests WHERE id=? AND status='active'").get(req.params.id);
  if(!test) return res.status(404).json({error:"الاختبار غير موجود"});
  const attempt=db.prepare("SELECT * FROM attempts WHERE test_id=? AND user_id=?").get(test.id,req.user.id);
  if(!attempt || attempt.submitted_at) return res.status(409).json({error:"محاولة غير متاحة"});
  const answers=Array.isArray(req.body.answers)?req.body.answers:[];
  const questions=JSON.parse(test.questions_json);
  let score=0;
  const tx=db.transaction(()=>{
    db.prepare("DELETE FROM answers WHERE attempt_id=?").run(attempt.id);
    for(let i=0;i<questions.length;i++){
      const answer=String(answers[i] ?? "");
      const correct=answer===questions[i].answer ? 1:0;
      if(correct) score++;
      db.prepare("INSERT INTO answers(attempt_id,question_index,answer,correct) VALUES(?,?,?,?)").run(attempt.id,i,answer,correct);
    }
    db.prepare("UPDATE attempts SET score=?,submitted_at=CURRENT_TIMESTAMP WHERE id=?").run(score,attempt.id);
    db.prepare("UPDATE users SET points=points+? WHERE id=?").run(score,req.user.id);
  });
  tx();
  const rank=db.prepare("SELECT COUNT(*)+1 AS r FROM users WHERE role='student' AND points>(SELECT points FROM users WHERE id=?)").get(req.user.id).r;
  res.json({score,total:questions.length,pointsAdded:score,rank});
});

app.get("/api/admin/stats",authRequired,schoolOnly,(req,res)=>{
  const students=db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get().c;
  const tests=db.prepare("SELECT COUNT(*) c FROM tests").get().c;
  const attempts=db.prepare("SELECT COUNT(*) c FROM attempts WHERE submitted_at IS NOT NULL").get().c;
  const points=db.prepare("SELECT COALESCE(SUM(points),0) c FROM users WHERE role='student'").get().c;
  res.json({students,tests,attempts,points});
});

app.get("/api/admin/students",authRequired,schoolOnly,(req,res)=>{
  res.json({students:db.prepare("SELECT id,student_no,name,course,specialization,points,created_at FROM users WHERE role='student' ORDER BY points DESC").all()});
});

app.patch("/api/admin/students/:id",authRequired,schoolOnly,(req,res)=>{
  const {name,course,specialization}=req.body||{};
  db.prepare("UPDATE users SET name=?,course=?,specialization=? WHERE id=? AND role='student'").run(name,course,specialization,req.params.id);
  res.json({ok:true});
});

app.delete("/api/admin/students/:id",authRequired,schoolOnly,(req,res)=>{
  db.prepare("DELETE FROM users WHERE id=? AND role='student'").run(req.params.id);
  res.json({ok:true});
});

app.post("/api/admin/points/:id",authRequired,schoolOnly,(req,res)=>{
  const amount=Number(req.body?.amount);
  if(!Number.isInteger(amount)) return res.status(400).json({error:"النقاط يجب أن تكون رقماً صحيحاً"});
  db.prepare("UPDATE users SET points=points+? WHERE id=? AND role='student'").run(amount,req.params.id);
  res.json({ok:true});
});

app.post("/api/admin/announcement",authRequired,schoolOnly,(req,res)=>{
  setSetting("important_announcement",String(req.body?.text||""));
  res.json({ok:true});
});

app.post("/api/admin/verses",authRequired,schoolOnly,(req,res)=>{
  const verses=Array.isArray(req.body?.verses)?req.body.verses.map(String):[];
  setSetting("verses",JSON.stringify(verses));
  res.json({ok:true});
});

app.post("/api/admin/posts",authRequired,schoolOnly,(req,res)=>{
  const title=String(req.body?.title||"منشور المدرسة"), body=String(req.body?.body||"");
  if(!body) return res.status(400).json({error:"النص مطلوب"});
  const r=db.prepare("INSERT INTO posts(title,body) VALUES(?,?)").run(title,body);
  res.json({id:r.lastInsertRowid});
});

app.get("/api/admin/tests",authRequired,schoolOnly,(req,res)=>{
  const tests=db.prepare(`
    SELECT t.id,t.name,t.title,t.duration_minutes,t.question_count,t.status,t.created_at,
    (SELECT COUNT(*) FROM attempts a WHERE a.test_id=t.id AND a.submitted_at IS NOT NULL) AS participants
    FROM tests t ORDER BY t.id DESC
  `).all();
  res.json({tests});
});

app.post("/api/admin/tests",authRequired,schoolOnly,upload.single("pdf"),async(req,res)=>{
  try{
    const {name,title,duration,count,mode,source,json}=req.body;
    let questions;
    if(mode==="array"){
      questions=normalizeQuestions(JSON.parse(json),Number(count));
    }else{
      const {generateQuiz}=require("./src/gemini");
      let text=source||"";
      if(req.file){
        const parsed=await pdfParse(fs.readFileSync(req.file.path));
        text=parsed.text;
      }
      const raw=await generateQuiz({sourceText:text,count:Number(count),title});
      questions=normalizeQuestions(raw,Number(count));
    }
    if(!questions.length) throw new Error("لا توجد أسئلة");
    const r=db.prepare("INSERT INTO tests(name,title,duration_minutes,question_count,questions_json,status) VALUES(?,?,?,?,?,'active')")
      .run(name,title,Number(duration),questions.length,JSON.stringify(questions));
    res.json({id:r.lastInsertRowid,questionCount:questions.length});
  }catch(e){res.status(400).json({error:e.message});}
  finally{if(req.file) fs.unlink(req.file.path,()=>{});}
});

app.post("/api/admin/tests/:id/close",authRequired,schoolOnly,(req,res)=>{
  db.prepare("UPDATE tests SET status='closed' WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.get("/api/admin/test-reports/:id",authRequired,schoolOnly,(req,res)=>{
  const test=db.prepare("SELECT id,name,title,question_count FROM tests WHERE id=?").get(req.params.id);
  if(!test) return res.status(404).json({error:"غير موجود"});
  const attempts=db.prepare(`
    SELECT u.name,u.student_no,a.score,a.total,a.submitted_at
    FROM attempts a JOIN users u ON u.id=a.user_id
    WHERE a.test_id=? AND a.submitted_at IS NOT NULL
    ORDER BY a.score DESC,a.submitted_at ASC
  `).all(req.params.id);
  res.json({test,attempts});
});

app.listen(PORT,()=>{
  console.log(`Balsam School: http://localhost:${PORT}`);
  require("./src/bot");
});
