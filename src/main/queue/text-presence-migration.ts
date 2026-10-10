// ECMAScript String.trim whitespace; BLOB length preserves embedded NUL as nonblank.
const present =
  'length(CAST(trim(text,char(9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279)) AS BLOB))>0';

export const queueTextPresenceMigration = `
ALTER TABLE queue_items ADD COLUMN hasText INTEGER NOT NULL DEFAULT 0;
UPDATE queue_items SET hasText=${present};
CREATE TRIGGER queue_text_insert AFTER INSERT ON queue_items BEGIN
  UPDATE queue_items SET hasText=${present} WHERE id=NEW.id;
END;
CREATE TRIGGER queue_text_update AFTER UPDATE OF text ON queue_items BEGIN
  UPDATE queue_items SET hasText=${present} WHERE id=NEW.id;
END;`;
