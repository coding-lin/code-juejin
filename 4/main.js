const vertexShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

uniform float uPointSize;

attribute vec4 aRandom;

uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uProgress;

varying vec3 vColor;
varying float vBlur;

#define PI 3.141592653589793

float saturate(float a)
{
    return clamp(a,0.,1.);
}

float remap01(float a,float b,float t)
{
    return saturate((t-a)/(b-a));
}

vec2 remap01(vec2 a,vec2 b,vec2 t)
{
    return(t-a)/(b-a);
}

float remap(float a,float b,float c,float d,float t)
{
    return saturate((t-a)/(b-a))*(d-c)+c;
}

vec3 distort(vec3 p){
    float t=iTime;
    
    float pr=uProgress*1.5-.25*(p.x+aRandom.w);
    
    vColor=vec3(1.);
    vBlur=0.;
    
    float angle=p.x;
    float angle2=floor(p.x*float(SPIRALS))/float(SPIRALS);
    angle=angle2;
    float radiusRatio=p.y;
    radiusRatio=fract(p.y+t*.02);
    float radius=radiusRatio*1.75;
    
    radius*=pr;
    
    angle*=2.*PI;
    angle-=radius*.75;
    
    vec2 dir=vec2(cos(angle),sin(angle));
    p=vec3(dir*radius,radiusRatio);
    
    p.z=cos(radiusRatio*PI*2.)*pow(radiusRatio,2.)*.8*smoothstep(.75,1.,pr);
    
    p.z=pr>.001?p.z:2.;
    
    // dof
    vec4 mvPosition=modelViewMatrix*vec4(p,1.);
    float dist=1.35;
    float coc=abs(-mvPosition.z-dist)*.3+pow(max(0.,-mvPosition.z-dist),2.5)*.5+radiusRatio*radiusRatio*1.25;
    
    vColor=mix(uColor2,uColor,saturate(coc+.35));
    
    gl_PointSize=(2.+coc*50.)/-mvPosition.z*iResolution.y/1280.;
    
    vBlur=coc*10.;
    
    return p;
}

void main(){
    vec3 p=position;
    
    gl_PointSize=uPointSize;
    
    p=distort(p);
    
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    
    vUv=uv;
}
`;

const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

varying vec3 vColor;
varying float vBlur;

float saturate(float a)
{
    return clamp(a,0.,1.);
}

float remap01(float a,float b,float t)
{
    return saturate((t-a)/(b-a));
}

vec2 remap01(vec2 a,vec2 b,vec2 t)
{
    return(t-a)/(b-a);
}

float remap(float a,float b,float c,float d,float t)
{
    return saturate((t-a)/(b-a))*(d-c)+c;
}

float spot(vec2 st){
    float d=length(st*2.-1.);
    float result=remap01(0.,vBlur+d,1.-d);
    return result;
}

void main(){
    vec2 p=vUv;
    
    vec3 col=vColor;
    
    float shape=spot(gl_PointCoord);
    
    col*=shape;
    
    gl_FragColor=vec4(col,1.);
}
`;

