extends Node2D
## Un disque (bulle de lave, étincelle…).

var radius: float = 8.0
var color: Color = Color(1.0, 0.76, 0.30, 0.7)


func _draw() -> void:
	draw_circle(Vector2.ZERO, radius, color)
