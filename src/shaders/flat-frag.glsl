#version 300 es
precision highp float;

uniform vec3 u_CamPos;
uniform vec2 u_Dimensions;
uniform float u_Time;
uniform vec4 u_Color;
uniform float u_Amp;
uniform int u_Vis;
uniform float u_Impulse;

in vec2 fs_Pos;
out vec4 out_Col;

float parabola(float x, float k) { return pow(4.0 * x * (1.0 - x), k); }

// https://www.shadertoy.com/view/4dXGR4
float snoise(vec3 uv, float res) // by trisomie21
{
  const vec3 s = vec3(1e0, 1e2, 1e4);

  uv *= res;

  vec3 uv0 = floor(mod(uv, res)) * s;
  vec3 uv1 = floor(mod(uv + vec3(1.), res)) * s;

  vec3 f = fract(uv);
  f = f * f * (3.0 - 2.0 * f);

  vec4 v = vec4(uv0.x + uv0.y + uv0.z, uv1.x + uv0.y + uv0.z,
                uv0.x + uv1.y + uv0.z, uv1.x + uv1.y + uv0.z);

  vec4 r = fract(sin(v * 1e-3) * 1e5);
  float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

  r = fract(sin((v + uv1.z - uv0.z) * 1e-3) * 1e5);
  float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

  return mix(r0, r1, f.z) * 2. - 1.;
}

void main() {
  float time = u_Time * 0.1;
  float amp;
  if (u_Vis == 1) {
    amp = u_Amp;
  } else {
    amp = 4.0 * sqrt(u_Amp) *
          (0.5 + parabola((sin(u_Time) + 1.0) * 0.5, u_Impulse));
  }

  float brightness = 0.8;
  float radius = 0.25 * (amp + 1.0) / 100.0;
  float invRadius = 1.0 / radius;

  vec3 orangeRed = vec3(0.8, 0.35, 0.1);
  float aspect = u_Dimensions.x / u_Dimensions.y;
  vec2 uv = fs_Pos.xy + vec2(0.5, 0.5);
  vec2 p = fs_Pos;

  p.x *= aspect;
  p /= ((amp + 1.0) / 5.0);

  float fade = pow(length(2.0 * p), 0.5);
  float fVal1 = 1.0 - fade;
  float fVal2 = 1.0 - fade;

  float angle = atan(p.x, p.y) / 6.2832;
  float dist = length(p);
  vec3 coord = vec3(angle, dist + amp / 25.0, time * 0.1);

  float newTime1 = abs(snoise(
      coord + vec3(0.0, -time * (0.35 + brightness * 0.001), time * 0.015),
      15.0));
  float newTime2 = abs(snoise(
      coord + vec3(0.0, -time * (0.15 + brightness * 0.001), time * 0.015),
      45.0));
  for (int i = 1; i <= 7; i++) {
    float power = pow(2.0, float(i + 1));
    fVal1 += (0.5 / power) * snoise(coord + vec3(0.0, -time, time * 0.2),
                                    (power * (10.0) * (newTime1 + 1.0)));
    fVal2 += (0.5 / power) * snoise(coord + vec3(0.0, -time, time * 0.2),
                                    (power * (25.0) * (newTime2 + 1.0)));
  }

  float corona = pow(fVal1 * max(1.1 - fade, 0.0), 2.0) * 50.0;
  corona += pow(fVal2 * max(1.1 - fade, 0.0), 2.0) * 50.0;
  corona *= 1.2 - newTime1;

  if (corona < 0.4)
    discard;
  out_Col = vec4(corona * orangeRed, 0.9);
}
