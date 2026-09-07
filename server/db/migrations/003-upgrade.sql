BEGIN;

-- Collapse existing duplicate registrations before adding the unique constraint.
WITH duplicate_groups AS (
  SELECT
    class_id,
    student_id,
    MIN(class_students_id) AS keep_id,
    BOOL_OR(complete) AS complete
  FROM class_students
  GROUP BY class_id, student_id
  HAVING COUNT(*) > 1
)
UPDATE class_students cs
SET complete = dg.complete
FROM duplicate_groups dg
WHERE cs.class_students_id = dg.keep_id;

WITH ranked AS (
  SELECT
    class_students_id,
    ROW_NUMBER() OVER (
      PARTITION BY class_id, student_id
      ORDER BY complete DESC, class_students_id
    ) AS rn
  FROM class_students
)
DELETE FROM class_students cs
USING ranked r
WHERE cs.class_students_id = r.class_students_id
  AND r.rn > 1;

ALTER TABLE class_students
ADD CONSTRAINT class_students_unique_class_student
UNIQUE (class_id, student_id);

ALTER TABLE students
ADD CONSTRAINT students_credits_nonnegative
CHECK (credits >= 0) NOT VALID;

CREATE OR REPLACE FUNCTION record_student_credit_change(
  p_student_id BIGINT,
  p_credits_change INTEGER,
  p_description TEXT
) RETURNS VOID AS $$
DECLARE
  v_before INTEGER;
  v_after  INTEGER;
BEGIN
  SELECT COALESCE(credits, 0) INTO v_before
  FROM students
  WHERE student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student id % not found', p_student_id;
  END IF;

  v_after := v_before + COALESCE(p_credits_change, 0);

  IF v_after < 0 THEN
    RAISE EXCEPTION 'insufficient credits for student id %: current %, change %',
      p_student_id, v_before, p_credits_change;
  END IF;

  UPDATE students
  SET credits = v_after
  WHERE student_id = p_student_id;

  INSERT INTO student_credits_audit (
    student_id,
    credits_before,
    credits_after,
    delta,
    description,
    changed_at
  ) VALUES (
    p_student_id,
    v_before,
    v_after,
    v_after - v_before,
    p_description,
    now()
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;
