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

    page: "home",

    selectedCategory: null,
    selectedSubject: null,

    quiz: null,

    ranking: []
};


/* =========================================================
   عناصر الصفحة
========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");

const loginForm = document.getElementById("loginForm");
const studentNumberInput = document.getElementById("studentNumber");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const togglePassword = document.getElementById("togglePassword");

const appContent = document.getElementById("appContent");
const studentChip = document.getElementById("studentChip");

const navButtons = document.querySelectorAll(".nav-button");


/* =========================================================
   أدوات عامة
========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatNumber(value) {
    return Number(value || 0).toLocaleString("ar");
}


function showLoginMessage(message, type = "error") {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
}


function setLoginLoading(loading) {
    if (!loginButton) return;

    loginButton.disabled = loading;

    loginButton.innerHTML = loading
        ? `
            <span>جارٍ تسجيل الدخول...</span>
            <span class="button-loader"></span>
          `
        : `
            <span>دخول إلى منصتي</span>
            <span class="button-arrow">←</span>
          `;
}


function shuffleArray(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


function normalizeQuestion(question) {
    return {
        q: question.q || "",
        a: question.a || "",
        w: Array.isArray(question.w)
            ? question.w
            : []
    };
}


/* =========================================================
   تحميل البيانات
========================================================= */

async function loadJSON(path) {
    const response = await fetch(path, {
        cache: "no-cache"
    });

    if (!response.ok) {
        throw new Error(`تعذر تحميل ${path}`);
    }

    return await response.json();
}


async function loadStaticData() {
    try {
        const [
            subjects,
            posts,
            notice
        ] = await Promise.all([
            loadJSON("data/subjects.json"),
            loadJSON("data/posts.json"),
            loadJSON("data/notice.json")
        ]);

        state.subjects =
            Array.isArray(subjects)
                ? subjects
                : [];

        state.posts =
            Array.isArray(posts)
                ? posts
                : [];

        state.notice =
            notice || null;

    } catch (error) {

        console.error(error);

        state.subjects = [];
        state.posts = [];
        state.notice = null;
    }
}


/* =========================================================
   تسجيل الدخول
========================================================= */

async function loginStudent(
    studentNumber,
    password
) {

    const { data, error } =
        await sb.rpc(
            "login_student",
            {
                p_student_number:
                    studentNumber,

                p_password:
                    password
            }
        );

    if (error) {
        throw error;
    }

    if (!data || data.length === 0) {
        throw new Error(
            "رقم الطالب أو كلمة المرور غير صحيحة"
        );
    }

    return data[0];
}


async function handleLogin(event) {

    event.preventDefault();

    const studentNumber =
        studentNumberInput.value.trim();

    const password =
        passwordInput.value.trim();

    if (!studentNumber || !password) {

        showLoginMessage(
            "يرجى إدخال رقم الطالب وكلمة المرور"
        );

        return;
    }

    setLoginLoading(true);
    showLoginMessage("", "");

    try {

        const student =
            await loginStudent(
                studentNumber,
                password
            );

        state.student = student;

        localStorage.setItem(
            "balsam_student",
            JSON.stringify(student)
        );

        await startApplication();

    } catch (error) {

        console.error(error);

        showLoginMessage(
            error.message ||
            "حدث خطأ أثناء تسجيل الدخول"
        );

    } finally {

        setLoginLoading(false);
    }
}


/* =========================================================
   الجلسة
========================================================= */

function loadSavedStudent() {

    try {

        const saved =
            localStorage.getItem(
                "balsam_student"
            );

        if (!saved) return null;

        return JSON.parse(saved);

    } catch (error) {

        console.error(error);

        localStorage.removeItem(
            "balsam_student"
        );

        return null;
    }
}


function logout() {

    clearInterval(
        state.quiz?.timer
    );

    state.student = null;
    state.quiz = null;

    localStorage.removeItem(
        "balsam_student"
    );

    location.reload();
}


/* =========================================================
   تشغيل التطبيق
========================================================= */

