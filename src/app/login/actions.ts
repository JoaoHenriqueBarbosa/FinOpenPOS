'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Función para traducir mensajes de error de Supabase al español
function translateError(errorMessage: string): string {
  const errorTranslations: { [key: string]: string } = {
    'Invalid login credentials': 'Credenciales de inicio de sesión inválidas',
    'Email not confirmed': 'Email no confirmado',
    'User already registered': 'Usuario ya registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Invalid email': 'Email inválido',
    'Email rate limit exceeded': 'Límite de intentos de email excedido',
    'Signup is disabled': 'El registro está deshabilitado',
    'User not found': 'Usuario no encontrado',
    'Invalid password': 'Contraseña inválida',
    'Too many requests': 'Demasiados intentos. Por favor intenta más tarde',
    'Email address is already registered': 'Este email ya está registrado',
    'Password does not match the criteria': 'La contraseña no cumple con los criterios requeridos',
  }

  // Buscar traducción exacta
  if (errorTranslations[errorMessage]) {
    return errorTranslations[errorMessage]
  }

  // Buscar traducción parcial (para mensajes que contengan estas frases)
  for (const [key, translation] of Object.entries(errorTranslations)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation
    }
  }

  // Si no hay traducción, devolver el mensaje original
  return errorMessage
}

export async function login(prevState: any, formData: FormData) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: translateError(error.message) }
  }

  revalidatePath('/admin', 'layout')
  redirect('/admin')
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: translateError(error.message) }
  }

  revalidatePath('/admin', 'layout')
  redirect('/admin')
}

// Wrapper actions for useFormState compatibility
export async function loginAction(prevState: any, formData: FormData) {
  return await login(prevState, formData)
}

export async function signupAction(prevState: any, formData: FormData) {
  return await signup(prevState, formData)
}

export async function logout() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.log(error)
    redirect('/error')
  }
  
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function generateExampleData(user_uid: string) {
  const supabase = createClient()
}