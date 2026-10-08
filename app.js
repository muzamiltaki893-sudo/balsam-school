"use strict";

/* =========================================================
   مدرسة البلسم الثانوية
   التطبيق الرئيسي
   ========================================================= */


/* =========================================================
   Supabase
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
        questions: [],
        answers: {},
        index: 0,

        startTime: 0,

        duration: 600,
        questionCount: 20,

        timer: null,
        loading: false
    }
};


/* =========================================================
   DOM
   ========================================================= */

const $ = (selector, root = document) =>
    root.querySelector(selector);

const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];


const loginScreen = $("#loginScreen");
const appScreen = $("#appScreen");

const loginForm = $("#loginForm");
const loginButton = $("#loginButton");
const loginMessage = $("#loginMessage");

const studentNumberInput = $("#studentNumber");
const passwordInput = $("#password");
const togglePassword = $("#togglePassword");

const appContent = $("#appContent");

const studentChip = $("#studentChip");
const headerStudentName = $("#headerStudentName");


/* =========================================================
   SVG ICONS
   ========================================================= */

const ICONS = {

    user: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21a8 8 0 0 1 16 0"/>
        </svg>
    `,

    book: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/>
            <path d="M4 5.5v16"/>
            <path d="M8 7h8"/>
            <path d="M8 11h8"/>
        </svg>
    `,

    test: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2"/>
            <path d="M9 7h6"/>
            <path d="M9 11h6"/>
            <path d="M9 15h3"/>
        </svg>
    `,

    trophy: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 21h8"/>
            <path d="M12 17v4"/>
            <path d="M6 4h12v5a6 6 0 0 1-12 0z"/>
            <path d="M6 7H3a4 4 0 0 0 4 4"/>
            <path d="M18 7h3a4 4 0 0 1-4 4"/>
            <path d="M9 3h6"/>
        </svg>
    `,

    arrow: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13"/>
            <path d="m13 6 6 6-6 6"/>
        </svg>
    `,

    back: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
        </svg>
    `,

    external: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 5h5v5"/>
            <path d="m19 5-8 8"/>
            <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>
        </svg>
    `,

    download: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12"/>
            <path d="m7 10 5 5 5-5"/>
            <path d="M5 21h14"/>
        </svg>
    `,

    close: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12"/>
            <path d="m18 6-12 12"/>
        </svg>
    `,

    check: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 4 4L19 6"/>
        </svg>
    `,

    logout: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 17l5-5-5-5"/>
            <path d="M15 12H3"/>
            <path d="M21 3v18"/>
        </svg>
    `,

    layers: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3 9 5-9 5-9-5z"/>
            <path d="m3 12 9 5 9-5"/>
            <path d="m3 16 9 5 9-5"/>
        </svg>
    `,

    megaphone: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 14V10a2 2 0 0 1 2-2h3l8-4v16l-8-4H6a2 2 0 0 1-2-2Z"/>
            <path d="M9 16v4"/>
            <path d="M21 9a4 4 0 0 1 0 6"/>
        </svg>
    `,

    quran: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/>
            <path d="M4 5.5v16"/>
            <path d="M8 7h8"/>
            <path d="M8 11h7"/>
            <path d="M8 15h5"/>
        </svg>
    `
};


/* =========================================================
   Helpers
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

    const result = [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


function normalizeArray(value) {

    if (Array.isArray(value)) {
        return value;
    }

    if (
        value &&
        typeof value === "object"
    ) {
        return Object.values(value);
    }

    return [];
}


function getStudentValue(...keys) {

    for (const key of keys) {

        if (
            state.student &&
            state.student[key] !== undefined &&
            state.student[key] !== null
        ) {
            return state.student[key];
        }
    }

    return "";
}


function formatNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("ar");
}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat(
        "ar",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    ).format(date);
}


function showMessage(message, type = "error") {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        `message-box ${type}`;
}


function clearMessage() {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = "";

    loginMessage.className =
        "message-box hidden";
}


function setLoading(loading) {

    if (!loginButton) {
        return;
    }

    loginButton.disabled = loading;

    const label =
        $(".button-label", loginButton);

    const loader =
        $(".button-loader", loginButton);

    if (label) {
        label.textContent =
            loading
                ? "جارٍ تسجيل الدخول..."
                : "دخول إلى المنصة";
    }

    if (loader) {
        loader.classList.toggle(
            "hidden",
            !loading
        );
    }

    const icon =
        $("svg", loginButton);

    if (icon) {
        icon.classList.toggle(
            "hidden",
            loading
        );
    }
}


/* =========================================================
   Student helpers
   ========================================================= */

function studentName() {

    return (
        getStudentValue(
            "name",
            "full_name",
            "student_name"
        ) ||
        "الطالب"
    );
}


function studentNumber() {

    return (
        getStudentValue(
            "studentNumber",
            "student_number",
            "number"
        ) ||
        "—"
    );
}


function updateStudentChip() {

    const name = studentName();

    const chipName =
        $(".student-chip-name");

    if (chipName) {
        chipName.textContent = name;
    }

    if (headerStudentName) {
        headerStudentName.textContent = name;
    }
}


/* =========================================================
   Login
   ========================================================= */

async function loginStudent(studentNumberValue, passwordValue) {

    if (!sb) {
        throw new Error(
            "إعدادات قاعدة البيانات غير موجودة."
        );
    }

    const {
        data,
        error
    } = await sb.rpc(
        "login_student",
        {
            p_student_number:
                studentNumberValue,

            p_password:
                passwordValue
        }
    );

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            "رقم الطالب أو كلمة المرور غير صحيحة."
        );
    }

    let student = data;

    if (Array.isArray(data)) {
        student = data[0];
    }

    if (
        data &&
        Array.isArray(data.data)
    ) {
        student = data.data[0];
    }

    if (!student) {
        throw new Error(
            "رقم الطالب أو كلمة المرور غير صحيحة."
        );
    }

    return student;
}


