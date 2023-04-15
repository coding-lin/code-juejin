const vertexShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

uniform vec2 uMeshSize;
uniform vec2 uMeshPosition;
uniform float uProgress;

// progress
// plain
float getProgress1(float pr,vec2 uv){
    return pr;
}

// stagger
float getProgress2(float pr,vec2 uv){
    float activation=uv.x;
    float latestStart=.5;
    float startAt=activation*latestStart;
    pr=smoothstep(startAt,1.,pr);
    return pr;
}

// transform
// flip
vec3 flipX(vec3 p,float pr){
    p.x=mix(p.x,-p.x,pr);
    return p;
}

vec2 flipUvX(vec2 uv,float pr){
    uv.x=mix(uv.x,1.-uv.x,pr);
    return uv;
}

vec3 fullscreen(vec3 p){
    // copy uv
    vec2 newUv=uv;
    
    // get progress
    float pr=getProgress2(uProgress,uv);
    
    // scale to view size
    vec2 scale=mix(vec2(1.),iResolution/uMeshSize,pr);
    p.xy*=scale;
    
    // other transforms
    p=flipX(p,pr);
    
    float latestStart=.5;
    float stepVal=latestStart-pow(latestStart,3.);
    newUv=flipUvX(newUv,step(stepVal,pr));
    
    // get uv
    vUv=newUv;
    
    // move to center
    p.x+=-uMeshPosition.x*pr;
    p.y+=-uMeshPosition.y*pr;
    
    // z
    p.z+=pr;
    
    return p;
}

void main(){
    vec3 p=position;
    
    p=fullscreen(p);
    
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}
`;

const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

uniform sampler2D uTexture;

varying vec2 vUv;

void main(){
    vec2 p=vUv;
    vec4 tex=texture(uTexture,p);
    vec4 col=tex;
    gl_FragColor=col;
}
`;

const vertexShader2 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

uniform float uPointSize;

uniform float uDevicePixelRatio;

varying float vOpacity;

float random(in vec3 pos){
    return fract(sin(dot(pos.xyz,vec3(70.9898,78.233,32.4355)))*43758.5453123);
}

//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
//

vec3 mod289(vec3 x)
{
    return x-floor(x*(1./289.))*289.;
}

vec4 mod289(vec4 x)
{
    return x-floor(x*(1./289.))*289.;
}

vec4 permute(vec4 x)
{
    return mod289(((x*34.)+1.)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159-.85373472095314*r;
}

vec3 fade(vec3 t){
    return t*t*t*(t*(t*6.-15.)+10.);
}

// Classic Perlin noise
float cnoise(vec3 P)
{
    vec3 Pi0=floor(P);// Integer part for indexing
    vec3 Pi1=Pi0+vec3(1.);// Integer part + 1
    Pi0=mod289(Pi0);
    Pi1=mod289(Pi1);
    vec3 Pf0=fract(P);// Fractional part for interpolation
    vec3 Pf1=Pf0-vec3(1.);// Fractional part - 1.0
    vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
    vec4 iy=vec4(Pi0.yy,Pi1.yy);
    vec4 iz0=Pi0.zzzz;
    vec4 iz1=Pi1.zzzz;
    
    vec4 ixy=permute(permute(ix)+iy);
    vec4 ixy0=permute(ixy+iz0);
    vec4 ixy1=permute(ixy+iz1);
    
    vec4 gx0=ixy0*(1./7.);
    vec4 gy0=fract(floor(gx0)*(1./7.))-.5;
    gx0=fract(gx0);
    vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);
    vec4 sz0=step(gz0,vec4(0.));
    gx0-=sz0*(step(0.,gx0)-.5);
    gy0-=sz0*(step(0.,gy0)-.5);
    
    vec4 gx1=ixy1*(1./7.);
    vec4 gy1=fract(floor(gx1)*(1./7.))-.5;
    gx1=fract(gx1);
    vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);
    vec4 sz1=step(gz1,vec4(0.));
    gx1-=sz1*(step(0.,gx1)-.5);
    gy1-=sz1*(step(0.,gy1)-.5);
    
    vec3 g000=vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010=vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001=vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011=vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
    
    vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
    g000*=norm0.x;
    g010*=norm0.y;
    g100*=norm0.z;
    g110*=norm0.w;
    vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
    g001*=norm1.x;
    g011*=norm1.y;
    g101*=norm1.z;
    g111*=norm1.w;
    
    float n000=dot(g000,Pf0);
    float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
    float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));
    float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
    float n001=dot(g001,vec3(Pf0.xy,Pf1.z));
    float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
    float n011=dot(g011,vec3(Pf0.x,Pf1.yz));
    float n111=dot(g111,Pf1);
    
    vec3 fade_xyz=fade(Pf0);
    vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
    vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
    float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);
    return 2.2*n_xyz;
}

