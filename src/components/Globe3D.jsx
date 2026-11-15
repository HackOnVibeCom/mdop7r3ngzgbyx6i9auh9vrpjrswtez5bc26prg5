import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

// Boarding-pass palette so the globe matches the rest of the app.
const STATUS_COLOR = {
  voting: '#F4C430', // haldi
  deciding: '#F4C430',
  decided: '#0F8B8D', // peacock
  locked: '#E8336D', // rani
  live: '#E8336D',
  done: '#E8336D',
}

const R = 1.6

/** lat/lon (degrees) → point on a sphere of radius `radius`. */
function latLonToVec3(lat, lon, radius = R) {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}

function Pin({ marker, onSelect }) {
  const [hover, setHover] = useState(false)
  const pos = useMemo(() => latLonToVec3(marker.lat, marker.lon, R + 0.02), [marker.lat, marker.lon])
  const color = STATUS_COLOR[marker.status] || '#F4C430'
  return (
    <mesh
      position={pos}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(marker.code)
      }}
    >
      <sphereGeometry args={[hover ? 0.1 : 0.07, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function World({ markers, onSelect, autoRotate }) {
  const group = useRef()
  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.15
  })
  return (
    <group ref={group}>
      {/* Solid globe body in ink + a wireframe shell: paper/ink boarding-pass look. */}
      <mesh>
        <sphereGeometry args={[R, 48, 48]} />
        <meshBasicMaterial color="#14213D" />
      </mesh>
      <mesh scale={1.001}>
        <sphereGeometry args={[R, 24, 24]} />
        <meshBasicMaterial color="#F6EFE3" wireframe transparent opacity={0.22} />
      </mesh>
      {markers.map((m) => (
        <Pin key={m.code} marker={m} onSelect={onSelect} />
      ))}
    </group>
  )
}

export default function Globe3D({ markers = [], onSelect, autoRotate = true }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.4], fov: 42 }}
      style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1} />
      <World markers={markers} onSelect={onSelect} autoRotate={autoRotate} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={(5 * Math.PI) / 6}
      />
    </Canvas>
  )
}