async function handleLogin(event) {

    event.preventDefault();

    clearMessage();

    const number =
        String(
            studentNumberInput?.value || ""
        ).trim();

    const password =
        String(
            passwordInput?.value || ""
        );

    if (!number || !password) {

        showMessage(
            "يرجى إدخال رقم الطالب وكلمة المرور."
        );

        return;
    }

    setLoading(true);

    try {

        const student =
            await loginStudent(
                number,
                password
            );

        state.student = student;

        localStorage.setItem(
            "balsam_student",
            JSON.stringify(student)
        );

        await showApplication();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showMessage(
            error?.message ||
            "تعذر تسجيل الدخول. حاول مرة أخرى."
        );

    } finally {

        setLoading(false);
    }
}


/* =========================================================
   Restore session
   ========================================================= */

function restoreSession() {

    try {

        const saved =
            localStorage.getItem(
                "balsam_student"
            );

        if (!saved) {
            return;
        }

        const student =
            JSON.parse(saved);

        if (!student) {
            return;
        }

        state.student = student;

        showApplication();

    } catch (error) {

        console.warn(
            "Could not restore session:",
            error
        );

        localStorage.removeItem(
            "balsam_student"
        );
    }
}


/* =========================================================
   Show application
   ========================================================= */

async function showApplication() {

    if (!state.student) {
        return;
    }

    loginScreen?.classList.add("hidden");

    appScreen?.classList.remove("hidden");

    updateStudentChip();

    await loadStaticData();

    renderPage("home");
}


/* =========================================================
   Static data
   ========================================================= */

