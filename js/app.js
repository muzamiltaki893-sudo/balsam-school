const view = document.getElementById("view");
const title = document.getElementById("pageTitle");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

let me = null;
let dataCache = null;

const API_BASE = "";

/* =========================================
   API
========================================= */

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

const api = async (url, opt = {}) => {

  const options = {
    credentials: "include",
    ...opt
  };

  const response = await fetch(
    apiUrl(url),
    options
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      "حدث خطأ أثناء الاتصال بالخادم."
    );
  }

  return data;
};

/* =========================================
   INIT
========================================= */

async function init() {

  try {

    const data = await api("/api/me");

    me = data.user;

    await render("home");

  } catch (_) {

    location.href =
      `${API_BASE}/`;

  }

}

/* =========================================
   NAVIGATION
========================================= */

function setActive(tab) {

  document
    .querySelectorAll(".bottom-nav button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );

    });

  const names = {

    home: "الرئيسية",

    tests: "الاختبارات",

    profile: "الملف الشخصي",

    ranking: "ترتيب الطلاب"

  };

  title.textContent =
    names[tab] || "مدرسة البلسم الثانوية";
}

async function render(tab) {

  setActive(tab);

  try {

    if (tab === "home") {
      return await home();
    }

    if (tab === "tests") {
      return await tests();
    }

    if (tab === "profile") {
      return await profile();
    }

    if (tab === "ranking") {
      return await ranking();
    }

  } catch (error) {

    showError(error.message);

  }

}

document
  .querySelectorAll(".bottom-nav button")
  .forEach(button => {

    button.onclick = () =>
      render(button.dataset.tab);

  });

/* =========================================
   HOME
========================================= */

async function home() {

  const data =
    await api("/api/home");

  dataCache = data;

  const notifications =
    Array.isArray(data.notifications)
      ? data.notifications
      : [];

  const posts =
    Array.isArray(data.posts)
      ? data.posts
      : [];

  const verses =
    Array.isArray(data.verses)
      ? data.verses
      : [];

  document.getElementById(
    "notifyCount"
  ).textContent = notifications.length;

  const verse =
    verses.length
      ? verses[0]
      : "لم تضف الإدارة آية بعد.";

  view.innerHTML = `

    <section class="home-intro">

      <img
        class="hero-logo"
        src="assets/logo.jpg"
        alt="شعار مدرسة البلسم الثانوية"
      >

      <div class="brand-lines">

        <strong>
          <em>البلسم</em> الثانوية
        </strong>

        <p>
          تعليم رفيع ★ قيم راسخة ★ مستقبل مشرق
        </p>

      </div>

    </section>

    <section class="card verse-card">

      <p>
        ${escapeHtml(verse)}
      </p>

      <small>
        آية من القرآن الكريم
      </small>

    </section>

    <section class="card announcement">

      <span class="accent">
        إعلان هام
      </span>

      <p>
        ${escapeHtml(
          data.announcement ||
          "لا توجد إعلانات حالياً."
        )}
      </p>

    </section>

    <div class="section-head">

      <h3>
        منشورات المدرسة
      </h3>

      <span class="muted">
        ${
          posts.length
            ? `${posts.length} منشور`
            : "لا توجد منشورات"
        }
      </span>

    </div>

    ${
      posts.length
        ? posts.map(postCard).join("")
        : `
          <div
            class="card muted"
            style="text-align:center"
          >
            لم تتم إضافة منشورات بعد.
            ستظهر هنا مباشرة عند نشرها من البوت
            أو حساب المدرسة.
          </div>
        `
    }

  `;
}

/* =========================================
   POST
========================================= */

function postCard(post) {

  return `

    <article class="card post">

      <div class="post-badge">
        ✦
      </div>

      <div>

        <h4>
          ${escapeHtml(post.title)}
        </h4>

        <p>
          ${escapeHtml(post.body)}
        </p>

      </div>

    </article>

  `;
}

