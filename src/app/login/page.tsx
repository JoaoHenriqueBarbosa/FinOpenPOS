"use client";

import { signupAction, loginAction } from "./actions";
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/y71wwxpKfsO
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useFormState } from "react-dom";

export default function LoginPage() {
  const [loginState, loginFormAction] = useFormState(loginAction, null);
  const [signupState, signupFormAction] = useFormState(signupAction, null);

  const error = loginState?.error || signupState?.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <Image
            src="/PCP-logo.png"
            alt="PCP Logo"
            width={120}
            height={120}
            className="object-contain"
          />
          <h2 className="text-2xl font-bold">Bienvenido</h2>
          <p className="text-muted-foreground">
            Ingresa tu email y contraseña para iniciar sesión.
          </p>
        </div>
        <Card>
          <form>
            <CardContent className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" name="email"  type="email" placeholder="nombre@ejemplo.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password"  type="password" />
              </div>
              {error && (
                <div className="text-sm text-red-500 mt-2 font-medium">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button formAction={loginFormAction} type="submit">
                Iniciar sesión
              </Button>
              <Button formAction={signupFormAction} type="submit">
                Registrarse
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
