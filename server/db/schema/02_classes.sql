DROP TABLE IF EXISTS classes CASCADE;
CREATE TABLE classes(
    class_id SERIAL PRIMARY KEY NOT NULL,
    class_type_id INT REFERENCES class_types(class_type_id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    credit_cost INT NOT NULL,
    max_students INT NOT NULL
);