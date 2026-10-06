const CONFIG = window.BALSAM_CONFIG;

if (!CONFIG || !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    document.body.innerHTML = `
        <div style="
            min-height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:30px;
            background:#061118;
            color:white;
            font-family:Arial;
            text-align:center;
        ">
            <div>
                <h2>إعداد Supabase غير مكتمل</h2>
                <p style="color:#9cffc2;margin-top:10px">
                    افتح config.js وضع مفتاح anon العام.
                </p>
            </div>
        </div>
    `;
    throw new Error("Supabase configuration missing");
}


const { createClient } = supabase;

const sb = createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseAnonKey
);


// ======================================================
// STATE
// ======================================================

const state = {
    student: null,

    subjects: [],

    posts: [],

    notice: null,

    page: "home",

    quiz: null
};


// ======================================================
// ELEMENTS
// ======================================================

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const appContent = document.getElementById("appContent");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

const studentChip = document.getElementById("studentChip");


// ======================================================
// HELPERS
// ======================================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function shuffle(array) {

    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}


function randomQuestions(array, count = 20) {
    return shuffle(array).slice(
        0,
        Math.min(count, array.length)
    );
}


async function loadJSON(path) {

    const response = await fetch(path, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`تعذر تحميل ${path}`);
    }

    return response.json();
}


function showLogin() {

    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
}


function showApp() {

    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
}


function setMessage(text, error = true) {

    loginMessage.textContent = text;

    loginMessage.style.color =
        error ? "#ff7777" : "#9cffc2";
}


function updateStudentChip() {

    if (!state.student) {
        studentChip.textContent = "الطالب";
        return;
    }

    studentChip.textContent = state.student.name;
}


// ======================================================
// INITIAL DATA
// ======================================================

async function bootData() {

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

        state.subjects = subjects.categories || subjects;
        state.posts = Array.isArray(posts) ? posts : [];
        state.notice = notice;

    } catch (error) {

        console.error(error);

        state.subjects = [];
        state.posts = [];

        state.notice = {
            title: "مرحبًا بكم",
            text: "منصة مدرسة البلسم الثانوية."
        };
    }
}


// ======================================================
// LOGIN
// ======================================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const studentNumber =
        document.getElementById("studentNumber")
        .value
        .trim();

    const password =
        passwordInput.value.trim();

    if (!studentNumber || !password) {

        setMessage("أدخل رقم الطالب وكلمة المرور.");

        return;
    }

    loginButton.disabled = true;

    loginButton.innerHTML = `
        <span>جاري الدخول...</span>
    `;

    setMessage("");

    try {

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

            setMessage(
                "رقم الطالب أو كلمة المرور غير صحيحة."
            );

            return;
        }

        state.student = data[0];

        localStorage.setItem(
            "balsam_student",
            JSON.stringify(state.student)
        );

        updateStudentChip();

        await bootData();

        showApp();

        renderPage("home");

    } catch (error) {

        console.error(error);

        setMessage(
            "حدث خطأ أثناء تسجيل الدخول."
        );

    } finally {

        loginButton.disabled = false;

        loginButton.innerHTML = `
            <span>دخول إلى المنصة</span>
        `;
    }
});


// ======================================================
// PASSWORD
// ======================================================

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.textContent = "إخفاء";

    } else {

        passwordInput.type = "password";

        togglePassword.textContent = "إظهار";
    }
});


// ======================================================
// HOME
// ======================================================

function home() {

    const studentName =
        escapeHTML(state.student?.name || "الطالب");

    const noticeTitle =
        escapeHTML(
            state.notice?.title || "الإعلان المهم"
        );

    const noticeText =
        escapeHTML(
            state.notice?.text || ""
        );

    const postsHTML =
        state.posts.length

            ? state.posts.map(post => `
                <article class="post-card">

                    <h3>
                        ${escapeHTML(post.title)}
                    </h3>

                    <p>
                        ${escapeHTML(post.text)}
                    </p>

                    ${
                        post.date
                            ? `<small class="post-date">
                                ${escapeHTML(post.date)}
                               </small>`
                            : ""
                    }

                </article>
            `).join("")

            : `
                <div class="empty">
                    لا توجد منشورات حاليًا.
                </div>
            `;


    appContent.innerHTML = `

        <section class="hero">

            <h2>
                أهلًا بك،
                <span>${studentName}</span>
            </h2>

            <p>
                واصل التعلم واكتسب المزيد من النقاط.
            </p>

        </section>


        <section class="notice-card">

            <div class="notice-label">
                الإعلان المهم
            </div>

            <h3>
                ${noticeTitle}
            </h3>

            <p>
                ${noticeText}
            </p>

        </section>


        <button
            class="big-library-button"
            data-action="library"
        >

            <strong>
                📚 مكتبة المدرسة
            </strong>

            <span>
                الكتب، المواد، وبنوك الأسئلة
            </span>

        </button>


        <div class="section-heading">

            <h3>
                آخر المنشورات
            </h3>

            <span>
                المدرسة
            </span>

        </div>


        <section class="posts">
            ${postsHTML}
        </section>
    `;
}


