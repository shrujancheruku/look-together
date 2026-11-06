// Pixel-art scene shader: the scene is evaluated per art pixel, and every motion (shimmer,
// ripples, twinkles) moves in whole art pixels, so the pixel grid never breaks.
export const PIXEL_SKSL = `
uniform shader bg;
uniform float2 art;     // art size, in art pixels
uniform float t;        // seconds, stepped at the art frame rate
uniform float still;    // 0 moving, 1 still
uniform float season;   // 0 spring morning, 1 autumn evening
uniform float waterTop; // art pixels
uniform float4 rip0; uniform float4 rip1; uniform float4 rip2; uniform float4 rip3; // x, y (art px), start t
uniform float frost;    // 1 when drawing a glass card: coarse cells, tinted, colour stepped
uniform half4 tint;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float ring(float2 q, float4 r) {
  float age = t - r.z;
  if (r.z < 0 || age <= 0 || age >= 1.6) return 0;
  float d = length((q - r.xy) * float2(1, 2.4));
  return step(abs(d - floor(age * 22)), 0.75) * step(age, 1.6);
}

half4 main(float2 p) {
  float2 q = floor(p) + 0.5; // the art pixel this fragment belongs to
  if (frost > 0) {
    float2 c0 = (floor(p / 3) + 0.5) * 3;
    half4 g = (bg.eval(c0 + float2(-0.75, -0.75)) + bg.eval(c0 + float2(0.75, -0.75)) + bg.eval(c0 + float2(-0.75, 0.75)) + bg.eval(c0 + float2(0.75, 0.75))) * 0.25;
    g.rgb = mix(g.rgb, tint.rgb, tint.a);
    return half4(floor(g.rgb * 14 + 0.5) / 14, 1);
  }
  float m = 1 - still;
  float water = step(waterTop, q.y);
  float rg = 0;
  if (water > 0 && m > 0) {
    float depth = (q.y - waterTop) / (art.y - waterTop);
    q.x += floor(sin(floor(q.y) * 0.9 + floor(t * 6) * 0.7) * (0.6 + depth * 1.4) + 0.5);
    rg = max(max(ring(q, rip0), ring(q, rip1)), max(ring(q, rip2), ring(q, rip3)));
  }
  half4 c = bg.eval(q);
  half3 hi = mix(half3(1, 1, 0.96), half3(1, 0.86, 0.66), half(season));
  if (rg > 0) c.rgb = mix(c.rgb, hi, 0.5);
  if (water > 0 && m > 0 && hash(floor(q) + floor(t * 4)) > 0.997) c.rgb = mix(c.rgb, hi, 0.6);
  return c;
}`;
