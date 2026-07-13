/**
 * POST /api/admin/verification/{id}/view — doğrulama medyası görüntüleme
 * body: { kind: "identity" | "voice" }
 *
 * KİMLİK BELGESİ (identity):
 * - Yalnızca SÜPER YÖNETİCİ açabilir.
 * - Yalnızca BİR KEZ: ilk açılışta identity_viewed_at/by işaretlenir,
 *   sonraki denemeler reddedilir (veritabanı seviyesinde atomik).
 * - 60 saniyelik süreli imzalı bağlantı üretilir; erişim audit log'a yazılır.
 *
 * SES BEYANI (voice): süper yönetici dinleyebilir (tekrar dinlenebilir);
 * her erişim audit log'a yazılır.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes, newRequestId } from "@/lib/errors";
import { VERIFICATION_DOCS_BUCKET } from "@/lib/storage";

const schema = z.object({ kind: z.enum(["identity", "voice"]) });
const SIGNED_URL_TTL_SECONDS = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Kimlik ve ses beyanına yalnızca süper yönetici erişir (kullanıcı kararı)
    const user = await requireRole("super_admin");

    if (isDemoMode()) {
      throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined,
        "Demo modunda doğrulama belgesi bulunmaz.");
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    const kind = parsed.data.kind;

    const admin = createSupabaseAdminClient();
    const requestId = newRequestId();

    let storagePath: string | null = null;

    if (kind === "identity") {
      // Atomik tek seferlik kilit: yalnızca identity_viewed_at NULL iken işaretlenir.
      // Eşzamanlı ikinci istek 0 satır günceller ve reddedilir.
      const { data: claimed, error: claimError } = await admin
        .from("artist_applications")
        .update({ identity_viewed_at: new Date().toISOString(), identity_viewed_by: user.id })
        .eq("id", id)
        .is("identity_viewed_at", null)
        .not("identity_document_path", "is", null)
        .select("identity_document_path")
        .maybeSingle();

      if (claimError) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
      if (!claimed) {
        // Ya belge yok ya da daha önce görüntülendi — hangisi olduğunu söyle
        const { data: app } = await admin
          .from("artist_applications")
          .select("identity_document_path, identity_viewed_at, identity_viewed_by")
          .eq("id", id)
          .single();
        if (!app?.identity_document_path) {
          throw new ApiError(ErrorCodes.POST_NOT_FOUND, undefined, "Bu başvuruda kimlik belgesi yok.");
        }
        throw new ApiError(ErrorCodes.PERMISSION_DENIED, undefined,
          `Bu kimlik belgesi ${new Date(app.identity_viewed_at!).toLocaleString("tr-TR")} tarihinde bir kez görüntülendi ve erişim kapandı.`);
      }
      storagePath = claimed.identity_document_path;
    } else {
      const { data: app } = await admin
        .from("artist_applications")
        .select("voice_declaration_path")
        .eq("id", id)
        .single();
      if (!app?.voice_declaration_path) {
        throw new ApiError(ErrorCodes.POST_NOT_FOUND, undefined, "Bu başvuruda ses beyanı yok.");
      }
      storagePath = app.voice_declaration_path;
    }

    const { data: signed, error: signError } = await admin.storage
      .from(VERIFICATION_DOCS_BUCKET)
      .createSignedUrl(storagePath!, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

    // Her erişim audit log'a yazılır (13. Değişmez Kural)
    await admin.rpc("write_audit_log", {
      p_actor_id: user.id,
      p_action: kind === "identity" ? "verification.identity_viewed_once" : "verification.voice_played",
      p_target_type: "artist_application",
      p_target_id: id,
      p_previous: null,
      p_new: { kind, ttl_seconds: SIGNED_URL_TTL_SECONDS },
      p_request_id: requestId,
    });

    return NextResponse.json(
      apiSuccess({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS, kind })
    );
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