// ======================================================
// LIBRARY
// ======================================================

function library() {

    appContent.innerHTML = `

        <button
            class="back-button"
            data-page="home"
        >
            ← الرئيسية
        </button>

        <h1 class="page-title">
            المكتبة
        </h1>

        <p class="page-subtitle">
            اختر القسم الدراسي
        </p>

        <div class="category-grid">

            ${
                state.subjects.length

                ? state.subjects.map((category, index) => `

                    <button
                        class="category-card"
                        data-category="${escapeHTML(category.id)}"
                    >

                        <span class="category-number">
                            القسم ${index + 1}
                        </span>

                        <h3>
                            ${escapeHTML(category.title)}
                        </h3>

                        <p>
                            ${category.subjects?.length || 0}
                            مواد
                        </p>

                    </button>

                `).join("")

                : `
                    <div class="empty">
                        لم تتم إضافة المواد بعد.
                    </div>
                `
            }

        </div>
    `;
}


// ======================================================
// CATEGORY
// ======================================================

function category(categoryId) {

    const categoryData =
        state.subjects.find(
            category => category.id === categoryId
        );

    if (!categoryData) {

        library();

        return;
    }

    appContent.innerHTML = `

        <button
            class="back-button"
            data-page="library"
        >
            ← المكتبة
        </button>

        <h1 class="page-title">
            ${escapeHTML(categoryData.title)}
        </h1>

        <p class="page-subtitle">
            اختر المادة
        </p>

        <div class="category-grid">

            ${
                categoryData.subjects?.length

                ? categoryData.subjects.map((subject, index) => `

                    <button
                        class="category-card"
                        data-subject="${escapeHTML(subject.id)}"
                        data-category="${escapeHTML(categoryId)}"
                    >

                        <span class="category-number">
                            مادة ${index + 1}
                        </span>

                        <h3>
                            ${escapeHTML(subject.name)}
                        </h3>

                        <p>
                            ${subject.parts?.length || 0}
                            أجزاء
                        </p>

                    </button>

                `).join("")

                : `
                    <div class="empty">
                        لا توجد مواد في هذا القسم.
                    </div>
                `
            }

        </div>
    `;
}


// ======================================================
// SUBJECT
// ======================================================

function subject(categoryId, subjectId) {

    const categoryData =
        state.subjects.find(
            category => category.id === categoryId
        );

    if (!categoryData) return;

    const subjectData =
        categoryData.subjects.find(
            subject => subject.id === subjectId
        );

    if (!subjectData) return;


    const partsHTML =
        subjectData.parts?.length

        ? subjectData.parts.map(part => `

            <button
                class="part-button"
                data-start-quiz="true"
                data-questions="${escapeHTML(part.questions)}"
                data-subject="${escapeHTML(subjectData.name)}"
                data-part="${escapeHTML(part.name)}"
            >

                <span>
                    ${escapeHTML(part.name)}
                </span>

                <small>
                    اختبار 20 سؤال
                </small>

            </button>

        `).join("")

        : `
            <div class="empty">
                لا توجد اختبارات لهذه المادة.
            </div>
        `;


    appContent.innerHTML = `

        <button
            class="back-button"
            data-category-back="${escapeHTML(categoryId)}"
        >
            ← المواد
        </button>

        <h1 class="page-title">
            ${escapeHTML(subjectData.name)}
        </h1>

        <p class="page-subtitle">
            كتاب المادة والاختبارات
        </p>


        <section class="subject-card">

            <h3>
                📖 كتاب المادة
            </h3>

            <button
                class="book-button"
                data-book="${escapeHTML(subjectData.book)}"
            >
                فتح كتاب المادة
            </button>

        </section>


        <section class="subject-card">

            <h3>
                🧠 اختبارات المادة
            </h3>

            <div class="parts">
                ${partsHTML}
            </div>

        </section>
    `;
}


