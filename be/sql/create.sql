CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(1024) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created TIMESTAMP(3) NOT NULL DEFAULT now(),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    role TEXT CHECK(role IN ('ADMIN', 'USER', 'EDITOR')),
    active BOOLEAN DEFAULT TRUE,
    name TEXT NOT NULL DEFAULT '',
    surname TEXT NOT NULL DEFAULT '',
    lang VARCHAR(2) NOT NULL DEFAULT 'en'
);

CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    accessed TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON sessions("user");
CREATE INDEX sessions_accessed_idx ON sessions(accessed);

CREATE TABLE tokens (
    code VARCHAR(64) PRIMARY KEY,
    purpose VARCHAR(512) NOT NULL,
    expiration TIMESTAMP(0),
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

CREATE INDEX tokens_purpose_idx ON tokens(purpose);
CREATE INDEX tokens_user_idx ON tokens("user");

CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code VARCHAR(4) NOT NULL UNIQUE
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    language INTEGER NOT NULL REFERENCES languages ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ADVENTURE', 'USER')),
    visible_to TEXT CHECK (visible_to IN ('ME', 'EVERYONE')),
    owner INTEGER REFERENCES users ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('creating', 'paused', 'closed', 'published')),

    CONSTRAINT visible_to_valid CHECK (type = 'ADVENTURE' OR visible_to IS NOT NULL),
    CONSTRAINT owned_by_valid CHECK (type = 'ADVENTURE' OR owner IS NOT NULL)
);

CREATE INDEX courses_language_idx ON courses(language);
CREATE INDEX courses_owner_idx ON courses(owner);
CREATE INDEX courses_type_idx ON courses(type);

CREATE TABLE course_nodes (
    id SERIAL PRIMARY KEY,
    course INTEGER NOT NULL REFERENCES courses NOT NULL,
    name TEXT,
    description TEXT,
    level INTEGER NOT NULL,
    number_of_completion INTEGER,
    state TEXT CHECK (state IN ('creating', 'published'))
);

CREATE INDEX course_nodes_level_idx ON course_nodes(level);
CREATE INDEX course_nodes_course_idx ON course_nodes(course);

CREATE TABLE course_node_state (
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    course_nodes INTEGER NOT NULL REFERENCES course_nodes ON DELETE CASCADE,
    number_of_completion INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE word_groups (
    id SERIAL PRIMARY KEY,
    course_node INTEGER NOT NULL REFERENCES course_nodes REFERENCES course_nodes,
    word INTEGER NOT NULL REFERENCES words REFERENCES words,
    definition TEXT,
    translation TEXT,
    phonetic TEXT,
    sentence TEXT
);

CREATE INDEX word_groups_course_node_idx ON word_groups(course_node);

CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    definition TEXT,
    translation TEXT,
    phonetic TEXT,
    sentence TEXT,
    language INTEGER NOT NULL REFERENCES languages ON DELETE CASCADE
);

CREATE INDEX words_language_idx ON words(language);

CREATE TABLE word_state (
    "user" INTEGER REFERENCES users ON DELETE CASCADE,
    word INTEGER NOT NULL REFERENCES words ON DELETE CASCADE,
    state TEXT CHECK (state IN ('known', 'unknown')),
    changed TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX word_state_user_idx ON word_state("user");