/* =========================================
   TESTS
========================================= */

async function tests() {

  const data =
    await api("/api/tests");

  const testsList =
    Array.isArray(data.tests)
      ? data.tests
      : [];

  view.innerHTML = `

    <div class="section-head">

      <h3>
        الاختبارات
      </h3>

      <span class="admin-badge">
        ${testsList.length} متاح
      </span>

    </div>

    ${
      testsList.length

        ? testsList.map(test => `

          <div class="test-row">

            <div class="doc">
              ▣
            </div>

            <div class="grow">

              <h4>
                ${escapeHtml(test.name)}
              </h4>

              <p>
                ${escapeHtml(test.title)}
                •
                ${test.question_count} سؤال
                •
                ${test.duration_minutes} دقيقة
              </p>

            </div>

            <button
              class="btn btn-primary"
              onclick="startTest(${Number(test.id)})"
            >
              ابدأ
            </button>

          </div>

        `).join("")

        : `

          <div
            class="card muted"
            style="text-align:center"
          >
            لا توجد اختبارات منشورة بعد.
          </div>

        `
    }

  `;
}

/* =========================================
   START TEST
========================================= */

window.startTest = async function(id) {

  try {

    const data =
      await api(`/api/tests/${id}`);

    let index = 0;

    const answers =
      Array(data.questions.length).fill("");

    const draw = () => {

      const question =
        data.questions[index];

      const progress =
        data.questions.length
          ? (index / data.questions.length) * 100
          : 0;

      view.innerHTML = `

        <div class="test-active">

          <h3>
            ${escapeHtml(data.test.name)}
          </h3>

          <p>
            ${escapeHtml(data.test.title)}
          </p>

          <div class="test-meta">

            <div>

              <small>
                السؤال
              </small>

              <strong>
                ${index + 1}
                /
                ${data.questions.length}
              </strong>

            </div>

            <div>

              <small>
                المدة
              </small>

              <strong>
                ${data.test.duration_minutes}
                دقيقة
              </strong>

            </div>

          </div>

          <div class="progress">

            <i
              style="width:${progress}%"
            ></i>

          </div>

        </div>

        <div class="question-card">

          <h3>
            ${escapeHtml(question.q)}
          </h3>

          ${
            Array.isArray(question.options)
              ? question.options.map(option => `

                <button
                  class="option ${
                    answers[index] === option
                      ? "selected"
                      : ""
                  }"
                  data-opt="${escapeAttr(option)}"
                  type="button"
                >
                  ${escapeHtml(option)}
                </button>

              `).join("")
              : ""
          }

        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            margin-top:15px;
          "
        >

          <button
            class="btn"
            id="prev"
            type="button"
            ${index === 0 ? "disabled" : ""}
          >
            السابق
          </button>

          <button
            class="btn btn-primary"
            id="next"
            type="button"
          >
            ${
              index === data.questions.length - 1
                ? "إنهاء الاختبار"
                : "التالي"
            }
          </button>

        </div>

      `;

      document
        .querySelectorAll(".option")
        .forEach(button => {

          button.onclick = () => {

            answers[index] =
              button.dataset.opt;

            draw();

          };

        });

      document.getElementById(
        "prev"
      ).onclick = () => {

        if (index > 0) {
          index--;
          draw();
        }

      };

      document.getElementById(
        "next"
      ).onclick = async () => {

        if (!answers[index]) {

          alert(
            "اختر إجابة أولاً."
          );

          return;
        }

        if (
          index <
          data.questions.length - 1
        ) {

          index++;

          draw();

        } else {

          await submitTest(
            id,
            answers
          );

        }

      };

    };

    draw();

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   SUBMIT TEST
========================================= */

async function submitTest(
  id,
  answers
) {

  try {

    const data =
      await api(
        `/api/tests/${id}/submit`,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({
            answers
          })
        }
      );

    view.innerHTML = `

      <div class="result">

        <div>
          أحسنت، انتهى الاختبار
        </div>

        <div class="big">
          ${data.score}
        </div>

        <div>
          من ${data.total} سؤال
        </div>

        <p>
          أضيفت
          ${data.pointsAdded}
          نقطة إلى ملفك الشخصي
        </p>

        ${
          data.rank
            ? `
              <p>
                ترتيبك الحالي:
                <strong>${data.rank}</strong>
              </p>
            `
            : ""
        }

        <button
          class="btn btn-primary"
          onclick="render('tests')"
          type="button"
        >
          العودة للاختبارات
        </button>

      </div>

    `;

  } catch (error) {

    alert(error.message);

  }

}

