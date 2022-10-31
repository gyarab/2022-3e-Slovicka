CREATE TABLE course_ratings (
    "user" INTEGER REFERENCES users ON DELETE CASCADE,
    course INTEGER REFERENCES courses ON DELETE CASCADE,
    value INTEGER NOT NULL,

    PRIMARY KEY ("user", course)
);