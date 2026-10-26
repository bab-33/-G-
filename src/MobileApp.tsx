import { useEffect, useRef, useState } from 'react'

type InstallEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function MobileApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [message, setMessage] = useState('')
  const [update, setUpdate] = useState<ServiceWorker | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)')
    const isInstalled = () => setInstalled(media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone)
    const onInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent) }
    const onInstalled = () => { setInstalled(true); setPrompt(null); dialog.current?.close() }
    const onOnline = () => setOnline(navigator.onLine)
    isInstalled()
    media.addEventListener('change', isInstalled)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOnline)
    let disposed = false
    let registration: ServiceWorkerRegistration | undefined
    let installing: ServiceWorker | null = null
    const stateChanged = () => {
      if (disposed || installing?.state !== 'installed') return
      setOfflineReady(true)
      if (navigator.serviceWorker.controller) setUpdate(registration?.waiting || installing)
    }
    const foundUpdate = () => {
      installing?.removeEventListener('statechange', stateChanged)
      installing = registration?.installing || null
      installing?.addEventListener('statechange', stateChanged)
    }
    let refreshing = false
    const controllerChanged = () => {
      if (refreshing) return
      if (document.documentElement.dataset.appUpdating === 'true') {
        refreshing = true
        window.location.reload()
      }
    }
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
        if (disposed) return
        registration = reg
        if (reg.waiting) setUpdate(reg.waiting)
        if (reg.active) setOfflineReady(true)
        if (reg.installing) foundUpdate()
        reg.addEventListener('updatefound', foundUpdate)
      }).catch(() => { if (!disposed) setMessage('离线准备未完成，请联网时重新打开。') })
    }
    return () => {
      disposed = true
      media.removeEventListener('change', isInstalled)
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
      registration?.removeEventListener('updatefound', foundUpdate)
      installing?.removeEventListener('statechange', stateChanged)
      navigator.serviceWorker?.removeEventListener('controllerchange', controllerChanged)
    }
  }, [])

  useEffect(() => {
    if (!message) return
    const timeout = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timeout)
  }, [message])

  async function install() {
    if (prompt) {
      try {
        await prompt.prompt()
        const choice = await prompt.userChoice
        setPrompt(null)
        if (choice.outcome === 'accepted') setMessage('安装请求已提交，请按浏览器提示完成。')
      } catch { dialog.current?.showModal() }
    } else dialog.current?.showModal()
  }

  async function share() {
    const data = { title: '两人食 · 一起好好吃饭', text: '收藏家常味道，安排今天的美味。', url: window.location.origin + '/' }
    try {
      if (navigator.share) await navigator.share(data)
      else {
        await navigator.clipboard.writeText(data.url)
        setMessage('链接已复制，发给朋友就能使用。')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      dialog.current?.showModal()
      setMessage('可以复制下方地址分享。')
    }
  }

  return <>
    <section className="mobile-app-bar" aria-label="手机应用与分享">
      <img src="/icon-192.png" width="40" height="40" alt="" />
      <div className="mobile-app-copy"><strong>{installed ? '两人食，随时在身边' : '把我们的小厨房，放进手机里'}</strong><span>{!online ? (offlineReady ? '正在离线使用，菜单仍保存在本机' : '当前离线，重新打开前请先联网') : installed ? (offlineReady ? '已在应用模式中打开 · 离线已就绪' : '已在应用模式中打开') : offlineReady ? '添加到主屏幕 · 离线已就绪' : '添加到主屏幕，下次点开就能用'}</span></div>
      <div className="mobile-app-actions">{!installed && <button className="install-button" onClick={install}>安装到手机 <span aria-hidden="true">↗</span></button>}<button className="share-button" onClick={share}>分享给朋友</button></div>
    </section>
    {update && <div className="app-update" role="status"><span>新版两人食已准备好，当前菜单已在本机保存。</span><button onClick={() => { document.documentElement.dataset.appUpdating = 'true'; update.postMessage('SKIP_WAITING') }}>更新并重新打开</button></div>}
    {message && <div className="pwa-message" role="status">{message}</div>}
    <dialog ref={dialog} className="install-dialog">
      <div className="modal-head"><div><span className="eyebrow">YOUR LITTLE KITCHEN, TO GO</span><h2>让两人食住进手机</h2></div><button className="icon-button" aria-label="关闭安装说明" onClick={() => dialog.current?.close()}>✕</button></div>
      <p className="install-description">这是可安装的网页应用，添加后可以从手机桌面独立打开。</p>
      <div className="install-step"><strong>iPhone / iPad</strong><p>用 Safari 打开下方网址，点「分享」，再选择「添加到主屏幕」。如果出现「作为网页 App 打开」，请开启它。</p></div>
      <div className="install-step"><strong>安卓手机</strong><p>用 Chrome 或支持安装的浏览器打开网址，点右上角菜单，选择「安装应用」或「添加到主屏幕」。</p></div>
      <div className="install-step"><strong>在微信等应用里打开？</strong><p>请从右上角菜单选择「在浏览器打开」，再按上面的步骤安装。</p></div>
      <label className="app-url-label">应用网址<input readOnly aria-label="应用网址" value={window.location.origin + '/'} onFocus={e => e.currentTarget.select()} /></label>
      <p className="install-data-note">菜单和点餐数据保存在各自设备中，暂不跨设备同步。首次联网打开并完成离线准备后，断网也能点餐。请勿清除浏览器或应用数据。</p>
      <div className="modal-actions"><button className="primary" onClick={() => dialog.current?.close()}>知道了</button></div>
    </dialog>
  </>
}
