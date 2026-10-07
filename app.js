"use strict";

/* =========================================================
   مدرسة البلسم الثانوية
   التطبيق الرئيسي
========================================================= */

/* =========================================================
   CONFIG / SUPABASE
========================================================= */

const CONFIG = window.BALSAM_CONFIG || {};

let sb = null;

if (
    window.supabase &&
    CONFIG.supabaseUrl &&
    CONFIG.supabaseAnonKey
) {
    sb = window.supabase.createClient(
        CONFIG.supabaseUrl,
        CONFIG.supabaseAnonKey
    );
} else {
    console.error("Supabase configuration is missing.");
}


/* =========================================================
   STATE
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
        startTime: 0,
        timer: null,
        secondsLeft: 600,
        duration: 600,
        finished: false
    }
};


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const loginScreen = $("loginScreen");
const appScreen = $("appScreen");

const loginForm = $("loginForm");
const loginButton = $("loginButton");
const loginMessage = $("loginMessage");

const studentNumberInput = $("studentNumber");
const passwordInput = $("password");
const togglePassword = $("togglePassword");

const appContent = $("appContent");
const studentChip = $("studentChip");


/* =========================================================
   ICONS
========================================================= */

const ICONS = {

    user: `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 21a8 8 0 0 1 16 0"></path>
        </svg>
    `,

    book: `
        <svg viewBox="0 0 24 24">
            <path d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 1-2-2Z"></path>
            <path d="M4 5v13a2 2 0 0 0 2 2"></path>
            <path d="M8 7h7M8 11h7"></path>
        </svg>
    `,

    test: `
        <svg viewBox="0 0 24 24">
            <rect x="4" y="3" width="16" height="18" rx="2"></rect>
            <path d="M8 8h8M8 12h8M8 16h5"></path>
        </svg>
    `,

    trophy: `
        <svg viewBox="0 0 24 24">
            <path d="M8 4h8v5a4 4 0 0 1-8 0Z"></path>
            <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"></path>
            <path d="M12 13v5M8 21h8M9 18h6"></path>
        </svg>
    `,

    arrow: `
        <svg viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6"></path>
        </svg>
    `,

    back: `
        <svg viewBox="0 0 24 24">
            <path d="M19 12H5M11 6l-6 6 6 6"></path>
        </svg>
    `,

    external: `
        <svg viewBox="0 0 24 24">
            <path d="M14 5h5v5"></path>
            <path d="M10 14 19 5"></path>
            <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"></path>
        </svg>
    `,

    download: `
        <svg viewBox="0 0 24 24">
            <path d="M12 3v12"></path>
            <path d="m7 10 5 5 5-5"></path>
            <path d="M5 21h14"></path>
        </svg>
    `,

    close: `
        <svg viewBox="0 0 24 24">
            <path d="m6 6 12 12M18 6 6 18"></path>
        </svg>
    `,

    check: `
        <svg viewBox="0 0 24 24">
            <path d="m5 12 4 4L19 6"></path>
        </svg>
    `,

    logout: `
        <svg viewBox="0 0 24 24">
            <path d="M10 5H5v14h5"></path>
            <path d="M14 8l4 4-4 4"></path>
            <path d="M18 12H9"></path>
        </svg>
    `,

    layers: `
        <svg viewBox="0 0 24 24">
            <path d="m12 3 9 5-9 5-9-5 9-5Z"></path>
            <path d="m3 12 9 5 9-5"></path>
            <path d="m3 16 9 5 9-5"></path>
        </svg>
    `
};


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function shuffle(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}


function normalizeArray(value) {

    if (Array.isArray(value)) {
        return value;
    }

    if (value && Array.isArray(value.data)) {
        return value.data;
    }

    if (value && Array.isArray(value.items)) {
        return value.items;
    }

    return [];
}


function getStudentValue(...keys) {

    if (!state.student) {
        return "";
    }

    for (const key of keys) {

        if (
            state.student[key] !== undefined &&
            state.student[key] !== null
        ) {
            return state.student[key];
        }
    }

    return "";
}


function showMessage(message, type = "error") {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;
    loginMessage.classList.remove("hidden");

    if (type === "success") {
        loginMessage.style.color = "#8cf3c8";
        loginMessage.style.background = "rgba(70,214,160,.07)";
        loginMessage.style.borderColor = "rgba(70,214,160,.15)";
    } else {
        loginMessage.style.color = "#ffabb5";
        loginMessage.style.background = "rgba(255,101,119,.08)";
        loginMessage.style.borderColor = "rgba(255,101,119,.15)";
    }
}


function clearMessage() {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = "";
    loginMessage.classList.add("hidden");
}


function setLoading(loading) {

    if (!loginButton) {
        return;
    }

    loginButton.disabled = loading;
    loginButton.classList.toggle("loading", loading);
}


function formatNumber(value) {

    const number = Number(value || 0);

    return number.toLocaleString("ar");
}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("ar", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}


/* =========================================================
   SUPABASE CHECK
========================================================= */

function requireSupabase() {

    if (!sb) {
        throw new Error(
            "تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Supabase."
        );
    }

    return sb;
}


/* =========================================================
   LOGIN
========================================================= */