class ParticleSpiral extends kokomi.Component {
  constructor(base, config = {}) {
    super(base);

    const { count = 120, pointCount = 120, uniforms } = config;

    const totalPointCount = count * pointCount;

    const geometry = new THREE.BufferGeometry();

    const posBuffer = kokomi.makeBuffer(totalPointCount, (val) => val);
    geometry.setAttribute("position", new THREE.BufferAttribute(posBuffer, 3));

    kokomi.iterateBuffer(posBuffer, posBuffer.length, (arr, axis, i) => {
      arr[axis.x] = Math.random();
      arr[axis.y] = Math.random();
      arr[axis.z] = i / totalPointCount;
    });

    const randBuffer = kokomi.makeBuffer(
      totalPointCount,
      () => Math.random(),
      4
    );
    geometry.setAttribute("aRandom", new THREE.BufferAttribute(randBuffer, 4));

    const uj = new kokomi.UniformInjector(this.base);
    this.uj = uj;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      defines: {
        SPIRALS: count,
      },
      uniforms: {
        ...uj.shadertoyUniforms,
        ...{
          uPointSize: {
            value: 10,
          },
          uColor: {
            value: new THREE.Color(uniforms.color),
          },
          uColor2: {
            value: new THREE.Color(uniforms.color2),
          },
          uProgress: {
            value: uniforms.progress,
          },
        },
      },
    });

    const cm = new THREE.Points(geometry, material);
    this.cm = cm;
  }
  addExisting() {
    this.base.scene.add(this.cm);
  }
  update() {
    if (this.uj && this.cm) {
      this.uj.injectShadertoyUniforms(this.cm.material.uniforms);
    }
  }
  show() {
    gsap.to(this.cm.material.uniforms.uProgress, {
      value: 1,
      duration: 3,
    });
  }
}

class Sketch extends kokomi.Base {
  create() {
    const config = {
      bgColor: "#08092B",
      spiral: {
        count: 120,
        pointCount: 120,
        uniforms: {
          color: "#66CCFF",
          color2: "#CB17CF",
          progress: 0,
        },
      },
    };
    this.config = config;

    this.scene.background = new THREE.Color(config.bgColor);

    this.camera.position.set(0, 0, 1);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();

    // new kokomi.OrbitControls(this);

    const ps = new ParticleSpiral(this, config.spiral);
    this.ps = ps;
    ps.addExisting();

    const g = new THREE.Group();
    this.scene.add(g);
    g.add(ps.cm);
    g.rotation.x = THREE.MathUtils.degToRad(-60);

    // postprocessing
    const createPostprocessing = () => {
      const composer = new POSTPROCESSING.EffectComposer(this.renderer, {
        frameBufferType: THREE.HalfFloatType,
        multisampling: 8,
      });
      this.composer = composer;

      composer.addPass(new POSTPROCESSING.RenderPass(this.scene, this.camera));

      const bloom = new POSTPROCESSING.BloomEffect({
        blendFunction: POSTPROCESSING.BlendFunction.ADD,
        luminanceThreshold: 0.3,
        luminanceSmoothing: 0,
        mipmapBlur: true,
        intensity: 2,
        radius: 0.4,
      });

      const vig = new POSTPROCESSING.VignetteEffect({
        offset: 0.1,
        darkness: 0.8,
      });

      const effectPass = new POSTPROCESSING.EffectPass(this.camera, bloom, vig);
      composer.addPass(effectPass);

      this.renderer.autoClear = true;
    };

    createPostprocessing();

    // this.createDebug();

    const start = async () => {
      gsap.to(".core", {
        scale: 1.5,
        repeat: 6,
        yoyo: true,
        ease: "none",
        duration: 0.2,
        async onComplete() {
          gsap.to(".core", {
            display: "none",
          });
          ps.show();
          await kokomi.sleep(1500);
          gsap.to(".title-text", {
            opacity: 1,
            duration: 1,
            ease: "none",
          });
        },
      });
    };

    start();
  }
  createDebug() {
    const config = this.config;
    const mat = this.ps.cm.material;

    const gui = new dat.GUI();
    gui.addColor(config, "bgColor").onChange((val) => {
      this.scene.background = new THREE.Color(val);
    });
    gui.addColor(config.spiral.uniforms, "color").onChange((val) => {
      mat.uniforms.uColor.value = new THREE.Color(val);
    });
    gui.addColor(config.spiral.uniforms, "color2").onChange((val) => {
      mat.uniforms.uColor2.value = new THREE.Color(val);
    });
    gui
      .add(config.spiral.uniforms, "progress")
      .min(0)
      .max(1)
      .step(0.01)
      .onChange((val) => {
        mat.uniforms.uProgress.value = val;
      });
  }
}

const createSketch = () => {
  const sketch = new Sketch();
  sketch.create();
  return sketch;
};

createSketch();
