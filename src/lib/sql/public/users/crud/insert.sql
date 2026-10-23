INSERT INTO users (
  id,
  email,
  name,
  status,
  created_at
)
VALUES (
  /*$id default-to */DEFAULT,
  /*$email*/'sample',
  /*$name default-to */DEFAULT,
  /*$status default-to */DEFAULT,
  /*$created_at default-to */DEFAULT
)
RETURNING *
