/**
 * Sanatçı başvuru servisi (kullanıcı tarafı) — Şartname 4.3, 12
 */

import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes } from "@/lib/errors";
import { getFeatureFlags } from "@/features/moderation/service";
import type { ArtistApplication, SessionUser } from "@/types";

export interface ApplicationInput {
  stage_name: string;
  legal_name: string;
  city: string;
  contact_email: string;
  phone_optional?: string;
  artist_description: string;
  official_social_links: string[];
  distribution_links: string[];
  label_name_optional?: string;
  applicant_relationship: "artist" | "manager" | "label" | "team_member";
  rights_declaration: boolean;
  additional_notes?: string;
  /** /api/verification/upload ile yüklenen özel bucket yolları */
  identity_document_path?: string;
  voice_declaration_path?: string;
}

export async function getMyApplications(viewer: SessionUser): Promise<ArtistApplication[]> {
  if (isDemoMode()) {
    return demoState().applications.filter((a) => a.user_id === viewer.id);
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("artist_applications")
    .select("*")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as ArtistApplication[];
}

export async function createApplication(
  input: ApplicationInput,
  viewer: SessionUser
): Promise<ArtistApplication> {
  const flags = await getFeatureFlags();
  if (!flags.artist_applications_enabled) {
    throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
      "Sanatçı başvuruları şu anda kapalı.");
  }
  if (!input.rights_declaration) {
    throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
      rights_declaration: "Hak beyanını onaylamalısın.",
    });
  }

  if (isDemoMode()) {
    const s = demoState();
    const nowIso = new Date().toISOString();
    const app: ArtistApplication = {
      id: `app-${Date.now()}`,
      user_id: viewer.id,
      stage_name: input.stage_name,
      legal_name: input.legal_name,
      city: input.city,
      contact_email: input.contact_email,
      phone_optional: input.phone_optional ?? null,
      artist_description: input.artist_description,
      official_social_links: input.official_social_links,
      distribution_links: input.distribution_links,
      label_name_optional: input.label_name_optional ?? null,
      applicant_relationship: input.applicant_relationship,
      identity_document_path: input.identity_document_path ?? null,
      authorization_document_path: null,
      voice_declaration_path: input.voice_declaration_path ?? null,
      identity_viewed_at: null,
      identity_viewed_by: null,
      rights_declaration: input.rights_declaration,
      additional_notes: input.additional_notes ?? null,
      status: "submitted",
      review_note: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    s.applications.unshift(app);
    return app;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("artist_applications")
    .insert({ ...input, user_id: viewer.id, status: "submitted" })
    .select()
    .single();
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  return data as ArtistApplication;
}

export async function withdrawApplication(
  applicationId: string,
  viewer: SessionUser
): Promise<void> {
  if (isDemoMode()) {
    const app = demoState().applications.find(
      (a) => a.id === applicationId && a.user_id === viewer.id
    );
    if (!app) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    if (app.status === "approved") throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    app.status = "withdrawn";
    app.updated_at = new Date().toISOString();
    return;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("artist_applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("user_id", viewer.id)
    .neq("status", "approved");
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
}
