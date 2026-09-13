export const WORKSPACE_BUCKET = "workspace-files";

/** File types accepted for workspace uploads (PROJECT.md V1). */
const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt"];

function sanitizeFilename(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "file").slice(0, 100);
}

/**
 * Uploads a file to the private workspace bucket under the signed-in user's
 * own folder and returns the storage path. Ownership is enforced by the
 * storage.objects RLS policy (first path segment must equal auth.uid()).
 *
 * The browser Supabase client is imported lazily so that server code can
 * safely import WORKSPACE_BUCKET from this module.
 */
export async function uploadWorkspaceFile(
  file: File,
  entity: "materials" | "assignments"
): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("Unsupported file type. Allowed: PDF, DOCX, TXT.");
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be signed in to upload files.");
  }

  const path = `${user.id}/${entity}/${crypto.randomUUID()}/${sanitizeFilename(file.name)}`;
  const { error } = await supabase
    .storage.from(WORKSPACE_BUCKET)
    .upload(path, file);

  if (error) {
    throw new Error("File upload failed. Please try again.");
  }
  return path;
}