vec3 distort(vec3 p){
    float speed=.1;
    float noise=cnoise(p)*.5;
    p.x+=cos(iTime*speed+p.x*noise*100.)*.2;
    p.y+=sin(iTime*speed+p.x*noise*100.)*.2;
    p.z+=cos(iTime*speed+p.x*noise*100.)*.5;
    return p;
}

void main(){
    vec3 p=position;
    
    vec3 dp=distort(p);
    
    csm_Position=dp;
    
    vUv=uv;
    
    float randSize=clamp(random(p),.7,.8);
    gl_PointSize=uPointSize*uDevicePixelRatio*randSize;
    vec4 mvPosition=modelViewMatrix*vec4(dp,1.);
    gl_PointSize*=(1./-mvPosition.z);
    
    vOpacity=random(p);
}
`;

const fragmentShader2 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

uniform vec3 uColor;
varying float vOpacity;

float circle(float d,float size,float blur){
    float c=smoothstep(size,size*(1.-blur),d);
    float ring=smoothstep(size*.8,size,d);
    c*=mix(.7,1.,ring);
    return c;
}

void main(){
    float distanceToCenter=distance(gl_PointCoord,vec2(.5));
    float strength=circle(distanceToCenter,.5,.4);
    
    vec3 col=uColor;
    // float alpha=clamp(vOpacity,.5,1.);
    
    csm_DiffuseColor=vec4(col,strength);
}
`;

const vertexShader3 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

void main(){
    vec3 p=position;
    // gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    csm_Position=p;
    
    vUv=uv;
}
`;

const fragmentShader3 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

uniform sampler2D uTexture;

varying vec2 vUv;

void main(){
    vec2 p=vUv;
    vec4 tex=texture(uTexture,p);
    vec4 col=tex;
    // gl_FragColor=col;
    csm_DiffuseColor=col;
}
`;

const vertexShader4 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

void main(){
    vec3 p=position;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    
    vUv=uv;
}
`;

const fragmentShader4 = `
// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83#generic-123-noise
float rand(float n){return fract(sin(n)*43758.5453123);}

float rand(vec2 n){
    return fract(sin(dot(n,vec2(12.9898,4.1414)))*43758.5453);
}

float noise(float p){
    float fl=floor(p);
    float fc=fract(p);
    return mix(rand(fl),rand(fl+1.),fc);
}

float noise(vec2 n){
    const vec2 d=vec2(0.,1.);
    vec2 b=floor(n),f=smoothstep(vec2(0.),vec2(1.),fract(n));
    return mix(mix(rand(b),rand(b+d.yx),f.x),mix(rand(b+d.xy),rand(b+d.yy),f.x),f.y);
}

// https://gist.github.com/companje/29408948f1e8be54dd5733a74ca49bb9
float map(float value,float min1,float max1,float min2,float max2){
    return min2+(value-min1)*(max2-min2)/(max1-min1);
}

float saturate(float a){
    return clamp(a,0.,1.);
}

varying vec2 vUv;

uniform float uProgress;
uniform float uProgress1;
uniform vec2 uGrid;
uniform float uGridSize;
uniform vec3 uTextColor;
uniform vec3 uShadowColor;

float getMixer(vec2 p,float pr,float pattern){
    float width=.5;
    pr=map(pr,0.,1.,-width,1.);
    pr=smoothstep(pr,pr+width,p.x);
    float mixer=1.-saturate(pr*2.-pattern);
    return mixer;
}

