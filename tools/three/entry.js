// Zombie City: three.js r170 (MIT) and the few add-ons the 3D view uses, bundled as one global, THREE.
import * as T from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import * as BGU from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
const X = Object.assign({}, T, { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass, GTAOPass, SMAAPass, Sky, FXAAShader, BufferGeometryUtils: BGU, RoundedBoxGeometry });
window.THREE = X;