// ======================================================
// PROFILE
// ======================================================

async function profile() {

    const student = state.student;

    if (!student) return;


    appContent.innerHTML = `

        <h1 class="page-title">
            ملفي الشخصي
        </h1>

        <p class="page-subtitle">
            بياناتك ومستواك الدراسي
        </p>


        <section class="profile-header">

            <div class="avatar">
                ${escapeHTML(
                    student.name?.charAt(0) || "ط"
                )}
            </div>

            <h2>
                ${escapeHTML(student.name)}
            </h2>

            <p>
                رقم الطالب:
                ${escapeHTML(student.student_number)}
            </p>

            <p>
                التخصص:
                ${escapeHTML(
                    student.specialization || "غير محدد"
                )}
            </p>

        </section>


        <section class="stats-grid">

            <div class="stat-card">
                <strong>
                    ${student.points || 0}
                </strong>
                <span>
                    النقاط
                </span>
            </div>

            <div class="stat-card">
                <strong>
                    ${student.level || 1}
                </strong>
                <span>
                    المستوى
                </span>
            </div>

            <div class="stat-card">
                <strong>
                    ${student.tests_count || 0}
                </strong>
                <span>
                    الاختبارات
                </span>
            </div>

            <div class="stat-card">
                <strong>
                    ${student.correct_answers || 0}
                </strong>
                <span>
                    الإجابات الصحيحة
                </span>
            </div>

            <div class="stat-card">
                <strong>
                    ${student.wrong_answers || 0}
                </strong>
                <span>
                    الإجابات الخاطئة
                </span>
            </div>

        </section>


        <section class="note-card">

            <strong>
                ملاحظة
            </strong>

            <p>
                ${escapeHTML(
                    student.note || "لا توجد ملاحظة."
                )}
            </p>

        </section>
    `;
}


// ======================================================
// RANKING
// ======================================================

async function ranking() {

    appContent.innerHTML = `

        <h1 class="page-title">
            ترتيب الطلاب
        </h1>

        <p class="page-subtitle">
            أفضل 20 طالبًا حسب النقاط
        </p>

        <div class="ranking-list">
            <div class="empty">
                جاري تحميل الترتيب...
            </div>
        </div>
    `;


    const { data, error } =
        await sb.rpc("get_ranking");


    if (error) {

        console.error(error);

        appContent.querySelector(".ranking-list").innerHTML = `
            <div class="empty">
                تعذر تحميل الترتيب.
            </div>
        `;

        return;
    }


    const rankingList =
        appContent.querySelector(".ranking-list");


    if (!data?.length) {

        rankingList.innerHTML = `
            <div class="empty">
                لا يوجد طلاب في الترتيب.
            </div>
        `;

        return;
    }


    rankingList.innerHTML =
        data.map((student, index) => `

            <div class="rank-row">

                <div class="rank-number">
                    ${index + 1}
                </div>

                <div class="rank-name">

                    <strong>
                        ${escapeHTML(student.name)}
                    </strong>

                    <small>
                        المستوى ${student.level || 1}
                    </small>

                </div>

                <div class="rank-points">
                    ${student.points || 0}
                </div>

            </div>

        `).join("");
}


// ======================================================
// QUIZ
// ======================================================

async function startQuiz(
    questionsPath,
    subjectName,
    partName
) {

    try {

        const data =
            await loadJSON(questionsPath);

        const questions =
            Array.isArray(data)
                ? data
                : data.questions || [];


        if (!questions.length) {

            alert("لا توجد أسئلة في هذا الاختبار.");

            return;
        }


        const selectedQuestions =
            randomQuestions(questions, 20)
            .map(question => ({

                q: question.q,

                a: question.a,

                options: shuffle([
                    question.a,
                    ...(question.w || [])
                ])
            }));


        state.quiz = {

            subject: subjectName,

            part: partName,

            questions: selectedQuestions,

            index: 0,

            score: 0,

            correct: 0,

            wrong: 0,

            selected: null,

            seconds: 600,

            timer: null
        };


        renderQuiz();

        state.quiz.timer =
            setInterval(() => {

                if (!state.quiz) return;

                state.quiz.seconds--;

                updateTimer();

                if (state.quiz.seconds <= 0) {

                    clearInterval(state.quiz.timer);

                    finishQuiz();
                }

            }, 1000);

    } catch (error) {

        console.error(error);

        alert("تعذر تحميل أسئلة الاختبار.");
    }
}