async function startApplication() {

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    updateStudentChip();

    await loadStaticData();

    renderPage("home");
}


function updateStudentChip() {

    if (!studentChip || !state.student) {
        return;
    }

    studentChip.textContent =
        state.student.name || "الطالب";
}


/* =========================================================
   التنقل
========================================================= */

function setActiveNav(page) {

    navButtons.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });
}


function renderPage(page) {

    if (state.quiz && page !== "home") {
        clearInterval(state.quiz.timer);
    }

    state.page = page;

    setActiveNav(page);

    if (page === "home") {
        renderHome();
        return;
    }

    if (page === "library") {
        renderLibrary();
        return;
    }

    if (page === "ranking") {
        renderRanking();
        return;
    }

    if (page === "profile") {
        renderProfile();
    }
}


/* =========================================================
   الرئيسية
========================================================= */

function renderHome() {

    const student = state.student;

    const noticeHTML =
        state.notice &&
        state.notice.enabled !== false
            ? `
                <section class="notice-card">

                    <div class="notice-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 3a6 6 0 0 0-6 6v3.5L4 16h16l-2-3.5V9a6 6 0 0 0-6-6Z"/>
                            <path d="M9.5 19a3 3 0 0 0 5 0"/>
                        </svg>
                    </div>

                    <div class="notice-content">

                        <div class="notice-label">
                            إعلان مهم
                        </div>

                        <h3>
                            ${escapeHTML(
                                state.notice.title || ""
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                state.notice.text || ""
                            )}
                        </p>

                    </div>

                </section>
            `
            : "";


    const postsHTML =
        state.posts.length > 0
            ? state.posts.map(post => `
                <article class="post-card">

                    <div class="post-header">

                        <div class="post-avatar post-avatar-signal">
                            <span></span>
                        </div>

                        <div class="post-author">

                            <strong>
                                ${escapeHTML(
                                    post.author ||
                                    "مدرسة البلسم الثانوية"
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    post.date || ""
                                )}
                            </small>

                        </div>

                    </div>

                    ${
                        post.title
                            ? `
                                <h3 class="post-title">
                                    ${escapeHTML(
                                        post.title
                                    )}
                                </h3>
                            `
                            : ""
                    }

                    <p class="post-text">
                        ${escapeHTML(
                            post.text || ""
                        )}
                    </p>

                </article>
            `).join("")
            : `
                <div class="empty-card">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 4h12v16H6z"/>
                            <path d="M9 8h6M9 12h6M9 16h4"/>
                        </svg>
                    </div>

                    <strong>
                        لا توجد منشورات حالياً
                    </strong>

                    <span>
                        ستظهر هنا أخبار وإعلانات المدرسة.
                    </span>
                </div>
            `;


    appContent.innerHTML = `

        <div class="page-container home-page">

            <section class="hero">

                <div class="hero-content">

                    <div class="hero-kicker">
                        <span></span>
                        مساحتك التعليمية
                    </div>

                    <h2>
                        أهلاً بك،
                        <span>
                            ${escapeHTML(
                                student.name
                            )}
                        </span>
                    </h2>

                    <p>
                        ${escapeHTML(
                            student.specialization ||
                            "رحلتك التعليمية تبدأ من هنا."
                        )}
                    </p>

                    <div class="hero-actions">

                        <button
                            class="hero-library-button"
                            data-action="open-library"
                        >
                            <span class="button-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z"/>
                                    <path d="M5 18a2 2 0 0 1 2-2h12"/>
                                    <path d="M9 8h6M9 11h6"/>
                                </svg>
                            </span>

                            <span>
                                الذهاب إلى المكتبة
                            </span>

                            <b>←</b>
                        </button>

                    </div>

                </div>


                <div class="hero-points">

                    <div class="points-orbit">
                        <div class="points-core">
                            <span>نقاطك</span>
                            <strong>
                                ${formatNumber(
                                    student.points
                                )}
                            </strong>
                        </div>
                    </div>

                    <div class="hero-level">
                        المستوى
                        <strong>
                            ${formatNumber(
                                student.level
                            )}
                        </strong>
                    </div>

                </div>

            </section>


            ${noticeHTML}


            <section class="posts-section">

                <div class="section-heading">

                    <div>
                        <span>
                            المدرسة
                        </span>

                        <h2>
                            منشورات المدرسة
                        </h2>

                        <p>
                            آخر الأخبار والمعلومات المهمة
                        </p>
                    </div>

                </div>

                <div class="posts-list">
                    ${postsHTML}
                </div>

            </section>

        </div>
    `;
}


