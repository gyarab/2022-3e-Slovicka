CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "user" INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

CREATE INDEX folders_user ON folders("user");

CREATE TABLE course_folders (
   folder INTEGER NOT NULL REFERENCES folders ON DELETE CASCADE,
   course INTEGER NOT NULL REFERENCES courses ON DELETE CASCADE,

    UNIQUE (folder, course)
);

CREATE INDEX course_folders_folder ON course_folders(folder);
CREATE INDEX course_folders_course ON course_folders(course);

CREATE FUNCTION updateCourseVisibilityInFolders() RETURNS TRIGGER
    LANGUAGE plpgsql
as
$$
DECLARE
BEGIN
    IF NEW.visible_to <> OLD.visible_to AND NEW.visible_to = 'ME' THEN
        DELETE FROM course_folders AS cf
            USING folders f
            WHERE f.id = cf.folder AND cf.course = NEW.id AND f."user" <> NEW.owner;
    END IF;
    return NEW;
END
$$;

CREATE TRIGGER update_course_visibility_in_folders
    AFTER UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION updateCourseVisibilityInFolders();