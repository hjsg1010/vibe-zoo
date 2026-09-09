-- Published snapshots outlive the publisher's personal demo data.
-- Rebuild the child relationship in the same transaction, preserving every row.
CREATE TEMP TABLE installations_copy AS SELECT * FROM installations;
DROP TABLE installations;
CREATE TABLE publications_preserved(id TEXT PRIMARY KEY, owner TEXT NOT NULL, version_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(owner,version_id));
INSERT INTO publications_preserved SELECT * FROM publications;
DROP TABLE publications;
ALTER TABLE publications_preserved RENAME TO publications;
CREATE TABLE installations(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES actors(id) ON DELETE CASCADE, publication_id TEXT NOT NULL REFERENCES publications(id), data TEXT NOT NULL, UNIQUE(owner,publication_id));
INSERT INTO installations SELECT * FROM installations_copy;
DROP TABLE installations_copy;