void main(){
    vec2 p=vUv;
    
    // pattern
    vec2 grid=uGrid;
    grid.x*=uGridSize;
    vec2 gridP=vec2(floor(grid.x*p.x),floor(grid.y*p.y));
    float pattern=noise(gridP);
    
    // anime
    vec4 col=vec4(0.);
    
    vec4 l0=vec4(uShadowColor,1.);
    float pr0=uProgress;
    float m0=getMixer(p,pr0,pattern);
    col=mix(col,l0,m0);
    
    vec4 l1=vec4(uTextColor,1.);
    float pr1=uProgress1;
    float m1=getMixer(p,pr1,pattern);
    col=mix(col,l1,m1);
    
    gl_FragColor=col;
}
`;

const vertexShader5 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

varying vec2 vUv;

void main(){
    vec3 p=position;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    
    vUv=uv;
}
`;

const fragmentShader5 = `
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;

uniform sampler2D tDiffuse;

varying vec2 vUv;

uniform float uProgress;

uniform float uMaskRadius;
uniform float uDevicePixelRatio;
uniform vec2 uMouse;
uniform float uMouseSpeed;

vec2 centerUv(vec2 uv){
    uv=uv*2.-1.;
    return uv;
}

vec2 distort(vec2 p){
    vec2 cp=centerUv(p);
    float center=distance(p,vec2(.5));
    vec2 offset=cp*(1.-center)*uProgress;
    p-=offset;
    return p;
}

float circle(vec2 st,float r,vec2 v){
    float d=length(st-v);
    float c=smoothstep(r-.2,r+.2,d);
    return c;
}

float getCircle(float radius){
    vec2 viewportP=gl_FragCoord.xy/iResolution/uDevicePixelRatio;
    float aspect=iResolution.x/iResolution.y;
    
    vec2 m=iMouse.xy/iResolution.xy;
    
    vec2 maskP=viewportP-m;
    maskP/=vec2(1.,aspect);
    maskP+=m;
    
    float r=radius/iResolution.x;
    float c=circle(maskP,r,m);
    
    return c;
}

#define GLSLIFY 1
vec3 blackAndWhite(vec3 color){
    return vec3((color.r+color.g+color.b)/5.);
}

vec4 RGBShift(sampler2D t,vec2 rUv,vec2 gUv,vec2 bUv,float isBlackWhite){
    vec4 color1=texture(t,rUv);
    vec4 color2=texture(t,gUv);
    vec4 color3=texture(t,bUv);
    if(isBlackWhite==1.){
        color1.rgb=blackAndWhite(color1.rgb);
        color2.rgb=blackAndWhite(color2.rgb);
        color3.rgb=blackAndWhite(color3.rgb);
    }
    vec4 color=vec4(color1.r,color2.g,color3.b,color2.a);
    return color;
}

void main(){
    vec2 p=vUv;
    p=distort(p);
    
    float mask=1.-getCircle(uMaskRadius/uDevicePixelRatio);
    float r=mask*uMouseSpeed*.5;
    float g=mask*uMouseSpeed*.525;
    float b=mask*uMouseSpeed*.55;
    vec4 tex=RGBShift(tDiffuse,p+=r,p+=g,p+=b,0.);
    
    vec4 col=tex;
    
    gl_FragColor=col;
}
`;

