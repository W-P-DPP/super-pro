import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { AuthApiError, loginUser, registerUser } from '@/lib/auth-client'
import { saveAuthSession } from '@/lib/auth-storage'
import {
  type AuthFormErrors,
  type AuthMode,
  type LoginFormState,
  type RegisterFormState,
  validateLoginForm,
  validateRegisterForm,
} from '@/lib/auth-form'

const initialLoginState: LoginFormState = {
  username: '',
  password: '',
}

const initialRegisterState: RegisterFormState = {
  username: '',
  password: '',
  confirmPassword: '',
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [loginForm, setLoginForm] = useState(initialLoginState)
  const [registerForm, setRegisterForm] = useState(initialRegisterState)
  const [errors, setErrors] = useState<AuthFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isLogin = mode === 'login'

  const updateLoginField =
    (key: keyof LoginFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setLoginForm((current) => ({
        ...current,
        [key]: event.target.value,
      }))

      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }))
      setFormError('')
      setSuccessMessage('')
    }

  const updateRegisterField =
    (key: keyof RegisterFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setRegisterForm((current) => ({
        ...current,
        [key]: event.target.value,
      }))

      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }))
      setFormError('')
      setSuccessMessage('')
    }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setErrors({})
    setFormError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = isLogin ? validateLoginForm(loginForm) : validateRegisterForm(registerForm)
    setErrors(nextErrors)
    setFormError('')
    setSuccessMessage('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      setSubmitting(true)

      if (isLogin) {
        const result = await loginUser({
          username: loginForm.username.trim(),
          password: loginForm.password,
        })

        saveAuthSession(result)
        setLoginForm((current) => ({
          ...current,
          password: '',
        }))
        setSuccessMessage('登录成功，已保存登录凭证')
        return
      }

      const result = await registerUser({
        username: registerForm.username.trim(),
        password: registerForm.password,
      })

      setSuccessMessage('注册成功，请使用新账号登录')
      setMode('login')
      setLoginForm({
        username: result.username,
        password: '',
      })
      setRegisterForm(initialRegisterState)
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFormError(error.message)
      } else {
        setFormError(isLogin ? '登录失败，请稍后重试' : '注册失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-8 text-foreground">
      <section className="w-full max-w-sm rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-7">
        <div className="mb-6 rounded-2xl bg-muted p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={[
                'h-11 rounded-xl text-sm font-medium transition',
                isLogin
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={[
                'h-11 rounded-xl text-sm font-medium transition',
                !isLogin
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              注册
            </button>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{isLogin ? '登录' : '注册'}</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? '请输入账号和密码' : '请填写账号并设置密码'}
          </p>
        </div>

        {formError ? (
          <div className="mb-5 rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground">
            {successMessage}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              账号
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={isLogin ? loginForm.username : registerForm.username}
              onChange={isLogin ? updateLoginField('username') : updateRegisterField('username')}
              aria-invalid={Boolean(errors.username)}
              placeholder="请输入账号"
              className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20"
            />
            {errors.username ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.username}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={isLogin ? loginForm.password : registerForm.password}
              onChange={isLogin ? updateLoginField('password') : updateRegisterField('password')}
              aria-invalid={Boolean(errors.password)}
              placeholder="请输入密码"
              className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20"
            />
            {errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          {!isLogin ? (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={registerForm.confirmPassword}
                onChange={updateRegisterField('confirmPassword')}
                aria-invalid={Boolean(errors.confirmPassword)}
                placeholder="请再次输入密码"
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20"
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? '提交中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
      </section>
    </main>
  )
}
