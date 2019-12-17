
export class Rect {
  constructor(minx, miny, maxx, maxy) {
    [this.minx, this.miny, this.maxx, this.maxy] = [minx, miny, maxx, maxy];
  }

  static fromLeafletBounds(bounds) {
    const [w,s,e,n] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    return new Rect(w,s,e,n);
  }

  asLeafletBounds() {
    return [[this.miny, this.minx], [this.maxy, this.maxx]];
  }
  asQueryParams() {
    return `minx=${this.minx}&maxx=${this.maxx}&miny=${this.miny}&maxy=${this.maxy}`
  }
}

export class Point {
  constructor(x, y) {
    [this.x, this.y] = [x, y];
  }
  static fromJsonPoint(pt) {
    return new Point(pt.coordinates[0], pt.coordinates[1])
  }

  xy() { return [this.x, this.y] }
  yx() { return [this.y, this.x] }
  latLng() { return [this.y, this.x] }
  lngLat() { return [this.x, this.y] }
}