class CharacterGallery extends kokomi.Component {
  constructor(base, config) {
    super(base);

    const { scroller } = config;

    const gallary = new kokomi.Gallery(base, {
      vertexShader,
      fragmentShader,
      materialParams: {
        transparent: true,
      },
      scroller,
      elList: [...document.querySelectorAll("img:not(.webgl-fixed)")],
      uniforms: {
        uMeshSize: {
          value: new THREE.Vector2(0, 0),
        },
        uMeshPosition: {
          value: new THREE.Vector2(0, 0),
        },
        uProgress: {
          value: 0,
        },
      },
    });
    this.gallary = gallary;

    this.currentFullscreenMesh = null;
  }
  async addExisting() {
    await this.gallary.addExisting();

    this.gallary.makuGroup.makus.forEach((maku) => {
      maku.el.addEventListener("click", () => {
        if (!maku.el.classList.contains("webgl-img-fullscreen")) {
          return;
        }
        if (!this.currentFullscreenMesh) {
          const progress = maku.mesh.material.uniforms.uProgress.value;
          if (progress < 0.5) {
            this.doTransition(maku.mesh);
            this.currentFullscreenMesh = maku.mesh;
          }
        }
      });
    });

    window.addEventListener("click", () => {
      if (this.currentFullscreenMesh) {
        const progress =
          this.currentFullscreenMesh.material.uniforms.uProgress.value;
        if (progress > 0.01) {
          this.undoTransition(this.currentFullscreenMesh);
          this.currentFullscreenMesh = null;
        }
      }
    });
  }
  connectSwiper(swiper) {
    this.swiper = swiper;
  }
  update() {
    if (this.gallary.makuGroup) {
      // swiper
      if (this.swiper) {
        this.gallary.scroller.scroll.target = -this.swiper.translate;
      }

      // mesh info
      this.gallary.makuGroup.makus.forEach((maku) => {
        maku.mesh.material.uniforms.uMeshSize.value = new THREE.Vector2(
          maku.el.clientWidth,
          maku.el.clientHeight
        );
        maku.mesh.material.uniforms.uMeshPosition.value = new THREE.Vector2(
          maku.mesh.position.x,
          maku.mesh.position.y
        );
      });
    }
  }
  doTransition(mesh) {
    document.body.classList.add("overflow-hidden");
    gsap.set(".avatars", {
      pointerEvents: "none",
    });
    gsap.to(".avatars", {
      opacity: 0,
    });
    gsap.set(".close-icon", {
      pointerEvents: "auto",
    });
    gsap.to(".close-icon", {
      opacity: 1,
      delay: 0.3,
    });
    gsap.to(mesh.material.uniforms.uProgress, {
      value: 1,
      duration: 1,
      ease: "power2.out",
    });
  }
  undoTransition(mesh) {
    document.body.classList.remove("overflow-hidden");
    gsap.to(mesh.material.uniforms.uProgress, {
      value: 0,
      duration: 1,
      ease: "power2.inOut",
    });
    gsap.set(".avatars", {
      pointerEvents: "auto",
    });
    gsap.to(".avatars", {
      opacity: 1,
    });
    gsap.set(".close-icon", {
      pointerEvents: "none",
    });
    gsap.to(".close-icon", {
      opacity: 0,
    });
  }
}

class ParticlesFly extends kokomi.Component {
  constructor(base, config) {
    super(base);

    const { color = "#eff7ff", count = 36, size = 75 } = config;

    const geometry = new THREE.BufferGeometry();

    const posBuffer = kokomi.makeBuffer(count, () =>
      THREE.MathUtils.randFloatSpread(3)
    );
    kokomi.iterateBuffer(posBuffer, posBuffer.length, (arr, axis) => {
      arr[axis.x] = THREE.MathUtils.randFloatSpread(3);
      arr[axis.y] = THREE.MathUtils.randFloatSpread(3);
      arr[axis.z] = 0;
    });

    geometry.setAttribute("position", new THREE.BufferAttribute(posBuffer, 3));

    const cm = new kokomi.CustomPoints(base, {
      baseMaterial: new THREE.ShaderMaterial(),
      // geometry: new THREE.PlaneGeometry(1, 1, 16, 16),
      geometry,
      vertexShader: vertexShader2,
      fragmentShader: fragmentShader2,
      materialParams: {
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      },
      uniforms: {
        uDevicePixelRatio: {
          value: window.devicePixelRatio,
        },
        uPointSize: {
          value: size,
        },
        uColor: {
          value: new THREE.Color(color),
        },
      },
    });
    this.cm = cm;
  }
}

class ParticleQuad extends kokomi.Component {
  constructor(base, config) {
    super(base);

    const rtScene = new THREE.Scene();
    const rtCamera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    rtCamera.position.z = 1;
    const rt = new kokomi.RenderTexture(base, {
      rtScene,
      rtCamera,
    });

    const pf = new ParticlesFly(base, config);
    rtScene.add(pf.cm.points);

    const sqPf = new kokomi.CustomMesh(base, {
      geometry: new THREE.PlaneGeometry(window.innerWidth, window.innerHeight),
      vertexShader: vertexShader3,
      fragmentShader: fragmentShader3,
      uniforms: {
        uTexture: {
          value: rt.texture,
        },
      },
      materialParams: {
        transparent: true,
        blending: THREE.AdditiveBlending,
      },
    });
    sqPf.mesh.position.z -= 1;
    this.sqPf = sqPf;
  }
  addExisting() {
    this.sqPf.addExisting();
  }
}

