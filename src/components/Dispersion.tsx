import {
  BufferGeometry,
  Group,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { useFrame } from '@react-three/fiber'
import { Center, Text3D, useFBO } from '@react-three/drei'
import { useRef } from 'react'
import { range } from '../../utils'

const uniforms = {
  uTexture: {
    value: null,
  },
  uIorR: { value: 1.0 },
  uIorY: { value: 1.0 },
  uIorG: { value: 1.0 },
  uIorC: { value: 1.0 },
  uIorB: { value: 1.0 },
  uIorP: { value: 1.0 },
  uRefractPower: {
    value: 0.2,
  },
  uChromaticAberration: {
    value: 1.0,
  },
  uSaturation: { value: 0.0 },
  uShininess: { value: 40.0 },
  uDiffuseness: { value: 0.2 },
  uFresnelPower: { value: 8.0 },
  uLight: {
    value: new Vector3(-1.0, 1.0, 1.0),
  },
  winResolution: {
    value: new Vector2(window.innerWidth, window.innerHeight).multiplyScalar(
      Math.min(window.devicePixelRatio, 2)
    ),
  },
}

const vertexShader = `
varying vec3 worldNormal;
varying vec3 eyeVector;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 mvPosition = viewMatrix * worldPos;

  gl_Position = projectionMatrix * mvPosition;

  // vec3 transformedNormal = modelMatrix * normal;
  worldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
  eyeVector =  normalize(worldPos.xyz - cameraPosition);
}
`

const fragmentShader = `
uniform float uIorR;
uniform float uIorY;
uniform float uIorG;
uniform float uIorC;
uniform float uIorB;
uniform float uIorP;

uniform float uSaturation;
uniform float uChromaticAberration;
uniform float uRefractPower;
uniform float uFresnelPower;
uniform float uShininess;
uniform float uDiffuseness;
uniform vec3 uLight;

uniform vec2 winResolution;
uniform sampler2D uTexture;

varying vec3 worldNormal;
varying vec3 eyeVector;

vec3 sat(vec3 rgb, float adjustment) {
  const vec3 W = vec3(0.2125, 0.7154, 0.0721);
  vec3 intensity = vec3(dot(rgb, W));
  return mix(intensity, rgb, adjustment);
}

float fresnel(vec3 eyeVector, vec3 worldNormal, float power) {
  float fresnelFactor = abs(dot(eyeVector, worldNormal));
  float inversefresnelFactor = 1.0 - fresnelFactor;
  
  return pow(inversefresnelFactor, power);
}

float specular(vec3 light, float shininess, float diffuseness) {
  vec3 normal = worldNormal;
  vec3 lightVector = normalize(-light);
  vec3 halfVector = normalize(eyeVector + lightVector);

  float NdotL = dot(normal, lightVector);
  float NdotH =  dot(normal, halfVector);
  float kDiffuse = max(0.0, NdotL);
  float NdotH2 = NdotH * NdotH;

  float kSpecular = pow(NdotH2, shininess);
  return  kSpecular + kDiffuse * diffuseness;
}

const int LOOP = 16;

void main() {
  float iorRatioRed = 1.0/uIorR;
  float iorRatioGreen = 1.0/uIorG;
  float iorRatioBlue = 1.0/uIorB;

  vec2 uv = gl_FragCoord.xy / winResolution.xy;
  vec3 normal = worldNormal;
  vec3 color = vec3(0.0);

  for ( int i = 0; i < LOOP; i ++ ) {
    float slide = float(i) / float(LOOP) * 0.1;

    vec3 refractVecR = refract(eyeVector, normal,(1.0/uIorR));
    vec3 refractVecY = refract(eyeVector, normal, (1.0/uIorY));
    vec3 refractVecG = refract(eyeVector, normal, (1.0/uIorG));
    vec3 refractVecC = refract(eyeVector, normal, (1.0/uIorC));
    vec3 refractVecB = refract(eyeVector, normal, (1.0/uIorB));
    vec3 refractVecP = refract(eyeVector, normal, (1.0/uIorP));

    float r = texture2D(uTexture, uv + refractVecR.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).x * 0.5;

    float y = (texture2D(uTexture, uv + refractVecY.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).x * 2.0 +
                texture2D(uTexture, uv + refractVecY.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).y * 2.0 -
                texture2D(uTexture, uv + refractVecY.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).z) / 6.0;

    float g = texture2D(uTexture, uv + refractVecG.xy * (uRefractPower + slide * 2.0) * uChromaticAberration).y * 0.5;

    float c = (texture2D(uTexture, uv + refractVecC.xy * (uRefractPower + slide * 2.5) * uChromaticAberration).y * 2.0 +
                texture2D(uTexture, uv + refractVecC.xy * (uRefractPower + slide * 2.5) * uChromaticAberration).z * 2.0 -
                texture2D(uTexture, uv + refractVecC.xy * (uRefractPower + slide * 2.5) * uChromaticAberration).x) / 6.0;
          
    float b = texture2D(uTexture, uv + refractVecB.xy * (uRefractPower + slide * 3.0) * uChromaticAberration).z * 0.5;

    float p = (texture2D(uTexture, uv + refractVecP.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).z * 2.0 +
                texture2D(uTexture, uv + refractVecP.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).x * 2.0 -
                texture2D(uTexture, uv + refractVecP.xy * (uRefractPower + slide * 1.0) * uChromaticAberration).y) / 6.0;

    float R = r + (2.0*p + 2.0*y - c)/3.0;
    float G = g + (2.0*y + 2.0*c - p)/3.0;
    float B = b + (2.0*c + 2.0*p - y)/3.0;

    color.r += R;
    color.g += G;
    color.b += B;

    color = sat(color, uSaturation);
  }

  // Divide by the number of layers to normalize colors (rgb values can be worth up to the value of LOOP)
  color /= float( LOOP );

  // Specular
  float specularLight = specular(uLight, uShininess, uDiffuseness);
  color += specularLight;

  // Fresnel
  float f = fresnel(eyeVector, normal, uFresnelPower);
  color.rgb += f * vec3(1.0);

  gl_FragColor = vec4(color, 1.0);
}

`

const columns = range(-7.5, 7.5, 2.5)
const rows = range(-7.5, 7.5, 2.5)

const Dispersion = () => {
  const fontUrl = '/fonts/Nunito_Bold.json'
  const mesh = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null)
  const backgroundGroup = useRef<Group>(null)
  const renderTarget = useFBO()

  useFrame(({ gl, scene, camera }) => {
    if (!mesh.current) return
    mesh.current.visible = false

    gl.setRenderTarget(renderTarget)
    gl.render(scene, camera)

    mesh.current.material.uniforms.uTexture.value = renderTarget.texture

    gl.setRenderTarget(null)

    mesh.current.visible = true
    mesh.current.material.uniforms.uDiffuseness.value = 0.2
    mesh.current.material.uniforms.uShininess.value = 40
    mesh.current.material.uniforms.uLight.value = new Vector3(-1, 1, 1)
    mesh.current.material.uniforms.uFresnelPower.value = 8.0

    mesh.current.material.uniforms.uIorR.value = 1.15
    mesh.current.material.uniforms.uIorG.value = 1.18
    mesh.current.material.uniforms.uIorB.value = 1.22
    mesh.current.material.uniforms.uIorY.value = 1.16
    mesh.current.material.uniforms.uIorC.value = 1.22
    mesh.current.material.uniforms.uIorP.value = 1.22

    mesh.current.material.uniforms.uSaturation.value = 1.08
    mesh.current.material.uniforms.uChromaticAberration.value = 0.6
    mesh.current.material.uniforms.uRefractPower.value = 0.4
  })

  return (
    <>
      <group ref={backgroundGroup}>
        {columns.map((col) =>
          rows.map((row, index) => (
            <mesh position={[col, row, -4]} key={index}>
              <icosahedronGeometry args={[0.5, 8]} />
              <meshStandardMaterial color="white" />
            </mesh>
          ))
        )}
      </group>
      <Center>
        <Text3D font={fontUrl} ref={mesh} scale={[10, 10, 10]}>
          V
          <shaderMaterial
            fragmentShader={fragmentShader}
            vertexShader={vertexShader}
            uniforms={uniforms}
          />
        </Text3D>
      </Center>
      {/*<mesh ref={mesh}>*/}
      {/*  <icosahedronGeometry args={[2.84, 20]} />*/}
      {/*  <shaderMaterial*/}
      {/*    fragmentShader={fragmentShader}*/}
      {/*    vertexShader={vertexShader}*/}
      {/*    uniforms={uniforms}*/}
      {/*  />*/}
      {/*</mesh>*/}
    </>
  )
}
export default Dispersion