/* =========================================================
   المكتبة
========================================================= */

function renderLibrary() {

    state.selectedCategory = null;
    state.selectedSubject = null;

    const categories = [
        {
            id: "basic",
            title: "المواد الأساسية",
            description:
                "اللغة والرياضيات والمواد الأساسية",
            icon: "book"
        },
        {
            id: "scientific",
            title: "المواد العلمية",
            description:
                "الفيزياء والكيمياء والأحياء والحاسوب",
            icon: "science"
        },
        {
            id: "literary",
            title: "المواد الأدبية",
            description:
                "التاريخ والجغرافيا والدراسات الإسلامية",
            icon: "history"
        },
        {
            id: "foundation",
            title: "مواد التأسيس",
            description:
                "مهارات ومعلومات تأسيسية",
            icon: "spark"
        }
    ];

    appContent.innerHTML = `

        <div class="page-container">

            <div class="page-heading">

                <div class="heading-label">
                    مكتبتك
                </div>

                <h1>
                    المكتبة التعليمية
                </h1>

                <p>
                    اختر المسار للوصول إلى الكتب والاختبارات
                    والمواد الدراسية.
                </p>

            </div>


            <div class="category-grid">

                ${categories.map(category => `

                    <button
                        class="category-card"
                        data-category="${category.id}"
                    >

                        <div class="category-icon">
                            ${getCategoryIcon(category.icon)}
                        </div>

                        <div class="category-content">

                            <h3>
                                ${category.title}
                            </h3>

                            <p>
                                ${category.description}
                            </p>

                        </div>

                        <span class="category-arrow">
                            ←
                        </span>

                    </button>

                `).join("")}

            </div>

        </div>
    `;
}


function getCategoryIcon(type) {

    const icons = {

        book: `
            <svg viewBox="0 0 24 24">
                <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z"/>
                <path d="M5 18a2 2 0 0 1 2-2h12"/>
            </svg>
        `,

        science: `
            <svg viewBox="0 0 24 24">
                <path d="M9 3v6l-5 9a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 18l-5-9V3"/>
                <path d="M7 14h10M8 3h7"/>
            </svg>
        `,

        history: `
            <svg viewBox="0 0 24 24">
                <path d="M4 19h16M6 19V7h12v12M8 7V4h8v3M9 11h6M9 14h6"/>
            </svg>
        `,

        spark: `
            <svg viewBox="0 0 24 24">
                <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/>
                <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>
            </svg>
        `
    };

    return icons[type] || icons.spark;
}


function getSubjectsByCategory(categoryId) {

    return state.subjects.filter(
        subject =>
            subject.category === categoryId
    );
}