class CheckerboardText extends kokomi.Component {
  constructor(base, config) {
    super(base);

    const { scroller, shadowColor } = config;

    const mg = new kokomi.MojiGroup(base, {
      vertexShader: vertexShader4,
      fragmentShader: fragmentShader4,
      scroller,
      uniforms: {
        uProgress: {
          value: 0,
        },
        uProgress1: {
          value: 0,
        },
        uGrid: {
          value: new THREE.Vector2(3, 6),
        },
        uGridSize: {
          value: 1,
        },
        uShadowColor: {
          value: new THREE.Color(shadowColor),
        },
      },
    });
    this.mg = mg;
  }
  addExisting() {
    this.mg.addExisting();

    this.mg.mojis.forEach((moji) => {
      moji.textMesh.mesh.material.uniforms.uGridSize.value =
        moji.textMesh.mesh._private_text.length;

      moji.textMesh.mesh.letterSpacing = 0.05;
    });
  }
  fadeIn(textClass, config = {}) {
    const { duration = 1.6, stagger = 0.05, delay = 0 } = config;

    if (this.mg.mojis) {
      this.mg.mojis.forEach((moji) => {
        if (!moji.el.classList.contains(textClass)) {
          return;
        }
        const totalDuration = duration;
        const t1 = gsap.timeline();
        const uniforms = moji.textMesh.mesh.material.uniforms;
        t1.to(uniforms.uProgress, {
          value: 1,
          duration: totalDuration,
          delay,
        });
        t1.to(
          uniforms.uProgress1,
          {
            value: 1,
            duration: totalDuration,
            delay,
          },
          stagger
        );
      });
    }
  }
  fadeOut(textClass, config = {}) {
    const { duration = 0.8, stagger = 0.05, delay = 0 } = config;

    if (this.mg.mojis) {
      this.mg.mojis.forEach((moji) => {
        if (!moji.el.classList.contains(textClass)) {
          return;
        }
        const totalDuration = duration;
        const t1 = gsap.timeline();
        const uniforms = moji.textMesh.mesh.material.uniforms;
        t1.to(uniforms.uProgress1, {
          value: 0,
          duration: totalDuration,
          delay,
        });
        t1.to(
          uniforms.uProgress,
          {
            value: 0,
            duration: totalDuration,
            delay,
          },
          stagger
        );
      });
    }
  }
}

class SwellFilter extends kokomi.Component {
  constructor(base) {
    super(base);

    const ce = new kokomi.CustomEffect(base, {
      vertexShader: vertexShader5,
      fragmentShader: fragmentShader5,
      uniforms: {
        uProgress: {
          value: 0,
        },
        uMaskRadius: {
          value: 100,
        },
        uDevicePixelRatio: {
          value: window.devicePixelRatio,
        },
        uMouse: {
          value: new THREE.Vector2(0, 0),
        },
        uMouseSpeed: {
          value: 0,
        },
      },
    });
    this.ce = ce;
    this.progress = 0;

    this.offsetX = 0;
    this.offsetY = 0;

    this.targetSpeed = 0;
  }
  addExisting() {
    this.ce.addExisting();
  }
  update() {
    const pr = this.progress;
    this.ce.customPass.material.uniforms.uProgress.value = pr;

    this.RGBShift();
  }
  scroll(delta) {
    const scrollSpeed = Math.abs(delta / 50);
    this.progress = THREE.MathUtils.lerp(this.progress, scrollSpeed, 0.1);
  }
  RGBShift() {
    const { x, y } = this.base.interactionManager.mouse;
    this.offsetX = THREE.MathUtils.lerp(this.offsetX, x, 0.1);
    this.offsetY = THREE.MathUtils.lerp(this.offsetY, y, 0.1);
    this.ce.customPass.material.uniforms.uMouse.value = new THREE.Vector2(
      this.offsetX,
      this.offsetY
    );

    // mouse speed
    const hoverDelta = new THREE.Vector2(
      this.base.iMouse.mouseDOMDelta.x / window.innerWidth,
      this.base.iMouse.mouseDOMDelta.y / window.innerHeight
    );

    const mouseSpeed = Math.hypot(hoverDelta.x, hoverDelta.y);
    this.targetSpeed = THREE.MathUtils.lerp(this.targetSpeed, mouseSpeed, 0.1);
    this.ce.customPass.material.uniforms.uMouseSpeed.value = Math.min(
      this.targetSpeed,
      0.05
    );
    this.targetSpeed *= 0.999;
  }
}

