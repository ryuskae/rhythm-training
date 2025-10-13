import { useEffect, useRef } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'

type Props = {
  musicXML: string
  heightHint?: number
}

/**
 * OSMD 반응형 뷰어
 * - 컨테이너 폭 변화 감지(ResizeObserver)
 * - SVG 내재 폭(viewBox.width)을 기준으로 Zoom = containerWidth / scoreWidth
 * - 다크모드여도 흰 배경 고정
 */
export default function OSMDViewer({ musicXML, heightHint = 160 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const lastXmlHashRef = useRef<number>(0)

  useEffect(() => {
    if (!hostRef.current) return

    const host = hostRef.current
    host.innerHTML = ''

    const osmd = new OpenSheetMusicDisplay(host, {
      backend: 'svg',
      autoResize: false, // window resize만 잡음 → 직접 처리
      drawingParameters: 'compacttight',
      drawTitle: false,
      drawComposer: false,
      drawSubtitle: false,
      drawPartNames: false,
      renderSingleHorizontalStaffline: true
    })
    osmdRef.current = osmd

    const ensureResponsive = () => {
      const svg = host.querySelector('svg')
      if (!svg) return { w: 0, h: 0 }
      const bw = (svg as any).width?.baseVal?.value || svg.getBoundingClientRect().width || 1000
      const bh = (svg as any).height?.baseVal?.value || svg.getBoundingClientRect().height || 300
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${bw} ${bh}`)
      svg.removeAttribute('width'); svg.removeAttribute('height')
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      ;(svg as any).style.background = '#FFFFFF'
      host.style.background = '#FFFFFF'
      document.body.style.background = '#FFFFFF'
      const vb = (svg as any).viewBox.baseVal
      return { w: vb && vb.width ? vb.width : bw, h: vb && vb.height ? vb.height : bh }
    }

    const renderAndFit = async () => {
      if (!osmdRef.current) return
      await osmdRef.current.render()
      const { w } = ensureResponsive()
      const W = host.clientWidth || 0
      if (w > 0 && W > 0) {
        const zoom = Math.max(0.2, Math.min(5.0, (W / w) * 0.995))
        if (Math.abs(osmdRef.current.Zoom - zoom) > 0.004) {
          osmdRef.current.Zoom = zoom
          await osmdRef.current.render()
          ensureResponsive()
        }
      }
    }

    const loadAndRender = async () => {
      const hash = simpleHash(musicXML)
      if (hash !== lastXmlHashRef.current) {
        lastXmlHashRef.current = hash
        await osmd.load(musicXML)
      }
      await renderAndFit()
    }

    // 초기에 로드 & 리사이즈 감시
    loadAndRender()
    const ro = new ResizeObserver(() => renderAndFit())
    ro.observe(host)
    roRef.current = ro

    return () => {
      roRef.current?.disconnect()
      osmdRef.current?.clear()
      osmdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 마운트 1회

  useEffect(() => {
    // XML 바뀌면 다시 로드
    const go = async () => {
      if (!osmdRef.current) return
      await osmdRef.current.load(musicXML)
      // 컨테이너 폭에 맞춰 fit
      await osmdRef.current.render()
      const host = hostRef.current!
      const svg = host.querySelector('svg')
      if (svg) {
        const bw = (svg as any).viewBox?.baseVal?.width ||
                   (svg as any).width?.baseVal?.value ||
                   svg.getBoundingClientRect().width || 1000
        const W = host.clientWidth || 0
        const zoom = Math.max(0.2, Math.min(5.0, (W / bw) * 0.995))
        osmdRef.current.Zoom = zoom
        await osmdRef.current.render()
      }
    }
    go()
  }, [musicXML])

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        minHeight: heightHint,
        overflow: 'hidden',
        background: '#FFFFFF',
        borderRadius: 8
      }}
    />
  )
}

function simpleHash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