function renderCategory(categoryId) {

    state.selectedCategory = categoryId;
    state.selectedSubject = null;

    const subjects =
        getSubjectsByCategory(categoryId);

    const categoryNames = {
        basic: "المواد الأساسية",
        scientific: "المواد العلمية",
        literary: "المواد الأدبية",
        foundation: "مواد التأسيس"
    };

    appContent.innerHTML = `

        <div class="page-container">

            <button
                class="back-button"
                data-action="back-library"
            >
                <span>→</span>
                المكتبة
            </button>


            <div class="page-heading">

                <div class="heading-label">
                    القسم الدراسي
                </div>

                <h1>
                    ${escapeHTML(
                        categoryNames[categoryId] || ""
                    )}
                </h1>

                <p>
                    اختر المادة التي تريد دراستها.
                </p>

            </div>


            ${
                subjects.length
                    ? `
                        <div class="subjects-grid">

                            ${subjects.map(
                                (subject, index) => `

                                <button
                                    class="subject-card"
                                    data-subject-id="${escapeHTML(
                                        subject.id
                                    )}"
                                >

                                    <div class="subject-number">
                                        ${escapeHTML(
                                            subject.number ||
                                            String(index + 1).padStart(2, "0")
                                        )}
                                    </div>

                                    <div class="subject-info">

                                        <h3>
                                            ${escapeHTML(
                                                subject.name
                                            )}
                                        </h3>

                                        <p>
                                            ${
                                                Array.isArray(
                                                    subject.parts
                                                )
                                                    ? subject.parts.length
                                                    : 0
                                            }
                                            أجزاء اختبارية
                                        </p>

                                    </div>

                                    <span class="subject-arrow">
                                        ←
                                    </span>

                                </button>
                            `
                            ).join("")}

                        </div>
                    `
                    : `
                        <div class="empty-card">
                            لا توجد مواد في هذا القسم حالياً.
                        </div>
                    `
            }

        </div>
    `;
}


/* =========================================================
   صفحة المادة
========================================================= */

function getSubjectById(id) {

    return state.subjects.find(
        subject =>
            String(subject.id) === String(id)
    );
}


function renderSubject(subjectId) {

    const subject =
        getSubjectById(subjectId);

    if (!subject) {

        renderLibrary();

        return;
    }

    state.selectedSubject = subject;

    const parts =
        Array.isArray(subject.parts)
            ? subject.parts
            : [];


    const bookHTML =
        subject.book
            ? `

                <section class="book-card">

                    <div class="book-info">

                        <div class="book-icon">
                            <span>PDF</span>
                        </div>

                        <div>

                            <div class="book-label">
                                الكتاب الدراسي
                            </div>

                            <h3>
                                ${escapeHTML(
                                    subject.name
                                )}
                            </h3>

                            <p>
                                افتح الكتاب للقراءة أو
                                نزّله للدراسة دون اتصال.
                            </p>

                        </div>

                    </div>


                    <div class="book-actions">

                        <a
                            class="primary-button book-button"
                            href="${escapeHTML(
                                subject.book
                            )}"
                            target="_blank"
                            rel="noopener"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/>
                                <circle cx="12" cy="12" r="2.5"/>
                            </svg>

                            فتح الكتاب
                        </a>

                        <a
                            class="secondary-button book-button"
                            href="${escapeHTML(
                                subject.book
                            )}"
                            download
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M12 3v12"/>
                                <path d="m7 11 5 5 5-5"/>
                                <path d="M4 20h16"/>
                            </svg>

                            تنزيل PDF
                        </a>

                    </div>

                </section>
            `
            : "";


    appContent.innerHTML = `

        <div class="page-container">

            <button
                class="back-button"
                data-action="back-category"
            >
                <span>→</span>
                ${escapeHTML(
                    getCategoryName(
                        state.selectedCategory
                    )
                )}
            </button>


            <div class="page-heading">

                <div class="heading-label">
                    المادة الدراسية
                </div>

                <h1>
                    ${escapeHTML(
                        subject.name
                    )}
                </h1>

                <p>
                    الكتاب والاختبارات الخاصة بالمادة.
                </p>

            </div>


            ${bookHTML}


            <section class="parts-section">

                <div class="section-heading">

                    <div>
                        <span>
                            التدريب
                        </span>

                        <h2>
                            أجزاء المادة
                        </h2>

                        <p>
                            اختر الجزء لبدء الاختبار.
                        </p>
                    </div>

                </div>


                ${
                    parts.length
                        ? `
                            <div class="parts-list">

                                ${parts.map(
                                    (part, index) => `

                                    <button
                                        class="part-card"
                                        data-part-index="${index}"
                                    >

                                        <div class="part-number">
                                            ${String(
                                                index + 1
                                            ).padStart(2, "0")}
                                        </div>

                                        <div class="part-info">

                                            <h3>
                                                ${escapeHTML(
                                                    part.name ||
                                                    `الجزء ${index + 1}`
                                                )}
                                            </h3>

                                            <p>
                                                ${escapeHTML(
                                                    part.questions ||
                                                    "اختبار تدريبي"
                                                )}
                                            </p>

                                        </div>

                                        <span class="part-start">
                                            ابدأ
                                            <b>←</b>
                                        </span>

                                    </button>
                                `
                                ).join("")}

                            </div>
                        `
                        : `
                            <div class="empty-card">
                                لا توجد اختبارات لهذه المادة حالياً.
                            </div>
                        `
                }

            </section>

        </div>
    `;
}


