/** POST /api/artist-applications — sanatçı başvurusu oluşturma (Şartname 12, 23) */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApplication } from "@/features/applications/service";
import { requireUser } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/env";

const schema = z.object({
  stage_name: z.string().min(2).max(80),
  legal_name: z.string().min(2).max(160),
  contact_email: z.string().email(),
  phone_optional: z.string().max(40).optional(),
  artist_description: z.string().min(20).max(4000),
  official_social_links: z.array(z.string().url()).max(10).default([]),
  distribution_links: z.array(z.string().url()).max(10).default([]),
  label_name_optional: z.string().max(120).optional(),
  applicant_relationship: z.enum(["artist", "manager", "label", "team_member"]),
  rights_declaration: z.boolean(),
  additional_notes: z.string().max(2000).optional(),
  identity_document_path: z.string().max(500).optional(),
  voice_declaration_path: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.profile.email_verified) throw new ApiError(ErrorCodes.EMAIL_NOT_VERIFIED);
    if (!checkRateLimit("artist_application", user.id)) {
      throw new ApiError(ErrorCodes.RATE_LIMITED);
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, fieldErrors);
    }
    if (!isDemoMode()) {
      const evidenceErrors: Record<string, string> = {};
      if (!parsed.data.identity_document_path) {
        evidenceErrors.identity_document_path = "Kimlik fotoğrafı gerekli.";
      }
      if (!parsed.data.voice_declaration_path) {
        evidenceErrors.voice_declaration_path = "Sesli beyan gerekli.";
      }
      if (Object.keys(evidenceErrors).length > 0) {
        throw new ApiError(ErrorCodes.VALIDATION_FAILED, evidenceErrors);
      }
    }

    const expectedPaths = [
      [parsed.data.identity_document_path, `${user.id}/identity-`],
      [parsed.data.voice_declaration_path, `${user.id}/voice-`],
    ] as const;
    for (const [path, prefix] of expectedPaths) {
      if (path && (!path.startsWith(prefix) || path.includes(".."))) {
        throw new ApiError(ErrorCodes.PERMISSION_DENIED);
      }
    }
    const app = await createApplication(parsed.data, user);
    return NextResponse.json(apiSuccess({ id: app.id, status: app.status }), { status: 201 });
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
