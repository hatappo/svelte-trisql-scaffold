INSERT INTO posts (
  id,
  user_id,
  title,
  body,
  published,
  created_at
)
VALUES (
  /*$id default-to */DEFAULT,
  /*$user_id*/1,
  /*$title*/'sample',
  /*$body default-to */DEFAULT,
  /*$published default-to */DEFAULT,
  /*$created_at default-to */DEFAULT
)
RETURNING *
