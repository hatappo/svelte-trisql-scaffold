INSERT INTO users (
  id,
  email,
  name,
  status,
  created_at
)
VALUES (
  /*$inserts.id default-to */DEFAULT,
  /*$inserts.email*/'sample',
  /*$inserts.name default-to */DEFAULT,
  /*$inserts.status default-to */DEFAULT,
  /*$inserts.created_at default-to */DEFAULT
)
ON CONFLICT (email)
/*%if updates */
DO UPDATE SET
/*%for item in updates separating , */
  /*!item.name*/name = /*$item.value*/'sample'
/*%end */
/*%else => DO NOTHING */
/*%end */
RETURNING *
