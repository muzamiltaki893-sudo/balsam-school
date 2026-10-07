"use strict";

/* =========================================================
   مدرسة البلسم الثانوية
   التطبيق الرئيسي
   ========================================================= */

const CONFIG = window.BALSAM_CONFIG || {};

if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    console.error("Supabase configuration is missing.");
}

const sb = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseAnonKey
);


/* =========================================================
   الحالة العامة
========================================================= */

const state = {
    student: null,
    subjects: [],
    posts: [],
    notice: null,

    currentPage: "home",

    currentSubject: null,
    currentPart: null,

    quiz: {
        active: false,
        questions: [],
        currentIndex: 0,
        answers: [],
        correct: 0,
        wrong: 0,
        startTime: 0,
        timer: null,
        secondsLeft: 600,
        finished: false
    }
};


/* =========================================================
   العناصر
========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const studentNumberInput = document.getElementById("studentNumber");
const passwordInput = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");

const appContent = document.getElementById("appContent");
const studentChip = document.getElementById("studentChip");


/* =========================================================
   أدوات عامة
========================================================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function shuffle(array) {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}


function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    return [];
}


function showMessage(message, type = "error") {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
}


function setLoading(button, loading, text = "دخول إلى منصتي") {
    if (!button) return;

    button.disabled = loading;

    button.innerHTML = loading
        ? `
            <span>جارٍ الدخول...</span>
            <span class="button-arrow">...</span>
          `
        : `
            <span>${text}</span>
            <span class="button-arrow">←</span>
          `;
}


/* =========================================================
   أيقونات SVG
========================================================= */

