DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students(
    student_id SERIAL PRIMARY KEY NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    unique_code TEXT NOT NULL,
    credits INT NOT NULL,
    mailing_list BOOLEAN DEFAULT false NOT NULL,
    customer_id TEXT
);