## 少年。ブラウザ版（js/engine.js）と同じ動き：
##   ← → で歩く（加速して、手をはなすと止まる）、↑ / W でジャンプ。
##   いま立っているページ（左・右）の重力にしたがう。天井に立っているときは、上下さかさま。
##   本を裏返して落ちているあいだは、左右に動けない（着地するまで、まっすぐ落ちる）。
extends CharacterBody2D

const GRAVITY := 2200.0
const ACCEL := 3400.0
const FRICTION := 3000.0
const MAX_SPEED := 300.0
const JUMP_SPEED := 640.0
const SIZE := Vector2(26, 34)      # 当たり判定の大きさ
const DRAW_H := 64.0               # 絵の高さ

var game: Node                     # game.gd（ページの重力を持っている）
var facing := 1
var flip_fall := false             # 本を裏返して、落ちているところ
var sprite: Sprite2D
var shadow: Sprite2D                # うしろの背景に落ちる影
var tex_stand: Texture2D
var tex_walk: Texture2D
var walk_t := 0.0

func _ready() -> void:
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = SIZE
	shape.shape = rect
	add_child(shape)
	tex_stand = load("res://assets/boy_stand.webp")
	tex_walk = load("res://assets/boy_walk.webp")
	sprite = Sprite2D.new()
	sprite.texture = tex_stand
	add_child(sprite)
	shadow = Sprite2D.new()
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/shadow.gdshader")
	shadow.material = mat
	shadow.z_as_relative = false
	shadow.z_index = -20                  # 背景の上、足場の下（game.gd の Z_SHADOW）
	add_child(shadow)
	collision_layer = 0
	floor_snap_length = 4.0

## いまいるページ（体のまん中が、本のまん中より左か右か）
func page() -> String:
	return "left" if global_position.x < game.SPINE else "right"

func _physics_process(delta: float) -> void:
	var p := page()
	var g: int = game.gravity[p]
	up_direction = Vector2(0, -g)
	collision_mask = game.page_layer(p)       # そのページの足場にだけ、ぶつかる

	var can_steer := not flip_fall
	var left := can_steer and Input.is_action_pressed("move_left")
	var right := can_steer and Input.is_action_pressed("move_right")
	if left and not right:
		velocity.x -= ACCEL * delta
		facing = -1
	elif right and not left:
		velocity.x += ACCEL * delta
		facing = 1
	else:
		velocity.x = move_toward(velocity.x, 0.0, FRICTION * delta)
	velocity.x = clamp(velocity.x, -MAX_SPEED, MAX_SPEED)

	velocity.y += GRAVITY * g * delta
	if Input.is_action_pressed("jump") and is_on_floor():
		velocity.y = -JUMP_SPEED * g

	move_and_slide()
	if is_on_floor():
		flip_fall = false
	_update_sprite(g, delta)

func on_flipped() -> void:
	flip_fall = true
	velocity.x = 0.0

func _update_sprite(g: int, delta: float) -> void:
	var walking: bool = is_on_floor() and absf(velocity.x) > 40.0
	walk_t += delta
	sprite.texture = tex_walk if (walking and int(walk_t / 0.16) % 2 == 0) else tex_stand
	var s := DRAW_H / float(sprite.texture.get_height())
	sprite.scale = Vector2(s, s)
	sprite.flip_h = facing > 0          # 絵は左向きなので、右へ向くときは左右反転
	sprite.flip_v = g < 0               # 天井では、上下さかさま
	# 足もとを、当たり判定の箱の床がわにそろえる
	sprite.position = Vector2(0, (SIZE.y / 2.0 - DRAW_H / 2.0) * g)
	# 影：同じ絵の形を、右下へずらして、ぼかしてぬる（手前にいるぶん、影は少し遠く）
	var d: float = game.DEPTH_PLAYER
	shadow.texture = sprite.texture
	shadow.scale = sprite.scale
	shadow.flip_h = sprite.flip_h
	shadow.flip_v = sprite.flip_v
	shadow.position = sprite.position + game.shadow_offset(d)
	var m := shadow.material as ShaderMaterial
	m.set_shader_parameter("blur", game.shadow_blur(d) / s)
	m.set_shader_parameter("shadow_color", Color(0.12, 0.08, 0.05, game.shadow_alpha(d)))