function getCategoryName(categoryId) {

    const names = {
        basic: "المواد الأساسية",
        scientific: "المواد العلمية",
        literary: "المواد الأدبية",
        foundation: "مواد التأسيس"
    };

    return names[categoryId] || "المكتبة";
}


/* =========================================================
   الاختبارات
========================================================= */

async function startQuiz(subject, part) {

    if (!part || !part.file) {

        alert(
            "لم يتم تحديد ملف أسئلة لهذا الجزء."
        );

        return;
    }

    try {

        const questions =
            await loadJSON(part.file);

        if (
            !Array.isArray(questions) ||
            questions.length === 0
        ) {
            throw new Error(
                "لا توجد أسئلة في هذا الاختبار."
            );
        }

        const normalized =
            questions
                .map(normalizeQuestion)
                .filter(q => q.q && q.a);


        const selectedQuestions =
            shuffleArray(normalized)
                .slice(
                    0,
                    Math.min(
                        20,
                        normalized.length
                    )
                );


        state.quiz = {

            subject:
                subject.name,

            part:
                part.name ||
                "اختبار",

            questions:
                selectedQuestions,

            current:
                0,

            answers:
                new Array(
                    selectedQuestions.length
                ).fill(null),

            selected:
                null,

            currentOptions:
                [],

            correct:
                0,

            wrong:
                0,

            timeLeft:
                600,

            timer:
                null,

            finished:
                false
        };


        renderQuiz();

        startQuizTimer();

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "تعذر تحميل أسئلة الاختبار."
        );
    }
}


function startQuizTimer() {

    if (!state.quiz) return;

    clearInterval(
        state.quiz.timer
    );

    state.quiz.timer =
        setInterval(() => {

            if (
                !state.quiz ||
                state.quiz.finished
            ) {

                clearInterval(
                    state.quiz?.timer
                );

                return;
            }

            state.quiz.timeLeft--;

            updateQuizTimer();

            if (
                state.quiz.timeLeft <= 0
            ) {

                clearInterval(
                    state.quiz.timer
                );

                finishQuiz();
            }

        }, 1000);
}


function updateQuizTimer() {

    const timer =
        document.getElementById(
            "quizTimer"
        );

    if (!timer || !state.quiz) return;

    timer.textContent =
        formatTime(
            state.quiz.timeLeft
        );
}


function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}


