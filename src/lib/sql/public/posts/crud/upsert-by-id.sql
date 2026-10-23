INSERT INTO posts (
  id,
  user_id,
  title,
  body,
  published,
  created_at
)
VALUES (
  /*$inserts.id*/1,
  /*$inserts.user_id*/1,
  /*$inserts.title*/'sample',
  /*$inserts.body default-to */DEFAULT,
  /*$inserts.published default-to */DEFAULT,
  /*$inserts.created_at default-to */DEFAULT
)
ON CONFLICT (id)
/*%if updates */
DO UPDATE SET
/*%for item in updates separating , */
  /*!item.name*/user_id = /*$item.value*/1
/*%end */
/*%else => DO NOTHING */
/*%end */
RETURNING *