async function loadJSON(path) {

    const response =
        await fetch(
            `${path}?v=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return response.json();
}


async function loadStaticData() {

    const [
        subjectsResult,
        postsResult,
        noticeResult
    ] = await Promise.allSettled([

        loadJSON(
            "data/subjects.json"
        ),

        loadJSON(
            "data/posts.json"
        ),

        loadJSON(
            "data/notice.json"
        )

    ]);


    if (
        subjectsResult.status === "fulfilled"
    ) {

        state.subjects =
            normalizeSubjects(
                subjectsResult.value
            );

    } else {

        console.error(
            "Could not load subjects:",
            subjectsResult.reason
        );

        state.subjects = [];
    }


    if (
        postsResult.status === "fulfilled"
    ) {

        state.posts =
            normalizeArray(
                postsResult.value
            );

    } else {

        console.warn(
            "Posts could not be loaded."
        );

        state.posts = [];
    }


    if (
        noticeResult.status === "fulfilled"
    ) {

        state.notice =
            noticeResult.value;

    } else {

        state.notice = null;

        console.warn(
            "Notice could not be loaded."
        );
    }
}


/* =========================================================
   Subjects normalization
   ========================================================= */

function normalizeSubjects(value) {

    let subjects =
        normalizeArray(value);

    if (
        value &&
        Array.isArray(value.subjects)
    ) {
        subjects = value.subjects;
    }

    return subjects
        .map(normalizeSubject)
        .filter(Boolean);
}


function normalizeSubject(subject, index) {

    if (
        !subject ||
        typeof subject !== "object"
    ) {
        return null;
    }

    const parts =
        normalizeArray(
            subject.parts
        )
        .map((part, partIndex) => {

            if (
                !part ||
                typeof part !== "object"
            ) {
                return null;
            }

            return {
                ...part,

                index:
                    part.index ??
                    part.number ??
                    partIndex + 1,

                name:
                    part.name ||
                    part.title ||
                    `الجزء ${partIndex + 1}`,

                file:
                    part.file ||
                    part.json ||
                    part.questionsFile ||
                    ""
            };
        })
        .filter(Boolean);


    return {

        ...subject,

        id:
            subject.id ||
            `subject-${index + 1}`,

        number:
            subject.number ??
            index + 1,

        category:
            subject.category ||
            "المواد",

        name:
            subject.name ||
            subject.title ||
            `المادة ${index + 1}`,

        book:
            subject.book ||
            subject.pdf ||
            subject.bookUrl ||
            "",

        parts
    };
}


/* =========================================================
   Page navigation
   ========================================================= */

function setActiveNavigation(page) {

    $$(".mobile-nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });
}


function renderPage(page) {

    if (!state.student) {
        return;
    }

    /*
       أثناء الاختبار لا نسمح بالتنقل إلى صفحة
       أخرى حتى لا تضيع محاولة الطالب.
    */

    if (
        state.quiz.questions.length &&
        state.currentPage === "quiz" &&
        page !== "quiz"
    ) {

        return;
    }

    state.currentPage = page;

    setActiveNavigation(page);


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

        case "quiz":
            renderQuiz();
            break;

        case "subject":
            renderSubject(
                state.currentSubject
            );
            break;

        case "result":
            renderQuizResult(
                state.quiz.lastResult
            );
            break;

        default:
            renderHome();
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   Home
   ========================================================= */

function renderHome() {

    const posts =
        normalizeArray(
            state.posts
        );

    const notice =
        state.notice;


    const points =
        Number(
            getStudentValue(
                "points",
                "score",
                "total_points"
            )
        ) || 0;


    const tests =
        Number(
            getStudentValue(
                "tests",
                "test_count",
                "completed_tests",
                "total_tests"
            )
        ) || 0;


    const correct =
        Number(
            getStudentValue(
                "correct",
                "correct_answers",
                "total_correct"
            )
        ) || 0;


    appContent.innerHTML = `

        <section class="page home-page">

            <div class="home-hero">

                <div class="home-hero-main">

                    <div class="home-hero-copy">

                        <div class="hero-user-icon">
                            ${ICONS.user}
                        </div>

                        <span class="eyebrow">
                            منصة مدرسة البلسم الثانوية
                        </span>

                        <h1>
                            مرحباً،
                            <span>
                                ${escapeHTML(studentName())}
                            </span>
                        </h1>

                        <p class="home-hero-description">
                            أهلاً بك في منصتك التعليمية.
                            يمكنك الوصول إلى المواد والاختبارات
                            ومتابعة تقدمك الأكاديمي من مكان واحد.
                        </p>

                    </div>


                    <div class="hero-stats">

                        <div class="mini-stat">
                            <span class="mini-stat-value">
                                ${formatNumber(points)}
                            </span>

                            <span class="mini-stat-label">
                                النقاط
                            </span>
                        </div>


                        <div class="mini-stat">
                            <span class="mini-stat-value">
                                ${formatNumber(tests)}
                            </span>

                            <span class="mini-stat-label">
                                الاختبارات
                            </span>
                        </div>


                        <div class="mini-stat">
                            <span class="mini-stat-value">
                                ${formatNumber(correct)}
                            </span>

                            <span class="mini-stat-label">
                                الإجابات الصحيحة
                            </span>
                        </div>


                        <div class="mini-stat">
                            <span class="mini-stat-value">
                                ${formatNumber(state.subjects.length)}
                            </span>

                            <span class="mini-stat-label">
                                المواد
                            </span>
                        </div>

                    </div>

                </div>

            </div>


            <div class="ayah-card">

                <div class="ayah-icon">
                    ${ICONS.quran}
                </div>

                <div class="ayah-content">

                    <strong>
                        قال تعالى
                    </strong>

                    <p>
                        ﴿وَقُلْ رَبِّ زِدْنِي عِلْمًا﴾
                    </p>

                    <small>
                        سورة طه — الآية 114
                    </small>

                </div>

            </div>


            ${
                renderNotice(notice)
            }


            <div class="library-banner">

                <div>

                    <h2>
                        مكتبتك التعليمية
                    </h2>

                    <p>
                        تصفح المواد الدراسية وابدأ اختبارك
                        من المكان الذي يناسبك.
                    </p>

                </div>

                <button
                    class="library-banner-icon"
                    data-page="library"
                    type="button"
                    aria-label="فتح المكتبة"
                >
                    ${ICONS.book}
                </button>

            </div>


            <section class="posts-section">

                <div class="section-heading">

                    <div class="section-heading-main">

                        <span class="section-heading-icon">
                            ${ICONS.megaphone}
                        </span>

                        <div>

                            <h2>
                                منشورات المدرسة
                            </h2>

                            <p>
                                آخر الأخبار والمعلومات
                            </p>

                        </div>

                    </div>

                </div>


                <div class="posts-list">

                    ${
                        posts.length
                            ? posts
                                .map(renderPost)
                                .join("")
                            : `
                                <div class="empty-state">

                                    <strong>
                                        لا توجد منشورات حالياً
                                    </strong>

                                    <p>
                                        ستظهر منشورات المدرسة هنا عند نشرها.
                                    </p>

                                </div>
                              `
                    }

                </div>

            </section>

        </section>
    `;
}


function renderNotice(notice) {

    if (!notice) {
        return "";
    }

    const title =
        notice.title ||
        notice.heading ||
        "إعلان مهم";

    const content =
        notice.content ||
        notice.text ||
        notice.message ||
        "";


    if (!content) {
        return "";
    }


    return `

        <section class="notice-card">

            <div class="notice-heading">

                <span class="notice-icon">
                    ${ICONS.megaphone}
                </span>

                <h2>
                    ${escapeHTML(title)}
                </h2>

            </div>

            <div class="notice-content">
                ${escapeHTML(content)}
            </div>

        </section>
    `;
}


function renderPost(post) {

    if (!post) {
        return "";
    }

    const author =
        post.author ||
        post.authorName ||
        post.name ||
        "مدرسة البلسم الثانوية";

    const text =
        post.text ||
        post.content ||
        post.body ||
        post.description ||
        "";

    const date =
        post.date ||
        post.created_at ||
        post.createdAt ||
        "";


    const firstLetter =
        author.trim().charAt(0) ||
        "م";


    return `

        <article class="post-card">

            <div class="post-header">

                <div class="post-author-icon">
                    ${escapeHTML(firstLetter)}
                </div>

                <div class="post-author-info">

                    <strong>
                        ${escapeHTML(author)}
                    </strong>

                    ${
                        date
                            ? `
                                <small>
                                    ${escapeHTML(formatDate(date))}
                                </small>
                              `
                            : ""
                    }

                </div>

            </div>


            <div class="post-body">
                ${escapeHTML(text)}
            </div>


            ${
                date
                    ? `
                        <div class="post-date">
                            ${escapeHTML(formatDate(date))}
                        </div>
                      `
                    : ""
            }

        </article>
    `;
}


/* =========================================================
   Library
   ========================================================= */

function renderLibrary() {

    const groups = {};


    state.subjects.forEach(subject => {

        const category =
            subject.category ||
            "المواد";

        if (!groups[category]) {
            groups[category] = [];
        }

        groups[category].push(subject);

    });


    const categories =
        Object.entries(groups);


    appContent.innerHTML = `

        <section class="page library-page">

            <div class="page-header">

                <span class="eyebrow">
                    المكتبة التعليمية
                </span>

                <h1>
                    المواد الدراسية
                </h1>

                <p>
                    اختر المادة للوصول إلى أجزائها
                    والاختبارات والكتاب المرتبط بالمادة.
                </p>

            </div>


            ${
                categories.length
                    ? `
                        <div class="library-categories">

                            ${
                                categories
                                    .map(
                                        (
                                            [category, subjects],
                                            categoryIndex
                                        ) =>
                                            renderCategory(
                                                category,
                                                subjects,
                                                categoryIndex
                                            )
                                    )
                                    .join("")
                            }

                        </div>
                      `
                    : `
                        <div class="empty-state">

                            <strong>
                                لا توجد مواد حالياً
                            </strong>

                            <p>
                                سيتم عرض المواد هنا عند إضافتها.
                            </p>

                        </div>
                      `
            }

        </section>
    `;
}


function renderCategory(
    category,
    subjects,
    index
) {

    return `

        <section class="library-category">

            <div class="category-header">

                <div class="category-title">

                    <span class="category-number">
                        ${index + 1}
                    </span>

                    <div>

                        <h2>
                            ${escapeHTML(category)}
                        </h2>

                    </div>

                </div>


                <span class="category-count">
                    ${formatNumber(subjects.length)}
                    مواد
                </span>

            </div>


            <div class="subjects-grid">

                ${
                    subjects
                        .map(renderSubjectCard)
                        .join("")
                }

            </div>

        </section>
    `;
}


function renderSubjectCard(subject) {

    return `

        <button
            class="subject-card"
            data-action="open-subject"
            data-subject-id="${escapeHTML(subject.id)}"
            type="button"
        >

            <span class="subject-card-icon">
                ${ICONS.book}
            </span>

            <span class="subject-card-content">

                <strong>
                    ${escapeHTML(subject.name)}
                </strong>

                <small>
                    ${formatNumber(subject.parts.length)}
                    ${subject.parts.length === 1 ? "جزء" : "أجزاء"}
                </small>

            </span>

            <span class="subject-card-arrow">
                ${ICONS.arrow}
            </span>

        </button>
    `;
}


/* =========================================================
   Subject
   ========================================================= */

function renderSubject(subject) {

    if (!subject) {
        renderLibrary();
        return;
    }


    state.currentSubject = subject;


    appContent.innerHTML = `

        <section class="page subject-page">

            <button
                class="back-button"
                data-page="library"
                type="button"
            >
                ${ICONS.back}

                العودة إلى المكتبة
            </button>


            <div class="subject-hero">

                <div class="subject-main-icon">
                    ${ICONS.book}
                </div>

                <div>

                    <h1>
                        ${escapeHTML(subject.name)}
                    </h1>

                    <p>
                        ${formatNumber(subject.parts.length)}
                        أجزاء اختبارية متاحة
                    </p>

                </div>

            </div>


            ${
                subject.book
                    ? `

                        <div class="subject-book-card">

                            <div class="subject-book-info">

                                <span class="subject-book-icon">
                                    ${ICONS.book}
                                </span>

                                <div>

                                    <strong>
                                        كتاب المادة
                                    </strong>

                                    <small>
                                        الكتاب مرتبط بالمادة كاملة
                                    </small>

                                </div>

                            </div>


                            <a
                                class="primary-button subject-book-button"
                                href="${escapeHTML(subject.book)}"
                                target="_blank"
                                rel="noopener"
                            >
                                ${ICONS.external}

                                كتاب المادة
                                — فتح / تنزيل
                            </a>

                        </div>

                      `
                    : ""
            }


            <div class="section-heading">

                <div class="section-heading-main">

                    <span class="section-heading-icon">
                        ${ICONS.test}
                    </span>

                    <div>

                        <h2>
                            اختبارات المادة
                        </h2>

                        <p>
                            اختر الجزء الذي تريد اختباره
                        </p>

                    </div>

                </div>

            </div>


            ${
                subject.parts.length
                    ? `
                        <div class="parts-grid">

                            ${
                                subject.parts
                                    .map(
                                        (part, index) =>
                                            renderPartCard(
                                                part,
                                                index,
                                                subject
                                            )
                                    )
                                    .join("")
                            }

                        </div>
                      `
                    : `
                        <div class="empty-state">

                            <strong>
                                لا توجد اختبارات لهذه المادة
                            </strong>

                            <p>
                                سيتم إضافة الاختبارات لاحقاً.
                            </p>

                        </div>
                      `
            }

        </section>
    `;
}


/* =========================================================
   Part card
   ========================================================= */

function renderPartCard(
    part,
    index,
    subject
) {

    const label =
        part.questions ||
        "اختبار 20 سؤالاً";


    return `

        <article class="part-card">

            <div class="part-top">

                <span class="part-number">
                    ${index + 1}
                </span>

                <span class="part-icon">
                    ${ICONS.layers}
                </span>

            </div>


            <div class="part-content">

                <strong>
                    ${escapeHTML(part.name)}
                </strong>

                <small>
                    ${escapeHTML(label)}
                </small>

            </div>


            <div class="part-actions">

                <button
                    class="primary-button"
                    data-action="start-quiz"
                    data-subject-id="${escapeHTML(subject.id)}"
                    data-part-index="${index}"
                    type="button"
                >
                    ${ICONS.test}

                    ابدأ الاختبار
                </button>

            </div>

        </article>
    `;
}


/* =========================================================
   Questions
   ========================================================= */

function normalizeQuestion(question) {

    if (
        !question ||
        typeof question !== "object"
    ) {
        return null;
    }


    const text =
        question.q ||
        question.question ||
        question.text ||
        question.prompt ||
        "";


    const correct =
        question.a ||
        question.answer ||
        question.correct ||
        question.correctAnswer ||
        "";


    let wrong =
        question.w ||
        question.wrongAnswers ||
        question.wrong ||
        [];


    if (!Array.isArray(wrong)) {
        wrong = [wrong];
    }


    let options =
        question.options;


    if (!Array.isArray(options)) {
        options = [
            correct,
            ...wrong
        ];
    }


    options =
        options
            .filter(
                option =>
                    option !== null &&
                    option !== undefined &&
                    String(option).trim()
            )
            .map(
                option =>
                    String(option)
            );


    if (
        correct &&
        !options.includes(
            String(correct)
        )
    ) {
        options.unshift(
            String(correct)
        );
    }


    options =
        [...new Set(options)];


    if (
        !text ||
        !correct ||
        options.length < 2
    ) {
        return null;
    }


    return {

        q: String(text),

        a: String(correct),

        options: shuffle(options)
    };
}


async function loadQuestions(file) {

    if (!file) {
        throw new Error(
            "ملف أسئلة الاختبار غير محدد."
        );
    }


    const data =
        await loadJSON(file);


    let questions =
        normalizeArray(data);


    if (
        data &&
        Array.isArray(data.questions)
    ) {
        questions =
            data.questions;
    }


    if (
        data &&
        Array.isArray(data.data)
    ) {
        questions =
            data.data;
    }


    return questions
        .map(normalizeQuestion)
        .filter(Boolean);
}


/* =========================================================
   Start quiz
   ========================================================= */

async function startPartQuiz(
    subject,
    part,
    index
) {

    if (!part?.file) {

        appContent.innerHTML = `

            <section class="page">

                <div class="error-state">

                    لم يتم تحديد ملف أسئلة لهذا الجزء.

                </div>

            </section>
        `;

        return;
    }


    state.currentSubject = subject;
    state.currentPart = part;

    state.quiz = {

        questions: [],
        answers: {},

        index: 0,

        startTime: 0,

        duration:
            Number(
                part.duration ||
                subject.duration ||
                600
            ),

        questionCount:
            Number(
                part.questionCount ||
                subject.questionCount ||
                20
            ),

        timer: null,

        loading: true
    };


    state.currentPage = "quiz";

    setActiveNavigation("quiz");


    appContent.innerHTML = `

        <section class="page quiz-page">

            <div class="quiz-loading">

                <div>

                    <div class="loading-orb"></div>

                    <p>
                        جارٍ تحميل أسئلة الاختبار...
                    </p>

                </div>

            </div>

        </section>
    `;


    try {

        const allQuestions =
            await loadQuestions(
                part.file
            );


        if (!allQuestions.length) {
            throw new Error(
                "لا توجد أسئلة صالحة في ملف هذا الاختبار."
            );
        }


        const count =
            Math.min(
                Math.max(
                    1,
                    state.quiz.questionCount
                ),
                allQuestions.length
            );


        state.quiz.questions =
            shuffle(
                allQuestions
            ).slice(
                0,
                count
            );


        state.quiz.questionCount =
            state.quiz.questions.length;

        state.quiz.startTime =
            Date.now();

        state.quiz.loading = false;


        renderQuiz();

        startQuizTimer();


    } catch (error) {

        console.error(
            "Quiz loading error:",
            error
        );

        appContent.innerHTML = `

            <section class="page">

                <button
                    class="back-button"
                    data-page="library"
                    type="button"
                >
                    ${ICONS.back}
                    العودة
                </button>

                <div class="error-state">
                    تعذر تحميل الاختبار.
                    <br>
                    ${escapeHTML(
                        error?.message ||
                        "حدث خطأ غير معروف."
                    )}
                </div>

            </section>
        `;
    }
}


/* =========================================================
   Render quiz
   ========================================================= */

function renderQuiz() {

    const quiz =
        state.quiz;

    const question =
        quiz.questions[
            quiz.index
        ];


    if (!question) {
        return;
    }


    const total =
        quiz.questions.length;


    const current =
        quiz.index + 1;


    const progress =
        Math.round(
            (current / total) * 100
        );


    const selected =
        quiz.answers[
            quiz.index
        ];


    appContent.innerHTML = `

        <section class="page quiz-page">

            <div class="quiz-header">

                <button
                    class="quiz-exit"
                    data-action="quit-quiz"
                    type="button"
                >
                    ${ICONS.close}

                    إنهاء الاختبار
                </button>


                <div class="quiz-title">

                    <strong>
                        ${escapeHTML(
                            state.currentSubject?.name ||
                            "الاختبار"
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            state.currentPart?.name ||
                            ""
                        )}
                    </small>

                </div>


                <div
                    id="quizTimer"
                    class="quiz-timer"
                >
                    ${formatSeconds(
                        getRemainingSeconds()
                    )}
                </div>

            </div>


            <div class="quiz-progress">

                <div class="quiz-progress-info">

                    <span>
                        السؤال ${formatNumber(current)}
                        من
                        ${formatNumber(total)}
                    </span>

                    <span>
                        ${progress}%
                    </span>

                </div>


                <div class="quiz-progress-bar">

                    <div
                        class="quiz-progress-fill"
                        style="width:${progress}%"
                    ></div>

                </div>

            </div>


            <div class="question-card">

                <div class="quiz-question-meta">
                    سؤال ${formatNumber(current)}
                </div>


                <h2>
                    ${escapeHTML(question.q)}
                </h2>


                <div class="answers-list">

                    ${
                        question.options
                            .map(
                                (option, optionIndex) =>
                                    renderAnswer(
                                        option,
                                        optionIndex,
                                        selected
                                    )
                            )
                            .join("")
                    }

                </div>


                <div class="quiz-footer">

                    <button
                        class="secondary-button danger"
                        data-action="quit-quiz"
                        type="button"
                    >
                        إنهاء دون حفظ
                    </button>


                    <button
                        class="primary-button quiz-next"
                        data-action="next-question"
                        type="button"
                    >
                        ${
                            current >= total
                                ? "إنهاء الاختبار"
                                : "السؤال التالي"
                        }

                        ${ICONS.arrow}
                    </button>

                </div>

            </div>

        </section>
    `;
}


function renderAnswer(
    option,
    optionIndex,
    selected
) {

    const letters =
        ["أ", "ب", "ج", "د", "هـ", "و"];


    const isSelected =
        selected === option;


    return `

        <button
            class="answer-button ${
                isSelected
                    ? "selected"
                    : ""
            }"
            data-action="select-answer"
            data-answer="${escapeHTML(option)}"
            type="button"
        >

            <span class="answer-letter">
                ${letters[optionIndex] || optionIndex + 1}
            </span>

            <span class="answer-text">
                ${escapeHTML(option)}
            </span>

        </button>
    `;
}


/* =========================================================
   Quiz timer
   ========================================================= */

function getRemainingSeconds() {

    const elapsed =
        Math.floor(
            (
                Date.now() -
                state.quiz.startTime
            ) / 1000
        );


    return Math.max(
        0,
        state.quiz.duration - elapsed
    );
}


function formatSeconds(totalSeconds) {

    const seconds =
        Math.max(
            0,
            Number(totalSeconds) || 0
        );


    const minutes =
        Math.floor(
            seconds / 60
        );

    const remaining =
        seconds % 60;


    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}


function startQuizTimer() {

    stopQuizTimer();


    state.quiz.timer =
        setInterval(() => {

            const remaining =
                getRemainingSeconds();


            const timer =
                $("#quizTimer");


            if (timer) {
                timer.textContent =
                    formatSeconds(
                        remaining
                    );
            }


            if (remaining <= 0) {

                stopQuizTimer();

                finishQuiz(
                    true
                );
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
   Quiz answer
   ========================================================= */

function selectAnswer(answer) {

    state.quiz.answers[
        state.quiz.index
    ] = answer;

    renderQuiz();
}


function nextQuestion() {

    const total =
        state.quiz.questions.length;


    if (
        state.quiz.index >=
        total - 1
    ) {

        finishQuiz(false);

        return;
    }


    state.quiz.index++;

    renderQuiz();
}


function quitQuiz() {

    const confirmed =
        window.confirm(
            "هل تريد إنهاء الاختبار؟ لن يتم حفظ هذه المحاولة."
        );


    if (!confirmed) {
        return;
    }


    stopQuizTimer();


    state.quiz = {

        questions: [],
        answers: {},

        index: 0,

        startTime: 0,

        duration: 600,
        questionCount: 20,

        timer: null,

        loading: false
    };


    state.currentPart = null;

    renderPage("library");
}


/* =========================================================
   Finish quiz
   ========================================================= */

async function finishQuiz(autoFinished = false) {

    if (
        !state.quiz.questions.length
    ) {
        return;
    }


    stopQuizTimer();


    const questions =
        state.quiz.questions;


    let correct = 0;


    questions.forEach(
        (question, index) => {

            const answer =
                state.quiz.answers[index];


            if (
                answer !== undefined &&
                answer === question.a
            ) {
                correct++;
            }

        }
    );


    const total =
        questions.length;


    const wrong =
        total - correct;


    const elapsed =
        Math.min(
            state.quiz.duration,
            Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        state.quiz.startTime
                    ) / 1000
                )
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

        totalQuestions: total,

        correctAnswers: correct,

        wrongAnswers: wrong,

        durationSeconds: elapsed,

        autoFinished
    };


    state.quiz.lastResult =
        result;


    await saveTestResult(result);


    state.quiz.questions = [];


    state.currentPage = "result";

    renderQuizResult(result);
}


/* =========================================================
   Save result
   ========================================================= */

async function saveTestResult(result) {

    if (!sb || !state.student) {
        return false;
    }


    const studentId =
        getStudentValue(
            "id",
            "student_id"
        );


    if (!studentId) {
        console.warn(
            "Student ID is missing; result not saved."
        );

        return false;
    }


    try {

        const {
            error
        } = await sb.rpc(
            "submit_test_result",
            {

                p_student_id:
                    studentId,

                p_subject:
                    result.subject,

                p_part:
                    result.part,

                p_score:
                    result.score,

                p_total_questions:
                    result.totalQuestions,

                p_correct_answers:
                    result.correctAnswers,

                p_wrong_answers:
                    result.wrongAnswers,

                p_duration_seconds:
                    result.durationSeconds
            }
        );


        if (error) {
            throw error;
        }


        /*
         * تحديث القيم المحلية فقط بعد نجاح الحفظ.
         */

        const currentPoints =
            Number(
                getStudentValue(
                    "points",
                    "score",
                    "total_points"
                )
            ) || 0;


        const currentTests =
            Number(
                getStudentValue(
                    "tests",
                    "test_count",
                    "completed_tests",
                    "total_tests"
                )
            ) || 0;


        const currentCorrect =
            Number(
                getStudentValue(
                    "correct",
                    "correct_answers",
                    "total_correct"
                )
            ) || 0;


        state.student.points =
            currentPoints +
            result.score;


        state.student.tests =
            currentTests + 1;


        state.student.correct =
            currentCorrect +
            result.correctAnswers;


        localStorage.setItem(
            "balsam_student",
            JSON.stringify(
                state.student
            )
        );


        updateStudentChip();


        return true;


    } catch (error) {

        console.error(
            "Could not save test result:",
            error
        );

        return false;
    }
}


/* =========================================================
   Quiz result
   ========================================================= */

function renderQuizResult(result) {

    if (!result) {
        renderPage("home");
        return;
    }


    const percentage =
        result.totalQuestions
            ? Math.round(
                (
                    result.correctAnswers /
                    result.totalQuestions
                ) * 100
            )
            : 0;


    appContent.innerHTML = `

        <section class="page quiz-result-page">

            <div class="result-card">

                <div class="result-icon">

                    ${
                        percentage >= 50
                            ? ICONS.check
                            : ICONS.test
                    }

                </div>


                <h1>
                    تم الانتهاء من الاختبار
                </h1>


                <p>
                    ${
                        result.autoFinished
                            ? "انتهى الوقت وتم إنهاء الاختبار تلقائياً."
                            : "تم تسجيل نتيجة محاولتك."
                    }
                </p>


                <div class="result-score">

                    ${formatNumber(result.score)}

                    <small>
                        /
                        ${formatNumber(result.totalQuestions)}
                    </small>

                </div>


                <div class="result-stats">

                    <div class="result-stat">

                        <strong>
                            ${formatNumber(
                                result.correctAnswers
                            )}
                        </strong>

                        <span>
                            إجابات صحيحة
                        </span>

                    </div>


                    <div class="result-stat">

                        <strong>
                            ${formatNumber(
                                result.wrongAnswers
                            )}
                        </strong>

                        <span>
                            إجابات خاطئة
                        </span>

                    </div>


                    <div class="result-stat">

                        <strong>
                            ${formatSeconds(
                                result.durationSeconds
                            )}
                        </strong>

                        <span>
                            الوقت المستغرق
                        </span>

                    </div>

                </div>


                <div class="result-actions">

                    <button
                        class="primary-button"
                        data-page="library"
                        type="button"
                    >
                        ${ICONS.book}

                        العودة إلى المكتبة
                    </button>


                    <button
                        class="secondary-button"
                        data-page="home"
                        type="button"
                    >
                        الرئيسية
                    </button>

                </div>

            </div>

        </section>
    `;
}


/* =========================================================
   Ranking
   ========================================================= */

async function renderRanking() {

    appContent.innerHTML = `

        <section class="page ranking-page">

            <div class="page-header">

                <span class="eyebrow">
                    لوحة المتصدرين
                </span>

                <h1>
                    ترتيب الطلاب
                </h1>

                <p>
                    تعرّف على ترتيب الطلاب حسب نقاطهم.
                </p>

            </div>


            <div
                id="rankingContainer"
                class="ranking-list"
            >

                <div class="loading-state">
                    جارٍ تحميل الترتيب...
                </div>

            </div>

        </section>
    `;


    if (!sb) {

        $("#rankingContainer").innerHTML = `

            <div class="error-state">
                قاعدة البيانات غير متصلة.
            </div>

        `;

        return;
    }


    try {

        const {
            data,
            error
        } = await sb.rpc(
            "get_ranking"
        );


        if (error) {
            throw error;
        }


        let ranking =
            normalizeArray(data);


        if (
            data &&
            Array.isArray(data.data)
        ) {
            ranking =
                data.data;
        }


        const container =
            $("#rankingContainer");


        if (!ranking.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <strong>
                        لا يوجد ترتيب حالياً
                    </strong>

                    <p>
                        سيظهر ترتيب الطلاب بعد تسجيل النتائج.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            ranking
                .map(
                    (student, index) =>
                        renderRankingItem(
                            student,
                            index
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Ranking error:",
            error
        );


        $("#rankingContainer").innerHTML = `

            <div class="error-state">

                تعذر تحميل الترتيب حالياً.
                <br>

                ${escapeHTML(
                    error?.message ||
                    "حدث خطأ غير معروف."
                )}

            </div>
        `;
    }
}


function renderRankingItem(
    student,
    index
) {

    const name =
        student.name ||
        student.full_name ||
        student.student_name ||
        "طالب";


    const points =
        Number(
            student.points ??
            student.total_points ??
            student.score ??
            0
        );


    const firstLetter =
        name.trim().charAt(0) ||
        "ط";


    return `

        <div class="ranking-item">

            <span class="ranking-position">
                ${index + 1}
            </span>

            <span class="ranking-avatar">
                ${escapeHTML(firstLetter)}
            </span>

            <span class="ranking-info">

                <strong>
                    ${escapeHTML(name)}
                </strong>

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

            </span>

            <span class="ranking-points">
                ${formatNumber(points)}
                نقطة
            </span>

        </div>
    `;
}


/* =========================================================
   Profile
   ========================================================= */

function renderProfile() {

    const name =
        studentName();


    const number =
        studentNumber();


    const specialization =
        getStudentValue(
            "specialization",
            "major",
            "department"
        ) ||
        "غير محدد";


    const points =
        Number(
            getStudentValue(
                "points",
                "score",
                "total_points"
            )
        ) || 0;


    const tests =
        Number(
            getStudentValue(
                "tests",
                "test_count",
                "completed_tests",
                "total_tests"
            )
        ) || 0;


    const correct =
        Number(
            getStudentValue(
                "correct",
                "correct_answers",
                "total_correct"
            )
        ) || 0;


    const note =
        getStudentValue(
            "note",
            "admin_note",
            "student_note"
        );


    const level =
        getStudentValue(
            "level",
            "student_level"
        ) ||
        calculateLevel(points);


    appContent.innerHTML = `

        <section class="page profile-page">

            <div class="page-header">

                <span class="eyebrow">
                    الحساب الشخصي
                </span>

                <h1>
                    ملفي الشخصي
                </h1>

                <p>
                    بياناتك الأكاديمية وإحصاءات تقدمك.
                </p>

            </div>


            <div class="profile-card">

                <div class="profile-top">

                    <div class="profile-icon">
                        ${ICONS.user}
                    </div>


                    <div class="profile-main">

                        <h1>
                            ${escapeHTML(name)}
                        </h1>

                        <p>
                            رقم الطالب:
                            ${escapeHTML(number)}
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
                            إجابات صحيحة
                        </span>

                    </div>


                    <div class="profile-stat">

                        <strong>
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
                                    ملاحظة الإدارة
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
                        class="logout-button"
                        data-action="logout"
                        type="button"
                    >
                        ${ICONS.logout}

                        تسجيل الخروج
                    </button>

                </div>

            </div>

        </section>
    `;
}


function calculateLevel(points) {

    if (points >= 1000) {
        return "متميز";
    }

    if (points >= 500) {
        return "متقدم";
    }

    if (points >= 200) {
        return "مجتهد";
    }

    return "مبتدئ";
}


/* =========================================================
   Logout
   ========================================================= */

function logout() {

    stopQuizTimer();

    state.student = null;

    state.currentSubject = null;
    state.currentPart = null;

    state.quiz = {

        questions: [],
        answers: {},

        index: 0,

        startTime: 0,

        duration: 600,
        questionCount: 20,

        timer: null,
        loading: false
    };


    localStorage.removeItem(
        "balsam_student"
    );


    appScreen?.classList.add("hidden");

    loginScreen?.classList.remove("hidden");


    if (studentNumberInput) {
        studentNumberInput.value = "";
    }

    if (passwordInput) {
        passwordInput.value = "";
    }


    clearMessage();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   Event delegation
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        const pageButton =
            event.target.closest(
                "[data-page]"
            );


        if (
            pageButton &&
            pageButton.dataset.page
        ) {

            const page =
                pageButton.dataset.page;


            if (page === "subject") {

                renderSubject(
                    state.currentSubject
                );

                return;
            }


            renderPage(page);

            return;
        }


        const openSubject =
            event.target.closest(
                '[data-action="open-subject"]'
            );


        if (openSubject) {

            const subjectId =
                openSubject.dataset.subjectId;


            const subject =
                state.subjects.find(
                    item =>
                        String(item.id) ===
                        String(subjectId)
                );


            if (subject) {

                state.currentSubject =
                    subject;

                state.currentPage =
                    "subject";

                renderSubject(subject);

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }


            return;
        }


        const startQuizButton =
            event.target.closest(
                '[data-action="start-quiz"]'
            );


        if (startQuizButton) {

            const subjectId =
                startQuizButton.dataset.subjectId;


            const partIndex =
                Number(
                    startQuizButton.dataset.partIndex
                );


            const subject =
                state.subjects.find(
                    item =>
                        String(item.id) ===
                        String(subjectId)
                );


            const part =
                subject?.parts?.[
                    partIndex
                ];


            if (subject && part) {

                await startPartQuiz(
                    subject,
                    part,
                    partIndex
                );
            }


            return;
        }


        const answerButton =
            event.target.closest(
                '[data-action="select-answer"]'
            );


        if (answerButton) {

            selectAnswer(
                answerButton.dataset.answer
            );

            return;
        }


        const nextButton =
            event.target.closest(
                '[data-action="next-question"]'
            );


        if (nextButton) {

            nextQuestion();

            return;
        }


        const quitButton =
            event.target.closest(
                '[data-action="quit-quiz"]'
            );


        if (quitButton) {

            quitQuiz();

            return;
        }


        const logoutButton =
            event.target.closest(
                '[data-action="logout"]'
            );


        if (logoutButton) {

            const confirmed =
                window.confirm(
                    "هل تريد تسجيل الخروج؟"
                );


            if (confirmed) {
                logout();
            }

            return;
        }

    }
);


/* =========================================================
   Login listeners
   ========================================================= */

loginForm?.addEventListener(
    "submit",
    handleLogin
);


togglePassword?.addEventListener(
    "click",
    () => {

        if (!passwordInput) {
            return;
        }


        const isPassword =
            passwordInput.type ===
            "password";


        passwordInput.type =
            isPassword
                ? "text"
                : "password";


        const openEye =
            $(".eye-open", togglePassword);

        const closedEye =
            $(".eye-closed", togglePassword);


        openEye?.classList.toggle(
            "hidden",
            isPassword
        );

        closedEye?.classList.toggle(
            "hidden",
            !isPassword
        );


        togglePassword.setAttribute(
            "aria-label",
            isPassword
                ? "إخفاء كلمة المرور"
                : "إظهار كلمة المرور"
        );
    }
);


/* =========================================================
   Initial load
   ========================================================= */

restoreSession();
