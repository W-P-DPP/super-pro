import { create } from 'zustand'
import * as todoApi from '@/api/modules/todo'
import type { TodoItem, CreateTodoParams, UpdateTodoParams } from '@/api/modules/todo'
import { TodoStatus } from '@/api/modules/todo'

interface TodoState {
  todos: TodoItem[]
  loading: boolean
  error: string | null
  clearError: () => void
  fetchTodos: (status?: TodoStatus) => Promise<TodoItem[]>
  createTodo: (data: CreateTodoParams) => Promise<TodoItem | null>
  updateTodo: (id: number, data: UpdateTodoParams) => Promise<TodoItem | null>
  approveTodo: (id: number) => Promise<TodoItem | null>
  rejectTodo: (id: number) => Promise<TodoItem | null>
  completeTodo: (id: number) => Promise<TodoItem | null>
  cancelTodo: (id: number) => Promise<TodoItem | null>
  rollbackTodo: (id: number) => Promise<TodoItem | null>
  deleteTodo: (id: number) => Promise<boolean>
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  loading: false,
  error: null,

  clearError: () => {
    set({ error: null })
  },

  fetchTodos: async (status?: TodoStatus) => {
    set({ loading: true, error: null })
    try {
      const res = await todoApi.getTodoList(status)
      set({ todos: res ?? [], loading: false })
      return res ?? []
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载失败',
        loading: false,
      })
      return []
    }
  },

  createTodo: async (data) => {
    set({ error: null })
    try {
      const created = await todoApi.createTodo(data)
      if (created) {
        set((state) => ({ todos: [created, ...state.todos] }))
      }
      return created ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建失败' })
      return null
    }
  },

  updateTodo: async (id, data) => {
    set({ error: null })
    try {
      const updated = await todoApi.updateTodo(id, data)
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
      return updated ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新失败' })
      return null
    }
  },

  approveTodo: async (id) => {
    set({ error: null })
    try {
      const updated = await todoApi.approveTodo(id)
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
      return updated ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审核失败' })
      return null
    }
  },

  rejectTodo: async (id) => {
    set({ error: null })
    try {
      const updated = await todoApi.rejectTodo(id)
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
      return updated ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审核失败操作失败' })
      return null
    }
  },

  completeTodo: async (id) => {
    set({ error: null })
    try {
      const updated = await todoApi.completeTodo(id)
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
      return updated ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '完成操作失败' })
      return null
    }
  },

  cancelTodo: async (id) => {
    set({ error: null })
    try {
      const updated = await todoApi.cancelTodo(id)
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
      return updated ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '取消失败' })
      return null
    }
  },

  rollbackTodo: async (id) => {
    set({ error: null })
    try {
      const updated = await todoApi.rollbackTodo(id)
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
      return updated ?? null
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '回退失败' })
      return null
    }
  },

  deleteTodo: async (id) => {
    set({ error: null })
    try {
      await todoApi.deleteTodo(id)
      set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }))
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除失败' })
      return false
    }
  },
}))
