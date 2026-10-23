INSERT INTO posts (
  id,
  user_id,
  title,
  body,
  published,
  created_at
)
VALUES
/*%for row in rows separating , */
(
  /*$row.id default-to */DEFAULT,
  /*$row.user_id*/1,
  /*$row.title*/'sample',
  /*$row.body default-to */DEFAULT,
  /*$row.published default-to */DEFAULT,
  /*$row.created_at default-to */DEFAULT
)
/*%end */
RETURNING *