// ======================================================
// RENDER QUIZ
// ======================================================

function renderQuiz() {

    const quiz = state.quiz;

    if (!quiz) return;


    const question =
        quiz.questions[quiz.index];


    const optionsHTML =
        question.options.map((option, index) => `

            <button
                class="option"
                data-option-index="${index}"
            >
                ${escapeHTML(option)}
            </button>

        `).join("");


    appContent.innerHTML = `

        <section class="quiz-card">

            <div class="quiz-top">

                <span class="quiz-progress">
                    السؤال ${quiz.index + 1}
                    من ${quiz.questions.length}
                </span>

                <span
                    id="quizTimer"
                    class="timer"
                >
                    10:00
                </span>

            </div>


            <div class="question">
                ${escapeHTML(question.q)}
            </div>


            <div class="options">
                ${optionsHTML}
            </div>


            <button
                id="nextQuestion"
                class="next-button"
            >
                ${
                    quiz.index === quiz.questions.length - 1
                        ? "إنهاء الاختبار"
                        : "السؤال التالي"
                }
            </button>

        </section>
    `;

    updateTimer();
}


// ======================================================
// OPTION SELECT
// ======================================================

function selectOption(index) {

    if (!state.quiz) return;

    state.quiz.selected = index;


    document
        .querySelectorAll(".option")
        .forEach((button, buttonIndex) => {

            button.classList.toggle(
                "selected",
                buttonIndex === index
            );
        });
}


// ======================================================
// NEXT QUESTION
// ======================================================

function nextQuestion() {

    const quiz = state.quiz;

    if (!quiz) return;


    if (quiz.selected !== null) {

        const question =
            quiz.questions[quiz.index];

        const selected =
            question.options[quiz.selected];


        if (selected === question.a) {

            quiz.score++;
            quiz.correct++;

        } else {

            quiz.wrong++;
        }

    } else {

        quiz.wrong++;
    }


    if (
        quiz.index >=
        quiz.questions.length - 1
    ) {

        quiz.selected = null;

        finishQuiz();

        return;
    }


    quiz.index++;

    quiz.selected = null;

    renderQuiz();
}


// ======================================================
// TIMER
// ======================================================

