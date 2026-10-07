"use strict";

/* =========================================================
   مدرسة البلسم الثانوية
   التطبيق الرئيسي

   ملاحظة:
   - لا يتم تغيير Supabase
   - لا يتم تغيير RPCs
   - لا يتم تخزين كلمة المرور
   - لا يتم استخدام أول حرف من اسم الطالب
========================================================= */


/* =========================================================
   Supabase
========================================================= */

const CONFIG = window.BALSAM_CONFIG || {};

if (
    !CONFIG.supabaseUrl ||
    !CONFIG.supabaseAnonKey
) {
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

    currentPage: "home",

    subjects: [],

    posts: [],

    notice: null,

    currentSection: null,

    currentSubject: null,

    currentQuestions: [],

    currentQuestionIndex: 0,

    currentOptions: [],

    selectedAnswer: null,

    quiz: null

};


/* =========================================================
   أدوات
========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);


const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function formatDate(value) {

    if (!value) {
        return "";
    }

    try {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "ar",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        ).format(date);

    } catch {

        return "";
    }
}


function getStudentName(student = state.student) {

    return (
        student?.name ||
        student?.full_name ||
        student?.student_name ||
        "الطالب"
    );
}


function getStudentNumber(student = state.student) {

    return (
        student?.studentNumber ||
        student?.student_number ||
        student?.number ||
        ""
    );
}


function getPoints(student = state.student) {

    return safeNumber(
        student?.points ??
        student?.score ??
        0
    );
}


function getTests(student = state.student) {

    return safeNumber(
        student?.tests ??
        student?.tests_count ??
        student?.test_count ??
        0
    );
}


function getCorrect(student = state.student) {

    return safeNumber(
        student?.correct ??
        student?.correct_answers ??
        0
    );
}


function getWrong(student = state.student) {

    return safeNumber(
        student?.wrong ??
        student?.wrong_answers ??
        0
    );
}


function getLevel(student = state.student) {

    return (
        student?.level ||
        calculateLevel(getPoints(student))
    );
}


function calculateLevel(points) {

    const p = safeNumber(points);

    if (p >= 1000) return "أسطورة";
    if (p >= 700) return "متقدم جدًا";
    if (p >= 500) return "متقدم";
    if (p >= 300) return "مجتهد";
    if (p >= 100) return "متعلم نشيط";

    return "بداية الطريق";
}


function getAccuracy(student = state.student) {

    const correct = getCorrect(student);
    const wrong = getWrong(student);

    const total = correct + wrong;

    if (!total) {
        return 0;
    }

    return Math.round(
        (correct / total) * 100
    );
}


/* =========================================================
   SVG Icons
========================================================= */

function userIcon() {

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2"></circle>
            <path d="M5.5 20c.8-3.5 3-5.2 6.5-5.2s5.7 1.7 6.5 5.2"></path>
        </svg>
    `;
}


function bookIcon() {

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z"></path>
            <path d="M5 18a2 2 0 0 1 2-2h12"></path>
            <path d="M9 8h6M9 11h6"></path>
        </svg>
    `;
}


function folderIcon() {

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"></path>
        </svg>
    `;
}


function chartIcon() {

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 19V10"></path>
            <path d="M12 19V5"></path>
            <path d="M19 19v-7"></path>
            <path d="M3 19h18"></path>
        </svg>
    `;
}


/* =========================================================
   Local Storage
========================================================= */

function saveStudent(student) {

    state.student = student;

    localStorage.setItem(
        "balsam_student",
        JSON.stringify(student)
    );
}


function loadStudent() {

    try {

        const saved =
            localStorage.getItem("balsam_student");

        if (!saved) {
            return null;
        }

        return JSON.parse(saved);

    } catch {

        localStorage.removeItem("balsam_student");

        return null;
    }
}


function clearStudent() {

    state.student = null;

    localStorage.removeItem("balsam_student");
}


/* =========================================================
   تحميل البيانات الثابتة
========================================================= */

async function loadJSON(path, fallback) {

    try {

        const response = await fetch(path, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            `Failed to load ${path}`,
            error
        );

        return fallback;
    }
}


async function loadStaticData() {

    const [
        subjects,
        posts,
        notice
    ] = await Promise.all([

        loadJSON(
            "data/subjects.json",
            []
        ),

        loadJSON(
            "data/posts.json",
            []
        ),

        loadJSON(
            "data/notice.json",
            {}
        )

    ]);


    state.subjects =
        Array.isArray(subjects)
            ? subjects
            : (
                subjects?.subjects ||
                subjects?.data ||
                []
            );


    state.posts =
        Array.isArray(posts)
            ? posts
            : (
                posts?.posts ||
                posts?.data ||
                []
            );


    state.notice = notice || {};
}


/* =========================================================
   تطبيع المادة
========================================================= */

