ALTER TABLE word_state DROP CONSTRAINT word_group_user_unique;

create or replace function validateWordStateUpdate() returns trigger
    language plpgsql
as
$$
DECLARE
    word_known_count INTEGER;
    course_node_completion INTEGER;
    node INTEGER;
BEGIN
    IF NEW.state = 'known' THEN
        SELECT course_node INTO node FROM word_groups WHERE word_groups.id = NEW.word_group;

        SELECT course_node_state.number_of_completion INTO course_node_completion
            FROM course_node_state
                INNER JOIN course_nodes cn on cn.id = course_node_state.course_nodes
            WHERE cn.id = node AND course_node_state."user" = NEW."user";

        SELECT COUNT(*) INTO word_known_count
            FROM word_state
                 INNER JOIN word_groups wg on wg.id = word_state.word_group
                 INNER JOIN course_nodes cn on cn.id = wg.course_node and cn.id = wg.course_node
            WHERE "user" = NEW."user" AND cn.id = node AND word_group = NEW.word_group;

        IF word_known_count > course_node_completion THEN
            RAISE EXCEPTION 'Cannot set word is known repeatedly';
        END IF;
    END IF;

    return NEW;
END
$$;

CREATE TRIGGER validate_word_state_update
    BEFORE INSERT OR UPDATE ON word_state
    FOR EACH ROW EXECUTE FUNCTION validateWordStateUpdate();