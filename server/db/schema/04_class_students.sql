DROP TABLE IF EXISTS class_students CASCADE;
CREATE TABLE class_students(
    class_students_id SERIAL PRIMARY KEY NOT NULL,
    class_id INT REFERENCES classes(class_id) ON DELETE CASCADE,
    student_id INT REFERENCES students(student_id) ON DELETE CASCADE
);