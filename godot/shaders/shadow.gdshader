// 影：絵の形（不透明なところ）を、ぼかした影の色でぬる。
// blur … ぼかす広さ（絵のピクセル）。shadow_color … 影の色と濃さ
shader_type canvas_item;

uniform float blur = 6.0;
uniform vec4 shadow_color : source_color = vec4(0.12, 0.08, 0.05, 0.7);

void fragment() {
	float a = 0.0;
	float total = 0.0;
	for (int i = -3; i <= 3; i++) {
		for (int j = -3; j <= 3; j++) {
			vec2 o = vec2(float(i), float(j)) / 3.0 * blur * TEXTURE_PIXEL_SIZE;
			float w = 1.0 - length(vec2(float(i), float(j))) / 4.5;
			a += texture(TEXTURE, UV + o).a * w;
			total += w;
		}
	}
	COLOR = vec4(shadow_color.rgb, shadow_color.a * a / total);
}
