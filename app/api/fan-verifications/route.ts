/** POST /api/fan-verifications - özel örnek görsel + ses beyanıyla fan başvurusu. */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { extensionForMime, VERIFICATION_DOCS_BUCKET } from "@/lib/storage";
import { AUDIO_MIME_TYPES, IMAGE_MAX_BYTES, IMAGE_MIME_TYPES } from "@/lib/validation";

const schema = z.object({
  artist_id: z.string().uuid(),
  art_created_on: z.string().date(),
  ownership_declaration: z.literal("true"),
});
const VOICE_MAX_BYTES = 10 * 1024 * 1024;
const VOICE_TYPES = new Set([...AUDIO_MIME_TYPES, "audio/webm", "audio/webm;codecs=opus"].map((type) => type.split(";")[0]));

export async function POST(req: NextRequest) {
  const uploadedPaths: string[] = [];
  try {
    const user = await requireUser();
    if (!user.profile.email_verified) throw new ApiError(ErrorCodes.EMAIL_NOT_VERIFIED);
    if (!checkRateLimit("artist_application", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    if (isDemoMode()) throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE, undefined, "Demo modunda fan doğrulama medyası yüklenmez.");

    const form = await req.formData();
    const parsed = schema.safeParse({
      artist_id: String(form.get("artist_id") ?? ""),
      art_created_on: String(form.get("art_created_on") ?? ""),
      ownership_declaration: String(form.get("ownership_declaration") ?? ""),
    });
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED);
    if (new Date(`${parsed.data.art_created_on}T23:59:59Z`).getTime() > Date.now()) {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, { art_created_on: "Çizim tarihi gelecekte olamaz." });
    }

    const sample = form.get("sample_art");
    const voice = form.get("voice");
    if (!(sample instanceof File)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { sample_art: "Örnek görsel gerekli." });
    if (!(voice instanceof File)) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { voice: "Sesli beyan gerekli." });
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(sample.type) || sample.size <= 0) {
      throw new ApiError(ErrorCodes.INVALID_MEDIA, { sample_art: "JPEG, PNG, WebP veya AVIF görseli yükle." });
    }
    if (sample.size > IMAGE_MAX_BYTES) throw new ApiError(ErrorCodes.FILE_TOO_LARGE, { sample_art: "Görsel en fazla 12 MB olabilir." });
    const voiceBaseType = voice.type.split(";")[0];
    if (!VOICE_TYPES.has(voiceBaseType) || voice.size <= 0) {
      throw new ApiError(ErrorCodes.INVALID_MEDIA, { voice: "Ses kaydı formatı desteklenmiyor." });
    }
    if (voice.size > VOICE_MAX_BYTES) throw new ApiError(ErrorCodes.FILE_TOO_LARGE, { voice: "Ses kaydı en fazla 10 MB olabilir." });

    const admin = createSupabaseAdminClient();
    const [{ data: artist }, { data: existing, error: existingError }] = await Promise.all([
      admin.from("artists").select("id").eq("id", parsed.data.artist_id).eq("profile_status", "active").eq("verification_status", "approved").maybeSingle(),
      admin.from("fan_verifications").select("status, sample_art_path, voice_declaration_path").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!artist) throw new ApiError(ErrorCodes.POST_NOT_FOUND, undefined, "Seçilen sanatçı bulunamadı.");
    if (existingError && existingError.code !== "PGRST116") throw new ApiError(ErrorCodes.SERVICE_UNAVAILABLE);
    if (existing?.status === "approved") throw new ApiError(ErrorCodes.VALIDATION_FAILED, undefined, "Fan hesabın zaten onaylı.");
    if (existing?.status === "pending") throw new ApiError(ErrorCodes.VALIDATION_FAILED, undefined, "Fan doğrulaman zaten inceleniyor.");

    const samplePath = `${user.id}/fan-sample-${globalThis.crypto.randomUUID()}.${extensionForMime(sample.type, "jpg")}`;
    const voicePath = `${user.id}/fan-voice-${globalThis.crypto.randomUUID()}.${extensionForMime(voiceBaseType, "webm")}`;
    const sampleUpload = await admin.storage.from(VERIFICATION_DOCS_BUCKET).upload(
      samplePath,
      new Uint8Array(await sample.arrayBuffer()),
      { contentType: sample.type, upsert: false }
    );
    if (sampleUpload.error) throw new ApiError(ErrorCodes.UPLOAD_FAILED);
    uploadedPaths.push(samplePath);
    const voiceUpload = await admin.storage.from(VERIFICATION_DOCS_BUCKET).upload(
      voicePath,
      new Uint8Array(await voice.arrayBuffer()),
      { contentType: voice.type, upsert: false }
    );
    if (voiceUpload.error) throw new ApiError(ErrorCodes.UPLOAD_FAILED);
    uploadedPaths.push(voicePath);

    const { data, error } = await admin.from("fan_verifications").upsert({
      user_id: user.id,
      related_artist_id: parsed.data.artist_id,
      sample_art_path: samplePath,
      voice_declaration_path: voicePath,
      art_created_on: parsed.data.art_created_on,
      ownership_declaration: true,
      status: "pending",
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
    }, { onConflict: "user_id" }).select("id, status").single();
    if (error || !data) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);

    const oldPaths = [existing?.sample_art_path, existing?.voice_declaration_path]
      .filter((path): path is string => Boolean(path));
    if (oldPaths.length) await admin.storage.from(VERIFICATION_DOCS_BUCKET).remove(oldPaths);
    uploadedPaths.length = 0;
    return NextResponse.json(apiSuccess(data));
  } catch (error) {
    if (uploadedPaths.length && !isDemoMode()) {
      await createSupabaseAdminClient().storage.from(VERIFICATION_DOCS_BUCKET).remove(uploadedPaths);
    }
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
