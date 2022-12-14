DROP TABLE IF EXISTS class_types CASCADE;
CREATE TABLE class_types(
    class_type_id SERIAL PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);