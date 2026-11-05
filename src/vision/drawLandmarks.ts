import type { Landmark, VisionFrame } from './visionTypes'
import { visible } from './landmarkUtils'

const handEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
]
const poseEdges = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  frame: VisionFrame,
  width: number,
  height: number,
) {
  function draw(points: Landmark[], edges: number[][], color: string, step = 1) {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const [a, b] of edges) {
      if (!visible(points[a!]) || !visible(points[b!])) continue
      ctx.moveTo(points[a!]!.x * width, points[a!]!.y * height)
      ctx.lineTo(points[b!]!.x * width, points[b!]!.y * height)
    }
    ctx.stroke()
    for (let index = 0; index < points.length; index += step) {
      const point = points[index]!
      if (!visible(point)) continue
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, edges.length ? 3 : 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  draw(frame.face, [], '#c4b5fd', 2)
  for (const hand of frame.hands) draw(hand.landmarks, handEdges, '#6ee7b7')
  draw(frame.pose, poseEdges, '#fcd34d')
}
