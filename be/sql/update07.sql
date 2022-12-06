CREATE TABLE last_course_interaction (
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    course INTEGER NOT NULL REFERENCES courses ON DELETE CASCADE,
    interaction TIMESTAMP(3) DEFAULT now()
);

CREATE INDEX last_course_interaction_user_idx ON last_course_interaction("user");
CREATE INDEX last_course_interaction_course_idx ON last_course_interaction(course);