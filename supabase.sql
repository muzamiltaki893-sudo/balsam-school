-- =====================================================
-- مدرسة البلسم الثانوية
-- Supabase Database
-- =====================================================


-- =====================================================
-- الإضافات
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto
WITH SCHEMA extensions;


-- =====================================================
-- جدول الطلاب
-- =====================================================

CREATE TABLE IF NOT EXISTS public.students (

    id uuid PRIMARY KEY
        DEFAULT gen_random_uuid(),

    student_number text NOT NULL UNIQUE,

    name text NOT NULL,

    specialization text,

    points integer NOT NULL DEFAULT 0,

    level integer NOT NULL DEFAULT 1,

    tests_count integer NOT NULL DEFAULT 0,

    correct_answers integer NOT NULL DEFAULT 0,

    wrong_answers integer NOT NULL DEFAULT 0,

    note text,

    created_at timestamptz NOT NULL
        DEFAULT now(),

    password_hash text

);


-- =====================================================
-- جدول نتائج الاختبارات
-- =====================================================

CREATE TABLE IF NOT EXISTS public.test_results (

    id uuid PRIMARY KEY
        DEFAULT gen_random_uuid(),

    student_id uuid NOT NULL
        REFERENCES public.students(id)
        ON DELETE CASCADE,

    subject text NOT NULL,

    part text NOT NULL,

    score integer NOT NULL DEFAULT 0,

    total_questions integer NOT NULL DEFAULT 20,

    correct_answers integer NOT NULL DEFAULT 0,

    wrong_answers integer NOT NULL DEFAULT 0,

    duration_seconds integer,

    created_at timestamptz NOT NULL
        DEFAULT now()

);


-- =====================================================
-- تفعيل RLS
-- =====================================================

ALTER TABLE public.students
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.test_results
ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- تسجيل دخول الطالب
-- =====================================================

CREATE OR REPLACE FUNCTION public.login_student(
    p_student_number text,
    p_password text
)
RETURNS TABLE (

    id uuid,

    student_number text,

    name text,

    specialization text,

    points integer,

    level integer,

    tests_count integer,

    correct_answers integer,

    wrong_answers integer,

    note text

)

LANGUAGE sql

SECURITY DEFINER

SET search_path = public

AS $$

    SELECT

        s.id,

        s.student_number,

        s.name,

        s.specialization,

        s.points,

        s.level,

        s.tests_count,

        s.correct_answers,

        s.wrong_answers,

        s.note

    FROM public.students s

    WHERE
        s.student_number =
            p_student_number

        AND

        s.password_hash =
            extensions.crypt(
                p_password,
                s.password_hash
            );

$$;


REVOKE ALL
ON FUNCTION public.login_student(
    text,
    text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.login_student(
    text,
    text
)
TO anon;


-- =====================================================
-- إنشاء طالب
-- يستخدم من الإدارة / السكربت المحلي
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_student(

    p_student_number text,

    p_name text,

    p_password text,

    p_specialization text

)

RETURNS uuid

LANGUAGE sql

SECURITY DEFINER

SET search_path = public

AS $$

    INSERT INTO public.students (

        student_number,

        name,

        password_hash,

        specialization

    )

    VALUES (

        p_student_number,

        p_name,

        extensions.crypt(
            p_password,
            extensions.gen_salt('bf')
        ),

        p_specialization

    )

    RETURNING id;

$$;


REVOKE ALL

ON FUNCTION public.create_student(
    text,
    text,
    text,
    text
)

FROM PUBLIC;


GRANT EXECUTE

ON FUNCTION public.create_student(
    text,
    text,
    text,
    text
)

TO service_role;


-- =====================================================
-- حفظ نتيجة الاختبار
-- =====================================================

CREATE OR REPLACE FUNCTION public.submit_test_result(

    p_student_id uuid,

    p_subject text,

    p_part text,

    p_score integer,

    p_total_questions integer,

    p_correct_answers integer,

    p_wrong_answers integer,

    p_duration_seconds integer

)

RETURNS uuid

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

    result_id uuid;

BEGIN

    IF NOT EXISTS (

        SELECT 1

        FROM public.students

        WHERE id = p_student_id

    ) THEN

        RAISE EXCEPTION
            'الطالب غير موجود';

    END IF;


    IF
        p_total_questions <= 0

        OR p_score < 0

        OR p_score > p_total_questions

        OR p_correct_answers < 0

        OR p_wrong_answers < 0

        OR
        p_correct_answers
        +
        p_wrong_answers
        <>
        p_total_questions

    THEN

        RAISE EXCEPTION
            'بيانات النتيجة غير صحيحة';

    END IF;


    INSERT INTO public.test_results (

        student_id,

        subject,

        part,

        score,

        total_questions,

        correct_answers,

        wrong_answers,

        duration_seconds

    )

    VALUES (

        p_student_id,

        p_subject,

        p_part,

        p_score,

        p_total_questions,

        p_correct_answers,

        p_wrong_answers,

        p_duration_seconds

    )

    RETURNING id
    INTO result_id;


    UPDATE public.students

    SET

        points =
            points + p_score,

        tests_count =
            tests_count + 1,

        correct_answers =
            correct_answers
            +
            p_correct_answers,

        wrong_answers =
            wrong_answers
            +
            p_wrong_answers,

        level =
            GREATEST(
                1,
                FLOOR(
                    (
                        points + p_score
                    ) / 100.0
                )::integer + 1
            )

    WHERE id = p_student_id;


    RETURN result_id;

END;

$$;


REVOKE ALL

ON FUNCTION public.submit_test_result(
    uuid,
    text,
    text,
    integer,
    integer,
    integer,
    integer,
    integer
)

FROM PUBLIC;


GRANT EXECUTE

ON FUNCTION public.submit_test_result(
    uuid,
    text,
    text,
    integer,
    integer,
    integer,
    integer,
    integer
)

TO anon;


-- =====================================================
-- ترتيب الطلاب
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ranking()

RETURNS TABLE (

    student_number text,

    name text,

    specialization text,

    points integer,

    level integer

)

LANGUAGE sql

SECURITY DEFINER

SET search_path = public

AS $$

    SELECT

        student_number,

        name,

        specialization,

        points,

        level

    FROM public.students

    ORDER BY

        points DESC,

        name ASC

    LIMIT 20;

$$;


REVOKE ALL

ON FUNCTION public.get_ranking()

FROM PUBLIC;


GRANT EXECUTE

ON FUNCTION public.get_ranking()

TO anon;
