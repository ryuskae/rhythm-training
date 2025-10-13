import { useMemo, useState } from 'react'
import OSMDViewer from './components/OSMDViewer'

type Diff = 4 | 8 | 16

function makeMusicXML(subdivisions: Diff): string {
  // 4/4 한 마디, 모든 음은 같은 피치(C4), subdivisions만큼 등분
  const divisions = 8 // 8 기준(8=quarter), 16th = 2, 8th = 4, quarter=8
  const stepDur = subdivisions === 16 ? 2 : subdivisions === 8 ? 4 : 8
  const notes = Array.from({ length: subdivisions }, () => `
    <note>
      <pitch><step>C</step><octave>4</octave></pitch>
      <duration>${stepDur}</duration>
      <type>${subdivisions === 16 ? '16th' : subdivisions === 8 ? 'eighth' : 'quarter'}</type>
      <stem>up</stem>
    </note>
  `).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
  <score-partwise version="3.1">
    <part-list>
      <score-part id="P1"><part-name>Rhythm</part-name></score-part>
    </part-list>
    <part id="P1">
      <measure number="1">
        <attributes>
          <divisions>${divisions}</divisions>
          <key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
        </attributes>
        ${notes}
      </measure>
    </part>
  </score-partwise>`
}

export default function App() {
  const [diff, setDiff] = useState<Diff>(8)
  const xml = useMemo(() => makeMusicXML(diff), [diff])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1 style={{ margin: '8px 0' }}>🎵 OSMD Codespace Preview</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[4,8,16].map(d => (
          <button
            key={d}
            onClick={() => setDiff(d as Diff)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: d===diff ? '#1e90ff' : 'white',
              color: d===diff ? 'white' : '#333',
              cursor: 'pointer'
            }}
          >
            {d}비트
          </button>
        ))}
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: 'white',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        {/* 컨테이너 폭이 바뀌면 내부에서 자동 스케일 */}
        <OSMDViewer musicXML={xml} heightHint={160} />
      </div>
    </div>
  )
}
