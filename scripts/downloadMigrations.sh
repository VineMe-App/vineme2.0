
#!/usr/bin/env bash

PROJECT_REF="knwlfuysipixbwuzvyen"
PAT=""
OUTPUT_DIR="supabase/migrations"

mkdir -p "$OUTPUT_DIR"

echo "Fetching migrations..."

MIGRATION_VERSIONS=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${PAT}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"}')

echo $MIGRATION_VERSIONS | jq -c -r '.[].version' | while IFS= read -r version; do
    migration_info=$(curl -s --compressed \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/migrations/$version" \
  -H "Authorization: Bearer ${PAT}" \
  -H "Content-Type: application/json")
    name=$(printf '%s' "$migration_info" | jq -r '.name')
    echo "Parsing $name..."
    filename="${OUTPUT_DIR}/${version}_${name}.sql"
    statements=$(printf '%s' "$migration_info" | jq -r '.statements')
    if [ "$statements" = "null" ] || [ "$statements" = "[]" ]; then
      echo "Skipping $filename (no statements)"
      continue
    fi

    echo "Writing $filename..."

    printf '%s' "$migration_info" \
      | jq -r '.statements[]' \
      > "$filename"
    echo "Written $filename"
  done

echo "Done."
