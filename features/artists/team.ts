/**
 * Ekip yönetimi — Şartname 13.8, 4.5
 */

import { getMembership } from "@/features/artists/service";
import { demoState, writeAudit } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import { ApiError, ErrorCodes, newRequestId } from "@/lib/errors";
import { DEFAULT_ROLE_PERMISSIONS, memberHasPermission } from "@/lib/permissions";
import type { ArtistMember, ArtistMemberRole, SessionUser, TeamPermission } from "@/types";

export async function listTeam(artistId: string, viewer: SessionUser): Promise<ArtistMember[]> {
  const membership = await getMembership(artistId, viewer.id);
  const isStaff = viewer.profile.role === "admin" || viewer.profile.role === "super_admin";
  if (!membership && !isStaff) throw new ApiError(ErrorCodes.PERMISSION_DENIED);

  if (isDemoMode()) {
    return demoState().members.filter((m) => m.artist_id === artistId && m.status !== "revoked");
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("artist_members")
    .select("*")
    .eq("artist_id", artistId)
    .neq("status", "revoked");
  return (data ?? []) as ArtistMember[];
}

export async function inviteMember(
  params: {
    artist_id: string;
    invite_email: string;
    member_role: ArtistMemberRole;
    permissions?: TeamPermission[];
  },
  viewer: SessionUser
): Promise<ArtistMember> {
  const membership = await getMembership(params.artist_id, viewer.id);
  if (!memberHasPermission(membership, "manage_team") && viewer.profile.role !== "super_admin") {
    throw new ApiError(ErrorCodes.PERMISSION_DENIED);
  }
  if (params.member_role === "owner") {
    throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
      member_role: "Sahiplik daveti gönderilemez; sahiplik transferi Control Center'dan yönetilir.",
    });
  }

  const permissions = params.permissions ?? DEFAULT_ROLE_PERMISSIONS[params.member_role] ?? [];

  if (isDemoMode()) {
    const s = demoState();
    const invited = s.profiles.find(
      (p) => `${p.username}@demo.raplab.local` === params.invite_email
    );
    const nowIso = new Date().toISOString();
    const member: ArtistMember = {
      id: `m-${Date.now()}`,
      artist_id: params.artist_id,
      user_id: invited?.id ?? `davet:${params.invite_email}`,
      member_role: params.member_role,
      permissions,
      status: "invited",
      invited_by: viewer.id,
      accepted_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    s.members.push(member);
    writeAudit({
      actor_user_id: viewer.id,
      actor_role: viewer.profile.role,
      action: "artist_team.invited",
      target_type: "artist_member",
      target_id: member.id,
      new_data: { member_role: params.member_role, email: params.invite_email },
      request_id: newRequestId(),
    });
    return member;
  }

  const supabase = await createSupabaseServerClient();
  const { data: invitedProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", params.invite_email.split("@")[0])
    .maybeSingle();
  if (!invitedProfile) {
    throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
      invite_email: "Bu e-postaya bağlı RapLab TR hesabı bulunamadı.",
    });
  }
  const { data, error } = await supabase
    .from("artist_members")
    .insert({
      artist_id: params.artist_id,
      user_id: invitedProfile.id,
      member_role: params.member_role,
      permissions,
      status: "invited",
      invited_by: viewer.id,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, {
        invite_email: "Bu kullanıcı zaten ekipte.",
      });
    }
    throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
  }
  return data as ArtistMember;
}

export async function acceptInvite(membershipId: string, viewer: SessionUser): Promise<void> {
  if (isDemoMode()) {
    const member = demoState().members.find(
      (m) => m.id === membershipId && m.user_id === viewer.id && m.status === "invited"
    );
    if (!member) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    member.status = "active";
    member.accepted_at = new Date().toISOString();
    return;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("artist_members")
    .update({ status: "active", accepted_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("user_id", viewer.id)
    .eq("status", "invited");
  if (error) throw new ApiError(ErrorCodes.UNKNOWN_ERROR);
}

export async function removeMember(membershipId: string, viewer: SessionUser): Promise<void> {
  if (isDemoMode()) {
    const s = demoState();
    const member = s.members.find((m) => m.id === membershipId);
    if (!member) throw new ApiError(ErrorCodes.POST_NOT_FOUND);
    if (member.member_role === "owner") {
      throw new ApiError(ErrorCodes.VALIDATION_FAILED, { member: "Sahip ekipten çıkarılamaz." });
    }
    const actorMembership = await getMembership(member.artist_id, viewer.id);
    if (
      !memberHasPermission(actorMembership, "manage_team") &&
      member.user_id !== viewer.id &&
      viewer.profile.role !== "super_admin"
    ) {
      throw new ApiError(ErrorCodes.PERMISSION_DENIED);
    }
    member.status = "revoked";
    member.updated_at = new Date().toISOString();
    return;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("artist_members")
    .update({ status: "revoked" })
    .eq("id", membershipId)
    .neq("member_role", "owner");
  if (error) throw new ApiError(ErrorCodes.PERMISSION_DENIED);
}
