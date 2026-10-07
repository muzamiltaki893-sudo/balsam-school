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
        ? "<span>جارٍ تسجيل الدخول...</span>"
        : "<span>دخول إلى المنصة</span>";
}


function getInitial(name) {
    if (!name) return "ط";

    return String(name).trim().charAt(0);
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
   تحميل البيانات الثابتة
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

        state.subjects = Array.isArray(subjects)
            ? subjects
            : [];

        state.posts = Array.isArray(posts)
            ? posts
            : [];

        state.notice = notice || null;

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

    if (!data || data.length === 0) {
        throw new Error("رقم الطالب أو كلمة المرور غير صحيحة");
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
   الجلسة المحلية
   ========================================================= */

function loadSavedStudent() {

    try {

        const saved =
            localStorage.getItem("balsam_student");

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

    if (!studentChip || !state.student) return;

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
        return;
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
                    <div class="notice-icon">!</div>

                    <div>
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

                        <div class="post-avatar">
                            ${escapeHTML(
                                getInitial(
                                    post.author || "م"
                                )
                            )}
                        </div>

                        <div>
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
                                    ${escapeHTML(post.title)}
                                </h3>
                            `
                            : ""
                    }

                    <p class="post-text">
                        ${escapeHTML(post.text || "")}
                    </p>

                </article>
            `).join("")

            : `
                <div class="empty-card">
                    لا توجد منشورات حالياً.
                </div>
            `;


    appContent.innerHTML = `

        <div class="page-container">

            <section class="hero">

                <div class="hero-student">

                    <div class="student-avatar">
                        ${escapeHTML(
                            getInitial(student.name)
                        )}
                    </div>

                    <div>

                        <h2>
                            أهلاً،
                            ${escapeHTML(student.name)}
                        </h2>

                        <p>
                            ${escapeHTML(
                                student.specialization ||
                                "طالب"
                            )}
                        </p>

                    </div>

                </div>

                <div class="hero-points">

                    <span>
                        نقاطك
                    </span>

                    <strong>
                        ${formatNumber(student.points)}
                    </strong>

                </div>

            </section>


            ${noticeHTML}


            <button
                class="library-main-button"
                data-action="open-library"
            >

                <div class="library-main-icon">
                    ▦
                </div>

                <div>

                    <strong>
                        المكتبة التعليمية
                    </strong>

                    <span>
                        الكتب والاختبارات والمواد الدراسية
                    </span>

                </div>

                <b>
                    ←
                </b>

            </button>


            <section class="posts-section">

                <div class="section-heading">

                    <div>
                        <span>
                            آخر الأخبار
                        </span>

                        <h2>
                            منشورات المدرسة
                        </h2>
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
            description: "اللغة والرياضيات والمواد الأساسية",
            icon: "◈"
        },
        {
            id: "scientific",
            title: "المواد العلمية",
            description: "الفيزياء والكيمياء والأحياء والحاسوب",
            icon: "◇"
        },
        {
            id: "literary",
            title: "المواد الأدبية",
            description: "التاريخ والجغرافيا والدراسات الإسلامية",
            icon: "▤"
        },
        {
            id: "foundation",
            title: "مواد التأسيس",
            description: "مهارات ومعلومات تأسيسية",
            icon: "✦"
        }
    ];

    appContent.innerHTML = `

        <div class="page-container">

            <div class="page-heading">

                <span>
                    المكتبة
                </span>

                <h1>
                    المكتبة التعليمية
                </h1>

                <p>
                    اختر القسم للوصول إلى الكتب والاختبارات.
                </p>

            </div>


            <div class="category-grid">

                ${categories.map(category => `

                    <button
                        class="category-card"
                        data-category="${category.id}"
                    >

                        <div class="category-icon">
                            ${category.icon}
                        </div>

                        <div>

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
                → المكتبة
            </button>

            <div class="page-heading">

                <span>
                    القسم
                </span>

                <h1>
                    ${categoryNames[categoryId] || ""}
                </h1>

                <p>
                    اختر المادة التي تريد دراستها.
                </p>

            </div>


            ${
                subjects.length
                    ? `
                        <div class="subjects-grid">

                            ${subjects.map(subject => `

                                <button
                                    class="subject-card"
                                    data-subject-id="${escapeHTML(
                                        subject.id
                                    )}"
                                >

                                    <div class="subject-number">
                                        ${escapeHTML(
                                            subject.number ||
                                            ""
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
                                            أجزاء
                                        </p>

                                    </div>

                                    <span>
                                        ←
                                    </span>

                                </button>

                            `).join("")}

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
        subject => String(subject.id) === String(id)
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
                            PDF
                        </div>

                        <div>

                            <span>
                                كتاب المادة
                            </span>

                            <h3>
                                ${escapeHTML(
                                    subject.name
                                )}
                            </h3>

                            <p>
                                يمكنك فتح الكتاب أو تنزيله
                                على هاتفك للدراسة دون اتصال.
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
                            فتح كتاب المادة
                        </a>

                        <a
                            class="secondary-button book-button"
                            href="${escapeHTML(
                                subject.book
                            )}"
                            download
                        >
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
                → ${escapeHTML(
                    getCategoryName(
                        state.selectedCategory
                    )
                )}
            </button>


            <div class="page-heading">

                <span>
                    المادة
                </span>

                <h1>
                    ${escapeHTML(subject.name)}
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
                            الاختبارات
                        </span>

                        <h2>
                            أجزاء المادة
                        </h2>
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
                                            ${
                                                index + 1
                                            }
                                        </div>

                                        <div>

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

                                        <span>
                                            ابدأ ←
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
   فتح الكتاب / التنزيل
   =========================================================

   ملاحظة:
   يمكن للطالب تنزيل PDF إلى الهاتف باستخدام download.
   إذا كان المتصفح لا يدعم التنزيل المباشر لملفات GitHub
   فقد يفتح PDF أولاً، وهذا يعتمد على المتصفح.
   */


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

        if (!Array.isArray(questions) ||
            questions.length === 0) {

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
                    Math.min(20, normalized.length)
                );


        state.quiz = {

            subject: subject.name,

            part:
                part.name ||
                "اختبار",

            questions:
                selectedQuestions,

            current: 0,

            answers:
                new Array(
                    selectedQuestions.length
                ).fill(null),

            selected: null,

            correct: 0,

            wrong: 0,

            timeLeft: 600,

            timer: null,

            finished: false
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

            if (!state.quiz ||
                state.quiz.finished) {

                clearInterval(
                    state.quiz?.timer
                );

                return;
            }

            state.quiz.timeLeft--;

            updateQuizTimer();

            if (state.quiz.timeLeft <= 0) {

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


    quiz.currentOptions = options;


    appContent.innerHTML = `

        <div class="page-container quiz-container">

            <div class="quiz-top">

                <button
                    class="back-button"
                    data-action="exit-quiz"
                >
                    إنهاء الاختبار
                </button>

                <div
                    id="quizTimer"
                    class="quiz-timer"
                >
                    ${formatTime(
                        quiz.timeLeft
                    )}
                </div>

            </div>


            <div class="quiz-progress">

                <div>
                    السؤال
                    ${quiz.current + 1}
                    من
                    ${quiz.questions.length}
                </div>

                <div class="progress-track">

                    <div
                        class="progress-fill"
                        style="
                            width:
                            ${
                                (
                                    (quiz.current + 1) /
                                    quiz.questions.length
                                ) * 100
                            }%
                        "
                    ></div>

                </div>

            </div>


            <section class="question-card">

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

                            <span>
                                ${
                                    String.fromCharCode(
                                        65 + index
                                    )
                                }
                            </span>

                            <strong>
                                ${escapeHTML(option)}
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
            </button>

        </div>
    `;

    updateQuizTimer();
}


function selectAnswer(index) {

    if (!state.quiz) return;

    state.quiz.selected = index;

    document
        .querySelectorAll(".answer-button")
        .forEach((button, buttonIndex) => {

            button.classList.toggle(
                "selected",
                buttonIndex === index
            );

        });
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
        selected: selectedAnswer,
        correct: question.a,
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
            Number(state.student.points || 0) +
            score;

        state.student.tests_count =
            Number(state.student.tests_count || 0) +
            1;

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
                (quiz.correct / total) * 100
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
            "لا تستسلم، أعد المراجعة وحاول مرة أخرى.";
    }


    appContent.innerHTML = `

        <div class="page-container result-container">

            <section class="result-card">

                <div class="result-icon">
                    ${percentage >= 50 ? "✓" : "!"}
                </div>

                <span>
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

                <span>
                    المنافسة
                </span>

                <h1>
                    ترتيب الطلاب
                </h1>

                <p>
                    أفضل 20 طالباً حسب النقاط.
                </p>

            </div>

            <div class="ranking-card">

                <div class="ranking-loading">
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
                                ${escapeHTML(
                                    getInitial(
                                        student.name
                                    )
                                )}
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
        Number(student.correct_answers || 0) +
        Number(student.wrong_answers || 0);


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

            <div class="profile-card">

                <div class="profile-avatar">
                    ${escapeHTML(
                        getInitial(
                            student.name
                        )
                    )}
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
                    ${escapeHTML(
                        student.student_number
                    )}
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

            </div>


            <div class="stats-grid">

                <div class="stat-card">

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

                    <span>
                        الإجابات الصحيحة
                    </span>

                    <strong>
                        ${formatNumber(
                            student.correct_answers
                        )}
                    </strong>

                </div>


                <div class="stat-card">

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
                تسجيل الخروج
            </button>

        </div>
    `;
}


/* =========================================================
   الأحداث
   ========================================================= */

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        handleLogin
    );
}


if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            if (
                passwordInput.type ===
                "password"
            ) {

                passwordInput.type =
                    "text";

                togglePassword.textContent =
                    "إخفاء";

            } else {

                passwordInput.type =
                    "password";

                togglePassword.textContent =
                    "إظهار";
            }
        }
    );
}


navButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            if (
                button.dataset.page
            ) {

                renderPage(
                    button.dataset.page
                );
            }
        }
    );
});


document.addEventListener(
    "click",
    event => {

        const categoryButton =
            event.target.closest(
                "[data-category]"
            );

        if (categoryButton) {

            renderCategory(
                categoryButton.dataset.category
            );

            return;
        }


        const subjectButton =
            event.target.closest(
                "[data-subject-id]"
            );

        if (subjectButton) {

            renderSubject(
                subjectButton.dataset.subjectId
            );

            return;
        }


        const partButton =
            event.target.closest(
                "[data-part-index]"
            );

        if (partButton) {

            if (!state.selectedSubject) {
                return;
            }

            const index =
                Number(
                    partButton.dataset.partIndex
                );

            const part =
                state.selectedSubject.parts[index];

            startQuiz(
                state.selectedSubject,
                part
            );

            return;
        }


        const answerButton =
            event.target.closest(
                "[data-answer-index]"
            );

        if (answerButton) {

            selectAnswer(
                Number(
                    answerButton.dataset.answerIndex
                )
            );

            return;
        }


        const action =
            event.target.closest(
                "[data-action]"
            );


        if (!action) return;


        const actionName =
            action.dataset.action;


        if (actionName === "open-library") {

            renderPage("library");

            return;
        }


        if (actionName === "back-library") {

            renderPage("library");

            return;
        }


        if (actionName === "back-category") {

            if (state.selectedCategory) {

                renderCategory(
                    state.selectedCategory
                );

            } else {

                renderLibrary();
            }

            return;
        }


        if (actionName === "next-question") {

            nextQuestion();

            return;
        }


        if (actionName === "exit-quiz") {

            const confirmed =
                confirm(
                    "هل تريد إنهاء الاختبار؟ ستفقد تقدمك الحالي."
                );

            if (confirmed) {

                clearInterval(
                    state.quiz?.timer
                );

                state.quiz = null;

                if (
                    state.selectedSubject
                ) {

                    renderSubject(
                        state.selectedSubject.id
                    );

                } else {

                    renderPage("library");
                }
            }

            return;
        }


        if (actionName === "back-subject") {

            if (state.selectedSubject) {

                renderSubject(
                    state.selectedSubject.id
                );

            } else {

                renderPage("library");
            }

            return;
        }


        if (actionName === "back-home") {

            state.quiz = null;

            renderPage("home");

            return;
        }


        if (actionName === "logout") {

            logout();

            return;
        }

    }
);


/* =========================================================
   بدء التطبيق
   ========================================================= */

(async function init() {

    const savedStudent =
        loadSavedStudent();

    if (savedStudent) {

        state.student =
            savedStudent;

        await startApplication();

    } else {

        loginScreen.classList.remove(
            "hidden"
        );

        appScreen.classList.add(
            "hidden"
        );
    }

})();
