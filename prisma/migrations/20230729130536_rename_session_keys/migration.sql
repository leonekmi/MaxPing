UPDATE "GrammYSession"
SET "key" = 'chat/conversation/' || "key"
WHERE KEY NOT LIKE '%/%';