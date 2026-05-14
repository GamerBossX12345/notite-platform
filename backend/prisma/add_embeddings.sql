-- Rulează o singură dată: psql <CONNECTION_STRING> -f add_embeddings.sql

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Note"
  ADD COLUMN IF NOT EXISTS embedding vector(384);