function normalizeSubject(subject, index = 0) {

    if (!subject) {
        return null;
    }

    return {

        id:
            subject.id ??
            subject.subjectId ??
            subject.slug ??
            index,

        name:
            subject.name ??
            subject.title ??
            subject.subject ??
            `المادة ${index + 1}`,

        description:
            subject.description ??
            subject.desc ??
            "محتوى تعليمي واختبار تفاعلي.",

        section:
            subject.section ??
            subject.sectionId ??
            subject.category ??
            1,

        sectionName:
            subject.sectionName ??
            subject.categoryName ??
            "",

        file:
            subject.file ??
            subject.questions ??
            subject.json ??
            subject.questionsFile ??
            "",

        pdf:
            subject.pdf ??
            subject.book ??
            subject.bookUrl ??
            subject.pdfUrl ??
            "",

        count:
            safeNumber(
                subject.count ??
                subject.questionsCount ??
                0
            ),

        duration:
            safeNumber(
                subject.duration ??
                subject.time ??
                600
            )

    };
}


function getNormalizedSubjects() {

    return state.subjects
        .map(normalizeSubject)
        .filter(Boolean);
}


/* =========================================================
   Navigation
========================================================= */

function updateNavigation(page) {

    $$(".nav-button").forEach(button => {

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

    state.currentPage = page;

    updateNavigation(page);

    const content = $("#appContent");

    if (!content) {
        return;
    }

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

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   تحديث اسم الطالب
========================================================= */

function updateStudentChip() {

    const chip = $("#studentChip");

    if (!chip) {
        return;
    }

    chip.textContent =
        getStudentName();
}


/* =========================================================
   Home
========================================================= */

function renderHome() {

    const content = $("#appContent");

    const student = state.student;

    const subjects =
        getNormalizedSubjects();

    const posts =
        Array.isArray(state.posts)
            ? state.posts
            : [];


    const notice =
        state.notice &&
        typeof state.notice === "object"
            ? state.notice
            : {};


    const studentName =
        getStudentName(student);

    const points =
        getPoints(student);

    const tests =
        getTests(student);

    const correct =
        getCorrect(student);

    const accuracy =
        getAccuracy(student);


    const postsHTML = posts.length

        ? posts.map(post => {

            const author =
                post.author ||
                post.createdBy ||
                "مدرسة البلسم";

            const title =
                post.title ||
                post.heading ||
                "";

            const text =
                post.text ||
                post.content ||
                post.body ||
                "";

            const date =
                formatDate(
                    post.date ||
                    post.createdAt ||
                    post.created_at
                );

            return `
                <article class="post-card">

                    <div class="post-head">

                        <div class="post-icon">
                            ${userIcon()}
                        </div>

                        <div class="post-author">

                            <strong>
                                ${escapeHTML(author)}
                            </strong>

                            <small>
                                ${escapeHTML(date || "منصة البلسم")}
                            </small>

                        </div>

                    </div>

                    ${
                        title
                            ? `
                                <h3 class="post-title">
                                    ${escapeHTML(title)}
                                </h3>
                            `
                            : ""
                    }

                    <p class="post-text">
                        ${escapeHTML(text)}
                    </p>

                </article>
            `;

        }).join("")

        : `
            <div class="empty-state">
                <strong>لا توجد منشورات حاليًا</strong>
                <p>ستظهر إعلانات المدرسة ومنشوراتها هنا.</p>
            </div>
        `;


    content.innerHTML = `

        <section class="page home-page">

            <div class="home-hero">

                <div class="hero-main">

                    <span class="eyebrow">
                        مساحتك التعليمية
                    </span>

                    <h1>
                        أهلًا بك،
                        <span>
                            ${escapeHTML(studentName)}
                        </span>
                    </h1>

                    <p>
                        واصل تعلمك، راجع موادك،
                        واختبر مستواك خطوة بخطوة.
                    </p>

                </div>


                <div class="hero-side">

                    <div>

                        <span class="hero-side-label">
                            المستوى الحالي
                        </span>

                        <div class="hero-side-number">
                            ${escapeHTML(
                                getLevel(student)
                            )}
                        </div>

                        <span class="hero-side-text">
                            استمر في التقدم لتحصل على مستوى أعلى.
                        </span>

                    </div>

                </div>

            </div>


            <div class="stats-grid">

                <div class="stat-card">

                    <div class="stat-label">
                        النقاط
                    </div>

                    <div class="stat-value green">
                        ${points}
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        الاختبارات
                    </div>

                    <div class="stat-value">
                        ${tests}
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        الإجابات الصحيحة
                    </div>

                    <div class="stat-value blue">
                        ${correct}
                    </div>

                </div>


                <div class="stat-card">

                    <div class="stat-label">
                        نسبة الدقة
                    </div>

                    <div class="stat-value green">
                        ${accuracy}%
                    </div>

                </div>

            </div>


            ${
                notice &&
                (
                    notice.title ||
                    notice.text ||
                    notice.content
                )
                    ? `

                        <article class="notice-card">

                            <div class="notice-label">
                                إعلان مهم
                            </div>

                            ${
                                notice.title
                                    ? `
                                        <div class="notice-title">
                                            ${escapeHTML(
                                                notice.title
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                            <div class="notice-text">
                                ${escapeHTML(
                                    notice.text ||
                                    notice.content ||
                                    ""
                                )}
                            </div>

                        </article>

                    `
                    : ""
            }


            <div class="section-heading">

                <h2>
                    آخر المنشورات
                </h2>

                <span>
                    ${posts.length} منشور
                </span>

            </div>


            <div class="posts-list">
                ${postsHTML}
            </div>

        </section>
    `;
}


/* =========================================================
   Library
========================================================= */

function renderLibrary() {

    const content = $("#appContent");

    const subjects =
        getNormalizedSubjects();


    const groups = {};

    subjects.forEach(subject => {

        const key =
            String(subject.section);

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(subject);
    });


    const sectionNames = {

        "1": "المواد الأساسية",
        "2": "المواد العلمية",
        "3": "المواد الأدبية",
        "4": "المواد الإضافية",
        "5": "المواد والمراجعات",
        "6": "المحتوى الإضافي"

    };


    const sectionIcons = {

        "1": bookIcon(),
        "2": chartIcon(),
        "3": folderIcon(),
        "4": bookIcon(),
        "5": chartIcon(),
        "6": folderIcon()

    };


    const sectionCards =
        Object.entries(groups)
            .map(([section, items]) => {

                const name =
                    items[0]?.sectionName ||
                    sectionNames[section] ||
                    `القسم ${section}`;

                return `

                    <button
                        type="button"
                        class="library-section-card"
                        data-library-section="${escapeHTML(section)}"
                    >

                        <div>

                            <div class="library-section-icon">
                                ${
                                    sectionIcons[section] ||
                                    bookIcon()
                                }
                            </div>

                            <h3>
                                ${escapeHTML(name)}
                            </h3>

                            <p>
                                ${items.length}
                                ${items.length === 1 ? "مادة" : "مواد"}
                            </p>

                        </div>

                        <span
                            class="library-section-arrow"
                            aria-hidden="true"
                        >
                            ←
                        </span>

                    </button>

                `;

            })
            .join("");


    content.innerHTML = `

        <section class="page library-page">

            <div class="page-header">

                <span class="eyebrow">
                    المعرفة
                </span>

                <h1>
                    المكتبة
                </h1>

                <p>
                    اختر القسم للوصول إلى المواد التعليمية
                    والكتب والاختبارات.
                </p>

            </div>


            <div class="library-summary">

                <div class="summary-pill">
                    المواد:
                    <strong>${subjects.length}</strong>
                </div>

                <div class="summary-pill">
                    أقسام:
                    <strong>
                        ${Object.keys(groups).length}
                    </strong>
                </div>

            </div>


            ${
                sectionCards
                    ? `
                        <div class="library-sections">
                            ${sectionCards}
                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <strong>المكتبة فارغة</strong>
                            <p>
                                لم تتم إضافة المواد التعليمية بعد.
                            </p>
                        </div>
                    `
            }

        </section>
    `;
}


/* =========================================================
   عرض مواد القسم
========================================================= */

function renderSection(section) {

    state.currentSection =
        String(section);

    const content = $("#appContent");

    const subjects =
        getNormalizedSubjects()
            .filter(
                subject =>
                    String(subject.section) ===
                    String(section)
            );


    const sectionName =
        subjects[0]?.sectionName ||
        `القسم ${section}`;


    const cards =
        subjects.map((subject, index) => {

            return `

                <article class="subject-card">

                    <div class="subject-number">
                        ${String(index + 1).padStart(2, "0")}
                    </div>

                    <h3>
                        ${escapeHTML(subject.name)}
                    </h3>

                    <p>
                        ${escapeHTML(
                            subject.description
                        )}
                    </p>

                    <div class="subject-actions">

                        ${
                            subject.pdf
                                ? `
                                    <button
                                        type="button"
                                        class="action-button primary"
                                        data-action="open-book"
                                        data-pdf="${escapeHTML(
                                            subject.pdf
                                        )}"
                                    >
                                        فتح الكتاب
                                    </button>

                                    <a
                                        class="action-button"
                                        href="${escapeHTML(
                                            subject.pdf
                                        )}"
                                        download
                                    >
                                        تنزيل PDF
                                    </a>
                                `
                                : `
                                    <button
                                        type="button"
                                        class="action-button"
                                        disabled
                                    >
                                        لا يوجد كتاب
                                    </button>

                                    <button
                                        type="button"
                                        class="action-button"
                                        data-action="start-quiz"
                                        data-subject-id="${escapeHTML(
                                            subject.id
                                        )}"
                                    >
                                        الاختبار
                                    </button>
                                `
                        }

                    </div>

                    ${
                        subject.pdf
                            ? `
                                <div style="height:8px"></div>

                                <button
                                    type="button"
                                    class="action-button"
                                    data-action="start-quiz"
                                    data-subject-id="${escapeHTML(
                                        subject.id
                                    )}"
                                >
                                    بدء اختبار المادة
                                </button>
                            `
                            : ""
                    }

                </article>

            `;

        })
        .join("");


    content.innerHTML = `

        <section class="page">

            <div class="page-header">

                <span class="eyebrow">
                    المكتبة
                </span>

                <h1>
                    ${escapeHTML(sectionName)}
                </h1>

                <p>
                    اختر المادة التي تريد دراستها أو اختبار نفسك فيها.
                </p>

            </div>


            <button
                type="button"
                class="action-button"
                data-action="back-library"
                style="
                    width:auto;
                    padding:0 16px;
                    margin-bottom:18px;
                "
            >
                ← العودة إلى الأقسام
            </button>


            ${
                cards
                    ? `
                        <div class="subject-grid">
                            ${cards}
                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <strong>
                                لا توجد مواد في هذا القسم
                            </strong>
                        </div>
                    `
            }

        </section>
    `;
}


/* =========================================================
   تحميل أسئلة المادة
========================================================= */

async function loadQuestions(file) {

    if (!file) {
        throw new Error(
            "لم يتم تحديد ملف أسئلة للمادة."
        );
    }


    const response =
        await fetch(file, {
            cache: "no-cache"
        });


    if (!response.ok) {

        throw new Error(
            `تعذر تحميل ملف الأسئلة (${response.status})`
        );
    }


    const data =
        await response.json();


    let questions = data;


    if (!Array.isArray(questions)) {

        questions =
            data.questions ||
            data.data ||
            data.items ||
            [];
    }


    if (!Array.isArray(questions)) {
        questions = [];
    }


    return questions
        .map(item => {

            if (!item) {
                return null;
            }

            return {

                q:
                    item.q ??
                    item.question ??
                    "",

                a:
                    item.a ??
                    item.answer ??
                    item.correct ??
                    "",

                w:
                    Array.isArray(item.w)
                        ? item.w
                        : (
                            Array.isArray(item.wrong)
                                ? item.wrong
                                : []
                        )

            };

        })
        .filter(
            item =>
                item &&
                item.q &&
                item.a
        );
}


/* =========================================================
   Shuffle
========================================================= */

function shuffle(array) {

    const result =
        [...array];

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


/* =========================================================
   Start Quiz
========================================================= */

async function startQuiz(subjectId) {

    const subject =
        getNormalizedSubjects()
            .find(
                item =>
                    String(item.id) ===
                    String(subjectId)
            );


    if (!subject) {

        alert(
            "تعذر العثور على المادة."
        );

        return;
    }


    if (!subject.file) {

        alert(
            "لم يتم ربط ملف أسئلة بهذه المادة."
        );

        return;
    }


    const content =
        $("#appContent");


    content.innerHTML = `

        <section class="page quiz-page">

            <div class="empty-state">

                <strong>
                    جارٍ تجهيز الاختبار...
                </strong>

                <p>
                    لحظات من فضلك.
                </p>

            </div>

        </section>
    `;


    try {

        let questions =
            await loadQuestions(
                subject.file
            );


        questions =
            shuffle(questions)
                .slice(
                    0,
                    Math.min(20, questions.length)
                );


        if (!questions.length) {

            throw new Error(
                "لا توجد أسئلة صالحة."
            );
        }


        state.currentSubject =
            subject;

        state.currentQuestions =
            questions;

        state.currentQuestionIndex =
            0;

        state.currentOptions =
            [];

        state.selectedAnswer =
            null;


        state.quiz = {

            subjectId:
                subject.id,

            subjectName:
                subject.name,

            questions,

            answers: [],

            correct: 0,

            wrong: 0,

            startedAt:
                Date.now(),

            timeLeft:
                safeNumber(
                    subject.duration,
                    600
                ),

            finished: false,

            timer: null

        };


        renderQuizQuestion();

        startQuizTimer();

    } catch (error) {

        console.error(error);

        content.innerHTML = `

            <section class="page quiz-page">

                <div class="empty-state">

                    <strong>
                        تعذر تشغيل الاختبار
                    </strong>

                    <p>
                        ${
                            escapeHTML(
                                error.message ||
                                "حدث خطأ غير متوقع."
                            )
                        }
                    </p>

                    <br>

                    <button
                        type="button"
                        class="action-button"
                        data-action="back-library"
                        style="width:auto;padding:0 18px;margin:auto;"
                    >
                        العودة إلى المكتبة
                    </button>

                </div>

            </section>
        `;
    }
}


/* =========================================================
   Quiz Timer
========================================================= */

function startQuizTimer() {

    stopQuizTimer();


    if (!state.quiz) {
        return;
    }


    state.quiz.timer =
        setInterval(() => {

            if (!state.quiz) {
                return;
            }


            state.quiz.timeLeft--;

            updateQuizTimer();


            if (
                state.quiz.timeLeft <= 0
            ) {

                stopQuizTimer();

                finishQuiz();

            }

        }, 1000);
}


function stopQuizTimer() {

    if (
        state.quiz &&
        state.quiz.timer
    ) {

        clearInterval(
            state.quiz.timer
        );

        state.quiz.timer = null;
    }
}


function formatTime(seconds) {

    const safe =
        Math.max(
            0,
            safeNumber(seconds)
        );

    const minutes =
        Math.floor(safe / 60);

    const secs =
        safe % 60;


    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
    );
}


function updateQuizTimer() {

    const timer =
        $(".quiz-timer");


    if (!timer || !state.quiz) {
        return;
    }


    timer.textContent =
        formatTime(
            state.quiz.timeLeft
        );


    timer.classList.toggle(
        "warning",
        state.quiz.timeLeft <= 60
    );
}


/* =========================================================
   Render Quiz Question
========================================================= */

function renderQuizQuestion() {

    const content =
        $("#appContent");


    const quiz =
        state.quiz;


    if (!quiz) {
        return;
    }


    const index =
        state.currentQuestionIndex;


    const question =
        quiz.questions[index];


    if (!question) {

        finishQuiz();

        return;
    }


    state.selectedAnswer =
        null;


    const answers =
        shuffle([
            question.a,
            ...question.w
        ]);


    state.currentOptions =
        answers;


    const progress =
        Math.round(
            (index / quiz.questions.length) *
            100
        );


    const labels = [
        "أ",
        "ب",
        "ج",
        "د",
        "هـ",
        "و"
    ];


    const optionsHTML =
        answers.map(
            (answer, optionIndex) => {

                return `

                    <button
                        type="button"
                        class="option-button"
                        data-action="answer"
                        data-answer-index="${optionIndex}"
                    >

                        <span class="option-label">
                            ${labels[optionIndex] || optionIndex + 1}
                        </span>

                        <span class="option-text">
                            ${escapeHTML(answer)}
                        </span>

                    </button>

                `;

            }
        ).join("");


    content.innerHTML = `

        <section class="page quiz-page">

            <div class="quiz-top">

                <div class="quiz-subject">

                    <span>
                        اختبار تفاعلي
                    </span>

                    <strong>
                        ${escapeHTML(
                            quiz.subjectName
                        )}
                    </strong>

                </div>


                <div class="quiz-timer">
                    ${formatTime(
                        quiz.timeLeft
                    )}
                </div>

            </div>


            <div class="quiz-progress">

                <span
                    style="width:${progress}%"
                ></span>

            </div>


            <div class="question-card">

                <div class="question-number">

                    السؤال
                    ${index + 1}
                    من
                    ${quiz.questions.length}

                </div>


                <div class="question-text">
                    ${escapeHTML(question.q)}
                </div>


                <div class="options-list">
                    ${optionsHTML}
                </div>


                <div class="quiz-actions">

                    <button
                        type="button"
                        class="quiz-exit"
                        data-action="exit-quiz"
                    >
                        إنهاء الاختبار
                    </button>

                </div>

            </div>

        </section>
    `;
}


/* =========================================================
   Answer
========================================================= */

function selectAnswer(index) {

    if (
        !state.quiz ||
        state.quiz.finished
    ) {
        return;
    }


    const selected =
        state.currentOptions[index];


    if (
        selected === undefined
    ) {
        return;
    }


    const question =
        state.currentQuestions[
            state.currentQuestionIndex
        ];


    const correct =
        String(selected).trim() ===
        String(question.a).trim();


    if (correct) {

        state.quiz.correct++;

    } else {

        state.quiz.wrong++;

    }


    state.quiz.answers.push({
        question: question.q,
        selected,
        correctAnswer: question.a,
        correct
    });


    state.currentQuestionIndex++;


    if (
        state.currentQuestionIndex >=
        state.currentQuestions.length
    ) {

        finishQuiz();

        return;
    }


    renderQuizQuestion();
    updateQuizTimer();
}


/* =========================================================
   Finish Quiz
========================================================= */

async function finishQuiz() {

    if (
        !state.quiz ||
        state.quiz.finished
    ) {
        return;
    }


    state.quiz.finished =
        true;


    stopQuizTimer();


    const quiz =
        state.quiz;


    const total =
        quiz.questions.length;


    const correct =
        quiz.correct;


    const wrong =
        quiz.wrong;


    const score =
        correct;


    const unanswered =
        Math.max(
            0,
            total -
            (correct + wrong)
        );


    await saveResult(
        state.currentSubject,
        score,
        correct,
        wrong
    );


    renderQuizResult(
        total,
        correct,
        wrong,
        unanswered
    );
}


/* =========================================================
   Save Result
========================================================= */

async function saveResult(
    subject,
    score,
    correct,
    wrong
) {

    if (!state.student) {
        return;
    }


    try {

        const studentNumber =
            getStudentNumber();


        const payload = {

            student_number:
                studentNumber,

            subject_id:
                subject?.id ?? null,

            subject_name:
                subject?.name ?? "",

            score:
                safeNumber(score),

            correct:
                safeNumber(correct),

            wrong:
                safeNumber(wrong),

            total:
                safeNumber(
                    correct
                ) +
                safeNumber(
                    wrong
                )

        };


        /*
         * RPC الحالية.
         *
         * إذا كان RPC الموجود في مشروعك
         * يعتمد على نفس الأسماء السابقة،
         * سيبقى الاتصال هنا كما هو.
         */

        const {
            data,
            error
        } =
            await sb.rpc(
                "submit_test_result",
                payload
            );


        if (error) {

            console.error(
                "submit_test_result:",
                error
            );

            return;
        }


        /*
         * إذا أعادت قاعدة البيانات
         * بيانات الطالب المحدثة،
         * نستخدمها مباشرة.
         */

        if (
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
        ) {

            const updated =
                data.student ||
                data.data ||
                data;


            if (
                updated &&
                typeof updated === "object"
            ) {

                saveStudent({
                    ...state.student,
                    ...updated
                });

                updateStudentChip();
            }
        }


        /*
         * تحديث محلي فقط للواجهة.
         * قاعدة البيانات هي المصدر الأساسي.
         */

        state.student = {
            ...state.student,

            points:
                getPoints() +
                safeNumber(score),

            tests:
                getTests() + 1,

            correct:
                getCorrect() +
                safeNumber(correct),

            wrong:
                getWrong() +
                safeNumber(wrong)

        };


        saveStudent(
            state.student
        );


    } catch (error) {

        console.error(
            "Failed to save result:",
            error
        );
    }
}


/* =========================================================
   Quiz Result
========================================================= */

function renderQuizResult(
    total,
    correct,
    wrong,
    unanswered
) {

    const content =
        $("#appContent");


    const percentage =
        total
            ? Math.round(
                (correct / total) * 100
            )
            : 0;


    content.innerHTML = `

        <section class="page quiz-page">

            <div class="result-card">

                <div class="result-icon">
                    ✓
                </div>

                <h1>
                    انتهى الاختبار
                </h1>

                <p>
                    أحسنت، تم تسجيل نتيجة الاختبار.
                </p>


                <div class="result-score">
                    ${percentage}%
                </div>


                <div class="result-stats">

                    <div class="result-stat">

                        <strong>
                            ${correct}
                        </strong>

                        <span>
                            صحيحة
                        </span>

                    </div>


                    <div class="result-stat">

                        <strong>
                            ${wrong}
                        </strong>

                        <span>
                            خاطئة
                        </span>

                    </div>


                    <div class="result-stat">

                        <strong>
                            ${unanswered}
                        </strong>

                        <span>
                            دون إجابة
                        </span>

                    </div>

                </div>


                <div
                    style="
                        display:grid;
                        gap:9px;
                        margin-top:20px;
                    "
                >

                    <button
                        type="button"
                        class="primary-button"
                        data-action="back-library"
                    >
                        العودة إلى المكتبة
                    </button>


                    <button
                        type="button"
                        class="action-button"
                        data-action="home"
                    >
                        العودة للرئيسية
                    </button>

                </div>

            </div>

        </section>
    `;


    state.quiz = null;

    state.currentSubject = null;

    state.currentQuestions = [];

    state.currentOptions = [];
}


/* =========================================================
   Ranking
========================================================= */

async function fetchRanking() {

    const {
        data,
        error
    } = await sb.rpc(
        "get_ranking"
    );


    if (error) {

        console.error(
            "get_ranking:",
            error
        );

        throw error;
    }


    if (Array.isArray(data)) {
        return data;
    }


    if (
        data &&
        Array.isArray(data.data)
    ) {
        return data.data;
    }


    if (
        data &&
        Array.isArray(data.ranking)
    ) {
        return data.ranking;
    }


    return [];
}


async function renderRanking() {

    const content =
        $("#appContent");


    content.innerHTML = `

        <section class="page">

            <div class="page-header">

                <span class="eyebrow">
                    الإنجاز
                </span>

                <h1>
                    ترتيب الطلاب
                </h1>

                <p>
                    تعرف على ترتيب الطلاب حسب النقاط.
                </p>

            </div>


            <div class="empty-state">

                <strong>
                    جارٍ تحميل الترتيب...
                </strong>

                <p>
                    لحظات من فضلك.
                </p>

            </div>

        </section>
    `;


    try {

        const ranking =
            await fetchRanking();


        if (!ranking.length) {

            content.innerHTML = `

                <section class="page">

                    <div class="page-header">

                        <span class="eyebrow">
                            الإنجاز
                        </span>

                        <h1>
                            ترتيب الطلاب
                        </h1>

                    </div>

                    <div class="empty-state">

                        <strong>
                            لا توجد بيانات ترتيب
                        </strong>

                        <p>
                            سيظهر الترتيب بعد توفر نتائج الطلاب.
                        </p>

                    </div>

                </section>
            `;

            return;
        }


        const currentNumber =
            getStudentNumber();


        const html =
            ranking.map(
                (student, index) => {

                    const number =
                        student.studentNumber ??
                        student.student_number ??
                        student.number ??
                        "";

                    const name =
                        student.name ??
                        student.full_name ??
                        "طالب";


                    const points =
                        safeNumber(
                            student.points ??
                            student.score ??
                            0
                        );


                    const current =
                        String(number) ===
                        String(currentNumber);


                    return `

                        <div
                            class="
                                ranking-item
                                ${current ? "current" : ""}
                            "
                        >

                            <div class="ranking-position">
                                ${index + 1}
                            </div>


                            <div class="ranking-student">

                                <div class="ranking-avatar">
                                    ${userIcon()}
                                </div>

                                <div class="ranking-name">
                                    ${escapeHTML(name)}
                                </div>

                            </div>


                            <div class="ranking-points">
                                ${points} نقطة
                            </div>

                        </div>
                    `;

                }
            ).join("");


        content.innerHTML = `

            <section class="page">

                <div class="page-header">

                    <span class="eyebrow">
                        الإنجاز
                    </span>

                    <h1>
                        ترتيب الطلاب
                    </h1>

                    <p>
                        ترتيب الطلاب حسب النقاط المسجلة في المنصة.
                    </p>

                </div>


                <div class="ranking-list">
                    ${html}
                </div>

            </section>
        `;


    } catch (error) {

        console.error(error);

        content.innerHTML = `

            <section class="page">

                <div class="page-header">

                    <span class="eyebrow">
                        الإنجاز
                    </span>

                    <h1>
                        ترتيب الطلاب
                    </h1>

                </div>


                <div class="empty-state">

                    <strong>
                        تعذر تحميل الترتيب
                    </strong>

                    <p>
                        تحقق من اتصال قاعدة البيانات ثم حاول مرة أخرى.
                    </p>

                </div>

            </section>
        `;
    }
}


/* =========================================================
   Profile
========================================================= */

function renderProfile() {

    const content =
        $("#appContent");


    const student =
        state.student;


    const name =
        getStudentName(student);


    const number =
        getStudentNumber(student);


    const points =
        getPoints(student);


    const tests =
        getTests(student);


    const correct =
        getCorrect(student);


    const wrong =
        getWrong(student);


    const accuracy =
        getAccuracy(student);


    const note =
        student?.note ||
        student?.notes ||
        student?.student_note ||
        "لا توجد ملاحظة مضافة إلى ملفك حاليًا.";


    content.innerHTML = `

        <section class="page">

            <div class="page-header">

                <span class="eyebrow">
                    حسابي
                </span>

                <h1>
                    ملفي الشخصي
                </h1>

                <p>
                    معلوماتك التعليمية وإحصاءات تقدمك.
                </p>

            </div>


            <div class="profile-header">

                <div class="profile-avatar">
                    ${userIcon()}
                </div>


                <div>

                    <h1>
                        ${escapeHTML(name)}
                    </h1>

                    <p>
                        رقم الطالب:
                        ${escapeHTML(number)}
                    </p>

                    <p>
                        المستوى:
                        ${escapeHTML(
                            getLevel(student)
                        )}
                    </p>

                </div>

            </div>


            <div class="profile-stats">

                <div class="profile-stat">

                    <span>
                        النقاط
                    </span>

                    <strong>
                        ${points}
                    </strong>

                </div>


                <div class="profile-stat">

                    <span>
                        الاختبارات
                    </span>

                    <strong>
                        ${tests}
                    </strong>

                </div>


                <div class="profile-stat">

                    <span>
                        صحيحة
                    </span>

                    <strong>
                        ${correct}
                    </strong>

                </div>


                <div class="profile-stat">

                    <span>
                        الدقة
                    </span>

                    <strong>
                        ${accuracy}%
                    </strong>

                </div>

            </div>


            <div class="profile-note">

                <h3>
                    ملاحظة الطالب
                </h3>

                <p>
                    ${escapeHTML(note)}
                </p>

            </div>

        </section>
    `;
}


/* =========================================================
   Login
========================================================= */

async function loginStudent(
    studentNumber,
    password
) {

    const {
        data,
        error
    } =
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


    /*
     * بعض نسخ RPC قد تعيد
     * صفًا واحدًا أو مصفوفة.
     */

    let student =
        Array.isArray(data)
            ? data[0]
            : data;


    if (
        student &&
        student.data &&
        typeof student.data === "object"
    ) {
        student =
            Array.isArray(student.data)
                ? student.data[0]
                : student.data;
    }


    if (
        !student ||
        typeof student !== "object"
    ) {

        throw new Error(
            "رقم الطالب أو كلمة المرور غير صحيحة."
        );
    }


    return student;
}


/* =========================================================
   Login UI
========================================================= */

async function handleLogin(event) {

    event.preventDefault();


    const numberInput =
        $("#studentNumber");


    const passwordInput =
        $("#password");


    const button =
        $("#loginButton");


    const message =
        $("#loginMessage");


    const studentNumber =
        numberInput.value.trim();


    const password =
        passwordInput.value;


    message.textContent = "";
    message.className = "message";


    if (
        !studentNumber ||
        !password
    ) {

        message.textContent =
            "أدخل رقم الطالب وكلمة المرور.";

        return;
    }


    button.disabled = true;

    button.classList.add("loading");


    const originalHTML =
        button.innerHTML;


    button.innerHTML =
        "<span>جارٍ تسجيل الدخول...</span>";


    try {

        const student =
            await loginStudent(
                studentNumber,
                password
            );


        /*
         * لا نخزن كلمة المرور.
         */

        delete student.password;

        delete student.user_password;


        saveStudent(student);


        updateStudentChip();


        $("#loginScreen")
            .classList.add("hidden");


        $("#appScreen")
            .classList.remove("hidden");


        await loadStaticData();


        renderPage("home");


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        message.textContent =
            error?.message ||
            "تعذر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى.";

    } finally {

        button.disabled = false;

        button.classList.remove("loading");

        button.innerHTML =
            originalHTML;
    }
}


/* =========================================================
   Password toggle
========================================================= */

function setupPasswordToggle() {

    const button =
        $("#togglePassword");


    const input =
        $("#password");


    if (!button || !input) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const showing =
                input.type === "text";


            input.type =
                showing
                    ? "password"
                    : "text";


            button.textContent =
                showing
                    ? "إظهار"
                    : "إخفاء";


            button.setAttribute(
                "aria-label",
                showing
                    ? "إظهار كلمة المرور"
                    : "إخفاء كلمة المرور"
            );

        }
    );
}


/* =========================================================
   Events
========================================================= */

function setupEvents() {

    const loginForm =
        $("#loginForm");


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    setupPasswordToggle();


    document.addEventListener(
        "click",
        async event => {

            const navButton =
                event.target.closest(
                    "[data-page]"
                );


            if (
                navButton &&
                navButton.dataset.page
            ) {

                const page =
                    navButton.dataset.page;


                if (
                    state.quiz &&
                    !state.quiz.finished &&
                    page !== "home"
                ) {

                    return;
                }


                renderPage(page);

                return;
            }


            const sectionButton =
                event.target.closest(
                    "[data-library-section]"
                );


            if (sectionButton) {

                renderSection(
                    sectionButton.dataset.librarySection
                );

                return;
            }


            const actionButton =
                event.target.closest(
                    "[data-action]"
                );


            if (!actionButton) {
                return;
            }


            const action =
                actionButton.dataset.action;


            switch (action) {

                case "back-library":

                    if (state.quiz) {
                        stopQuizTimer();
                        state.quiz = null;
                    }

                    renderPage("library");

                    break;


                case "home":

                    if (state.quiz) {
                        stopQuizTimer();
                        state.quiz = null;
                    }

                    renderPage("home");

                    break;


                case "open-book": {

                    const pdf =
                        actionButton.dataset.pdf;

                    if (!pdf) {
                        return;
                    }

                    window.open(
                        pdf,
                        "_blank",
                        "noopener,noreferrer"
                    );

                    break;
                }


                case "start-quiz":

                    await startQuiz(
                        actionButton.dataset.subjectId
                    );

                    break;


                case "answer":

                    selectAnswer(
                        safeNumber(
                            actionButton.dataset.answerIndex
                        )
                    );

                    break;


                case "exit-quiz": {

                    const confirmed =
                        window.confirm(
                            "هل تريد إنهاء الاختبار؟ لن يتم احتساب الأسئلة التي لم تجب عنها."
                        );


                    if (!confirmed) {
                        return;
                    }


                    stopQuizTimer();

                    state.quiz = null;

                    renderPage("library");

                    break;
                }

            }

        }
    );
}


/* =========================================================
   تشغيل التطبيق
========================================================= */

async function init() {

    setupEvents();


    const savedStudent =
        loadStudent();


    if (savedStudent) {

        state.student =
            savedStudent;


        updateStudentChip();


        $("#loginScreen")
            .classList.add("hidden");


        $("#appScreen")
            .classList.remove("hidden");


        await loadStaticData();


        renderPage("home");


        return;
    }


    $("#loginScreen")
        .classList.remove("hidden");


    $("#appScreen")
        .classList.add("hidden");
}


document.addEventListener(
    "DOMContentLoaded",
    init
);
