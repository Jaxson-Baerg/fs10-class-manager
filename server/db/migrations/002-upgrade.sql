BEGIN;

CREATE TABLE student_credits_audit (
  audit_id   BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  credits_before INTEGER,
  credits_after  INTEGER,
  delta INTEGER NOT NULL,
  description TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

  UPDATE students
  SET credits = v_after
  WHERE student_id = p_student_id;

  INSERT INTO student_credits_audit (
    student_id,
    credits_before, credits_after, delta, description, changed_at
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
