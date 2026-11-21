extends Control
## Avatar provisoire dessiné par code. Remplacé plus tard par les vrais personnages.

const Avatars = preload("res://scripts/data/avatars.gd")

var avatar_id: String = "renard":
	set(value):
		avatar_id = value
		queue_redraw()


func _init() -> void:
	custom_minimum_size = Vector2(100, 100)
	resized.connect(queue_redraw)


func _draw() -> void:
	var avatar: Dictionary = Avatars.get_avatar(avatar_id)
	var color: Color = avatar["color"]
	var ears: String = avatar["ears"]

	var center := size / 2.0
	var r := minf(size.x, size.y) * 0.44
	var dark_eye := Color(0.10, 0.07, 0.06)

	if ears == "round":
		for side in [-1.0, 1.0]:
			draw_circle(center + Vector2(side * r * 0.68, -r * 0.78), r * 0.30, color.darkened(0.2))
	elif ears == "pointy":
		for side in [-1.0, 1.0]:
			var base_x: float = side * r * 0.62
			var points := PackedVector2Array([
				center + Vector2(base_x - 0.32 * r, -r * 0.55),
				center + Vector2(base_x + side * 0.10 * r, -r * 1.25),
				center + Vector2(base_x + 0.32 * r, -r * 0.55),
			])
			# Le sens des points doit rester le même pour les deux oreilles.
			if side < 0.0:
				points.reverse()
			draw_colored_polygon(points, color.darkened(0.2))

	draw_circle(center, r, color)
	draw_circle(center + Vector2(0, r * 0.30), r * 0.55, color.lightened(0.45))

	for side in [-1.0, 1.0]:
		var eye := center + Vector2(side * r * 0.38, -r * 0.12)
		draw_circle(eye, r * 0.20, Color.WHITE)
		draw_circle(eye + Vector2(0, r * 0.02), r * 0.10, dark_eye)

	draw_arc(center + Vector2(0, r * 0.18), r * 0.30, 0.2 * PI, 0.8 * PI, 16, dark_eye, maxf(2.0, r * 0.07))