function renderQuiz() {

    const quiz = state.quiz;

    if (!quiz) return;

    const question =
        quiz.questions[quiz.current];

    if (!question) {

        finishQuiz();

        return;
    }


    const options =
        shuffleArray([
            question.a,
            ...question.w
        ]);

    quiz.currentOptions =
        options;


    const progress =
        (
            (quiz.current + 1) /
            quiz.questions.length
        ) * 100;


    appContent.innerHTML = `

        <div class="page-container quiz-page">

            <div class="quiz-top">

                <button
                    class="back-button"
                    data-action="exit-quiz"
                >
                    إنهاء الاختبار
                </button>

                <div class="quiz-timer" id="quizTimer">
                    ${formatTime(
                        quiz.timeLeft
                    )}
                </div>

            </div>


            <div class="quiz-progress">

                <div class="quiz-progress-head">

                    <span>
                        السؤال
                        ${quiz.current + 1}
                        من
                        ${quiz.questions.length}
                    </span>

                    <strong>
                        ${Math.round(progress)}%
                    </strong>

                </div>

                <div class="progress-track">

                    <div
                        class="progress-fill"
                        style="width:${progress}%"
                    ></div>

                </div>

            </div>


            <section class="question-card">

                <div class="question-topline">
                    <span>
                        ${escapeHTML(
                            quiz.subject
                        )}
                    </span>

                    <small>
                        ${escapeHTML(
                            quiz.part
                        )}
                    </small>
                </div>

                <span class="question-label">
                    السؤال ${quiz.current + 1}
                </span>

                <h2>
                    ${escapeHTML(
                        question.q
                    )}
                </h2>


                <div class="answers-list">

                    ${options.map(
                        (option, index) => `

                        <button
                            class="answer-button"
                            data-answer-index="${index}"
                        >

                            <span class="answer-letter">
                                ${String.fromCharCode(
                                    65 + index
                                )}
                            </span>

                            <strong>
                                ${escapeHTML(
                                    option
                                )}
                            </strong>

                        </button>

                    `).join("")}

                </div>

            </section>


            <button
                class="primary-button next-question-button"
                data-action="next-question"
            >
                ${
                    quiz.current ===
                    quiz.questions.length - 1
                        ? "إنهاء الاختبار"
                        : "السؤال التالي"
                }

                <span>←</span>
            </button>

        </div>
    `;

    updateQuizTimer();
}


function selectAnswer(index) {

    if (!state.quiz) return;

    state.quiz.selected =
        index;

    document
        .querySelectorAll(
            ".answer-button"
        )
        .forEach(
            (button, buttonIndex) => {

                button.classList.toggle(
                    "selected",
                    buttonIndex === index
                );
            }
        );
}


function nextQuestion() {

    const quiz = state.quiz;

    if (!quiz || quiz.finished) return;


    if (
        quiz.selected === null ||
        quiz.selected === undefined
    ) {

        alert(
            "اختر إجابة أولاً."
        );

        return;
    }


    const question =
        quiz.questions[quiz.current];

    const selectedAnswer =
        quiz.currentOptions[
            quiz.selected
        ];


    const isCorrect =
        selectedAnswer === question.a;


    quiz.answers[
        quiz.current
    ] = {
        selected:
            selectedAnswer,

        correct:
            question.a,

        isCorrect
    };


    if (isCorrect) {
        quiz.correct++;
    } else {
        quiz.wrong++;
    }


    if (
        quiz.current ===
        quiz.questions.length - 1
    ) {

        finishQuiz();

        return;
    }


    quiz.current++;
    quiz.selected = null;

    renderQuiz();
}


async function finishQuiz() {

    const quiz = state.quiz;

    if (!quiz || quiz.finished) return;

    quiz.finished = true;

    clearInterval(
        quiz.timer
    );


    const total =
        quiz.questions.length;

    const score =
        quiz.correct;

    const wrong =
        quiz.wrong;


    await saveResult(
        quiz.subject,
        quiz.part,
        score,
        total,
        quiz.correct,
        wrong,
        600 - quiz.timeLeft
    );


    if (state.student) {

        state.student.points =
            Number(
                state.student.points || 0
            ) + score;

        state.student.tests_count =
            Number(
                state.student.tests_count || 0
            ) + 1;

        state.student.correct_answers =
            Number(
                state.student.correct_answers || 0
            ) + score;

        state.student.wrong_answers =
            Number(
                state.student.wrong_answers || 0
            ) + wrong;

        state.student.level =
            Math.max(
                1,
                Math.floor(
                    state.student.points / 100
                ) + 1
            );

        localStorage.setItem(
            "balsam_student",
            JSON.stringify(
                state.student
            )
        );
    }


    renderQuizResult();
}