function updateTimer() {

    const timer =
        document.getElementById("quizTimer");

    if (!timer || !state.quiz) return;


    const minutes =
        Math.floor(
            state.quiz.seconds / 60
        );

    const seconds =
        state.quiz.seconds % 60;


    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


// ======================================================
// FINISH QUIZ
// ======================================================

async function finishQuiz() {

    const quiz = state.quiz;

    if (!quiz) return;


    if (quiz.timer) {
        clearInterval(quiz.timer);
    }


    const unanswered =
        quiz.questions.length -
        quiz.correct -
        quiz.wrong;


    quiz.wrong +=
        Math.max(0, unanswered);


    const total =
        quiz.questions.length;


    appContent.innerHTML = `

        <section class="result-card">

            <div class="result-score">
                ${quiz.score}/${total}
            </div>

            <h2>
                انتهى الاختبار
            </h2>

            <p>
                ${escapeHTML(quiz.subject)}
                — ${escapeHTML(quiz.part)}
            </p>


            <div class="result-details">

                <div class="result-detail">
                    <strong>
                        ${quiz.correct}
                    </strong>
                    <span>
                        صحيحة
                    </span>
                </div>

                <div class="result-detail">
                    <strong>
                        ${quiz.wrong}
                    </strong>
                    <span>
                        خاطئة
                    </span>
                </div>

            </div>


            <button
                class="next-button"
                data-page="home"
            >
                العودة للرئيسية
            </button>

        </section>
    `;


    await saveResult(quiz);
}


// ======================================================
// SAVE RESULT
// ======================================================

async function saveResult(quiz) {

    if (!state.student) return;


    const duration =
        600 - quiz.seconds;


    const { error } =
        await sb.rpc(
            "submit_test_result",
            {
                p_student_id: state.student.id,

                p_subject: quiz.subject,

                p_part: quiz.part,

                p_score: quiz.score,

                p_total_questions:
                    quiz.questions.length,

                p_correct_answers:
                    quiz.correct,

                p_wrong_answers:
                    quiz.wrong,

                p_duration_seconds:
                    duration
            }
        );


    if (error) {

        console.error(
            "حفظ النتيجة:",
            error
        );

        return;
    }


    /*
      تحديث بيانات الطالب محليًا
      حتى يظهر التغيير مباشرة.
    */

    state.student.points =
        (state.student.points || 0)
        + quiz.score;

    state.student.tests_count =
        (state.student.tests_count || 0)
        + 1;

    state.student.correct_answers =
        (state.student.correct_answers || 0)
        + quiz.correct;

    state.student.wrong_answers =
        (state.student.wrong_answers || 0)
        + quiz.wrong;


    state.student.level =
        Math.max(
            1,
            Math.floor(
                state.student.points / 100
            ) + 1
        );


    localStorage.setItem(
        "balsam_student",
        JSON.stringify(state.student)
    );

    state.quiz = null;
}


// ======================================================
// RENDER PAGE
// ======================================================

function renderPage(page) {

    if (state.quiz) {

        if (state.quiz.timer) {
            clearInterval(state.quiz.timer);
        }

        state.quiz = null;
    }


    state.page = page;


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });


    if (page === "home") {

        home();

    } else if (page === "library") {

        library();

    } else if (page === "profile") {

        profile();

    } else if (page === "ranking") {

        ranking();
    }
}


// ======================================================
// EVENTS
// ======================================================

document.addEventListener("click", async (event) => {

    const nav =
        event.target.closest(
            "[data-page]"
        );

    if (nav) {

        renderPage(
            nav.dataset.page
        );

        return;
    }


    const action =
        event.target.closest(
            "[data-action]"
        );

    if (action) {

        if (
            action.dataset.action ===
            "library"
        ) {

            renderPage("library");
        }

        return;
    }


    const categoryButton =
        event.target.closest(
            "[data-category]"
        );

    if (
        categoryButton &&
        !categoryButton.dataset.subject
    ) {

        category(
            categoryButton.dataset.category
        );

        return;
    }


    const subjectButton =
        event.target.closest(
            "[data-subject]"
        );

    if (subjectButton) {

        subject(
            subjectButton.dataset.category,
            subjectButton.dataset.subject
        );

        return;
    }


    const backCategory =
        event.target.closest(
            "[data-category-back]"
        );

    if (backCategory) {

        category(
            backCategory.dataset.categoryBack
        );

        return;
    }


    const bookButton =
        event.target.closest(
            "[data-book]"
        );

    if (bookButton) {

        const path =
            bookButton.dataset.book;

        if (path) {
            window.open(path, "_blank");
        }

        return;
    }


    const startButton =
        event.target.closest(
            "[data-start-quiz]"
        );

    if (startButton) {

        await startQuiz(
            startButton.dataset.questions,
            startButton.dataset.subject,
            startButton.dataset.part
        );

        return;
    }


    const option =
        event.target.closest(
            "[data-option-index]"
        );

    if (option) {

        selectOption(
            Number(option.dataset.optionIndex)
        );

        return;
    }


    if (
        event.target.closest(
            "#nextQuestion"
        )
    ) {

        nextQuestion();

        return;
    }
});


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    if (state.quiz?.timer) {
        clearInterval(state.quiz.timer);
    }

    state.student = null;
    state.quiz = null;

    localStorage.removeItem(
        "balsam_student"
    );

    showLogin();

    document.getElementById(
        "studentNumber"
    ).value = "";

    passwordInput.value = "";
}


// ======================================================
// STARTUP
// ======================================================

async function startApp() {

    await bootData();


    const saved =
        localStorage.getItem(
            "balsam_student"
        );


    if (saved) {

        try {

            state.student =
                JSON.parse(saved);

            updateStudentChip();

            showApp();

            renderPage("home");

            return;

        } catch {

            localStorage.removeItem(
                "balsam_student"
            );
        }
    }


    showLogin();
}


startApp();
