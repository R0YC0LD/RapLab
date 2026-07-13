import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes, newRequestId } from "@/lib/errors";
import { VERIFICATION_DOCS_BUCKET } from "@/lib/storage";

const schema = z.object({ kind: z.enum(["sample", "voice"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("moderator");
    if (isDemoMode()) throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined, "Demo doğrulama medyası bulunmaz.");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    const id = (await params).id;
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("fan_verifications")
      .select("sample_art_path, voice_declaration_path")
      .eq("id", id)
      .single();
    const path = parsed.data.kind === "sample" ? data?.sample_art_path : data?.voice_declaration_path;
    if (!path) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    const { data: signed, error } = await admin.storage.from(VERIFICATION_DOCS_BUCKET).createSignedUrl(path, 120);
    if (error || !signed) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
    await admin.rpc("write_audit_log", {
      p_actor_id: user.id,
      p_action: `fan_verification.${parsed.data.kind}_viewed`,
      p_target_type: "fan_verification",
      p_target_id: id,
      p_previous: null,
      p_new: { kind: parsed.data.kind, ttl_seconds: 120 },
      p_request_id: newRequestId(),
    });
    return NextResponse.json(apiSuccess({ url: signed.signedUrl, expires_in: 120, kind: parsed.data.kind }));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
