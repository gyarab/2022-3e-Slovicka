ALTER TABLE course_nodes
    DROP CONSTRAINT course_nodes_course_fkey,
    ADD CONSTRAINT course_nodes_course_fkey
    FOREIGN KEY(course) REFERENCES courses(id)
    ON DELETE CASCADE;

ALTER TABLE word_groups
    DROP CONSTRAINT word_groups_course_node_fkey,
    DROP CONSTRAINT word_groups_course_node_fkey1,
    ADD CONSTRAINT word_groups_course_node_fkey
        FOREIGN KEY(course_node) REFERENCES course_nodes(id) ON DELETE CASCADE;