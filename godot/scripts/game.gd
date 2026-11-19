## Gravity Tales（Godot 版）のゲーム本体。
## ブラウザ版の js/engine.js の、いちばん大事なしくみを移したもの：
##   ・本は見開き（左ページ・右ページ）。ページごとに重力の向きがある
##   ・F / Space で、いま立っているページを裏返す（そのページの上下が入れかわる）
##     床（天井）に立っているときだけ。空中で押したら 0.35 秒だけ覚えておく
##   ・足場は、それぞれのページのもの。そのページにいるときだけ ぶつかる
##   ・お話のかけらを全部集めると、右の端が開く。右の端まで行くと、次のページへ
extends Node2D

const W := 900.0
const H := 480.0
const SPINE := 450.0
const EDGE := 16.0
const FLIP_BUFFER := 0.35

## 影：光は左上から。物がうしろの背景に影を落とす。
## depth … どれくらい手前にあるか（0＝背景のすぐ前 〜 1＝いちばん手前）。手前の物ほど、影は物から遠く・大きくぼける
const DEPTH_PLATFORM := 0.4
const DEPTH_PLAYER := 0.55
static func shadow_offset(depth: float) -> Vector2:
	return Vector2(4.0 + depth * 20.0, 3.0 + depth * 11.0)
static func shadow_blur(depth: float) -> float:
	return 2.0 + depth * 8.0
static func shadow_alpha(depth: float) -> float:
	return 0.82 - 0.2 * depth
## 重ねる順番（小さいほど奥）
const Z_BG := -30
const Z_SHADOW := -20
const Z_WORLD := -10

var gravity := {"left": 1, "right": 1}
var stage_id := "komichi1"
var stage: Dictionary
var player: CharacterBody2D
var right_wall: StaticBody2D
var items: Array = []             # [{rect, got, node}]
var flip_buffered := 0.0
var exit_open := false
var cleared := false
var flash := {"left": 0.0, "right": 0.0}

var world: Node2D
var shadows: Node2D
var hud: Label
var hint: Label
var font: SystemFont

func _ready() -> void:
	font = SystemFont.new()
	font.font_names = PackedStringArray(["Yu Mincho", "Yu Gothic", "Meiryo", "MS Gothic"])
	load_stage(stage_id)

## ページの重力に合わせた、ぶつかる相手の番号（左ページ＝2、右ページ＝4）
func page_layer(p: String) -> int:
	return 2 if p == "left" else 4

func load_stage(id: String) -> void:
	for c in get_children():
		c.queue_free()
	gravity = {"left": 1, "right": 1}
	items.clear()
	exit_open = false
	cleared = false
	flip_buffered = 0.0
	stage = Stages.LIST[id]

	# 背景の絵（見開き全体）
	var bg := Sprite2D.new()
	bg.texture = load(stage["bg"])
	bg.centered = false
	bg.scale = Vector2(W / bg.texture.get_width(), H / bg.texture.get_height())
	bg.modulate = Color(1, 1, 1, 0.9)
	bg.z_index = Z_BG
	add_child(bg)

	shadows = Node2D.new()                 # 足場の影（背景の上、足場の下）
	shadows.z_index = Z_SHADOW
	shadows.draw.connect(_draw_shadows)
	add_child(shadows)

	world = Node2D.new()
	world.z_index = Z_WORLD
	world.draw.connect(_draw_world)
	add_child(world)

	# 本のへり（見えない壁）：上・下・はし。ページごと
	for p in ["left", "right"]:
		var x0 := 0.0 if p == "left" else SPINE
		_add_block(Rect2(x0, -40, SPINE, EDGE + 40), p)          # 天井
		_add_block(Rect2(x0, H - EDGE, SPINE, 40), p)            # 床
	_add_block(Rect2(-40, 0, EDGE + 40, H), "left")              # 左のはし
	right_wall = _add_block(Rect2(W - EDGE, 0, 40, H), "right")  # 右のはし（かけらを全部集めると開く）

	for pl in stage["platforms"]:
		_add_block(Rect2(pl["x"], pl["y"], pl["w"], pl["h"]), pl["page"])
	for it in stage["items"]:
		items.append({"rect": Rect2(it["x"], it["y"], it["w"], it["h"]), "got": false})

	player = CharacterBody2D.new()
	player.set_script(load("res://scripts/player.gd"))
	player.game = self
	add_child(player)
	player.global_position = stage["start"]

	hud = _label(Vector2(0, 30), 16, HORIZONTAL_ALIGNMENT_CENTER)
	hint = _label(Vector2(0, 92), 15, HORIZONTAL_ALIGNMENT_CENTER)
	hint.text = "← → 歩く　　↑ / W ジャンプ　　F / Space 本を裏返す"

func _add_block(r: Rect2, p: String) -> StaticBody2D:
	var body := StaticBody2D.new()
	body.collision_layer = page_layer(p)
	body.collision_mask = 0
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = r.size
	shape.shape = rect
	shape.position = r.position + r.size / 2.0
	body.add_child(shape)
	add_child(body)
	return body

