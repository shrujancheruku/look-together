// One shared shader for the whole scene: water shimmer, tap ripples, line boil and a fixed
// paper grain over painted layers. `still` (Still water / Reduce Motion) zeroes every motion term.
export const SCENE_SKSL = `
uniform shader sky; uniform shader bank; uniform shader water; uniform shader wash; uniform shader line;
uniform float2 res;
uniform float t;        // seconds, stepped at the art frame rate
uniform float boil;     // boil step, advances on twos (~8 per second)
uniform float still;    // 0 moving, 1 still
uniform float season;   // 0 spring morning, 1 autumn evening
uniform float waterTop; // px
uniform float4 rip0; uniform float4 rip1; uniform float4 rip2; uniform float4 rip3; // x, y, start t

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p); float2 f = fract(p); f = f * f * (3 - 2 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), f.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), f.x), f.y);
}
half4 over(half4 a, half4 b) { return b + a * (1 - b.a); }
float2 ripple(float2 p, float4 r, inout float hi) {
  float age = t - r.z;
  if (age <= 0 || age >= 2.5 || r.z < 0) return float2(0);
  float2 v = (p - r.xy) * float2(1, 2.6);
  float ring = exp(-pow((length(v) - age * 150) / 14, 2)) * (1 - age / 2.5);
  hi += ring;
  return normalize(v + 0.001) * ring * 7;
}

half4 main(float2 p) {
  float m = 1 - still;
  float depth = clamp((p.y - waterTop) / (res.y - waterTop), 0, 1);
  float inWater = step(waterTop, p.y);
  float2 d = float2(sin(p.y * 0.045 + t * 1.6) * 2.5, sin(p.x * 0.02 + t * 1.1) * 1.2) * (0.4 + depth) * inWater;
  float hi = 0;
  d += ripple(p, rip0, hi) + ripple(p, rip1, hi) + ripple(p, rip2, hi) + ripple(p, rip3, hi);
  d *= m;
  half4 c = sky.eval(p);
  c = over(c, bank.eval(p));
  c = over(c, water.eval(p + d));
  c = over(c, wash.eval(p + d * 0.5));
  float2 bo = (float2(noise(p * 0.02 + boil * 7.13), noise(p * 0.02 + boil * 3.71 + 9)) - 0.5) * 3.0 * m;
  c = over(c, line.eval(p + d * 0.5 + bo));
  half3 rimTint = mix(half3(1), half3(1.0, 0.85, 0.67), half(season));
  c.rgb = mix(c.rgb, rimTint, half(clamp(hi * 0.35 * m * inWater, 0, 0.5)));
  float g = noise(p * 0.9) * 0.5 + noise(p * 0.23) * 0.5;
  c.rgb *= half(1 - 0.07 * g);
  return c;
}`;