/* =========================================
   PROFILE
========================================= */

async function profile() {

  const data =
    await api("/api/profile");

  const user = data.user;

  const finished =
    Array.isArray(data.finished)
      ? data.finished
      : [];

  view.innerHTML = `

    <div class="profile-head">

      <div class="avatar">
        ♙
      </div>

      <h2>
        ${escapeHtml(user.name)}
      </h2>

      <p>
        ${escapeHtml(user.course || "")}

        ${
          user.specialization
            ? ` • ${escapeHtml(
                user.specialization
              )}`
            : ""
        }

      </p>

      <div class="stats">

        <div>

          <small>
            النقاط
          </small>

          <strong>
            ${Number(user.points || 0)}
          </strong>

        </div>

        <div>

          <small>
            الحساب
          </small>

          <strong>
            ${escapeHtml(
              user.student_no
            )}
          </strong>

        </div>

        <div>

          <small>
            الاختبارات
          </small>

          <strong>
            ${finished.length}
          </strong>

        </div>

      </div>

    </div>

    <div class="card">

      <div class="menu-row">
        <span>♙ المعلومات الشخصية</span>
        <span>‹</span>
      </div>

      <div class="menu-row">
        <span>▥ إحصائياتي</span>
        <span>‹</span>
      </div>

      <div class="menu-row">
        <span>♜ الإنجازات</span>
        <span>‹</span>
      </div>

      <div class="menu-row">
        <span>⚙ الإعدادات</span>
        <span>‹</span>
      </div>

      <div
        class="menu-row"
        id="logout"
      >
        <span>
          ↪ تسجيل الخروج
        </span>

        <span>‹</span>
      </div>

    </div>

    <div class="section-head">

      <h3>
        الاختبارات المنتهية
      </h3>

    </div>

    ${
      finished.length

        ? finished.map(item => `

          <div class="test-row">

            <div class="doc">
              ✓
            </div>

            <div class="grow">

              <h4>
                ${escapeHtml(item.name)}
              </h4>

              <p>
                ${escapeHtml(item.title)}
              </p>

            </div>

            <span class="score">
              ${item.score}/${item.total}
            </span>

          </div>

        `).join("")

        : `

          <div class="card muted">
            لا توجد اختبارات منتهية بعد.
          </div>

        `
    }

  `;

  document.getElementById(
    "logout"
  ).onclick = async () => {

    try {

      await api(
        "/api/logout",
        {
          method:"POST"
        }
      );

    } finally {

      location.href =
        `${API_BASE}/`;

    }

  };

  if (user.role === "school") {
    addSchoolTools();
  }

}

/* =========================================
   SCHOOL ADMIN TOOLS
========================================= */

function addSchoolTools() {

  view.insertAdjacentHTML(
    "beforeend",
    `

      <div class="card">

        <span class="admin-badge">
          حساب المدرسة
        </span>

        <h3>
          لوحة الإدارة
        </h3>

        <div
          class="menu-row"
          onclick="adminStudents()"
        >
          <span>
            إدارة الطلاب والتقارير
          </span>

          <span>‹</span>
        </div>

        <div
          class="menu-row"
          onclick="adminCreatePost()"
        >
          <span>
            إضافة منشور
          </span>

          <span>‹</span>
        </div>

        <div
          class="menu-row"
          onclick="adminAnnouncement()"
        >
          <span>
            تعديل الخبر الهام
          </span>

          <span>‹</span>
        </div>

        <div
          class="menu-row"
          onclick="adminStats()"
        >
          <span>
            تقارير المنصة والاختبارات
          </span>

          <span>‹</span>
        </div>

      </div>

    `
  );

}

