const Mat4 = {
  create(){ return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
  identity(o){ o.set([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); return o; },
  multiply(a,b,o){
    const out = new Float32Array(16);
    for(let i=0;i<4;i++){
      for(let j=0;j<4;j++){
        out[i*4+j] = a[i*4+0]*b[0*4+j]+a[i*4+1]*b[1*4+j]+a[i*4+2]*b[2*4+j]+a[i*4+3]*b[3*4+j];
      }
    }
    o.set(out); return o;
  },
  perspective(fovy, aspect, near, far){
    const f = 1/Math.tan(fovy/2), nf = 1/(near-far);
    const o = new Float32Array(16);
    o[0]=f/aspect; o[5]=f; o[10]=(far+near)*nf; o[11]=-1; o[14]=2*far*near*nf;
    return o;
  },
  lookAt(eye, center, up){
    let z0=eye[0]-center[0], z1=eye[1]-center[1], z2=eye[2]-center[2];
    let len=Math.hypot(z0,z1,z2); z0/=len; z1/=len; z2/=len;
    let x0=up[1]*z2-up[2]*z1, x1=up[2]*z0-up[0]*z2, x2=up[0]*z1-up[1]*z0;
    len=Math.hypot(x0,x1,x2)||1; x0/=len; x1/=len; x2/=len;
    let y0=z1*x2-z2*x1, y1=z2*x0-z0*x2, y2=z0*x1-z1*x0;
    const o = new Float32Array(16);
    o[0]=x0;o[1]=y0;o[2]=z0;o[3]=0;
    o[4]=x1;o[5]=y1;o[6]=z1;o[7]=0;
    o[8]=x2;o[9]=y2;o[10]=z2;o[11]=0;
    o[12]=-(x0*eye[0]+x1*eye[1]+x2*eye[2]);
    o[13]=-(y0*eye[0]+y1*eye[1]+y2*eye[2]);
    o[14]=-(z0*eye[0]+z1*eye[1]+z2*eye[2]);
    o[15]=1;
    return o;
  },
  translate(m, v){
    const o = Mat4.create(); o.set(m);
    o[12] += m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
    o[13] += m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
    o[14] += m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
    return o;
  },
  scale(m, v){
    const o = new Float32Array(m);
    o[0]*=v[0]; o[1]*=v[0]; o[2]*=v[0];
    o[4]*=v[1]; o[5]*=v[1]; o[6]*=v[1];
    o[8]*=v[2]; o[9]*=v[2]; o[10]*=v[2];
    return o;
  },
  rotateY(m, rad){
    const c=Math.cos(rad), s=Math.sin(rad);
    const o = new Float32Array(m);
    const a00=m[0],a01=m[1],a02=m[2],a20=m[8],a21=m[9],a22=m[10];
    o[0]=a00*c-a20*s; o[1]=a01*c-a21*s; o[2]=a02*c-a22*s;
    o[8]=a00*s+a20*c; o[9]=a01*s+a21*c; o[10]=a02*s+a22*c;
    return o;
  }
};

const VS = `
attribute vec3 aPos; attribute vec3 aNormal; attribute vec3 aColor;
uniform mat4 uModel, uView, uProj;
varying vec3 vNormal; varying vec3 vColor; varying vec3 vWorldPos;
void main(){
  vec4 wp = uModel * vec4(aPos,1.0);
  vWorldPos = wp.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  gl_Position = uProj * uView * wp;
}`;

const FS = `
precision mediump float;
varying vec3 vNormal; varying vec3 vColor; varying vec3 vWorldPos;
uniform vec3 uLightDir; uniform vec3 uCamPos; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
void main(){
  vec3 n = normalize(vNormal);
  float diff = max(dot(n, -uLightDir), 0.0);
  float ambient = 0.38;
  vec3 lit = vColor * (ambient + diff*0.75);
  float dist = length(uCamPos - vWorldPos);
  float fogF = clamp((uFogFar-dist)/(uFogFar-uFogNear), 0.0, 1.0);
  vec3 finalColor = mix(uFogColor, lit, fogF);
  gl_FragColor = vec4(finalColor, 1.0);
}`;

function compileShader(gl, src, type){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
  return s;
}

class Engine {
  constructor(canvas){
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {antialias:true}) || canvas.getContext('experimental-webgl');
    const gl = this.gl;
    const vs = compileShader(gl, VS, gl.VERTEX_SHADER);
    const fs = compileShader(gl, FS, gl.FRAGMENT_SHADER);
    this.prog = gl.createProgram();
    gl.attachShader(this.prog, vs); gl.attachShader(this.prog, fs); gl.linkProgram(this.prog);
    gl.useProgram(this.prog);
    this.locs = {
      aPos: gl.getAttribLocation(this.prog,'aPos'),
      aNormal: gl.getAttribLocation(this.prog,'aNormal'),
      aColor: gl.getAttribLocation(this.prog,'aColor'),
      uModel: gl.getUniformLocation(this.prog,'uModel'),
      uView: gl.getUniformLocation(this.prog,'uView'),
      uProj: gl.getUniformLocation(this.prog,'uProj'),
      uLightDir: gl.getUniformLocation(this.prog,'uLightDir'),
      uCamPos: gl.getUniformLocation(this.prog,'uCamPos'),
      uFogColor: gl.getUniformLocation(this.prog,'uFogColor'),
      uFogNear: gl.getUniformLocation(this.prog,'uFogNear'),
      uFogFar: gl.getUniformLocation(this.prog,'uFogFar'),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    this.fogColor = [0.55,0.62,0.7];
    this.resize();
    this.meshes = [];
  }
  resize(){
    const c = this.canvas;
    const w = c.clientWidth, h = c.clientHeight;
    if(c.width!==w || c.height!==h){ c.width=w; c.height=h; }
    this.gl.viewport(0,0,c.width,c.height);
    this.aspect = c.width/Math.max(1,c.height);
  }
  makeBox(w,h,d,color){
    const gl = this.gl;
    const x=w/2,y=h/2,z=d/2;
    const c = color;
    const positions = [
      -x,-y, z,  x,-y, z,  x, y, z,  -x, y, z,
      -x,-y,-z, -x, y,-z,  x, y,-z,   x,-y,-z,
      -x, y,-z, -x, y, z,   x, y, z,  x, y,-z,
      -x,-y,-z,  x,-y,-z,   x,-y, z, -x,-y, z,
       x,-y,-z,  x, y,-z,   x, y, z,  x,-y, z,
      -x,-y,-z, -x,-y, z,  -x, y, z, -x, y,-z,
    ];
    const normals = [
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1,0,0,-1,0,0,-1,0,0,-1,
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0,0,-1,0,0,-1,0,0,-1,0,
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0,
    ];
    const colors = [];
    for(let i=0;i<6;i++){
      const shade = [1, 0.8, 1.08, 0.65, 0.92, 0.92][i];
      for(let j=0;j<4;j++) colors.push(c[0]*shade, c[1]*shade, c[2]*shade);
    }
    const indices = [];
    for(let i=0;i<6;i++){ const o=i*4; indices.push(o,o+1,o+2, o,o+2,o+3); }
    return this._upload(positions, normals, colors, indices);
  }
  _upload(positions, normals, colors, indices){
    const gl = this.gl;
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    const colBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    return {posBuf, normBuf, colBuf, idxBuf, count: indices.length};
  }
  drawMesh(mesh, modelMat){
    const gl = this.gl, l = this.locs;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuf);
    gl.enableVertexAttribArray(l.aPos); gl.vertexAttribPointer(l.aPos,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normBuf);
    gl.enableVertexAttribArray(l.aNormal); gl.vertexAttribPointer(l.aNormal,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colBuf);
    gl.enableVertexAttribArray(l.aColor); gl.vertexAttribPointer(l.aColor,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuf);
    gl.uniformMatrix4fv(l.uModel, false, modelMat);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }
  beginFrame(camPos, viewMat, fogNear, fogFar, skyTop){
    this.resize();
    const gl = this.gl, l = this.locs;
    gl.clearColor(skyTop[0],skyTop[1],skyTop[2],1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const proj = Mat4.perspective(1.1, this.aspect, 0.1, 300);
    gl.uniformMatrix4fv(l.uView, false, viewMat);
    gl.uniformMatrix4fv(l.uProj, false, proj);
    gl.uniform3fv(l.uLightDir, [0.4,-0.85,0.3]);
    gl.uniform3fv(l.uCamPos, camPos);
    gl.uniform3fv(l.uFogColor, this.fogColor);
    gl.uniform1f(l.uFogNear, fogNear);
    gl.uniform1f(l.uFogFar, fogFar);
  }
  }
