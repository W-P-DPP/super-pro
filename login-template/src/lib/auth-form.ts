export type AuthMode = 'login' | 'register'

export type LoginFormState = {
  username: string
  password: string
}

export type RegisterFormState = {
  username: string
  password: string
  confirmPassword: string
}

export type AuthFormErrors = Partial<
  Record<'username' | 'password' | 'confirmPassword', string>
>

export function validateLoginForm(values: LoginFormState): AuthFormErrors {
  const errors: AuthFormErrors = {}

  if (!values.username.trim()) {
    errors.username = '请输入账号'
  }

  if (!values.password) {
    errors.password = '请输入密码'
  }

  return errors
}

export function validateRegisterForm(values: RegisterFormState): AuthFormErrors {
  const errors: AuthFormErrors = {}

  if (!values.username.trim()) {
    errors.username = '请输入账号'
  }

  if (!values.password) {
    errors.password = '请输入密码'
  } else if (values.password.length < 6) {
    errors.password = '密码至少需要 6 位'
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = '请再次输入密码'
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = '两次输入的密码不一致'
  }

  return errors
}
