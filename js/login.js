const form = document.getElementById("loginForm");
const msg = document.getElementById("message");
const password = document.getElementById("password");
const studentNo = document.getElementById("studentNo");
const loginButton = document.getElementById("loginButton");
const remember = document.getElementById("remember");

const API_BASE = "";

/* =========================================
   HELPERS
========================================= */

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function setMessage(text, type = "error") {
  msg.textContent = text || "";

  msg.classList.remove(
    "message-success",
    "message-error",
    "message-loading"
  );

  if (!text) return;

  if (type === "success") {
    msg.classList.add("message-success");
  } else if (type === "loading") {
    msg.classList.add("message-loading");
  } else {
    msg.classList.add("message-error");
  }
}

/* =========================================
   REMEMBER LOGIN
========================================= */

try {
  const savedStudentNo = localStorage.getItem("balsam_student_no");

  if (savedStudentNo) {
    studentNo.value = savedStudentNo;
    remember.checked = true;
  }
} catch (_) {}

/* =========================================
   PASSWORD VISIBILITY
========================================= */

document.getElementById("togglePassword").onclick = () => {

  const show = password.type === "password";

  password.type = show ? "text" : "password";

  const button = document.getElementById("togglePassword");

  button.setAttribute(
    "aria-label",
    show
      ? "إخفاء كلمة المرور"
      : "إظهار كلمة المرور"
  );

  button.setAttribute(
    "title",
    show
      ? "إخفاء كلمة المرور"
      : "إظهار كلمة المرور"
  );
};

/* =========================================
   SCHOOL WHATSAPP
========================================= */

fetch(apiUrl("/api/home"))
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed");
    }

    return response.json();
  })
  .then(data => {

    if (
      data &&
      data.whatsapp &&
      document.getElementById("whatsappLink")
    ) {
      document.getElementById("whatsappLink").href =
        data.whatsapp;
    }

  })
  .catch(() => {});

/* =========================================
   FORGOT PASSWORD
========================================= */

document.getElementById("forgot").onclick = () => {

  setMessage(
    "لإعادة كلمة المرور، تواصل مع إدارة المدرسة عبر واتساب.",
    "error"
  );

};

/* =========================================
   SCHOOL ACCOUNT
========================================= */

document.getElementById("schoolLogin").onclick = () => {

  studentNo.focus();

  setMessage(
    "استخدم رقم حساب المدرسة وكلمة المرور التي أنشأها البوت.",
    "loading"
  );

};

/* =========================================
   LOGIN
========================================= */

form.addEventListener("submit", async event => {

  event.preventDefault();

  const number = studentNo.value.trim();
  const pass = password.value;

  if (!number || !pass) {

    setMessage(
      "أدخل رقم الطالب وكلمة المرور.",
      "error"
    );

    return;
  }

  loginButton.disabled = true;

  loginButton.dataset.originalText =
    loginButton.querySelector("span")?.textContent ||
    "تسجيل الدخول";

  if (loginButton.querySelector("span")) {
    loginButton.querySelector("span").textContent =
      "جارٍ تسجيل الدخول...";
  }

  setMessage(
    "جارٍ التحقق من بيانات الحساب...",
    "loading"
  );

  try {

    const response = await fetch(
      apiUrl("/api/login"),
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        credentials: "include",

        body: JSON.stringify({
          studentNo: number,
          password: pass
        })
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        "رقم الحساب أو كلمة المرور غير صحيحة."
      );
    }

    try {

      if (remember.checked) {
        localStorage.setItem(
          "balsam_student_no",
          number
        );
      } else {
        localStorage.removeItem(
          "balsam_student_no"
        );
      }

    } catch (_) {}

    setMessage(
      "تم تسجيل الدخول بنجاح.",
      "success"
    );

    location.href =
      `${API_BASE}/app`;

  } catch (error) {

    setMessage(
      error.message ||
      "تعذر تسجيل الدخول.",
      "error"
    );

    loginButton.disabled = false;

    if (loginButton.querySelector("span")) {
      loginButton.querySelector("span").textContent =
        loginButton.dataset.originalText ||
        "تسجيل الدخول";
    }
  }

});

/* =========================================
   ENTER KEY
========================================= */

studentNo.addEventListener("keydown", event => {

  if (event.key === "Enter") {
    password.focus();
  }

});

password.addEventListener("keydown", event => {

  if (event.key === "Enter") {
    form.requestSubmit();
  }

});
