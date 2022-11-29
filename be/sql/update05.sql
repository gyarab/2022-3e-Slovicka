CREATE TABLE user_interactions (
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    event TEXT NOT NULL,
    at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX user_interactions_user ON user_interactions("user");