/* =========================================
   ADMIN STUDENTS
========================================= */

window.adminStudents = async function() {

  try {

    const data =
      await api("/api/admin/students");

    openModal();

    modalContent.innerHTML = `

      <h2>
        إدارة الطلاب
      </h2>

      ${
        data.students.length

          ? data.students.map(student => `

            <div class="test-row">

              <div class="grow">

                <b>
                  ${escapeHtml(student.name)}
                </b>

                <p>
                  ${escapeHtml(
                    student.student_no
                  )}
                  •
                  ${Number(student.points || 0)}
                  نقطة
                </p>

              </div>

              <button
                class="btn btn-primary"
                onclick="addPoints(${Number(student.id)})"
                type="button"
              >
                + نقاط
              </button>

            </div>

          `).join("")

          : `
            <p class="muted">
              لا يوجد طلاب.
            </p>
          `
      }

      <button
        class="btn"
        onclick="closeModal()"
        type="button"
      >
        إغلاق
      </button>

    `;

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   ADD POINTS
========================================= */

window.addPoints = async function(id) {

  const value =
    prompt("كم نقطة؟");

  if (value === null) {
    return;
  }

  const amount =
    Number(value);

  if (!Number.isInteger(amount)) {

    alert(
      "أدخل رقماً صحيحاً."
    );

    return;
  }

  try {

    await api(
      `/api/admin/points/${id}`,
      {
        method:"POST",

        headers:{
          "Content-Type":
            "application/json"
        },

        body:JSON.stringify({
          amount
        })
      }
    );

    closeModal();

    await adminStudents();

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   CREATE POST
========================================= */

window.adminCreatePost = async function() {

  openModal();

  modalContent.innerHTML = `

    <h2>
      منشور جديد
    </h2>

    <div class="form-grid">

      <input
        id="pt"
        type="text"
        placeholder="عنوان المنشور"
      >

      <textarea
        id="pb"
        placeholder="اكتب نص المنشور هنا..."
      ></textarea>

      <button
        class="btn btn-primary"
        onclick="savePost()"
        type="button"
      >
        نشر المنشور
      </button>

      <button
        class="btn"
        onclick="closeModal()"
        type="button"
      >
        إغلاق
      </button>

    </div>

  `;

};

/* =========================================
   SAVE POST
========================================= */

window.savePost = async function() {

  const titleInput =
    document.getElementById("pt");

  const bodyInput =
    document.getElementById("pb");

  const postTitle =
    titleInput.value.trim();

  const postBody =
    bodyInput.value.trim();

  if (!postBody) {

    alert(
      "اكتب نص المنشور أولاً."
    );

    return;
  }

  try {

    await api(
      "/api/admin/posts",
      {
        method:"POST",

        headers:{
          "Content-Type":
            "application/json"
        },

        body:JSON.stringify({
          title:
            postTitle ||
            "منشور المدرسة",

          body:
            postBody
        })
      }
    );

    closeModal();

    await home();

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   ANNOUNCEMENT
========================================= */

window.adminAnnouncement = async function() {

  try {

    const data =
      await api("/api/home");

    openModal();

    modalContent.innerHTML = `

      <h2>
        الخبر الهام
      </h2>

      <div class="form-grid">

        <textarea
          id="annText"
          placeholder="اكتب الإعلان الهام..."
        >${escapeHtml(
          data.announcement || ""
        )}</textarea>

        <button
          class="btn btn-primary"
          onclick="saveAnn()"
          type="button"
        >
          حفظ الإعلان
        </button>

        <button
          class="btn"
          onclick="closeModal()"
          type="button"
        >
          إغلاق
        </button>

      </div>

    `;

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   SAVE ANNOUNCEMENT
========================================= */

window.saveAnn = async function() {

  const input =
    document.getElementById("annText");

  try {

    await api(
      "/api/admin/announcement",
      {
        method:"POST",

        headers:{
          "Content-Type":
            "application/json"
        },

        body:JSON.stringify({
          text:
            input.value
        })
      }
    );

    closeModal();

    await home();

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   MODAL
========================================= */

function openModal() {

  modal.classList.remove(
    "hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

}

window.closeModal = function() {

  modal.classList.add(
    "hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

};

modal.addEventListener(
  "click",
  event => {

    if (event.target === modal) {
      closeModal();
    }

  }
);

/* =========================================
   RANKING
========================================= */

async function ranking() {

  const data =
    await api("/api/ranking");

  const students =
    Array.isArray(data.students)
      ? data.students
      : [];

  view.innerHTML = `

    <div class="card">

      <input
        class="search"
        id="rankSearch"
        type="search"
        placeholder="ابحث عن طالب بالاسم..."
        autocomplete="off"
      >

    </div>

    <div id="rankList"></div>

  `;

  const draw = (query = "") => {

    const normalized =
      query.trim().toLowerCase();

    const list =
      students.filter(student =>
        String(student.name || "")
          .toLowerCase()
          .includes(normalized)
      );

    const top =
      list.slice(0, 3);

    document.getElementById(
      "rankList"
    ).innerHTML = `

      ${
        top.length

          ? `

            <div class="ranking-top">

              ${top.map(
                (student, index) => `

                  <div
                    class="podium ${
                      index === 0
                        ? "first"
                        : ""
                    }"
                  >

                    <div class="rank">
                      ${index + 1}
                    </div>

                    <strong>
                      ${escapeHtml(
                        student.name
                      )}
                    </strong>

                    <small>
                      ${Number(
                        student.points || 0
                      )}
                      نقطة
                    </small>

                  </div>

                `
              ).join("")}

            </div>

          `

          : ""
      }

      ${
        list.map(
          (student, index) => `

            <div class="rank-row">

              <div class="rank-no">
                ${index + 1}
              </div>

              <div class="rank-avatar">
                ♙
              </div>

              <div class="rank-name">

                <b>
                  ${escapeHtml(
                    student.name
                  )}
                </b>

                <div class="rank-points">
                  ${escapeHtml(
                    student.course || ""
                  )}
                </div>

              </div>

              <div class="rank-points">
                ${Number(
                  student.points || 0
                )}
                نقطة
              </div>

            </div>

          `
        ).join("")
      }

      ${
        !list.length

          ? `
            <div
              class="card muted"
              style="text-align:center"
            >
              لا توجد نتائج.
            </div>
          `

          : ""
      }

    `;

  };

  draw();

  document.getElementById(
    "rankSearch"
  ).oninput = event =>
    draw(event.target.value);

}

/* =========================================
   NOTIFICATIONS
========================================= */

document.getElementById(
  "notifyBtn"
).onclick = async () => {

  try {

    const data =
      await api("/api/home");

    openModal();

    modalContent.innerHTML = `

      <h2>
        التنبيهات
      </h2>

      ${
        data.notifications &&
        data.notifications.length

          ? data.notifications.map(
              notification => `

                <div class="card">

                  ${escapeHtml(
                    notification.body
                  )}

                </div>

              `
            ).join("")

          : `
            <p class="muted">
              لا توجد تنبيهات.
            </p>
          `
      }

      <button
        class="btn"
        onclick="closeModal()"
        type="button"
      >
        إغلاق
      </button>

    `;

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   ADMIN STATISTICS
========================================= */

window.adminStats = async function() {

  try {

    const [
      stats,
      testsData
    ] = await Promise.all([
      api("/api/admin/stats"),
      api("/api/admin/tests")
    ]);

    openModal();

    modalContent.innerHTML = `

      <h2>
        تقارير المدرسة
      </h2>

      <div class="stats">

        <div>

          <small>
            الطلاب
          </small>

          <strong>
            ${Number(stats.students || 0)}
          </strong>

        </div>

        <div>

          <small>
            الاختبارات
          </small>

          <strong>
            ${Number(stats.tests || 0)}
          </strong>

        </div>

        <div>

          <small>
            الممتحنون
          </small>

          <strong>
            ${Number(stats.attempts || 0)}
          </strong>

        </div>

      </div>

      <h3>
        الاختبارات
      </h3>

      ${
        testsData.tests.length

          ? testsData.tests.map(
              test => `

                <div class="test-row">

                  <div class="grow">

                    <b>
                      ${escapeHtml(
                        test.name
                      )}
                    </b>

                    <p>
                      ${Number(
                        test.participants || 0
                      )}
                      ممتحن
                      •
                      ${Number(
                        test.question_count || 0
                      )}
                      سؤال
                    </p>

                  </div>

                  <button
                    class="btn btn-primary"
                    onclick="testReport(${Number(test.id)})"
                    type="button"
                  >
                    التقرير
                  </button>

                </div>

              `
            ).join("")

          : `
            <p class="muted">
              لا توجد اختبارات.
            </p>
          `
      }

      <button
        class="btn"
        onclick="closeModal()"
        type="button"
      >
        إغلاق
      </button>

    `;

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   TEST REPORT
========================================= */

window.testReport = async function(id) {

  try {

    const data =
      await api(
        `/api/admin/test-reports/${id}`
      );

    modalContent.innerHTML = `

      <h2>
        ${escapeHtml(
          data.test.name
        )}
      </h2>

      <p class="muted">
        عدد الممتحنين:
        ${data.attempts.length}
      </p>

      ${
        data.attempts.length

          ? data.attempts.map(
              (attempt, index) => `

                <div class="rank-row">

                  <div class="rank-no">
                    ${index + 1}
                  </div>

                  <div class="rank-avatar">
                    ♙
                  </div>

                  <div class="rank-name">

                    <b>
                      ${escapeHtml(
                        attempt.name
                      )}
                    </b>

                    <div class="rank-points">
                      ${escapeHtml(
                        attempt.student_no
                      )}
                    </div>

                  </div>

                  <strong>
                    ${attempt.score}/${attempt.total}
                  </strong>

                </div>

              `
            ).join("")

          : `
            <p class="muted">
              لم ينته أحد الاختبار بعد.
            </p>
          `
      }

      <button
        class="btn"
        onclick="adminStats()"
        type="button"
      >
        عودة
      </button>

    `;

  } catch (error) {

    alert(error.message);

  }

};

/* =========================================
   ERROR UI
========================================= */

function showError(message) {

  view.innerHTML = `

    <div
      class="card"
      style="text-align:center"
    >

      <div
        style="
          font-size:42px;
          margin-bottom:10px;
        "
      >
        !
      </div>

      <h3>
        تعذر تحميل الصفحة
      </h3>

      <p class="muted">
        ${escapeHtml(
          message ||
          "حدث خطأ غير متوقع."
        )}
      </p>

      <button
        class="btn btn-primary"
        onclick="location.reload()"
        type="button"
      >
        إعادة المحاولة
      </button>

    </div>

  `;

}

/* =========================================
   SECURITY HELPERS
========================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    character => {

      if (character === "&")
        return "&amp;";

      if (character === "<")
        return "&lt;";

      if (character === ">")
        return "&gt;";

      if (character === '"')
        return "&quot;";

      return "&#039;";

    }
  );

}

function escapeAttr(value) {

  return escapeHtml(value)
    .replace(/`/g, "&#096;");

}

/* =========================================
   START
========================================= */

init();
