import { mapToUser } from "./auth-service";
import { supabase } from "./supabase";
import type { AppUserRecord, PdfCatalogMetadata, PdfCatalogMetadataRow } from "./types";

const TABLE_NAME = "pdf_catalog_metadata";

type CatalogMetadataRowWithUser = PdfCatalogMetadataRow & {
  user?: AppUserRecord | null;
};

export async function fetchLatestCatalogMetadata(): Promise<PdfCatalogMetadata | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(
      `
        id,
        created_at,
        user_id,
        link,
        user:app_users (
          id,
          email,
          full_name,
          role,
          is_active,
          created_at,
          updated_at
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if ("code" in error && error.code === "PGRST116") {
      return null;
    }

    throw new Error(`Failed to fetch catalog metadata: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as CatalogMetadataRowWithUser;

  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id ?? null,
    link: row.link ?? null,
    user: row.user ? mapToUser(row.user) : null
  };
}
