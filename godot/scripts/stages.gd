## ステージのデータ（ブラウザ版の stages/*.js の defineStage と同じ数字）。
## platforms … 足場。page は "left" / "right"。その足場は、そのページの重力にしたがう少年だけが ぶつかる
## items     … お話のかけら（光の玉）。mission が true なら、全部集めると右の端が開く
class_name Stages

const LIST := {
	"komichi1": {
		"label": "序章 ── 森の小道 ①",
		"bg": "res://assets/bg_day.webp",
		"start": Vector2(60, 430),
		"platforms": [
			{"page": "left", "x": 310, "y": 130, "w": 105, "h": 60},
			{"page": "left", "x": 350, "y": 190, "w": 25, "h": 275},
			{"page": "right", "x": 790, "y": 10, "w": 20, "h": 145},
			{"page": "left", "x": 180, "y": 360, "w": 110, "h": 100},
			{"page": "right", "x": 680, "y": 310, "w": 130, "h": 150},
			{"page": "right", "x": 760, "y": 360, "w": 80, "h": 100},
			{"page": "right", "x": 650, "y": 330, "w": 120, "h": 130},
			{"page": "left", "x": 290, "y": 170, "w": 140, "h": 90},
			{"page": "left", "x": 140, "y": 400, "w": 60, "h": 60},
		],
		"items": [
			{"x": 217, "y": 322, "w": 36, "h": 36},
			{"x": 212, "y": 17, "w": 36, "h": 36},
			{"x": 602, "y": 22, "w": 36, "h": 36},
			{"x": 702, "y": 272, "w": 36, "h": 36},
		],
		"mission": true,
	},
}
