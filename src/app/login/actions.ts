"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    redirect("/login?error=invalid-credentials");
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await auth.api.signUpEmail({
      body: { email, password, name: email.split("@")[0] },
      headers: await headers(),
    });
  } catch {
    redirect("/login?error=signup-failed");
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function logout() {
  await auth.api.signOut({
    headers: await headers(),
  });

  revalidatePath("/", "layout");
  redirect("/");
}
