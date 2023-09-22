#version 300 es

// This is a vertex shader. While it is called a "shader" due to outdated
// conventions, this file is used to apply matrix transformations to the arrays
// of vertex data passed to it. Since this code is run on your GPU, each vertex
// is transformed simultaneously. If it were run on your CPU, each vertex would
// have to be processed in a FOR loop, one at a time. This simultaneous
// transformation allows your program to run much faster, especially when
// rendering geometry with millions of vertices.

uniform mat4 u_Model; // The matrix that defines the transformation of the
                      // object we're rendering. In this assignment,
                      // this will be the result of traversing your scene graph.

uniform mat4
    u_ModelInvTr; // The inverse transpose of the model matrix.
                  // This allows us to transform the object's normals properly
                  // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj; // The matrix that defines the camera's transformation.
                         // We've written a static matrix for you to use for
                         // HW2, but in HW3 you'll have to generate one yourself
uniform float u_Time;    // The time values for the shader

uniform float u_Amp;
uniform float u_Freq;
uniform float u_Impulse;
uniform float u_FreqFbm;
uniform int u_Vis;

in vec4 vs_Pos; // The array of vertex positions passed to the shader

in vec4 vs_Nor; // The array of vertex normals passed to the shader

in vec4 vs_Col; // The array of vertex colors passed to the shader.

out vec4
    fs_Nor; // The array of normals that has been transformed by u_ModelInvTr.
            // This is implicitly passed to the fragment shader.
out vec4 fs_LightVec; // The direction in which our virtual light lies, relative
                      // to each vertex. This is implicitly passed to the
                      // fragment shader.
out vec4 fs_Col;  // The color of each vertex. This is implicitly passed to the
                  // fragment shader.
out vec4 fs_Pos;  // The color of each vertex. This is implicitly passed to the
                  // fragment shader.
out vec3 fs_Disp; // The displacement of each vertex. This is implicitly passed
                  // to the fragment shader.

const vec4 lightPos = vec4(
    5, 5, 3, 1); // The position of our virtual light, which is used to compute
                 // the shading of the geometry in the fragment shader.

#define NUM_OCTAVES 6

float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 perm(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

float noise(vec3 p) {
  vec3 a = floor(p);
  vec3 d = p - a;
  d = d * d * (3.0 - 2.0 * d);

  vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
  vec4 k1 = perm(b.xyxy);
  vec4 k2 = perm(k1.xyxy + b.zzww);

  vec4 c = k2 + a.zzzz;
  vec4 k3 = perm(c);
  vec4 k4 = perm(c + 1.0);

  vec4 o1 = fract(k3 * (1.0 / 41.0));
  vec4 o2 = fract(k4 * (1.0 / 41.0));

  vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
  vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

  return o4.y * d.y + o4.x * (1.0 - d.y);
}

float fbm(vec3 x) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100);
  for (int i = 0; i < NUM_OCTAVES; ++i) {
    v += a * noise(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

float bias(float b, float t) { return pow(t, log(b) / log(0.9)); }

float transform(vec3 p) { return bias(0.75, length(p)); }

float impulse(float k, float x) {
  float h = k * x;
  return h * exp(1.0 - h);
}

vec3 impulse(vec3 k, vec3 x) {
  vec3 h = k * x;
  return h * exp(1.0 - h);
}

float parabola(float x, float k) { return pow(4.0 * x * (1.0 - x), k); }

void main() {
  fs_Col =
      vs_Col; // Pass the vertex colors to the fragment shader for interpolation

  mat3 invTranspose = mat3(u_ModelInvTr);
  fs_Nor = vec4(invTranspose * vec3(vs_Nor),
                0); // Pass the vertex normals to the fragment shader for
                    // interpolation. Transform the geometry's normals by the
                    // inverse transpose of the model matrix. This is necessary
                    // to ensure the normals remain perpendicular to the surface
                    // after the surface is transformed by the model matrix.
  float time = 0.0;
  float amp2 = 0.0;
  time = u_Time * u_Freq;
  if (u_Vis == 1)
    amp2 = u_Amp + 0.1;
  else
    amp2 = u_Amp * (0.5 + parabola((sin(time) + 1.0) * 0.5, u_Impulse));

  float freq1 = 0.05;
  float freq2 = u_FreqFbm;
  float amp1 = transform(vs_Pos.xyz);
  vec3 disp = amp2 * ((sin(freq1 * vs_Pos.xyz) + 1.0) / 2.f) *
              vs_Nor.xyz; // Low frequency, high amplitude noise

  vec3 pos = vs_Pos.xyz + disp +
             amp1 * impulse(fbm(freq2 * (vs_Pos.xyz + time)), 0.9) *
                 fs_Nor.xyz; // High frequency, low amplitude noise
  vec4 modelposition =
      u_Model * vec4(pos.xyz, 1.0); // Temporarily store the transformed vertex
                                    // positions for use below

  fs_LightVec =
      lightPos -
      modelposition; // Compute the direction in which the light source lies

  gl_Position =
      u_ViewProj * modelposition; // gl_Position is a built-in variable of
                                  // OpenGL which is used to render the final
                                  // positions of the geometry's vertices
    fs_Pos = vec4(pos, 1.0);
  fs_Disp = disp + impulse(fbm(freq2 * (vs_Pos.xyz + time)), 0.9) * fs_Nor.xyz;
}