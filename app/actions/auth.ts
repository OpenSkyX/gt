"use server";

import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { generateUniqueInviteCode } from "@/lib/invite-code";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type AuthedUser = {
  userId: string;
  phone: string;
  userName: string;
  inviteCode: string;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// 测试期间不对接真实短信验证码，仅做格式校验
function validatePhoneAndCode(phone: string, code: string): string | null {
  if (!/^1\d{10}$/.test(phone)) return "请输入正确的手机号";
  if (!code) return "请输入验证码";
  return null;
}

export async function registerAction(
  phone: string,
  code: string,
  inviteCode?: string
): Promise<ActionResult<AuthedUser>> {
  const normalizedPhone = normalizePhone(phone);
  const validationError = validatePhoneAndCode(normalizedPhone, code);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const existing = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });
  if (existing) {
    return { success: false, error: "该手机号已注册，请直接登录" };
  }

  const trimmedInviteCode = inviteCode?.trim().toUpperCase() || undefined;
  let inviter: { id: string } | null = null;
  if (trimmedInviteCode) {
    inviter = await prisma.user.findUnique({
      where: { inviteCode: trimmedInviteCode },
      select: { id: true },
    });
    if (!inviter) {
      return { success: false, error: "邀请码不存在，请检查后重试" };
    }
  }

  const newInviteCode = await generateUniqueInviteCode();

  const user = await prisma.user.create({
    data: {
      phone: normalizedPhone,
      userName: `用户${normalizedPhone.slice(-4)}`,
      inviteCode: newInviteCode,
      ...(inviter && {
        invitationReceived: {
          create: {
            inviterId: inviter.id,
            inviteCode: trimmedInviteCode!,
          },
        },
      }),
    },
  });

  await createSession(user.id);

  return {
    success: true,
    data: {
      userId: user.id,
      phone: user.phone,
      userName: user.userName,
      inviteCode: user.inviteCode,
    },
  };
}

export async function loginAction(
  phone: string,
  code: string
): Promise<ActionResult<AuthedUser>> {
  const normalizedPhone = normalizePhone(phone);
  const validationError = validatePhoneAndCode(normalizedPhone, code);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });
  if (!user) {
    return { success: false, error: "该手机号尚未注册，请先注册" };
  }

  await createSession(user.id);

  return {
    success: true,
    data: {
      userId: user.id,
      phone: user.phone,
      userName: user.userName,
      inviteCode: user.inviteCode,
    },
  };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
}
