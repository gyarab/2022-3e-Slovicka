CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    original_filename TEXT NOT NULL,
    filename TEXT NOT NULL,
    type VARCHAR(256),
    uploaded TIMESTAMP(3) NOT NULL DEFAULT now(),
    size INTEGER,
    uploader INTEGER REFERENCES users ON DELETE SET NULL,
    storage_path VARCHAR(512) NULL
);

CREATE INDEX files_filename_idx ON files(filename);

CREATE TABLE adventure_node_pictures (
    id SERIAL PRIMARY KEY,
    file INTEGER NOT NULL REFERENCES files ON DELETE CASCADE,
    name TEXT
);

CREATE INDEX adventure_node_pictures_file ON adventure_node_pictures(file);

ALTER TABLE course_nodes ADD COLUMN picture INTEGER REFERENCES adventure_node_pictures ON DELETE SET NULL;