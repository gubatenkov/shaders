import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

import Dispersion from './components/Dispersion'
import { NoToneMapping } from 'three'

const App = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 50, near: 0.1, far: 50 }}
      gl={{ antialias: true, toneMapping: NoToneMapping }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['black']} />
      <ambientLight intensity={3.0} />
      <OrbitControls />
      <Dispersion />
    </Canvas>
  )
}

export default App
