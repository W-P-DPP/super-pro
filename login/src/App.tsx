import { SuggestionCollector } from '@super-pro/shared-ui'
import { submitSuggestion } from '@/api/modules/todo-suggestion'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  return (
    <>
      <LoginPage />
      <SuggestionCollector sourceApp="login" onSubmit={submitSuggestion} />
    </>
  )
}