async function saveResult(
    subject,
    part,
    score,
    totalQuestions,
    correct,
    wrong,
    duration
) {

    if (!state.student) return;

    try {

        const { error } =
            await sb.rpc(
                "submit_test_result",
                {
                    p_student_id:
                        state.student.id,

                    p_subject:
                        subject,

                    p_part:
                        part,

                    p_score:
                        score,

                    p_total_questions:
                        totalQuestions,

                    p_correct_answers:
                        correct,

                    p_wrong_answers:
                        wrong,

                    p_duration_seconds:
                        duration
                }
            );


        if (error) {
            console.error(
                "Save result error:",
                error
            );
        }

    } catch (error) {

        console.error(error);
    }
}


function renderQuizResult() {

    const quiz = state.quiz;

    if (!quiz) return;


    const total =
        quiz.questions.length;

    const percentage =
        total
            ? Math.round(
                (
                    quiz.correct /
                    total
                ) * 100
            )
            : 0;


    let message =
        "استمر في التعلم والتدريب.";

    if (percentage >= 90) {

        message =
            "ممتاز جداً! أداء رائع.";

    } else if (percentage >= 75) {

        message =
            "أداء ممتاز، واصل التقدم.";

    } else if (percentage >= 50) {

        message =
            "نتيجة جيدة، ويمكنك تحسينها أكثر.";

    } else {

        message =
            "لا تستسلم، راجع المادة وحاول مرة أخرى.";
    }


    appContent.innerHTML = `

        <div class="page-container result-container">

            <section class="result-card">

                <div class="result-icon">
                    ${
                        percentage >= 50
                            ? "✓"
                            : "!"
                    }
                </div>

                <span class="result-label">
                    نتيجة الاختبار
                </span>

                <h1>
                    ${percentage}%
                </h1>

                <p>
                    ${message}
                </p>


                <div class="result-stats">

                    <div>
                        <strong>
                            ${quiz.correct}
                        </strong>

                        <span>
                            صحيحة
                        </span>
                    </div>


                    <div>
                        <strong>
                            ${quiz.wrong}
                        </strong>

                        <span>
                            خاطئة
                        </span>
                    </div>


                    <div>
                        <strong>
                            ${total}
                        </strong>

                        <span>
                            الأسئلة
                        </span>
                    </div>

                </div>


                <div class="result-actions">

                    <button
                        class="primary-button"
                        data-action="back-subject"
                    >
                        العودة للمادة
                        <span>←</span>
                    </button>

                    <button
                        class="secondary-button"
                        data-action="back-home"
                    >
                        الرئيسية
                    </button>

                </div>

            </section>

        </div>
    `;
}


/* =========================================================
   الترتيب
========================================================= */

async function renderRanking() {

    appContent.innerHTML = `

        <div class="page-container">

            <div class="page-heading">

                <div class="heading-label">
                    المنافسة
                </div>

                <h1>
                    ترتيب الطلاب
                </h1>

                <p>
                    أفضل 20 طالباً حسب النقاط.
                </p>

            </div>

            <div class="ranking-card">

                <div class="ranking-loading">
                    <span class="loading-ring"></span>
                    جارٍ تحميل الترتيب...
                </div>

            </div>

        </div>
    `;


    try {

        const { data, error } =
            await sb.rpc(
                "get_ranking"
            );

        if (error) {
            throw error;
        }


        state.ranking =
            Array.isArray(data)
                ? data
                : [];


        const rankingCard =
            document.querySelector(
                ".ranking-card"
            );


        if (!rankingCard) return;


        if (state.ranking.length === 0) {

            rankingCard.innerHTML = `
                <div class="empty-card">
                    لا توجد بيانات للترتيب حالياً.
                </div>
            `;

            return;
        }


        rankingCard.innerHTML =
            state.ranking.map(
                (student, index) => {

                    const isMe =
                        state.student &&
                        student.student_number ===
                        state.student.student_number;


                    return `

                        <div
                            class="ranking-row ${
                                isMe
                                    ? "current-student"
                                    : ""
                            }"
                        >

                            <div class="rank-number">
                                ${index + 1}
                            </div>

                            <div class="ranking-avatar">
                                <span></span>
                            </div>

                            <div class="ranking-name">

                                <strong>
                                    ${escapeHTML(
                                        student.name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        student.specialization ||
                                        ""
                                    )}
                                </small>

                            </div>

                            <div class="ranking-points">

                                <strong>
                                    ${formatNumber(
                                        student.points
                                    )}
                                </strong>

                                <small>
                                    نقطة
                                </small>

                            </div>

                        </div>
                    `;
                }
            ).join("");


    } catch (error) {

        console.error(error);

        const rankingCard =
            document.querySelector(
                ".ranking-card"
            );

        if (rankingCard) {

            rankingCard.innerHTML = `
                <div class="empty-card">
                    تعذر تحميل الترتيب حالياً.
                </div>
            `;
        }
    }
}


