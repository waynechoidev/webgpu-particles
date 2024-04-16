export type Position = [number, number];
export type TexCoord = [number, number];
export type Color = [number, number, number, number];
export type Vertex = {
  position: Position;
  texCoord: TexCoord;
  color: Color;
  speed: number;
};

export const colorTable: Color[] = [
  [0.8, 0.2, 0.2, 1.0],
  [0.8, 0.5, 0.2, 1.0],
  [0.8, 0.8, 0.2, 1.0],
  [0.2, 0.8, 0.2, 1.0],
  [0.2, 0.2, 0.8, 1.0],
  [0.4, 0.2, 0.4, 1.0],
  [0.4, 0.2, 0.8, 1.0],
];
