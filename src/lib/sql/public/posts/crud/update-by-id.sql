UPDATE posts
SET
/*%for item in updates separating , */
  /*!item.name*/user_id = /*$item.value*/1
/*%end */
WHERE id = /*$where.id*/1
RETURNING *