const ICONS = {

    user: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2"></circle>
            <path d="M5.5 20c.8-3.5 3-5.2 6.5-5.2s5.7 1.7 6.5 5.2"></path>
        </svg>
    `,

    book: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z"></path>
            <path d="M5 18a2 2 0 0 1 2-2h12"></path>
            <path d="M9 8h6M9 11h6"></path>
        </svg>
    `,

    layers: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 4 8 4-8 4-8-4z"></path>
            <path d="m4 12 8 4 8-4"></path>
            <path d="m4 16 8 4 8-4"></path>
        </svg>
    `,

    test: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2"></rect>
            <path d="M9 7h6M9 11h6M9 15h3"></path>
        </svg>
    `,

    trophy: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4h8v4a4 4 0 0 1-8 0z"></path>
            <path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3"></path>
            <path d="M12 12v5M8 20h8M9 17h6"></path>
        </svg>
    `,

    logout: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"></path>
            <path d="M14 8l4 4-4 4"></path>
            <path d="M9 12h9"></path>
        </svg>
    `,

    arrow: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14"></path>
            <path d="m13 6 6 6-6 6"></path>
        </svg>
    `,

    download: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11"></path>
            <path d="m7 11 5 5 5-5"></path>
            <path d="M5 20h14"></path>
        </svg>
    `,

    external: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 5h5v5"></path>
            <path d="M19 5 11 13"></path>
            <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path>
        </svg>
    `,

    check: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 4 4L19 6"></path>
        </svg>
    `,

    close: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18"></path>
        </svg>
    `
};


/* =========================================================
   تسجيل الدخول
========================================================= */

async function loginStudent(studentNumber, password) {

    const { data, error } = await sb.rpc(
        "login_student",
        {
            p_student_number: studentNumber,
            p_password: password
        }
    );

    if (error) {
        throw error;
    }

    let student = data;

    if (Array.isArray(data)) {
        student = data[0];
    }

    if (!student) {
        throw new Error("رقم الطالب أو كلمة المرور غير صحيحة.");
    }

    return student;
}


async function handleLogin(event) {

    event.preventDefault();

    const studentNumber = studentNumberInput.value.trim();
    const password = passwordInput.value;

    if (!studentNumber || !password) {
        showMessage("يرجى إدخال رقم الطالب وكلمة المرور.");
        return;
    }

    setLoading(loginButton, true);

    showMessage("");

    try {

        const student = await loginStudent(
            studentNumber,
            password
        );

        state.student = student;

        localStorage.setItem(
            "balsam_student",
            JSON.stringify(student)
        );

        showApplication();

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "حدث خطأ أثناء تسجيل الدخول."
        );

    } finally {

        setLoading(loginButton, false);

    }
}


/* =========================================================
   تسجيل الخروج
========================================================= */

function logoutStudent() {

    if (state.quiz.active) {

        const confirmed = confirm(
            "الاختبار ما زال مفتوحًا. هل تريد الخروج منه وتسجيل الخروج؟"
        );

        if (!confirmed) {
            return;
        }
    }

    stopQuizTimer();

    state.student = null;

    state.currentPage = "home";
    state.currentSubject = null;
    state.currentPart = null;

    state.quiz.active = false;
    state.quiz.finished = true;

    localStorage.removeItem("balsam_student");

    if (appScreen) {
        appScreen.classList.add("hidden");
    }

    if (loginScreen) {
        loginScreen.classList.remove("hidden");
    }

    if (loginForm) {
        loginForm.reset();
    }

    showMessage("");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   استعادة الجلسة
========================================================= */

function restoreSession() {

    try {

        const saved = localStorage.getItem(
            "balsam_student"
        );

        if (!saved) {
            return false;
        }

        const student = JSON.parse(saved);

        if (!student || typeof student !== "object") {
            return false;
        }

        state.student = student;

        showApplication();

        return true;

    } catch (error) {

        console.error(error);

        localStorage.removeItem(
            "balsam_student"
        );

        return false;
    }
}


/* =========================================================
   إظهار التطبيق
========================================================= */

async function showApplication() {

    if (!state.student) return;

    if (loginScreen) {
        loginScreen.classList.add("hidden");
    }

    if (appScreen) {
        appScreen.classList.remove("hidden");
    }

    updateStudentChip();

    await loadStaticData();

    renderPage("home");
}


function updateStudentChip() {

    if (!studentChip || !state.student) return;

    studentChip.textContent =
        state.student.name ||
        "الطالب";
}


/* =========================================================
   تحميل البيانات الثابتة
========================================================= */

async function fetchJSON(url) {

    const response = await fetch(
        `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`
    );

    if (!response.ok) {
        throw new Error(
            `تعذر تحميل ${url}`
        );
    }

    return response.json();
}


async function loadStaticData() {

    try {

        const [
            subjects,
            posts,
            notice
        ] = await Promise.all([

            fetchJSON("data/subjects.json"),

            fetchJSON("data/posts.json")
                .catch(() => []),

            fetchJSON("data/notice.json")
                .catch(() => null)

        ]);

        state.subjects =
            normalizeSubjects(subjects);

        state.posts =
            Array.isArray(posts)
                ? posts
                : [];

        state.notice =
            notice;

    } catch (error) {

        console.error(error);

        state.subjects = [];
        state.posts = [];
        state.notice = null;
    }
}


/* =========================================================
   توحيد بنية المواد
========================================================= */

function normalizeSubjects(data) {

    if (Array.isArray(data)) {
        return data.map(normalizeSubject);
    }

    if (data && Array.isArray(data.subjects)) {
        return data.subjects.map(normalizeSubject);
    }

    if (data && Array.isArray(data.categories)) {

        const result = [];

        data.categories.forEach(category => {

            const subjects =
                category.subjects ||
                category.materials ||
                [];

            subjects.forEach(subject => {

                result.push(
                    normalizeSubject({
                        ...subject,
                        category:
                            subject.category ||
                            category.name ||
                            category.title
                    })
                );

            });

        });

        return result;
    }

    return [];
}


function normalizeSubject(subject) {

    const parts =
        subject.parts ||
        subject.sections ||
        subject.units ||
        [];

    return {
        ...subject,

        id:
            subject.id ||
            subject.slug ||
            subject.name,

        name:
            subject.name ||
            subject.title ||
            "مادة",

        category:
            subject.category ||
            subject.section ||
            "المواد الدراسية",

        description:
            subject.description ||
            "",

        icon:
            subject.icon ||
            "book",

        parts:
            parts.map((part, index) => ({

                ...part,

                id:
                    part.id ||
                    part.slug ||
                    `part-${index + 1}`,

                name:
                    part.name ||
                    part.title ||
                    `الجزء ${index + 1}`,

                /*
                 * مهم:
                 * part.questions في subjects.json
                 * عبارة عن نص مثل:
                 * "اختبار 20 سؤالاً"
                 *
                 * وليس مسار ملف JSON.
                 *
                 * لذلك نستخدم file فقط.
                 */

                file:
                    part.file ||
                    part.json ||
                    part.questionsFile ||
                    "",

                pdf:
                    part.pdf ||
                    part.book ||
                    part.pdfUrl ||
                    "",

                duration:
                    Number(part.duration) ||
                    10,

                questionCount:
                    Number(part.questionCount) ||
                    Number(part.questionsCount) ||
                    20

            }))

    };
}


/* =========================================================
   التنقل
========================================================= */

function setActiveNav(page) {

    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });
}


function renderPage(page) {

    if (state.quiz.active) {

        if (page !== "quiz") {
            return;
        }
    }

    state.currentPage = page;

    setActiveNav(page);

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    switch (page) {

        case "home":
            renderHome();
            break;

        case "library":
            renderLibrary();
            break;

        case "ranking":
            renderRanking();
            break;

        case "profile":
            renderProfile();
            break;

        default:
            renderHome();
    }
}


/* =========================================================
   الصفحة الرئيسية
========================================================= */

function renderHome() {

    const studentName =
        state.student?.name ||
        "الطالب";

    const specialization =
        state.student?.specialization ||
        "طالب مدرسة البلسم الثانوية";

    const points =
        Number(state.student?.points) || 0;

    const level =
        state.student?.level ||
        "مبتدئ";


    const noticeText =
        typeof state.notice === "string"
            ? state.notice
            : state.notice?.text ||
              state.notice?.content ||
              "تابع دروسك واختباراتك باستمرار وواصل تقدمك.";


    appContent.innerHTML = `

        <section class="page home-page">

            <div class="home-hero">

                <div class="home-hero-main">

                    <div class="hero-user-icon">
                        ${ICONS.user}
                    </div>

                    <div>

                        <span class="eyebrow">
                            مرحبًا بك في مساحتك التعليمية
                        </span>

                        <h1>
                            ${escapeHTML(studentName)}
                        </h1>

                        <p>
                            ${escapeHTML(specialization)}
                        </p>

                    </div>

                </div>


                <div class="hero-stats">

                    <div class="mini-stat">
                        <strong>${points}</strong>
                        <span>نقطة</span>
                    </div>

                    <div class="mini-stat">
                        <strong>${escapeHTML(level)}</strong>
                        <span>المستوى</span>
                    </div>

                </div>

            </div>


            <div class="ayah-card">

                <div class="ayah-icon">
                    ${ICONS.book}
                </div>

                <div>

                    <span>
                        آية اليوم
                    </span>

                    <strong>
                        ﴿وَقُلْ رَبِّ زِدْنِي عِلْمًا﴾
                    </strong>

                    <small>
                        سورة طه — 114
                    </small>

                </div>

            </div>


            <div class="notice-card">

                <div class="notice-heading">

                    <span class="notice-icon">
                        !
                    </span>

                    <div>

                        <span>
                            إشعار مهم
                        </span>

                        <strong>
                            من مدرسة البلسم
                        </strong>

                    </div>

                </div>

                <p>
                    ${escapeHTML(noticeText)}
                </p>

            </div>


            <button
                type="button"
                class="library-banner"
                data-page-action="library"
            >

                <span class="library-banner-icon">
                    ${ICONS.book}
                </span>

                <span>

                    <strong>
                        المكتبة التعليمية
                    </strong>

                    <small>
                        المواد والأجزاء والاختبارات
                    </small>

                </span>

                <span class="banner-arrow">
                    ${ICONS.arrow}
                </span>

            </button>


            <section class="posts-section">

                <div class="section-heading">

                    <div>
                        <span>آخر المستجدات</span>
                        <h2>منشورات المدرسة</h2>
                    </div>

                </div>


                <div class="posts-list">

                    ${
                        state.posts.length
                            ? state.posts
                                .map(renderPost)
                                .join("")
                            : `
                                <div class="empty-state">
                                    لا توجد منشورات حاليًا.
                                </div>
                              `
                    }

                </div>

            </section>

        </section>
    `;
}


function renderPost(post) {

    const author =
        post.author ||
        post.publisher ||
        "مدرسة البلسم الثانوية";

    const text =
        post.text ||
        post.content ||
        post.body ||
        "";

    const date =
        post.date ||
        post.created_at ||
        "";


    return `

        <article class="post-card">

            <div class="post-header">

                <div class="post-author-icon">
                    ${ICONS.user}
                </div>

                <div>

                    <strong>
                        ${escapeHTML(author)}
                    </strong>

                    ${
                        date
                            ? `<small>${escapeHTML(date)}</small>`
                            : ""
                    }

                </div>

            </div>

            <p>
                ${escapeHTML(text)}
            </p>

        </article>
    `;
}


/* =========================================================
   المكتبة
========================================================= */

function renderLibrary() {

    const categories = groupSubjectsByCategory();

    appContent.innerHTML = `

        <section class="page library-page">

            <div class="page-header">

                <span class="eyebrow">
                    المعرفة تبدأ من هنا
                </span>

                <h1>
                    المكتبة
                </h1>

                <p>
                    اختر القسم ثم المادة للوصول إلى أجزاء الدروس والاختبارات.
                </p>

            </div>


            <div class="library-categories">

                ${
                    categories.length
                        ? categories
                            .map(renderCategory)
                            .join("")
                        : `
                            <div class="empty-state">
                                لم يتم العثور على المواد.
                            </div>
                          `
                }

            </div>

        </section>
    `;
}


function groupSubjectsByCategory() {

    const map = new Map();

    state.subjects.forEach(subject => {

        const category =
            subject.category ||
            "المواد الدراسية";

        if (!map.has(category)) {
            map.set(category, []);
        }

        map.get(category).push(subject);

    });

    return Array.from(map.entries())
        .map(([name, subjects]) => ({
            name,
            subjects
        }));
}


function renderCategory(category, index) {

    return `

        <section class="library-category">

            <div class="category-header">

                <div class="category-number">
                    ${String(index + 1).padStart(2, "0")}
                </div>

                <div>

                    <span>
                        القسم
                    </span>

                    <h2>
                        ${escapeHTML(category.name)}
                    </h2>

                </div>

                <span class="category-count">
                    ${category.subjects.length} مادة
                </span>

            </div>


            <div class="subjects-grid">

                ${
                    category.subjects
                        .map(renderSubjectCard)
                        .join("")
                }

            </div>

        </section>
    `;
}


function renderSubjectCard(subject) {

    const partCount =
        subject.parts?.length || 0;


    return `

        <button
            type="button"
            class="subject-card"
            data-subject-id="${escapeHTML(subject.id)}"
        >

            <span class="subject-card-icon">
                ${ICONS.book}
            </span>

            <span class="subject-card-content">

                <strong>
                    ${escapeHTML(subject.name)}
                </strong>

                <small>
                    ${partCount} أجزاء
                </small>

            </span>

            <span class="subject-card-arrow">
                ${ICONS.arrow}
            </span>

        </button>
    `;
}


/* =========================================================
   صفحة المادة
========================================================= */

function openSubject(subjectId) {

    const subject =
        state.subjects.find(
            item => String(item.id) === String(subjectId)
        );

    if (!subject) {
        return;
    }

    state.currentSubject = subject;

    renderSubject(subject);
}


function renderSubject(subject) {

    const parts =
        subject.parts || [];


    appContent.innerHTML = `

        <section class="page subject-page">

            <button
                type="button"
                class="back-button"
                data-page-action="library"
            >
                ${ICONS.arrow}
                <span>العودة إلى المكتبة</span>
            </button>


            <div class="subject-hero">

                <div class="subject-main-icon">
                    ${ICONS.book}
                </div>

                <div>

                    <span class="eyebrow">
                        ${escapeHTML(subject.category)}
                    </span>

                    <h1>
                        ${escapeHTML(subject.name)}
                    </h1>

                    <p>
                        ${
                            escapeHTML(
                                subject.description ||
                                "اختر الجزء الذي تريد دراسته ثم ابدأ الاختبار."
                            )
                        }
                    </p>

                </div>

            </div>


            <div class="section-heading compact">

                <div>
                    <span>محتوى المادة</span>

                    <h2>
                        الأجزاء والاختبارات
                    </h2>
                </div>

                <strong>
                    ${parts.length} أجزاء
                </strong>

            </div>


            <div class="parts-grid">

                ${
                    parts.length
                        ? parts
                            .map(
                                (part, index) =>
                                    renderPartCard(
                                        part,
                                        index,
                                        subject
                                    )
                            )
                            .join("")
                        : `
                            <div class="empty-state">
                                لا توجد أجزاء لهذه المادة حاليًا.
                            </div>
                          `
                }

            </div>

        </section>
    `;
}


function renderPartCard(part, index, subject) {

    const hasQuestions =
        Boolean(part.file);

    /*
     * أبقينا نظام الكتاب كما هو.
     * إذا كان ملف الكتاب موجودًا على الجزء،
     * سيظهر كما كان في الكود الأصلي.
     */

    const hasPDF =
        Boolean(part.pdf);


    return `

        <article class="part-card">

            <div class="part-top">

                <span class="part-number">
                    ${String(index + 1).padStart(2, "0")}
                </span>

                <span class="part-icon">
                    ${ICONS.layers}
                </span>

            </div>


            <div class="part-content">

                <span>
                    الجزء ${index + 1}
                </span>

                <h3>
                    ${escapeHTML(part.name)}
                </h3>

                <p>
                    اختبار ${
                        part.questionCount || 20
                    } سؤال · ${
                        part.duration || 10
                    } دقائق
                </p>

            </div>


            <div class="part-actions">

                ${
                    hasQuestions
                        ? `
                            <button
                                type="button"
                                class="primary-button part-test-button"
                                data-start-part="${escapeHTML(part.id)}"
                            >
                                ${ICONS.test}
                                <span>ابدأ الاختبار</span>
                            </button>
                          `
                        : `
                            <button
                                type="button"
                                class="primary-button"
                                disabled
                            >
                                لا يوجد اختبار
                            </button>
                          `
                }


                ${
                    hasPDF
                        ? `
                            <div class="book-actions">

                                <a
                                    class="secondary-button"
                                    href="${escapeHTML(part.pdf)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    ${ICONS.external}
                                    <span>فتح الكتاب</span>
                                </a>


                                <a
                                    class="secondary-button download-book"
                                    href="${escapeHTML(part.pdf)}"
                                    download
                                >
                                    ${ICONS.download}
                                    <span>تنزيل PDF</span>
                                </a>

                            </div>
                          `
                        : ""
                }

            </div>

        </article>
    `;
}


/* =========================================================
   تحميل أسئلة الجزء
========================================================= */

async function loadQuestions(file) {

    if (!file) {
        throw new Error(
            "لا يوجد ملف أسئلة مرتبط بهذا الجزء."
        );
    }

    const data = await fetchJSON(file);

    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.questions)) {
        return data.questions;
    }

    if (data && Array.isArray(data.items)) {
        return data.items;
    }

    throw new Error(
        "صيغة ملف الأسئلة غير صحيحة."
    );
}


/* =========================================================
   بدء الاختبار
========================================================= */

async function startPartQuiz(partId) {

    const subject =
        state.currentSubject;

    if (!subject) {
        return;
    }

    const part =
        subject.parts.find(
            item =>
                String(item.id) === String(partId)
        );

    if (!part) {
        return;
    }

    if (!part.file) {
        alert(
            "هذا الجزء لا يحتوي على ملف أسئلة."
        );

        return;
    }

    try {

        appContent.innerHTML = `

            <section class="quiz-loading">

                <div class="loading-orb"></div>

                <h2>
                    تجهيز الاختبار...
                </h2>

                <p>
                    يتم تحميل أسئلة ${escapeHTML(part.name)}
                </p>

            </section>
        `;


        const rawQuestions =
            await loadQuestions(part.file);


        if (!rawQuestions.length) {
            throw new Error(
                "ملف الأسئلة فارغ."
            );
        }


        const normalized =
            rawQuestions
                .map(normalizeQuestion)
                .filter(Boolean);


        if (!normalized.length) {
            throw new Error(
                "لم يتم العثور على أسئلة صالحة."
            );
        }


        /*
         * كل اختبار = 20 سؤالًا.
         *
         * إذا كان الملف يحتوي على أكثر من 20 سؤالًا:
         * يتم اختيار 20 سؤالًا عشوائيًا.
         *
         * إذا كان يحتوي على أقل من 20:
         * يتم استخدام الموجود.
         */

        const questionCount =
            Math.min(
                Number(part.questionCount) || 20,
                normalized.length
            );


        const questions =
            shuffle(normalized)
                .slice(0, questionCount);


        state.currentPart = part;

        state.quiz = {

            active: true,

            questions,

            currentIndex: 0,

            answers:
                new Array(questions.length)
                    .fill(null),

            correct: 0,

            wrong: 0,

            startTime: Date.now(),

            timer: null,

            secondsLeft:
                (Number(part.duration) || 10) * 60,

            finished: false

        };


        renderQuiz();

        startQuizTimer();


    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "حدث خطأ أثناء تحميل الاختبار."
        );

        renderSubject(subject);
    }
}


/* =========================================================
   توحيد السؤال
========================================================= */

function normalizeQuestion(question) {

    if (!question || typeof question !== "object") {
        return null;
    }

    const text =
        question.q ||
        question.question ||
        question.text;

    const correct =
        question.a ||
        question.answer ||
        question.correct;

    const wrong =
        question.w ||
        question.wrong ||
        question.options ||
        [];


    if (!text || !correct) {
        return null;
    }


    const options = [

        String(correct),

        ...normalizeArray(wrong)
            .map(item => String(item))

    ];


    const uniqueOptions =
        [...new Set(options)];


    return {

        q: String(text),

        a: String(correct),

        options:
            shuffle(uniqueOptions)

    };
}


/* =========================================================
   واجهة الاختبار
========================================================= */

function renderQuiz() {

    const quiz =
        state.quiz;

    if (!quiz.active) {
        return;
    }


    const question =
        quiz.questions[
            quiz.currentIndex
        ];


    if (!question) {
        finishQuiz();
        return;
    }


    const total =
        quiz.questions.length;

    const current =
        quiz.currentIndex + 1;

    const selected =
        quiz.answers[
            quiz.currentIndex
        ];


    const progress =
        (current / total) * 100;


    appContent.innerHTML = `

        <section class="quiz-page">

            <header class="quiz-header">

                <button
                    type="button"
                    class="quiz-exit"
                    data-quiz-exit
                    aria-label="الخروج من الاختبار"
                >
                    ${ICONS.close}
                </button>


                <div class="quiz-title">

                    <span>
                        ${escapeHTML(
                            state.currentSubject?.name ||
                            "الاختبار"
                        )}
                    </span>

                    <strong>
                        ${escapeHTML(
                            state.currentPart?.name ||
                            ""
                        )}
                    </strong>

                </div>


                <div
                    class="quiz-timer"
                    id="quizTimer"
                >
                    10:00
                </div>

            </header>


            <div class="quiz-progress">

                <div
                    class="quiz-progress-bar"
                    style="width:${progress}%"
                ></div>

            </div>


            <div class="quiz-question-meta">

                <span>
                    السؤال ${current} من ${total}
                </span>

                <span>
                    اختر إجابة واحدة
                </span>

            </div>


            <article class="question-card">

                <div class="question-number">
                    ${String(current).padStart(2, "0")}
                </div>

                <h1>
                    ${escapeHTML(question.q)}
                </h1>

            </article>


            <div class="answers-list">

                ${
                    question.options
                        .map(
                            (option, index) => `
                                <button
                                    type="button"
                                    class="answer-button ${
                                        selected === option
                                            ? "selected"
                                            : ""
                                    }"
                                    data-answer="${escapeHTML(option)}"
                                >

                                    <span class="answer-letter">
                                        ${String.fromCharCode(
                                            65 + index
                                        )}
                                    </span>

                                    <span class="answer-text">
                                        ${escapeHTML(option)}
                                    </span>

                                </button>
                            `
                        )
                        .join("")
                }

            </div>


            <div class="quiz-footer">

                <button
                    type="button"
                    class="secondary-button"
                    data-quiz-exit
                >
                    خروج
                </button>


                <button
                    type="button"
                    class="primary-button quiz-next"
                    data-next-question
                    ${
                        selected === null
                            ? "disabled"
                            : ""
                    }
                >
                    <span>
                        ${
                            current === total
                                ? "إنهاء الاختبار"
                                : "السؤال التالي"
                        }
                    </span>

                    ${ICONS.arrow}

                </button>

            </div>

        </section>
    `;


    updateQuizTimerDisplay();
}


/* =========================================================
   اختيار إجابة
========================================================= */

function selectAnswer(answer) {

    if (!state.quiz.active) {
        return;
    }

    state.quiz.answers[
        state.quiz.currentIndex
    ] = answer;


    document
        .querySelectorAll(".answer-button")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.answer === answer
            );

        });


    const nextButton =
        document.querySelector(
            "[data-next-question]"
        );

    if (nextButton) {
        nextButton.disabled = false;
    }
}


/* =========================================================
   السؤال التالي
========================================================= */

function nextQuestion() {

    if (!state.quiz.active) {
        return;
    }


    const selected =
        state.quiz.answers[
            state.quiz.currentIndex
        ];


    if (selected === null) {
        return;
    }


    const question =
        state.quiz.questions[
            state.quiz.currentIndex
        ];


    if (selected === question.a) {
        state.quiz.correct++;
    } else {
        state.quiz.wrong++;
    }


    if (
        state.quiz.currentIndex >=
        state.quiz.questions.length - 1
    ) {

        finishQuiz();

        return;
    }


    state.quiz.currentIndex++;

    renderQuiz();
}


/* =========================================================
   المؤقت
========================================================= */

function startQuizTimer() {

    stopQuizTimer();


    state.quiz.timer =
        setInterval(() => {

            if (!state.quiz.active) {
                return;
            }


            state.quiz.secondsLeft--;


            updateQuizTimerDisplay();


            if (
                state.quiz.secondsLeft <= 0
            ) {

                clearInterval(
                    state.quiz.timer
                );

                state.quiz.timer = null;

                finishQuiz(true);
            }

        }, 1000);
}


function stopQuizTimer() {

    if (state.quiz.timer) {

        clearInterval(
            state.quiz.timer
        );

        state.quiz.timer = null;
    }
}


function updateQuizTimerDisplay() {

    const element =
        document.getElementById(
            "quizTimer"
        );

    if (!element) {
        return;
    }


    const totalSeconds =
        Math.max(
            0,
            state.quiz.secondsLeft
        );


    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const seconds =
        totalSeconds % 60;


    element.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


    element.classList.toggle(
        "danger",
        totalSeconds <= 60
    );
}


/* =========================================================
   إنهاء الاختبار
========================================================= */

async function finishQuiz(timeExpired = false) {

    if (
        !state.quiz.active ||
        state.quiz.finished
    ) {
        return;
    }


    state.quiz.finished = true;

    stopQuizTimer();


    const currentIndex =
        state.quiz.currentIndex;

    const currentQuestion =
        state.quiz.questions[
            currentIndex
        ];

    const currentAnswer =
        state.quiz.answers[
            currentIndex
        ];


    if (
        currentQuestion &&
        currentAnswer !== null &&
        currentIndex ===
            state.quiz.questions.length - 1
    ) {

        const alreadyCounted =
            state.quiz.correct +
            state.quiz.wrong;


        if (
            alreadyCounted <
            state.quiz.questions.length
        ) {

            if (
                currentAnswer ===
                currentQuestion.a
            ) {
                state.quiz.correct++;
            } else {
                state.quiz.wrong++;
            }
        }
    }


    const total =
        state.quiz.questions.length;


    const correct =
        state.quiz.correct;


    const wrong =
        state.quiz.wrong;


    const durationSeconds =
        Math.floor(
            (
                Date.now() -
                state.quiz.startTime
            ) / 1000
        );


    await saveTestResult(
        state.currentSubject,
        state.currentPart,
        correct,
        total,
        wrong,
        durationSeconds
    );


    renderQuizResult(
        correct,
        total,
        wrong,
        timeExpired
    );


    state.quiz.active = false;
}


/* =========================================================
   حفظ نتيجة الاختبار
========================================================= */

async function saveTestResult(
    subject,
    part,
    score,
    totalQuestions,
    wrongAnswers,
    durationSeconds
) {

    if (!state.student) {
        return;
    }


    try {

        const { error } =
            await sb.rpc(
                "submit_test_result",
                {
                    p_student_id:
                        state.student.id,

                    p_subject:
                        subject?.name ||
                        "",

                    p_part:
                        part?.name ||
                        "",

                    p_score:
                        score,

                    p_total_questions:
                        totalQuestions,

                    p_correct_answers:
                        score,

                    p_wrong_answers:
                        wrongAnswers,

                    p_duration_seconds:
                        durationSeconds
                }
            );


        if (error) {
            throw error;
        }


        const oldPoints =
            Number(
                state.student.points
            ) || 0;


        state.student.points =
            oldPoints + score;


        state.student.tests =
            (
                Number(
                    state.student.tests
                ) || 0
            ) + 1;


        state.student.correct =
            (
                Number(
                    state.student.correct
                ) || 0
            ) + score;


        state.student.wrong =
            (
                Number(
                    state.student.wrong
                ) || 0
            ) + wrongAnswers;


        localStorage.setItem(
            "balsam_student",
            JSON.stringify(
                state.student
            )
        );


    } catch (error) {

        console.error(
            "submit_test_result:",
            error
        );
    }
}


/* =========================================================
   صفحة النتيجة
========================================================= */

function renderQuizResult(
    correct,
    total,
    wrong,
    timeExpired
) {

    const percentage =
        total
            ? Math.round(
                (correct / total) * 100
            )
            : 0;


    let message =
        "استمر، كل اختبار يقربك أكثر من هدفك.";


    if (percentage >= 90) {

        message =
            "ممتاز جدًا! أداء قوي يدل على تقدم رائع.";

    } else if (percentage >= 75) {

        message =
            "أداء ممتاز، واصل بنفس التركيز.";

    } else if (percentage >= 50) {

        message =
            "نتيجة جيدة، ويمكنك رفع مستواك أكثر بالمراجعة.";

    }


    appContent.innerHTML = `

        <section class="quiz-result-page">

            <div class="result-icon">
                ${ICONS.check}
            </div>


            <span class="eyebrow">
                ${timeExpired ? "انتهى الوقت" : "اكتمل الاختبار"}
            </span>


            <h1>
                أحسنت، انتهيت من الاختبار
            </h1>


            <p>
                ${escapeHTML(message)}
            </p>


            <div class="result-score">

                <strong>
                    ${correct}
                </strong>

                <span>
                    من ${total}
                </span>

            </div>


            <div class="result-stats">

                <div>
                    <strong>
                        ${percentage}%
                    </strong>
                    <span>
                        النسبة
                    </span>
                </div>

                <div>
                    <strong>
                        ${correct}
                    </strong>
                    <span>
                        صحيح
                    </span>
                </div>

                <div>
                    <strong>
                        ${wrong}
                    </strong>
                    <span>
                        خطأ
                    </span>
                </div>

            </div>


            <div class="result-actions">

                <button
                    type="button"
                    class="primary-button"
                    data-page-action="subject"
                >
                    العودة إلى المادة
                </button>


                <button
                    type="button"
                    class="secondary-button"
                    data-page-action="library"
                >
                    العودة إلى المكتبة
                </button>

            </div>

        </section>
    `;
}


/* =========================================================
   الترتيب
========================================================= */

async function renderRanking() {

    appContent.innerHTML = `

        <section class="page ranking-page">

            <div class="page-header">

                <span class="eyebrow">
                    تنافس وواصل التقدم
                </span>

                <h1>
                    ترتيب الطلاب
                </h1>

                <p>
                    ترتيب الطلاب حسب النقاط المسجلة في المنصة.
                </p>

            </div>


            <div
                class="ranking-list"
                id="rankingList"
            >

                <div class="loading-state">
                    جارٍ تحميل الترتيب...
                </div>

            </div>

        </section>
    `;


    try {

        const { data, error } =
            await sb.rpc(
                "get_ranking"
            );


        if (error) {
            throw error;
        }


        /*
         * دعم أكثر من شكل محتمل للبيانات
         * التي يرجعها RPC.
         */

        const students =
            Array.isArray(data)
                ? data
                : Array.isArray(data?.ranking)
                    ? data.ranking
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];


        const rankingList =
            document.getElementById(
                "rankingList"
            );


        if (!rankingList) {
            return;
        }


        if (!students.length) {

            rankingList.innerHTML = `

                <div class="empty-state">

                    لا توجد بيانات ترتيب حاليًا.

                </div>
            `;

            return;
        }


        rankingList.innerHTML =
            students
                .map(
                    (student, index) =>
                        renderRankingStudent(
                            student,
                            index
                        )
                )
                .join("");


    } catch (error) {

        console.error(error);

        const rankingList =
            document.getElementById(
                "rankingList"
            );


        if (rankingList) {

            rankingList.innerHTML = `

                <div class="empty-state error-state">

                    تعذر تحميل الترتيب حاليًا.

                </div>
            `;
        }
    }
}


function renderRankingStudent(
    student,
    index
) {

    const name =
        student.name ||
        student.student_name ||
        "طالب";


    const points =
        Number(
            student.points ??
            student.total_points ??
            0
        );


    const specialization =
        student.specialization ||
        "";


    return `

        <article class="ranking-item">

            <div class="ranking-position">
                ${index + 1}
            </div>


            <div class="ranking-avatar">
                ${ICONS.user}
            </div>


            <div class="ranking-info">

                <strong>
                    ${escapeHTML(name)}
                </strong>

                ${
                    specialization
                        ? `
                            <small>
                                ${escapeHTML(specialization)}
                            </small>
                          `
                        : ""
                }

            </div>


            <div class="ranking-points">

                <strong>
                    ${points}
                </strong>

                <span>
                    نقطة
                </span>

            </div>

        </article>
    `;
}


/* =========================================================
   الملف الشخصي
========================================================= */

function renderProfile() {

    const student =
        state.student || {};


    const points =
        Number(student.points) || 0;


    const tests =
        Number(student.tests) || 0;


    const correct =
        Number(student.correct) || 0;


    const wrong =
        Number(student.wrong) || 0;


    const total =
        correct + wrong;


    const accuracy =
        total
            ? Math.round(
                (correct / total) * 100
            )
            : 0;


    const note =
        student.note ||
        student.notes ||
        "";


    appContent.innerHTML = `

        <section class="page profile-page">

            <div class="profile-card">

                <div class="profile-icon">
                    ${ICONS.user}
                </div>


                <div class="profile-main">

                    <span class="eyebrow">
                        الملف الشخصي
                    </span>

                    <h1>
                        ${escapeHTML(
                            student.name ||
                            "الطالب"
                        )}
                    </h1>

                    <p>
                        ${escapeHTML(
                            student.specialization ||
                            "طالب مدرسة البلسم الثانوية"
                        )}
                    </p>

                    ${
                        student.student_number
                            ? `
                                <small>
                                    رقم الطالب:
                                    ${escapeHTML(
                                        student.student_number
                                    )}
                                </small>
                              `
                            : ""
                    }

                </div>

            </div>


            <div class="profile-stats">

                <div class="profile-stat">

                    <strong>
                        ${points}
                    </strong>

                    <span>
                        النقاط
                    </span>

                </div>


                <div class="profile-stat">

                    <strong>
                        ${tests}
                    </strong>

                    <span>
                        الاختبارات
                    </span>

                </div>


                <div class="profile-stat">

                    <strong>
                        ${correct}
                    </strong>

                    <span>
                        إجابات صحيحة
                    </span>

                </div>


                <div class="profile-stat">

                    <strong>
                        ${accuracy}%
                    </strong>

                    <span>
                        الدقة
                    </span>

                </div>

            </div>


            <div class="profile-note">

                <span>
                    ملاحظة
                </span>

                <p>
                    ${
                        escapeHTML(
                            note ||
                            "لا توجد ملاحظة مضافة لهذا الطالب."
                        )
                    }
                </p>

            </div>


            <div class="profile-actions">

                <button
                    type="button"
                    class="logout-button"
                    data-logout
                >
                    ${ICONS.logout}

                    <span>
                        تسجيل الخروج
                    </span>

                </button>

            </div>

        </section>
    `;
}


/* =========================================================
   الأحداث
========================================================= */

document.addEventListener(
    "click",
    event => {

        const pageButton =
            event.target.closest(
                "[data-page]"
            );


        if (pageButton) {

            const page =
                pageButton.dataset.page;

            if (
                page &&
                !state.quiz.active
            ) {

                renderPage(page);
            }

            return;
        }


        const pageAction =
            event.target.closest(
                "[data-page-action]"
            );


        if (pageAction) {

            const action =
                pageAction.dataset.pageAction;


            if (action === "library") {

                renderPage("library");

                return;
            }


            if (action === "subject") {

                if (state.currentSubject) {

                    renderSubject(
                        state.currentSubject
                    );

                } else {

                    renderPage("library");
                }

                return;
            }
        }


        const subjectCard =
            event.target.closest(
                "[data-subject-id]"
            );


        if (subjectCard) {

            openSubject(
                subjectCard.dataset.subjectId
            );

            return;
        }


        const partButton =
            event.target.closest(
                "[data-start-part]"
            );


        if (partButton) {

            startPartQuiz(
                partButton.dataset.startPart
            );

            return;
        }


        const answerButton =
            event.target.closest(
                "[data-answer]"
            );


        if (
            answerButton &&
            state.quiz.active
        ) {

            selectAnswer(
                answerButton.dataset.answer
            );

            return;
        }


        const nextButton =
            event.target.closest(
                "[data-next-question]"
            );


        if (
            nextButton &&
            state.quiz.active
        ) {

            nextQuestion();

            return;
        }


        const exitButton =
            event.target.closest(
                "[data-quiz-exit]"
            );


        if (
            exitButton &&
            state.quiz.active
        ) {

            const confirmed =
                confirm(
                    "هل تريد الخروج من الاختبار؟ لن يتم احتساب هذا الاختبار."
                );


            if (confirmed) {

                stopQuizTimer();

                state.quiz.active =
                    false;

                state.quiz.finished =
                    true;

                if (state.currentSubject) {

                    renderSubject(
                        state.currentSubject
                    );
                }
            }

            return;
        }


        const logoutButton =
            event.target.closest(
                "[data-logout]"
            );


        if (logoutButton) {

            logoutStudent();

            return;
        }

    }
);


/* =========================================================
   إظهار / إخفاء كلمة المرور
========================================================= */

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            togglePassword.textContent =
                isPassword
                    ? "إخفاء"
                    : "إظهار";
        }
    );
}


/* =========================================================
   تسجيل الدخول
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        handleLogin
    );
}


/* =========================================================
   بدء التطبيق
========================================================= */

restoreSession();
