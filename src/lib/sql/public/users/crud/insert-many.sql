INSERT INTO users (
  id,
  email,
  name,
  status,
  created_at
)
VALUES
/*%for row in rows separating , */
(
  /*$row.id default-to */DEFAULT,
  /*$row.email*/'sample',
  /*$row.name default-to */DEFAULT,
  /*$row.status default-to */DEFAULT,
  /*$row.created_at default-to */DEFAULT
)
/*%end */
RETURNING *
