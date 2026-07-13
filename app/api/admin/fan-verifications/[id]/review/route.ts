import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewFanVerification } from "@/features/fan-art/service";
import { requireRole } from "@/lib/auth/session";
import { apiFailure, apiSuccess, ApiError, ErrorCodes } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).default(""),
}).superRefine((value, ctx) => {
  if (value.status === "rejected" && !value.note.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["note"], message: "Ret gerekçesi gerekli." });
  }
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin");
    if (!checkRateLimit("admin_action", user.id)) throw new ApiError(ErrorCodes.RATE_LIMITED);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(ErrorCodes.VALIDATION_FAILED, { note: parsed.error.issues[0]?.message ?? "Geçersiz karar." });
    const result = await reviewFanVerification((await params).id, parsed.data.status, parsed.data.note.trim(), user);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    const { body, status } = apiFailure(error);
    return NextResponse.json(body, { status });
  }
}
