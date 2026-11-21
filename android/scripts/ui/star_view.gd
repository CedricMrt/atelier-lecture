extends Control
## Une étoile dessinée par code : pleine (gagnée) ou vide.

var filled: bool = true:
	set(value):
		filled = value
		queue_redraw()


func _init() -> void:
	custom_minimum_size = Vector2(40, 40)
	resized.connect(queue_redraw)


func _draw() -> void:
	var center := size / 2.0
	var outer := minf(size.x, size.y) * 0.5
	var inner := outer * 0.45
	var points := PackedVector2Array()

	for i in 10:
		var angle := -PI / 2.0 + i * PI / 5.0
		var radius := outer if i % 2 == 0 else inner
		points.append(center + Vector2(cos(angle), sin(angle)) * radius)

	if filled:
		draw_colored_polygon(points, Color(1.0, 0.82, 0.20))
	else:
		points.append(points[0])
		draw_polyline(points, Color(1, 1, 1, 0.45), 3.0)
