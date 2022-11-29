CREATE TABLE course_study_time (
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    course INTEGER NOT NULL REFERENCES courses ON DELETE CASCADE,
    "from" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "to" TIMESTAMP(3)
);

CREATE INDEX course_study_time_user ON course_study_time("user");
CREATE INDEX course_study_time_course ON course_study_time(course);