func _label(pos: Vector2, size: int, align: HorizontalAlignment) -> Label:
	var l := Label.new()
	l.position = pos
	l.size = Vector2(W, 30)
	l.horizontal_alignment = align
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color("f3ead0"))
	l.add_theme_color_override("font_outline_color", Color("2b2418"))
	l.add_theme_constant_override("outline_size", 6)
	add_child(l)
	return l

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("flip"):
		_on_flip_key()
	elif event.is_action_pressed("reset"):
		load_stage(stage_id)

## 本を裏返す（床・天井に立っているときだけ。空中なら 0.35 秒だけ待つ）
func _on_flip_key() -> void:
	if player.is_on_floor():
		_flip_page()
	else:
		flip_buffered = FLIP_BUFFER

func _flip_page() -> void:
	var p: String = player.page()
	gravity[p] *= -1
	flash[p] = 1.0
	player.on_flipped()

func _physics_process(delta: float) -> void:
	if not is_instance_valid(player):
		return
	if flip_buffered > 0.0:
		if player.is_on_floor():
			flip_buffered = 0.0
			_flip_page()
		else:
			flip_buffered -= delta
	for p in flash:
		flash[p] = max(0.0, flash[p] - delta * 2.0)

	# お話のかけらを拾う
	var body := Rect2(player.global_position - Vector2(13, 17), Vector2(26, 34))
	for it in items:
		if not it["got"] and body.intersects(it["rect"].grow(-it["rect"].size.x * 0.2)):
			it["got"] = true
	var got: int = items.filter(func(i): return i["got"]).size()
	hud.text = "Complete" if got == items.size() else "お話のかけらを集める %d/%d" % [got, items.size()]

	# 全部集めたら、右の端が開く。右の端まで行くと、クリア
	if not exit_open and got == items.size():
		exit_open = true
		right_wall.queue_free()
	if exit_open and not cleared and player.global_position.x > W - EDGE:
		cleared = true
		hint.text = "ページをめくる……（つぎのステージは、まだ作っていません）"
		await get_tree().create_timer(1.5).timeout
		load_stage(stage_id)
		return
	world.queue_redraw()
	shadows.queue_redraw()

## 足場の影：右下へずらした四角を、少しずつ広げて重ね、ふちをぼかす
func _draw_shadows() -> void:
	var off := shadow_offset(DEPTH_PLATFORM)
	var blur := shadow_blur(DEPTH_PLATFORM)
	var a := shadow_alpha(DEPTH_PLATFORM)
	var steps := 6
	for pl in stage["platforms"]:
		var r := Rect2(pl["x"], pl["y"], pl["w"], pl["h"])
		r.position += off
		for k in range(steps):
			var grow := blur * (1.0 - float(k) / steps)
			shadows.draw_rect(r.grow(grow - blur * 0.5), Color(0.12, 0.08, 0.05, a / steps))

## 足場・ページの重力の矢印・お話のかけら・右の端の案内を描く
func _draw_world() -> void:
	var t := Time.get_ticks_msec() / 1000.0
	# 本のまん中（のど）の影
	world.draw_rect(Rect2(SPINE - 14, 0, 28, H), Color(0.23, 0.2, 0.15, 0.18))
	# 足場（茶色い紙の岩と、上の苔）
	for pl in stage["platforms"]:
		var r := Rect2(pl["x"], pl["y"], pl["w"], pl["h"])
		var flipped: bool = gravity[pl["page"]] < 0
		world.draw_rect(r, Color("8a7c62"))
		world.draw_rect(r, Color("3a2a1a"), false, 2.0)
		var moss_y := r.end.y - 6 if flipped else r.position.y
		world.draw_rect(Rect2(r.position.x, moss_y, r.size.x, 6), Color("8c9a4c"))
	# ページの重力の矢印（上）
	for p in ["left", "right"]:
		var cx := SPINE / 2.0 if p == "left" else SPINE * 1.5
		var g: int = gravity[p]
		var col := Color(0.35, 0.28, 0.18, 0.6 + 0.4 * flash[p])
		world.draw_line(Vector2(cx, 12), Vector2(cx, 28), col, 2.0)
		var tip := Vector2(cx, 28 if g > 0 else 12)
		world.draw_colored_polygon(PackedVector2Array([tip, tip + Vector2(-5, -6 * g), tip + Vector2(5, -6 * g)]), col)
	# お話のかけら（ふわふわ浮かぶ光の玉）
	for it in items:
		if it["got"]:
			continue
		var c: Vector2 = it["rect"].get_center() + Vector2(0, sin(t * 2.0 + it["rect"].position.x * 0.07) * 5.0)
		for k in range(4):
			world.draw_circle(c, 22.0 - k * 4.0, Color(1.0, 0.86, 0.5, 0.08 + k * 0.05))
		world.draw_circle(c, 8.0, Color(1.0, 0.97, 0.88))
	if exit_open:
		world.draw_string(font, Vector2(W - 230, H / 2.0), "Go to the right edge →", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("b08d57"))
