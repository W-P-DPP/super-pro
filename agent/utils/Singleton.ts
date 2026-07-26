

export class SingletonFactory {
    private static instances = new Map<string, any>()

    /** 通过无参构造函数创建单例 */
    static getInstance<T>(cls: new () => T): T
    /** 通过工厂函数 + key 创建单例（key 用于唯一标识该实例） */
    static getInstance<T>(factory: () => T, key: string): T
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static getInstance<T>(clsOrFactory: any, key?: string): T {
        const k: string = key ?? clsOrFactory?.name ?? ''
        if (!this.instances.has(k)) {
            const instance: T = key ? clsOrFactory() : new clsOrFactory()
            this.instances.set(k, instance)
        }
        return this.instances.get(k) as T
    }
}