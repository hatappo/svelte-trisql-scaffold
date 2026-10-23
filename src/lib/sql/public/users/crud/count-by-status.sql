SELECT count(*)::int AS count FROM users
WHERE status = /*$status*/'active'