class Sketch extends kokomi.Base {
  async create() {
    // config
    const config = {
      scroller: {
        ease: 0.025,
      },
      cg: {
        color: "#f0555a",
      },
      pq: {
        color: "#eff6fc",
        count: 80,
        size: 60,
      },
      ct: {
        shadowColor: "#e7096a",
      },
      sf: {
        strength: 1,
      },
    };

    // functions
    const start = async () => {
      document.querySelector(".loader-screen").classList.add("hollow");

      await kokomi.sleep(500);

      document.querySelector("body").style.overflow = "visible";
      document.querySelector("body").style.overflowX = "hidden";

      gsap.to(".gallery,#sketch", {
        opacity: 1,
      });
    };

    // main
    await kokomi.preloadImages();

    // --swiper--
    const swiper = new Swiper(".swiper", {
      direction: "vertical",
      mousewheel: true,
      freeMode: {
        sticky: true,
      },
    });
    window.swiper = swiper;

    // await start();
    // return;

    // --webgl--
    const screenCamera = new kokomi.ScreenCamera(this);
    screenCamera.addExisting();

    // scroller
    const scroller = new kokomi.NormalScroller();
    scroller.scroll.ease = config.scroller.ease;
    scroller.listenForScroll();

    // gallery
    document.querySelectorAll("img:not(.webgl-fixed)").forEach((el) => {
      el.classList.add("opacity-0");
    });

    const cg = new CharacterGallery(this, {
      ...config.cg,
      scroller,
    });
    await cg.addExisting();
    cg.connectSwiper(swiper);

    // particles
    const pq = new ParticleQuad(this, config.pq);
    pq.addExisting();

    // text anime delay
    const barSlideInTexts = document.querySelectorAll(".bar-slide-in");
    barSlideInTexts.forEach((el) => {
      el.style.setProperty("--bar-slide-in-delay", "0.8s");
    });

    // checkerboard text
    document.querySelectorAll(".webgl-text").forEach((el) => {
      el.classList.add("hollow");
    });

    const ct = new CheckerboardText(this, {
      scroller,
      ...config.ct,
    });
    ct.addExisting();

    // swell filter
    const sf = new SwellFilter(this);
    sf.addExisting();

    this.update(() => {
      sf.scroll(scroller.scroll.delta);
    });

    // load images
    await cg.gallary.checkImagesLoaded();

    // start
    await start();

    // swiper
    let activeIndex = swiper.activeIndex;

    ct.fadeIn(`checkerboard-text-${activeIndex + 1}`);

    swiper.on("slideChange", (e) => {
      ct.fadeOut(`webgl-text`);

      activeIndex = swiper.activeIndex;

      ct.fadeIn(`checkerboard-text-${activeIndex + 1}`, {
        delay: 0.2,
      });
    });
  }
}

const createSketch = () => {
  const sketch = new Sketch();
  sketch.create();
  return sketch;
};

createSketch();

const makeResponsive = () => {
  const clamp = (num, lower, upper) =>
    Math.max(
      Math.min(Number(num), Math.max(lower, upper)),
      Math.min(lower, upper)
    );

  // 基准宽度
  const baseWidth = 1640;

  // 基准字体大小
  const baseSize = 16;

  // 最小字体大小
  const minSize = 10;

  // 设置 rem 函数
  const setRem = () => {
    // 当前页面宽度相对于基准宽度的缩放比例
    const scale = document.documentElement.clientWidth / baseWidth;
    // 设置目标字体大小
    const target = baseSize * scale;
    // 限制字体大小
    const fontSize = clamp(target, minSize, Infinity);
    document.documentElement.style.fontSize = `${fontSize}px`;
  };

  // 执行setRem
  const doSetRem = () => {
    setRem();
    window.addEventListener("resize", setRem);
  };

  // 还原rem
  const resetRem = () => {
    document.documentElement.style.fontSize = `${16}px`;
    window.removeEventListener("resize", setRem);
  };

  doSetRem();
};

makeResponsive();