/* =========================================================
   الملف الشخصي
========================================================= */

function renderProfile() {

    const student =
        state.student;


    const totalAnswers =
        Number(
            student.correct_answers || 0
        ) +
        Number(
            student.wrong_answers || 0
        );


    const accuracy =
        totalAnswers > 0
            ? Math.round(
                (
                    Number(
                        student.correct_answers || 0
                    ) /
                    totalAnswers
                ) * 100
            )
            : 0;


    appContent.innerHTML = `

        <div class="page-container">

            <section class="profile-card">

                <div class="profile-visual">

                    <div class="profile-orbit">

                        <div class="profile-core">
                            <span></span>
                        </div>

                    </div>

                </div>


                <div class="profile-main">

                    <div class="heading-label">
                        الملف الشخصي
                    </div>

                    <h1>
                        ${escapeHTML(
                            student.name
                        )}
                    </h1>

                    <p>
                        ${escapeHTML(
                            student.specialization ||
                            "طالب"
                        )}
                    </p>

                    <div class="profile-number">
                        رقم الطالب:
                        <strong>
                            ${escapeHTML(
                                student.student_number
                            )}
                        </strong>
                    </div>

                </div>


                <div class="profile-level">

                    <span>
                        المستوى
                    </span>

                    <strong>
                        ${formatNumber(
                            student.level
                        )}
                    </strong>

                </div>

            </section>


            <div class="stats-grid">

                <div class="stat-card">
                    <div class="stat-icon">✦</div>

                    <span>
                        النقاط
                    </span>

                    <strong>
                        ${formatNumber(
                            student.points
                        )}
                    </strong>
                </div>


                <div class="stat-card">
                    <div class="stat-icon">◷</div>

                    <span>
                        الاختبارات
                    </span>

                    <strong>
                        ${formatNumber(
                            student.tests_count
                        )}
                    </strong>
                </div>


                <div class="stat-card">
                    <div class="stat-icon">✓</div>

                    <span>
                        الصحيحة
                    </span>

                    <strong>
                        ${formatNumber(
                            student.correct_answers
                        )}
                    </strong>
                </div>


                <div class="stat-card">
                    <div class="stat-icon">◎</div>

                    <span>
                        نسبة الدقة
                    </span>

                    <strong>
                        ${accuracy}%
                    </strong>
                </div>

            </div>


            <section class="note-card">

                <div class="section-heading">

                    <div>
                        <span>
                            ملاحظة
                        </span>

                        <h2>
                            ملاحظتك الشخصية
                        </h2>
                    </div>

                </div>

                <p>
                    ${
                        student.note
                            ? escapeHTML(
                                student.note
                            )
                            : "لا توجد ملاحظة مضافة لهذا الطالب."
                    }
                </p>

            </section>


            <button
                class="logout-button"
                data-action="logout"
            >
                <span>تسجيل الخروج</span>

                <svg viewBox="0 0 24 24">
                    <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/>
                    <path d="M14 8l4 4-4 4"/>
                    <path d="M18 12H9"/>
                </svg>
            </button>

        </div>
    `;
}


/* =========================================================
   الأحداث
==================================================
