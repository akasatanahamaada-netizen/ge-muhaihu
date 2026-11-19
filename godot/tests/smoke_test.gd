## 動作確認用（ゲームには使わない）。godot --headless --path . -s tests/smoke_test.gd
## 少年が床に立つ → 右へ歩く → 本を裏返すと天井へ落ちる、を確かめて、結果を出す。
extends SceneTree

var game
var frame := 0
var log := []

func _initialize() -> void:
	game = load("res://main.tscn").instantiate()
	root.add_child(game)

func _physics_process(_delta: float) -> bool:
	frame += 1
	var pl = game.player
	if frame == 60:
		log.append("landed: y=%.1f on_floor=%s" % [pl.global_position.y, pl.is_on_floor()])
		Input.action_press("move_right")
	if frame == 90:
		Input.action_release("move_right")
		log.append("walked: x=%.1f" % pl.global_position.x)
	if frame == 110:
		game._on_flip_key()
		log.append("flip: gravity.left=%d" % game.gravity["left"])
	if frame == 170:
		log.append("after flip: y=%.1f on_floor=%s (天井なら y は小さい)" % [pl.global_position.y, pl.is_on_floor()])
		game._on_flip_key()
	if frame == 230:
		log.append("flip back: y=%.1f on_floor=%s" % [pl.global_position.y, pl.is_on_floor()])
		for l in log:
			print(l)
		return true
	return false
