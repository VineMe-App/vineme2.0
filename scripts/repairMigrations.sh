#!/bin/bash
# loop through migrations-applied (?)
# move to migrations
# Fix formatting for \n
# apply migration
for file in supabase/migrations/*.sql; do
  perl -i -pe 's/\\n/\n/g' "$file"
  result=$(basename "$file" | cut -d'_' -f1)
  supabase migration repair --status applied $result
done