async function loginStudent(studentNumber, password) {

    requireSupabase();

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

    if (Array.isArray(student)) {
        student = student[0];
    }

    if (student?.student) {
        student = student.student;
    }

    if (student?.data && !student.id) {
        student = student.data;
    }

    if (!student || !student.id) {
        throw new Error("رقم الطالب أو كلمة المرور غير صحيحة.");
    }

    return student;
}


async function handleLogin(event) {

    event.preventDefault();

    clearMessage();

    const studentNumber = studentNumberInput.value.trim();
    const password = passwordInput.value;

    if (!studentNumber || !password) {

        showMessage("يرجى إدخال رقم الطالب وكلمة المرور.");

        return;
    }

    try {

        setLoading(true);

        const student = await loginStudent(
            studentNumber,
            password
        );

        state.student = student;

        localStorage.setItem(
            "balsam_student",
            JSON.stringify(student)
        );

        await showApplication();

    } catch (error) {

        console.error(error);

        showMessage(
            error?.message ||
            "تعذر تسجيل الدخول. حاول مرة أخرى."
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   SESSION
========================================================= */

async function restoreSession() {

    try {

        const saved = localStorage.getItem("balsam_student");

        if (!saved) {
            return;
        }

        const student = JSON.parse(saved);

        if (!student || !student.id) {
            localStorage.removeItem("balsam_student");
            return;
        }

        state.student = student;

        await showApplication();

    } catch (error) {

        console.error("Session restore failed:", error);

        localStorage.removeItem("balsam_student");
    }
}


async function showApplication() {

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    updateStudentChip();

    await loadStaticData();

    renderPage("home");
}


function updateStudentChip() {

    if (!studentChip) {
        return;
    }

    const name =
        getStudentValue("name", "full_name", "student_name") ||
        "الطالب";

    const nameElement =
        studentChip.querySelector(".student-chip-name");

    if (nameElement) {
        nameElement.textContent = name;
    }
}


function logoutStudent() {

    stopQuizTimer();

    state.student = null;
    state.currentPage = "home";
    state.currentSubject = null;
    state.currentPart = null;

    state.quiz = {
        active: false,
        questions: [],
        currentIndex: 0,
        answers: [],
        startTime: 0,
        timer: null,
        secondsLeft: 600,
        duration: 600,
        finished: false
    };

    localStorage.removeItem("balsam_student");

    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    loginForm.reset();
    clearMessage();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   STATIC DATA
========================================================= */

async function fetchJSON(path) {

    const response = await fetch(path, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`تعذر تحميل الملف: ${path}`);
    }

    return await response.json();
}


async function loadStaticData() {

    const results = await Promise.allSettled([

        fetchJSON("data/subjects.json"),

        fetchJSON("data/posts.json"),

        fetchJSON("data/notice.json")

    ]);

    if (results[0].status === "fulfilled") {

        state.subjects =
            normalizeSubjects(results[0].value);

    } else {

        console.error(
            "subjects.json:",
            results[0].reason
        );

        state.subjects = [];
    }


    if (results[1].status === "fulfilled") {

        state.posts =
            normalizeArray(results[1].value);

    } else {

        console.warn(
            "posts.json:",
            results[1].reason
        );

        state.posts = [];
    }


    if (results[2].status === "fulfilled") {

        const data = results[2].value;

        state.notice =
            data?.notice ||
            data ||
            null;

    } else {

        console.warn(
            "notice.json:",
            results[2].reason
        );

        state.notice = null;
    }
}


/* =========================================================
   SUBJECT NORMALIZATION
========================================================= */

function normalizeSubjects(data) {

    return normalizeArray(data)
        .map(normalizeSubject)
        .filter(Boolean);
}


function normalizeSubject(subject) {

    if (!subject || typeof subject !== "object") {
        return null;
    }

    const parts =
        Array.isArray(subject.parts)
            ? subject.parts.map((part, index) => {

                if (typeof part === "string") {

                    return {
                        name: part,
                        number: index + 1,
                        file: ""
                    };
                }

                return {
                    ...part,

                    number:
                        part.number ||
                        index + 1,

                    name:
                        part.name ||
                        part.title ||
                        `الجزء ${index + 1}`,

                    /*
                     * مهم:
                     * لا نستخدم part.questions هنا
                     * لأنها قيمة العرض:
                     * "اختبار 20 سؤالاً"
                     */
                    file:
                        part.file ||
                        part.json ||
                        part.questionsFile ||
                        ""
                };

            })
            : [];

    return {

        ...subject,

        id:
            subject.id ||
            crypto.randomUUID?.() ||
            String(Math.random()),

        category:
            subject.category ||
            "مواد أخرى",

        number:
            subject.number ||
            "",

        name:
            subject.name ||
            subject.title ||
            "مادة بدون اسم",

        /*
         * الكتاب موجود في subject وليس part
         */
        book:
            subject.book ||
            subject.pdf ||
            subject.bookUrl ||
            "",

        parts
    };
}


/* =========================================================
   NAVIGATION
========================================================= */

function setActiveNav(page) {

    document
        .querySelectorAll(".nav-button[data-page]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });
}


function renderPage(page) {

    if (state.quiz.active && page !== "quiz") {
        return;
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
   HOME
========================================================= */

function renderHome() {

    const name =
        getStudentValue(
            "name",
            "full_name",
            "student_name"
        ) || "طالبنا العزيز";

    const points =
        getStudentValue(
            "points",
            "total_points",
            "score"
        ) || 0;

    const tests =
        getStudentValue(
            "tests",
            "tests_count",
            "test_count"
        ) || 0;

    const subjectsCount =
        state.subjects.length;


    const notice = state.notice
        ? `
            <div class="notice-card">

                <div class="notice-icon">
                    ${ICONS.layers}
                </div>

                <div>
                    <div class="notice-heading">
                        إعلان مهم
                    </div>

                    <h3>
                        ${escapeHTML(
                            state.notice.title ||
                            state.notice.heading ||
                            "تنبيه من المدرسة"
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            state.notice.text ||
                            state.notice.content ||
                            state.notice.message ||
                            ""
                        )}
                    </p>
                </div>

            </div>
        `
        : "";


    const postsHTML =
        state.posts.length
            ? state.posts
                .map(renderPost)
                .join("")
            : `
                <div class="empty-state">
                    <div>
                        <strong>لا توجد منشورات حاليًا</strong>
                        <span>ستظهر منشورات المدرسة هنا عند إضافتها.</span>
                    </div>
                </div>
            `;


    appContent.innerHTML = `

        <section class="page home-page">

            <div class="home-hero">

                <div class="home-hero-main">

                    <div class="hero-user-icon"></div>

                    <span class="eyebrow">
                        <span class="status-dot"></span>
                        أهلاً بك في منصتك
                    </span>

                    <h1>
                        مرحبًا،
                        <span>${escapeHTML(name)}</span>
                    </h1>

                    <p>
                        واصل رحلة التعلم وطوّر مستواك خطوة بعد خطوة.
                    </p>

                    <div class="hero-stats">

                        <div class="mini-stat">
                            <strong>${formatNumber(points)}</strong>
                            <span>نقطة</span>
                        </div>

                        <div class="mini-stat">
                            <strong>${formatNumber(tests)}</strong>
                            <span>اختبار</span>
                        </div>

                        <div class="mini-stat">
                            <strong>${formatNumber(subjectsCount)}</strong>
                            <span>مادة</span>
                        </div>

                    </div>

                </div>


                <div class="ayah-card">

                    <div class="ayah-icon">۞</div>

                    <blockquote>
                        ﴿وَقُلْ رَبِّ زِدْنِي عِلْمًا﴾
                    </blockquote>

                    <cite>
                        سورة طه — 114
                    </cite>

                </div>

            </div>

            ${notice}

            <section class="posts-section">

                <div class="section-heading">

                    <div>
                        <h2>آخر المنشورات</h2>
                        <p>أحدث ما تنشره المدرسة للطلاب</p>
                    </div>

                </div>

                <div class="posts-list">
                    ${postsHTML}
                </div>

            </section>

        </section>
    `;
}


function renderPost(post) {

    const title =
        post.title ||
        post.heading ||
        "منشور المدرسة";

    const content =
        post.content ||
        post.text ||
        post.body ||
        "";

    const date =
        post.created_at ||
        post.date ||
        post.createdAt ||
        "";

    return `

        <article class="post-card">

            <div class="post-header">

                <div class="post-author-icon">
                    ${ICONS.user}
                </div>

                <div>
                    <h3>${escapeHTML(title)}</h3>

                    ${
                        date
                            ? `<span class="post-date">${escapeHTML(formatDate(date))}</span>`
                            : ""
                    }
                </div>

            </div>

            <p>
                ${escapeHTML(content)}
            </p>

        </article>

    `;
}


/* =========================================================
   LIBRARY
========================================================= */

function renderLibrary() {

    if (!state.subjects.length) {

        appContent.innerHTML = `

            <section class="page library-page">

                <div class="page-header">

                    <span class="eyebrow">
                        <span class="status-dot"></span>
                        المكتبة
                    </span>

                    <h1>المكتبة التعليمية</h1>

                    <p>
                        لم تتم إضافة المواد التعليمية حاليًا.
                    </p>

                </div>

                <div class="empty-state">

                    <div>
                        <strong>لا توجد مواد</strong>
                        <span>
                            أضف المواد من data/subjects.json
                        </span>
                    </div>

                </div>

            </section>

        `;

        return;
    }


    const totalParts =
        state.subjects.reduce(
            (sum, subject) =>
                sum + subject.parts.length,
            0
        );


    const groups =
        groupSubjectsByCategory(state.subjects);


    appContent.innerHTML = `

        <section class="page library-page">

            <div class="library-banner">

                <div>
                    <span class="eyebrow">
                        <span class="status-dot"></span>
                        KNOWLEDGE CENTER
                    </span>

                    <h1>المكتبة التعليمية</h1>

                    <p>
                        اختر المادة للوصول إلى الدروس والاختبارات.
                    </p>
                </div>

                <div class="library-banner-stats">

                    <div class="library-stat">
                        <strong>${formatNumber(state.subjects.length)}</strong>
                        <span>مادة</span>
                    </div>

                    <div class="library-stat">
                        <strong>${formatNumber(totalParts)}</strong>
                        <span>اختبار</span>
                    </div>

                </div>

            </div>

            ${Object.entries(groups)
                .map(
                    ([category, subjects], index) =>
                        renderCategory(
                            category,
                            subjects,
                            index + 1
                        )
                )
                .join("")}

        </section>
    `;
}


function groupSubjectsByCategory(subjects) {

    return subjects.reduce((groups, subject) => {

        const category =
            subject.category || "مواد أخرى";

        if (!groups[category]) {
            groups[category] = [];
        }

        groups[category].push(subject);

        return groups;

    }, {});
}


function renderCategory(category, subjects, index) {

    return `

        <section class="library-category">

            <div class="category-header">

                <div class="category-number">
                    ${String(index).padStart(2, "0")}
                </div>

                <div>
                    <h2>${escapeHTML(category)}</h2>
                    <span class="category-count">
                        ${formatNumber(subjects.length)} مواد
                    </span>
                </div>

            </div>

            <div class="subjects-grid">

                ${subjects
                    .map(renderSubjectCard)
                    .join("")}

            </div>

        </section>
    `;
}


function renderSubjectCard(subject) {

    const partsCount =
        subject.parts?.length || 0;

    return `

        <button
            type="button"
            class="subject-card"
            data-action="open-subject"
            data-subject-id="${escapeHTML(subject.id)}"
        >

            <div class="subject-card-icon">
                ${escapeHTML(
                    subject.number ||
                    String(subject.id).slice(0, 2)
                )}
            </div>

            <div class="subject-card-content">

                <small>
                    ${escapeHTML(subject.category)}
                </small>

                <h3>
                    ${escapeHTML(subject.name)}
                </h3>

                <p>
                    ${formatNumber(partsCount)} اختبارات
                </p>

            </div>

            <div class="subject-card-arrow">
                ${ICONS.arrow}
            </div>

        </button>

    `;
}


/* =========================================================
   SUBJECT
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
        Array.isArray(subject.parts)
            ? subject.parts
            : [];


    const partsHTML =
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
                    <div>
                        <strong>لا توجد اختبارات</strong>
                        <span>لم تتم إضافة أجزاء لهذه المادة.</span>
                    </div>
                </div>
            `;


    appContent.innerHTML = `

        <section class="page subject-page">

            <button
                class="back-button"
                type="button"
                data-action="back-library"
            >
                ${ICONS.back}
                العودة إلى المكتبة
            </button>


            <div class="subject-hero">

                <div class="subject-main-icon">
                    ${escapeHTML(
                        subject.number ||
                        "01"
                    )}
                </div>

                <div>
                    <h1>${escapeHTML(subject.name)}</h1>

                    <p>
                        ${formatNumber(parts.length)}
                        اختبارات متاحة في هذه المادة
                    </p>
                </div>

            </div>


            <div class="section-heading">

                <div>
                    <h2>اختبارات المادة</h2>

                    <p>
                        اختر الاختبار الذي تريد البدء به
                    </p>
                </div>

            </div>


            <div class="parts-grid">
                ${partsHTML}
            </div>

        </section>
    `;
}


function renderPartCard(part, index, subject) {

    const file =
        part.file ||
        part.json ||
        part.questionsFile ||
        "";

    const book =
        subject.book ||
        "";

    const partName =
        part.name ||
        `الجزء ${index + 1}`;

    const questionLabel =
        part.questions &&
        typeof part.questions === "string"
            ? part.questions
            : "اختبار 20 سؤالاً";


    return `

        <article class="part-card">

            <div class="part-top">

                <div class="part-number">
                    ${String(index + 1).padStart(2, "0")}
                </div>

            </div>

            <div class="part-content">

                <h3>
                    ${escapeHTML(partName)}
                </h3>

                <p>
                    ${escapeHTML(questionLabel)}
                </p>

            </div>


            <div class="part-actions">

                <button
                    type="button"
                    class="primary-button"
                    data-action="start-quiz"
                    data-part-index="${index}"
                >
                    ${ICONS.test}
                    بدء الاختبار
                </button>

                ${
                    book
                        ? `
                            <div class="book-actions">

                                <a
                                    class="secondary-button"
                                    href="${escapeHTML(book)}"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    ${ICONS.external}
                                    فتح الكتاب
                                </a>

                                <a
                                    class="secondary-button download-book"
                                    href="${escapeHTML(book)}"
                                    download
                                >
                                    ${ICONS.download}
                                    تحميل
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
   QUESTIONS
========================================================= */

async function loadQuestions(file) {

    if (!file) {
        throw new Error(
            "لم يتم تحديد ملف الأسئلة لهذا الاختبار."
        );
    }

    const data = await fetchJSON(file);

    const array =
        normalizeArray(data);

    if (!array.length) {
        throw new Error(
            "ملف الأسئلة فارغ."
        );
    }

    return array
        .map(normalizeQuestion)
        .filter(question =>
            question.q &&
            question.a &&
            question.options.length >= 2
        );
}


function normalizeQuestion(question) {

    if (!question || typeof question !== "object") {

        return {
            q: "",
            a: "",
            options: []
        };
    }


    const q = String(
        question.q ??
        question.question ??
        question.text ??
        question.prompt ??
        ""
    ).trim();


    const answer = String(
        question.a ??
        question.answer ??
        question.correct ??
        question.correctAnswer ??
        ""
    ).trim();


    let wrong = [];

    if (Array.isArray(question.w)) {

        wrong = question.w;

    } else if (Array.isArray(question.wrong)) {

        wrong = question.wrong;

    } else if (Array.isArray(question.wrongAnswers)) {

        wrong = question.wrongAnswers;
    }


    let options = [];

    if (Array.isArray(question.options)) {

        options = question.options.map(option => {

            if (
                typeof option === "object" &&
                option !== null
            ) {
                return String(
                    option.text ??
                    option.value ??
                    option.answer ??
                    ""
                ).trim();
            }

            return String(option).trim();
        });

    } else {

        options = wrong.map(
            item => String(item).trim()
        );
    }


    if (answer && !options.includes(answer)) {
        options.push(answer);
    }


    options = [
        ...new Set(
            options.filter(Boolean)
        )
    ];


    return {
        q,
        a: answer,
        options
    };
}


/* =========================================================
   START QUIZ
========================================================= */

async function startPartQuiz(part) {

    stopQuizTimer();

    state.currentPart = part;

    appContent.innerHTML = `

        <section class="page quiz-loading">

            <div>
                <div class="loading-orb"></div>

                <strong>
                    جارٍ تجهيز الاختبار
                </strong>

                <p style="color:var(--text-3);margin-top:7px;font-size:12px">
                    يتم تحميل الأسئلة...
                </p>
            </div>

        </section>
    `;


    try {

        const allQuestions =
            await loadQuestions(
                part.file ||
                part.json ||
                part.questionsFile ||
                ""
            );


        const requestedCount =
            Number(
                part.questionCount ||
                part.questionsCount ||
                20
            );


        const questions =
            shuffle(allQuestions)
                .slice(
                    0,
                    Math.min(
                        requestedCount,
                        allQuestions.length
                    )
                )
                .map(question => ({

                    ...question,

                    options:
                        shuffle(question.options)

                }));


        if (!questions.length) {
            throw new Error(
                "لا توجد أسئلة صالحة لهذا الاختبار."
            );
        }


        const durationMinutes =
            Number(
                part.duration ||
                part.durationMinutes ||
                10
            );


        const duration =
            Math.max(
                60,
                durationMinutes * 60
            );


        state.quiz = {

            active: true,

            questions,

            currentIndex: 0,

            answers:
                new Array(questions.length)
                    .fill(null),

            startTime: Date.now(),

            timer: null,

            secondsLeft: duration,

            duration,

            finished: false
        };


        state.currentPage = "quiz";

        renderQuiz();

        startQuizTimer();

    } catch (error) {

        console.error(error);

        appContent.innerHTML = `

            <section class="page">

                <div class="error-state">

                    <div>
                        <strong>
                            تعذر تحميل الاختبار
                        </strong>

                        <span>
                            ${escapeHTML(
                                error?.message ||
                                "حدث خطأ غير متوقع."
                            )}
                        </span>

                        <div style="margin-top:20px">

                            <button
                                class="secondary-button"
                                type="button"
                                data-action="back-subject"
                            >
                                ${ICONS.back}
                                العودة للمادة
                            </button>

                        </div>
                    </div>

                </div>

            </section>
        `;
    }
}


/* =========================================================
   QUIZ RENDER
========================================================= */

function renderQuiz() {

    const quiz = state.quiz;

    const question =
        quiz.questions[quiz.currentIndex];

    if (!question) {
        finishQuiz();
        return;
    }


    const currentAnswer =
        quiz.answers[quiz.currentIndex];


    const progress =
        (
            (quiz.currentIndex + 1) /
            quiz.questions.length
        ) * 100;


    const letters =
        ["أ", "ب", "ج", "د", "هـ", "و"];


    const answersHTML =
        question.options
            .map((option, index) => {

                const selected =
                    currentAnswer === option;

                return `

                    <button
                        type="button"
                        class="answer-button ${selected ? "selected" : ""}"
                        data-action="select-answer"
                        data-answer="${escapeHTML(option)}"
                    >

                        <span class="answer-letter">
                            ${letters[index] || index + 1}
                        </span>

                        <span class="answer-text">
                            ${escapeHTML(option)}
                        </span>

                    </button>

                `;

            })
            .join("");


    appContent.innerHTML = `

        <section class="page quiz-page">

            <div class="quiz-header">

                <button
                    type="button"
                    class="quiz-exit"
                    data-action="quit-quiz"
                    aria-label="الخروج من الاختبار"
                >
                    ${ICONS.close}
                </button>


                <div class="quiz-title">

                    <small>
                        ${escapeHTML(
                            state.currentSubject?.name ||
                            "اختبار"
                        )}
                    </small>

                    <h1>
                        ${escapeHTML(
                            state.currentPart?.name ||
                            "الاختبار"
                        )}
                    </h1>

                </div>


                <div
                    id="quizTimer"
                    class="quiz-timer"
                >
                    ${formatTimer(
                        quiz.secondsLeft
                    )}
                </div>

            </div>


            <div class="quiz-progress">

                <div
                    class="quiz-progress-bar"
                    style="width:${progress}%"
                ></div>

            </div>


            <div class="quiz-question-meta">

                السؤال
                ${formatNumber(quiz.currentIndex + 1)}
                من
                ${formatNumber(quiz.questions.length)}

            </div>


            <div class="question-card">

                <div class="question-number">
                    QUESTION ${String(
                        quiz.currentIndex + 1
                    ).padStart(2, "0")}
                </div>

                <h2>
                    ${escapeHTML(question.q)}
                </h2>


                <div class="answers-list">
                    ${answersHTML}
                </div>

            </div>


            <div class="quiz-footer">

                <button
                    type="button"
                    class="secondary-button"
                    data-action="quit-quiz"
                >
                    إنهاء الاختبار
                </button>


                <button
                    type="button"
                    class="primary-button quiz-next"
                    data-action="next-question"
                    ${currentAnswer === null ? "disabled" : ""}
                >

                    ${
                        quiz.currentIndex ===
                        quiz.questions.length - 1
                            ? "إنهاء الاختبار"
                            : "السؤال التالي"
                    }

                    ${ICONS.arrow}

                </button>

            </div>

        </section>
    `;


    const nextButton =
        appContent.querySelector(
            ".quiz-next"
        );

    if (nextButton) {

        nextButton.style.opacity =
            currentAnswer === null
                ? ".45"
                : "1";
    }
}


function selectAnswer(answer) {

    if (!state.quiz.active) {
        return;
    }

    state.quiz.answers[
        state.quiz.currentIndex
    ] = answer;

    renderQuiz();
}


function nextQuestion() {

    const quiz = state.quiz;

    if (
        quiz.answers[quiz.currentIndex] === null
    ) {
        return;
    }


    if (
        quiz.currentIndex >=
        quiz.questions.length - 1
    ) {

        finishQuiz();

        return;
    }


    quiz.currentIndex++;

    renderQuiz();
}


/* =========================================================
   TIMER
========================================================= */

function formatTimer(seconds) {

    const safe =
        Math.max(0, Number(seconds || 0));

    const minutes =
        Math.floor(safe / 60);

    const secs =
        safe % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


function startQuizTimer() {

    stopQuizTimer();

    state.quiz.timer =
        setInterval(() => {

            if (!state.quiz.active) {
                stopQuizTimer();
                return;
            }

            state.quiz.secondsLeft--;

            const timer =
                document.getElementById(
                    "quizTimer"
                );

            if (timer) {

                timer.textContent =
                    formatTimer(
                        state.quiz.secondsLeft
                    );

                timer.classList.toggle(
                    "warning",
                    state.quiz.secondsLeft <= 60
                );
            }


            if (state.quiz.secondsLeft <= 0) {

                finishQuiz();

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


/* =========================================================
   FINISH QUIZ
========================================================= */

async function finishQuiz() {

    if (
        !state.quiz.active ||
        state.quiz.finished
    ) {
        return;
    }

    state.quiz.finished = true;

    stopQuizTimer();

    state.quiz.active = false;


    const questions =
        state.quiz.questions;

    const answers =
        state.quiz.answers;


    let correct = 0;

    for (let i = 0; i < questions.length; i++) {

        if (
            answers[i] !== null &&
            answers[i] === questions[i].a
        ) {
            correct++;
        }
    }


    /*
     * غير المجاب يُحسب ضمن غير الصحيح،
     * حتى يكون مجموع الصحيح + الخطأ
     * مساويًا لإجمالي أسئلة الاختبار.
     */
    const total =
        questions.length;

    const wrong =
        total - correct;


    const elapsed =
        Math.max(
            0,
            Math.floor(
                (Date.now() -
                    state.quiz.startTime) /
                1000
            )
        );


    const result = {

        subject:
            state.currentSubject?.name ||
            "",

        part:
            state.currentPart?.name ||
            "",

        score: correct,

        total,

        correct,

        wrong,

        duration: elapsed
    };


    await saveTestResult(result);

    renderQuizResult(result);
}


/* =========================================================
   SAVE RESULT
========================================================= */

async function saveTestResult(result) {

    try {

        requireSupabase();

        await sb.rpc(
            "submit_test_result",
            {
                p_student_id:
                    state.student.id,

                p_subject:
                    result.subject,

                p_part:
                    result.part,

                p_score:
                    result.score,

                p_total_questions:
                    result.total,

                p_correct_answers:
                    result.correct,

                p_wrong_answers:
                    result.wrong,

                p_duration_seconds:
                    result.duration
            }
        );


        /*
         * تحديث محلي بسيط لعرض النتيجة
         * مباشرة دون الحاجة لإعادة تسجيل الدخول.
         */
        const oldPoints =
            Number(
                getStudentValue(
                    "points",
                    "total_points",
                    "score"
                ) || 0
            );


        state.student.points =
            oldPoints + result.score;


        const oldTests =
            Number(
                getStudentValue(
                    "tests",
                    "tests_count",
                    "test_count"
                ) || 0
            );


        state.student.tests =
            oldTests + 1;


        localStorage.setItem(
            "balsam_student",
            JSON.stringify(state.student)
        );


        updateStudentChip();

    } catch (error) {

        console.error(
            "Saving test result failed:",
            error
        );

        /*
         * لا نمنع الطالب من رؤية النتيجة
         * إذا فشل الاتصال أثناء الحفظ.
         */
    }
}


/* =========================================================
   RESULT PAGE
========================================================= */

function renderQuizResult(result) {

    const percentage =
        result.total
            ? Math.round(
                (result.correct /
                    result.total) * 100
            )
            : 0;


    let message =
        "استمر، فكل اختبار خطوة جديدة.";

    if (percentage >= 90) {

        message =
            "أداء رائع جدًا! واصل بهذا المستوى.";

    } else if (percentage >= 75) {

        message =
            "أداء ممتاز، يمكنك الوصول إلى مستوى أعلى.";

    } else if (percentage >= 50) {

        message =
            "نتيجة جيدة، راجع النقاط التي أخطأت فيها.";

    }


    appContent.innerHTML = `

        <section class="page quiz-result-page">

            <div class="result-icon">
                ${ICONS.check}
            </div>

            <h1>
                انتهى الاختبار
            </h1>

            <p class="result-subtitle">
                ${escapeHTML(result.subject)}
                —
                ${escapeHTML(result.part)}
            </p>


            <div class="result-score">

                <strong>
                    ${formatNumber(result.score)}
                    /
                    ${formatNumber(result.total)}
                </strong>

                <span>
                    النتيجة النهائية
                </span>

                <div style="
                    margin-top:10px;
                    color:var(--green-light);
                    font-size:12px;
                ">
                    ${percentage}% — ${message}
                </div>

            </div>


            <div class="result-stats">

                <div class="result-stat">

                    <strong style="color:var(--green-light)">
                        ${formatNumber(result.correct)}
                    </strong>

                    <span>
                        إجابة صحيحة
                    </span>

                </div>


                <div class="result-stat">

                    <strong style="color:var(--danger)">
                        ${formatNumber(result.wrong)}
                    </strong>

                    <span>
                        غير صحيحة
                    </span>

                </div>


                <div class="result-stat">

                    <strong>
                        ${formatNumber(result.total)}
                    </strong>

                    <span>
                        إجمالي الأسئلة
                    </span>

                </div>

            </div>


            <div class="result-actions">

                <button
                    type="button"
                    class="primary-button"
                    data-action="back-subject"
                >
                    العودة للمادة
                    ${ICONS.arrow}
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    data-action="go-ranking"
                >
                    ${ICONS.trophy}
                    الترتيب
                </button>

            </div>

        </section>
    `;
}


/* =========================================================
   RANKING
========================================================= */

async function renderRanking() {

    appContent.innerHTML = `

        <section class="page ranking-page">

            <div class="page-header">

                <span class="eyebrow">
                    <span class="status-dot"></span>
                    LEADERBOARD
                </span>

                <h1>ترتيب الطلاب</h1>

                <p>
                    ترتيب الطلاب حسب النقاط المسجلة في المنصة.
                </p>

            </div>


            <div class="ranking-list">

                <div class="loading-state">
                    <div>
                        <strong>جارٍ تحميل الترتيب</strong>
                        <span>لحظات...</span>
                    </div>
                </div>

            </div>

        </section>
    `;


    try {

        requireSupabase();

        const { data, error } =
            await sb.rpc("get_ranking");


        if (error) {
            throw error;
        }


        const students =
            Array.isArray(data)
                ? data
                : Array.isArray(data?.ranking)
                    ? data.ranking
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];


        const list =
            appContent.querySelector(
                ".ranking-list"
            );


        if (!list) {
            return;
        }


        if (!students.length) {

            list.innerHTML = `

                <div class="empty-state">

                    <div>
                        <strong>
                            لا توجد بيانات ترتيب حاليًا
                        </strong>

                        <span>
                            سيظهر الترتيب عند توفر النتائج.
                        </span>
                    </div>

                </div>

            `;

            return;
        }


        list.innerHTML =
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

        const list =
            appContent.querySelector(
                ".ranking-list"
            );

        if (list) {

            list.innerHTML = `

                <div class="error-state">

                    <div>
                        <strong>
                            تعذر تحميل الترتيب
                        </strong>

                        <span>
                            تحقق من اتصال قاعدة البيانات.
                        </span>
                    </div>

                </div>

            `;
        }
    }
}


function renderRankingStudent(student, index) {

    const id =
        student.id ||
        student.student_id ||
        "";


    const name =
        student.name ||
        student.full_name ||
        student.student_name ||
        "طالب";


    const points =
        student.points ??
        student.total_points ??
        student.score ??
        0;


    const isMe =
        String(id) ===
        String(state.student?.id);


    return `

        <div class="ranking-item ${isMe ? "me" : ""}">

            <div class="ranking-position">
                #${formatNumber(index + 1)}
            </div>

            <div class="ranking-avatar">
                ${ICONS.user}
            </div>

            <div class="ranking-info">

                <strong>
                    ${escapeHTML(name)}
                </strong>

                <span>
                    ${isMe ? "هذا حسابك" : "طالب"}
                </span>

            </div>

            <div class="ranking-points">

                ${formatNumber(points)}

                <small>
                    نقطة
                </small>

            </div>

        </div>

    `;
}


/* =========================================================
   PROFILE
========================================================= */

function renderProfile() {

    const name =
        getStudentValue(
            "name",
            "full_name",
            "student_name"
        ) || "الطالب";


    const studentNumber =
        getStudentValue(
            "student_number",
            "studentNumber",
            "number"
        ) || "—";


    const specialization =
        getStudentValue(
            "specialization",
            "major",
            "department"
        ) || "—";


    const points =
        getStudentValue(
            "points",
            "total_points",
            "score"
        ) || 0;


    const tests =
        getStudentValue(
            "tests",
            "tests_count",
            "test_count"
        ) || 0;


    const correct =
        getStudentValue(
            "correct",
            "correct_answers"
        ) || 0;


    const level =
        getStudentValue(
            "level",
            "student_level"
        ) || "مستوى الطالب";


    const note =
        getStudentValue(
            "note",
            "student_note",
            "admin_note"
        );


    appContent.innerHTML = `

        <section class="page profile-page">

            <div class="page-header">

                <span class="eyebrow">
                    <span class="status-dot"></span>
                    STUDENT PROFILE
                </span>

                <h1>ملفي الشخصي</h1>

                <p>
                    بياناتك ومستواك الأكاديمي داخل المنصة.
                </p>

            </div>


            <div class="profile-card">

                <div class="profile-main">

                    <div class="profile-icon">
                        ${ICONS.user}
                    </div>

                    <div>

                        <h1>
                            ${escapeHTML(name)}
                        </h1>

                        <p>
                            رقم الطالب:
                            ${escapeHTML(studentNumber)}
                        </p>

                        <p>
                            التخصص:
                            ${escapeHTML(specialization)}
                        </p>

                    </div>

                </div>


                <div class="profile-stats">

                    <div class="profile-stat">

                        <strong>
                            ${formatNumber(points)}
                        </strong>

                        <span>
                            النقاط
                        </span>

                    </div>


                    <div class="profile-stat">

                        <strong>
                            ${formatNumber(tests)}
                        </strong>

                        <span>
                            الاختبارات
                        </span>

                    </div>


                    <div class="profile-stat">

                        <strong>
                            ${formatNumber(correct)}
                        </strong>

                        <span>
                            الإجابات الصحيحة
                        </span>

                    </div>


                    <div class="profile-stat">

                        <strong style="font-size:15px">
                            ${escapeHTML(level)}
                        </strong>

                        <span>
                            المستوى
                        </span>

                    </div>

                </div>


                ${
                    note
                        ? `
                            <div class="profile-note">

                                <strong>
                                    ملاحظة
                                </strong>

                                <p>
                                    ${escapeHTML(note)}
                                </p>

                            </div>
                        `
                        : ""
                }


                <div class="profile-actions">

                    <button
                        type="button"
                        class="logout-button"
                        data-action="logout"
                    >
                        ${ICONS.logout}
                        تسجيل الخروج
                    </button>

                </div>

            </div>

        </section>
    `;
}


/* =========================================================
   GLOBAL ACTIONS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const pageButton =
            event.target.closest(
                ".nav-button[data-page]"
            );

        if (pageButton) {

            if (state.quiz.active) {
                return;
            }

            renderPage(
                pageButton.dataset.page
            );

            return;
        }


        const actionElement =
            event.target.closest(
                "[data-action]"
            );

        if (!actionElement) {
            return;
        }


        const action =
            actionElement.dataset.action;


        switch (action) {

            case "open-subject":

                openSubject(
                    actionElement.dataset.subjectId
                );

                break;


            case "back-library":

                state.currentSubject = null;

                renderPage("library");

                break;


            case "back-subject":

                if (state.currentSubject) {

                    renderSubject(
                        state.currentSubject
                    );

                } else {

                    renderPage("library");
                }

                break;


            case "start-quiz": {

                if (!state.currentSubject) {
                    return;
                }

                const index =
                    Number(
                        actionElement.dataset.partIndex
                    );

                const part =
                    state.currentSubject.parts[index];

                if (!part) {
                    return;
                }

                startPartQuiz(part);

                break;
            }


            case "select-answer":

                selectAnswer(
                    actionElement.dataset.answer
                );

                break;


            case "next-question":

                nextQuestion();

                break;


            case "quit-quiz": {

                const confirmed =
                    window.confirm(
                        "هل تريد إنهاء الاختبار؟ لن يتم حفظ إجابات غير مكتملة."
                    );

                if (confirmed) {

                    stopQuizTimer();

                    state.quiz.active = false;
                    state.quiz.finished = true;

                    if (state.currentSubject) {

                        renderSubject(
                            state.currentSubject
                        );

                    } else {

                        renderPage("library");
                    }
                }

                break;
            }


            case "go-ranking":

                renderPage("ranking");

                break;


            case "logout":

                logoutStudent();

                break;
        }

    }
);


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type === "password";

            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";

        }
    );
}


/* =========================================================
   LOGIN FORM
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        handleLogin
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

restoreSession();
